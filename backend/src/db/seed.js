import { getDb, migrate } from './migrate.js';
import { nanoid } from 'nanoid';

async function seedDatabase() {
  try {
    // Ensure migrations are run first
    await migrate();

    const db = getDb();

    // Check if --force is passed to clear existing data
    const force = process.argv.includes('--force');
    if (force) {
      console.log('🧹 Clear existing database tables...');
      await db.execute('DELETE FROM conversations');
      await db.execute('DELETE FROM messages');
      await db.execute('DELETE FROM inference_logs');
      await db.execute('DELETE FROM events');
    } else {
      // Check if data already exists in Turso
      const countResult = await db.execute('SELECT COUNT(*) as count FROM conversations');
      const conversationCount = Number(countResult.rows[0]?.count || 0);

      if (conversationCount > 0) {
        console.log('⚠️  Database already seeded. Skipping... (Use --force to override)');
        process.exit(0);
      }
    }

    console.log('🌱 Seeding Turso database with sample data...\n');

    // Generate stable UUIDs/IDs for relationships
    const convId1 = 'conv_arch_observability_' + nanoid(6);
    const convId2 = 'conv_rate_limiting_' + nanoid(6);
    const convId3 = 'conv_db_opt_' + nanoid(6);
    const convId4 = 'conv_err_handling_' + nanoid(6);

    const msgId1 = 'msg_user_1_' + nanoid(6);
    const msgId2 = 'msg_asst_1_' + nanoid(6);
    const msgId3 = 'msg_user_2_' + nanoid(6);
    const msgId4 = 'msg_asst_2_' + nanoid(6);
    const msgId5 = 'msg_user_3_' + nanoid(6);
    const msgId6 = 'msg_asst_3_' + nanoid(6);

    const now = new Date();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    // 1. Seed Conversations
    console.log('Inserting conversations...');
    const conversations = [
      {
        id: convId1,
        title: 'LLM Observatory Architecture Discussion',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        status: 'completed',
        message_count: 4,
        total_input_tokens: 2450,
        total_output_tokens: 1820,
        total_latency_ms: 3200,
        created_at: twoDaysAgo.toISOString(),
        updated_at: twoDaysAgo.toISOString(),
        cancelled_at: null,
        metadata: JSON.stringify({ tags: ['architecture', 'observability'] })
      },
      {
        id: convId2,
        title: 'API Rate Limiting Best Practices',
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        status: 'completed',
        message_count: 2,
        total_input_tokens: 3200,
        total_output_tokens: 2500,
        total_latency_ms: 4100,
        created_at: dayAgo.toISOString(),
        updated_at: dayAgo.toISOString(),
        cancelled_at: null,
        metadata: JSON.stringify({ tags: ['api', 'performance'] })
      },
      {
        id: convId3,
        title: 'Database Optimization Strategies',
        provider: 'anthropic',
        model: 'claude-opus-4-20250514',
        status: 'active',
        message_count: 0,
        total_input_tokens: 1800,
        total_output_tokens: 1200,
        total_latency_ms: 2100,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        cancelled_at: null,
        metadata: JSON.stringify({ tags: ['database', 'optimization'] })
      },
      {
        id: convId4,
        title: 'Error Handling Patterns',
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        status: 'cancelled',
        message_count: 0,
        total_input_tokens: 900,
        total_output_tokens: 500,
        total_latency_ms: 1200,
        created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        cancelled_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        metadata: JSON.stringify({ tags: ['errors', 'patterns'] })
      }
    ];

    for (const conv of conversations) {
      await db.execute({
        sql: `INSERT INTO conversations (id, title, provider, model, status, message_count, total_input_tokens, total_output_tokens, total_latency_ms, created_at, updated_at, cancelled_at, metadata)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          conv.id, conv.title, conv.provider, conv.model, conv.status,
          conv.message_count, conv.total_input_tokens, conv.total_output_tokens, conv.total_latency_ms,
          conv.created_at, conv.updated_at, conv.cancelled_at, conv.metadata
        ]
      });
    }
    console.log(`✅ Seeded ${conversations.length} conversations`);

    // 2. Seed Messages
    console.log('Inserting messages...');
    const messages = [
      {
        id: msgId1,
        conversation_id: convId1,
        role: 'user',
        content: 'How should I design an observable LLM system?',
        content_preview: 'How should I design an observable LLM system?',
        created_at: twoDaysAgo.toISOString()
      },
      {
        id: msgId2,
        conversation_id: convId1,
        role: 'assistant',
        content: 'An observable LLM system should include: 1) Structured logging for all API calls 2) Distributed tracing 3) Metrics collection for token usage and latency 4) Error tracking and alerting. You might consider using tools like OpenTelemetry for instrumentation.',
        content_preview: 'An observable LLM system should include: 1) Structured logging...',
        created_at: new Date(twoDaysAgo.getTime() + 1000 * 60).toISOString()
      },
      {
        id: msgId3,
        conversation_id: convId1,
        role: 'user',
        content: 'What about cost tracking?',
        content_preview: 'What about cost tracking?',
        created_at: new Date(twoDaysAgo.getTime() + 1000 * 60 * 5).toISOString()
      },
      {
        id: msgId4,
        conversation_id: convId1,
        role: 'assistant',
        content: 'Cost tracking is critical. Log token counts from each API response and multiply by the provider\'s current pricing. Store this data for analysis and optimization.',
        content_preview: 'Cost tracking is critical. Log token counts...',
        created_at: new Date(twoDaysAgo.getTime() + 1000 * 60 * 6).toISOString()
      },
      {
        id: msgId5,
        conversation_id: convId2,
        role: 'user',
        content: 'What\'s the best approach to rate limiting?',
        content_preview: 'What\'s the best approach to rate limiting?',
        created_at: dayAgo.toISOString()
      },
      {
        id: msgId6,
        conversation_id: convId2,
        role: 'assistant',
        content: 'Use token bucket or sliding window algorithms. Implement at multiple layers: API gateway, service level, and per-user basis.',
        content_preview: 'Use token bucket or sliding window algorithms...',
        created_at: new Date(dayAgo.getTime() + 1000 * 60).toISOString()
      }
    ];

    for (const msg of messages) {
      await db.execute({
        sql: `INSERT INTO messages (id, conversation_id, role, content, content_preview, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [msg.id, msg.conversation_id, msg.role, msg.content, msg.content_preview, msg.created_at]
      });
    }
    console.log(`✅ Seeded ${messages.length} messages`);

    // 3. Seed Inference Logs
    console.log('Inserting inference logs...');
    const inferenceLogs = [
      {
        id: 'log_' + nanoid(8),
        conversation_id: convId1,
        message_id: msgId2,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        request_id: 'req-' + nanoid(6),
        status: 'success',
        latency_ms: 1800,
        input_tokens: 125,
        output_tokens: 320,
        total_tokens: 445,
        input_preview: 'How should I design an observable LLM system?',
        output_preview: 'An observable LLM system should include...',
        error_message: null,
        error_code: null,
        stream: 0,
        pii_redacted: 0,
        created_at: twoDaysAgo.toISOString(),
        raw_payload: JSON.stringify({ usage: { input_tokens: 125, output_tokens: 320 } })
      },
      {
        id: 'log_' + nanoid(8),
        conversation_id: convId1,
        message_id: msgId4,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        request_id: 'req-' + nanoid(6),
        status: 'success',
        latency_ms: 1400,
        input_tokens: 95,
        output_tokens: 210,
        total_tokens: 305,
        input_preview: 'What about cost tracking?',
        output_preview: 'Cost tracking is critical...',
        error_message: null,
        error_code: null,
        stream: 0,
        pii_redacted: 0,
        created_at: new Date(twoDaysAgo.getTime() + 1000 * 60 * 6).toISOString(),
        raw_payload: JSON.stringify({ usage: { input_tokens: 95, output_tokens: 210 } })
      },
      {
        id: 'log_' + nanoid(8),
        conversation_id: convId2,
        message_id: msgId6,
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        request_id: 'req-' + nanoid(6),
        status: 'success',
        latency_ms: 850,
        input_tokens: 85,
        output_tokens: 150,
        total_tokens: 235,
        input_preview: 'What\'s the best approach to rate limiting?',
        output_preview: 'Use token bucket or sliding window algorithms...',
        error_message: null,
        error_code: null,
        stream: 1,
        pii_redacted: 1,
        created_at: dayAgo.toISOString(),
        raw_payload: JSON.stringify({ usage: { input_tokens: 85, output_tokens: 150 } })
      },
      {
        id: 'log_' + nanoid(8),
        conversation_id: convId3,
        message_id: null,
        provider: 'anthropic',
        model: 'claude-opus-4-20250514',
        request_id: 'req-' + nanoid(6),
        status: 'error',
        latency_ms: 2100,
        input_tokens: 200,
        output_tokens: 0,
        total_tokens: 200,
        input_preview: 'Query text...',
        output_preview: null,
        error_message: 'Rate limit exceeded',
        error_code: 'RATE_LIMIT_ERROR',
        stream: 0,
        pii_redacted: 0,
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        raw_payload: JSON.stringify({ error: { message: 'Rate limit exceeded', code: 'RATE_LIMIT_ERROR' } })
      },
      {
        id: 'log_' + nanoid(8),
        conversation_id: convId4,
        message_id: null,
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        request_id: 'req-' + nanoid(6),
        status: 'cancelled',
        latency_ms: 300,
        input_tokens: 75,
        output_tokens: 50,
        total_tokens: 125,
        input_preview: 'Question...',
        output_preview: null,
        error_message: 'User cancelled',
        error_code: 'CANCELLED',
        stream: 0,
        pii_redacted: 0,
        created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        raw_payload: JSON.stringify({ status: 'cancelled' })
      }
    ];

    for (const log of inferenceLogs) {
      await db.execute({
        sql: `INSERT INTO inference_logs (
                id, conversation_id, message_id, provider, model, request_id,
                status, latency_ms, input_tokens, output_tokens, total_tokens,
                input_preview, output_preview, error_message, error_code,
                stream, pii_redacted, created_at, raw_payload
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          log.id, log.conversation_id, log.message_id, log.provider, log.model, log.request_id,
          log.status, log.latency_ms, log.input_tokens, log.output_tokens, log.total_tokens,
          log.input_preview, log.output_preview, log.error_message, log.error_code,
          log.stream, log.pii_redacted, log.created_at, log.raw_payload
        ]
      });
    }
    console.log(`✅ Seeded ${inferenceLogs.length} inference logs`);

    // 4. Seed Events
    console.log('Inserting events...');
    const events = [
      {
        id: 'evt_' + nanoid(8),
        type: 'conversation.created',
        source: 'sdk',
        payload: JSON.stringify({ conversation_id: convId1, model: 'claude-sonnet-4-20250514' }),
        processed: 1,
        created_at: twoDaysAgo.toISOString()
      },
      {
        id: 'evt_' + nanoid(8),
        type: 'inference.completed',
        source: 'sdk',
        payload: JSON.stringify({ request_id: 'req-123', tokens: 445, latency_ms: 1800 }),
        processed: 1,
        created_at: twoDaysAgo.toISOString()
      },
      {
        id: 'evt_' + nanoid(8),
        type: 'inference.failed',
        source: 'sdk',
        payload: JSON.stringify({ request_id: 'req-124', error: 'Rate limit exceeded' }),
        processed: 1,
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
      },
      {
        id: 'evt_' + nanoid(8),
        type: 'log.ingested',
        source: 'sdk',
        payload: JSON.stringify({ count: 5, timestamp: new Date().toISOString() }),
        processed: 0,
        created_at: now.toISOString()
      }
    ];

    for (const evt of events) {
      await db.execute({
        sql: `INSERT INTO events (id, type, source, payload, processed, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [evt.id, evt.type, evt.source, evt.payload, evt.processed, evt.created_at]
      });
    }
    console.log(`✅ Seeded ${events.length} events`);

    console.log('\n📊 Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
