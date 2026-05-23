import { getDb } from '../db/migrate.js';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { emit, EventTypes } from '../events/bus.js';

// Validation schema for log payloads
const InferenceLogSchema = z.object({
  id: z.string().optional(),
  conversation_id: z.string().nullable().optional(),
  message_id: z.string().nullable().optional(),
  provider: z.string().min(1),
  model: z.string().min(1),
  request_id: z.string().optional(),
  status: z.enum(['success', 'error', 'cancelled', 'timeout']),
  latency_ms: z.number().int().nonnegative().nullable().optional(),
  input_tokens: z.number().int().nonnegative().nullable().optional(),
  output_tokens: z.number().int().nonnegative().nullable().optional(),
  total_tokens: z.number().int().nonnegative().nullable().optional(),
  input_preview: z.string().max(500).nullable().optional(),
  output_preview: z.string().max(500).nullable().optional(),
  error_message: z.string().nullable().optional(),
  error_code: z.string().nullable().optional(),
  stream: z.boolean().optional().default(false),
  pii_redacted: z.boolean().optional().default(false),
  created_at: z.string().optional(),
  raw_payload: z.any().optional(),
});

// Ingest a single inference log
export function ingestLog(rawPayload) {
  const db = getDb();
  
  // Validate
  const parsed = InferenceLogSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new Error(`Validation failed: ${parsed.error.message}`);
  }
  
  const data = parsed.data;
  const id = data.id || nanoid();
  const now = new Date().toISOString();

  // Insert log
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO inference_logs (
      id, conversation_id, message_id, provider, model, request_id,
      status, latency_ms, input_tokens, output_tokens, total_tokens,
      input_preview, output_preview, error_message, error_code,
      stream, pii_redacted, created_at, raw_payload
    ) VALUES (
      @id, @conversation_id, @message_id, @provider, @model, @request_id,
      @status, @latency_ms, @input_tokens, @output_tokens, @total_tokens,
      @input_preview, @output_preview, @error_message, @error_code,
      @stream, @pii_redacted, @created_at, @raw_payload
    )
  `);

  stmt.run({
    id,
    conversation_id: data.conversation_id || null,
    message_id: data.message_id || null,
    provider: data.provider,
    model: data.model,
    request_id: data.request_id || null,
    status: data.status,
    latency_ms: data.latency_ms ?? null,
    input_tokens: data.input_tokens ?? null,
    output_tokens: data.output_tokens ?? null,
    total_tokens: data.total_tokens ?? null,
    input_preview: data.input_preview || null,
    output_preview: data.output_preview || null,
    error_message: data.error_message || null,
    error_code: data.error_code || null,
    stream: data.stream ? 1 : 0,
    pii_redacted: data.pii_redacted ? 1 : 0,
    created_at: data.created_at || now,
    raw_payload: data.raw_payload ? JSON.stringify(data.raw_payload) : null,
  });

  // Update conversation aggregate stats
  if (data.conversation_id) {
    db.prepare(`
      UPDATE conversations SET
        total_input_tokens = total_input_tokens + @input_tokens,
        total_output_tokens = total_output_tokens + @output_tokens,
        total_latency_ms = total_latency_ms + @latency_ms,
        updated_at = @now
      WHERE id = @conversation_id
    `).run({
      input_tokens: data.input_tokens || 0,
      output_tokens: data.output_tokens || 0,
      latency_ms: data.latency_ms || 0,
      now,
      conversation_id: data.conversation_id,
    });
  }

  const log = db.prepare('SELECT * FROM inference_logs WHERE id = ?').get(id);
  emit(EventTypes.LOG_INGESTED, log);
  
  return log;
}

// Bulk ingest
export function ingestBatch(payloads) {
  const db = getDb();
  const results = [];
  const errors = [];

  const ingestMany = db.transaction((items) => {
    for (const item of items) {
      try {
        results.push(ingestLog(item));
      } catch (err) {
        errors.push({ item, error: err.message });
      }
    }
  });

  ingestMany(payloads);
  return { results, errors };
}

// Get analytics aggregates
export function getAnalytics(options = {}) {
  const db = getDb();
  const { hours = 24, provider, model } = options;

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  
  let whereClause = "WHERE created_at >= ?";
  const params = [since];
  
  if (provider) { whereClause += " AND provider = ?"; params.push(provider); }
  if (model) { whereClause += " AND model = ?"; params.push(model); }

  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_requests,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
      COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
      COUNT(CASE WHEN stream = 1 THEN 1 END) as streamed,
      ROUND(AVG(CASE WHEN status='success' THEN latency_ms END), 2) as avg_latency_ms,
      MIN(CASE WHEN status='success' THEN latency_ms END) as min_latency_ms,
      MAX(CASE WHEN status='success' THEN latency_ms END) as max_latency_ms,
      ROUND(AVG(CASE WHEN latency_ms <= 1000 THEN 1.0 ELSE 0.0 END) * 100, 2) as p50_under_1s_pct,
      SUM(COALESCE(input_tokens, 0)) as total_input_tokens,
      SUM(COALESCE(output_tokens, 0)) as total_output_tokens,
      ROUND(AVG(COALESCE(total_tokens, 0)), 2) as avg_tokens_per_request,
      ROUND(100.0 * COUNT(CASE WHEN status='success' THEN 1 END) / MAX(COUNT(*), 1), 2) as success_rate
    FROM inference_logs ${whereClause}
  `).get(...params);

  // Latency percentiles (manual calculation)
  const latencies = db.prepare(`
    SELECT latency_ms FROM inference_logs
    ${whereClause} AND status = 'success' AND latency_ms IS NOT NULL
    ORDER BY latency_ms
  `).all(...params).map(r => r.latency_ms);

  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  // Throughput over time (hourly buckets)
  const throughput = db.prepare(`
    SELECT 
      strftime('%Y-%m-%dT%H:00:00', created_at) as bucket,
      COUNT(*) as requests,
      COUNT(CASE WHEN status='success' THEN 1 END) as successes,
      COUNT(CASE WHEN status='error' THEN 1 END) as errors,
      ROUND(AVG(latency_ms), 0) as avg_latency
    FROM inference_logs ${whereClause}
    GROUP BY bucket
    ORDER BY bucket
  `).all(...params);

  // Provider breakdown
  const byProvider = db.prepare(`
    SELECT 
      provider,
      model,
      COUNT(*) as requests,
      ROUND(AVG(latency_ms), 0) as avg_latency,
      SUM(COALESCE(total_tokens, 0)) as total_tokens
    FROM inference_logs ${whereClause}
    GROUP BY provider, model
    ORDER BY requests DESC
  `).all(...params);

  // Error breakdown
  const errors = db.prepare(`
    SELECT 
      error_code,
      COUNT(*) as count,
      MIN(created_at) as first_seen,
      MAX(created_at) as last_seen
    FROM inference_logs ${whereClause} AND status = 'error'
    GROUP BY error_code
    ORDER BY count DESC
    LIMIT 10
  `).all(...params);

  return {
    summary: { ...summary, p50_latency_ms: p50, p95_latency_ms: p95, p99_latency_ms: p99 },
    throughput,
    byProvider,
    errors,
    period_hours: hours,
  };
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
