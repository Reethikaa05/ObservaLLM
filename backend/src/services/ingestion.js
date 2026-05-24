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
export async function ingestLog(rawPayload) {
  const db = getDb();

  const parsed = InferenceLogSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new Error(`Validation failed: ${parsed.error.message}`);
  }

  const data = parsed.data;
  const id = data.id || nanoid();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT OR REPLACE INTO inference_logs (
      id, conversation_id, message_id, provider, model, request_id,
      status, latency_ms, input_tokens, output_tokens, total_tokens,
      input_preview, output_preview, error_message, error_code,
      stream, pii_redacted, created_at, raw_payload
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )`,
    args: [
      id,
      data.conversation_id || null,
      data.message_id || null,
      data.provider,
      data.model,
      data.request_id || null,
      data.status,
      data.latency_ms ?? null,
      data.input_tokens ?? null,
      data.output_tokens ?? null,
      data.total_tokens ?? null,
      data.input_preview || null,
      data.output_preview || null,
      data.error_message || null,
      data.error_code || null,
      data.stream ? 1 : 0,
      data.pii_redacted ? 1 : 0,
      data.created_at || now,
      data.raw_payload ? JSON.stringify(data.raw_payload) : null,
    ]
  });

  // Update conversation aggregate stats
  if (data.conversation_id) {
    await db.execute({
      sql: `UPDATE conversations SET
              total_input_tokens = total_input_tokens + ?,
              total_output_tokens = total_output_tokens + ?,
              total_latency_ms = total_latency_ms + ?,
              updated_at = ?
            WHERE id = ?`,
      args: [
        data.input_tokens || 0,
        data.output_tokens || 0,
        data.latency_ms || 0,
        now,
        data.conversation_id
      ]
    });
  }

  const logResult = await db.execute({
    sql: 'SELECT * FROM inference_logs WHERE id = ?',
    args: [id]
  });
  const log = logResult.rows[0];
  await emit(EventTypes.LOG_INGESTED, log);

  return log;
}

// Bulk ingest — run sequentially (Turso doesn't support SQLite transactions over HTTP the same way)
export async function ingestBatch(payloads) {
  const results = [];
  const errors = [];

  for (const item of payloads) {
    try {
      const log = await ingestLog(item);
      results.push(log);
    } catch (err) {
      errors.push({ item, error: err.message });
    }
  }

  return { results, errors };
}

// Get analytics aggregates
export async function getAnalytics(options = {}) {
  const db = getDb();
  const { hours = 24, provider, model } = options;

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let whereClause = 'WHERE created_at >= ?';
  const params = [since];

  if (provider) { whereClause += ' AND provider = ?'; params.push(provider); }
  if (model) { whereClause += ' AND model = ?'; params.push(model); }

  const summaryResult = await db.execute({
    sql: `SELECT
      COUNT(*) as total_requests,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
      COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
      COUNT(CASE WHEN stream = 1 THEN 1 END) as streamed,
      ROUND(AVG(CASE WHEN status='success' THEN latency_ms END), 2) as avg_latency_ms,
      MIN(CASE WHEN status='success' THEN latency_ms END) as min_latency_ms,
      MAX(CASE WHEN status='success' THEN latency_ms END) as max_latency_ms,
      SUM(COALESCE(input_tokens, 0)) as total_input_tokens,
      SUM(COALESCE(output_tokens, 0)) as total_output_tokens,
      ROUND(AVG(COALESCE(total_tokens, 0)), 2) as avg_tokens_per_request,
      ROUND(100.0 * COUNT(CASE WHEN status='success' THEN 1 END) / MAX(COUNT(*), 1), 2) as success_rate
    FROM inference_logs ${whereClause}`,
    args: params
  });

  const summary = summaryResult.rows[0] || {};

  // Latency percentiles
  const latencyResult = await db.execute({
    sql: `SELECT latency_ms FROM inference_logs
          ${whereClause} AND status = 'success' AND latency_ms IS NOT NULL
          ORDER BY latency_ms`,
    args: params
  });
  const latencies = latencyResult.rows.map(r => Number(r.latency_ms));
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  // Throughput over time (hourly buckets)
  const throughputResult = await db.execute({
    sql: `SELECT
      strftime('%Y-%m-%dT%H:00:00', created_at) as bucket,
      COUNT(*) as requests,
      COUNT(CASE WHEN status='success' THEN 1 END) as successes,
      COUNT(CASE WHEN status='error' THEN 1 END) as errors,
      ROUND(AVG(latency_ms), 0) as avg_latency
    FROM inference_logs ${whereClause}
    GROUP BY bucket
    ORDER BY bucket`,
    args: params
  });

  // Provider breakdown
  const byProviderResult = await db.execute({
    sql: `SELECT
      provider, model,
      COUNT(*) as requests,
      ROUND(AVG(latency_ms), 0) as avg_latency,
      SUM(COALESCE(total_tokens, 0)) as total_tokens
    FROM inference_logs ${whereClause}
    GROUP BY provider, model
    ORDER BY requests DESC`,
    args: params
  });

  // Error breakdown
  const errorsResult = await db.execute({
    sql: `SELECT
      error_code,
      COUNT(*) as count,
      MIN(created_at) as first_seen,
      MAX(created_at) as last_seen
    FROM inference_logs ${whereClause} AND status = 'error'
    GROUP BY error_code
    ORDER BY count DESC
    LIMIT 10`,
    args: params
  });

  return {
    summary: { ...summary, p50_latency_ms: p50, p95_latency_ms: p95, p99_latency_ms: p99 },
    throughput: throughputResult.rows,
    byProvider: byProviderResult.rows,
    errors: errorsResult.rows,
    period_hours: hours,
  };
}

export async function deleteLog(id) {
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM inference_logs WHERE id = ?', args: [id] });
  return { id, deleted: true };
}

export async function deleteEvent(id) {
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM events WHERE id = ?', args: [id] });
  return { id, deleted: true };
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
