import { getDb, migrate } from './migrate.js';
import { randomUUID } from 'crypto';

const db = getDb();
migrate();

function generateId() {
  return randomUUID();
}

function seedDatabase() {
  try {
    // Check if data already exists
    const conversationCount = db.prepare('SELECT COUNT(*) as count FROM conversations').get();
    
    if (conversationCount.count > 0) {
      console.log('⚠️  Database already seeded. Skipping...');
      return;
    }

    console.log('🌱 Seeding database with sample data...\n');

    // Sample conversations
    const conversations = [
      {
        id: generateId(),
        title: 'LLM Observable Architecture Discussion',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        status: 'completed',
        message_count: 8,
        total_input_tokens: 2450,
        total_output_tokens: 1820,
        total_latency_ms: 3200,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
        metadata: JSON.stringify({ tags: ['architecture', 'observability'] })
      },
      {
        id: generateId(),
        title: 'API Rate Limiting Best Practices',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        status: 'completed',
        message_count: 12,
        total_input_tokens: 3200,
        total_output_tokens: 2500,
        total_latency_ms: 4100,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        cancelled_at: null,
        metadata: JSON.stringify({ tags: ['api', 'performance'] })
      },
      {
        id: generateId(),
        title: 'Database Optimization Strategies',
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        status: 'active',
        message_count: 5,
        total_input_tokens: 1800,
        total_output_tokens: 1200,
        total_latency_ms: 2100,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        cancelled_at: null,
        metadata: JSON.stringify({ tags: ['database', 'optimization'] })
      },
      {
        id: generateId(),
        title: 'Error Handling Patterns',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        status: 'cancelled',
        message_count: 3,
        total_input_tokens: 900,
        total_output_tokens: 500,
        total_latency_ms: 1200,
        created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        cancelled_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        metadata: JSON.stringify({ tags: ['errors', 'patterns'] })
      }
    ];

    // Insert conversations
    const insertConv = db.prepare(`
      INSERT INTO conversations (
        id, title, provider, model, status, message_count,
        total_input_tokens, total_output_tokens, total_latency_ms,
        created_at, updated_at, cancelled_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    conversations.forEach(conv => {
      insertConv.run(
        conv.id, conv.title, conv.provider, conv.model, conv.status,
        conv.message_count, conv.total_input_tokens, conv.total_output_tokens,
        conv.total_latency_ms, conv.created_at, conv.updated_at,
        conv.cancelled_at, conv.metadata
      );
    });

    console.log(`✅ Inserted ${conversations.length} conversations`);

    // Sample messages for first conversation
    const messages = [
      {
        id: generateId(),
        conversation_id: conversations[0].id,
        role: 'user',
        content: 'How should I design an observable LLM system?',
        content_preview: 'How should I design an observable LLM system?'
      },
      {
        id: generateId(),
        conversation_id: conversations[0].id,
        role: 'assistant',
        content: 'An observable LLM system should include: 1) Structured logging for all API calls 2) Distributed tracing 3) Metrics collection for token usage and latency 4) Error tracking and alerting. You might consider using tools like OpenTelemetry for instrumentation.',
        content_preview: 'An observable LLM system should include: 1) Structured logging...'
      },
      {
        id: generateId(),
        conversation_id: conversations[0].id,
        role: 'user',
        content: 'What about cost tracking?',
        content_preview: 'What about cost tracking?'
      },
      {
        id: generateId(),
        conversation_id: conversations[0].id,
        role: 'assistant',
        content: 'Cost tracking is critical. Log token counts from each API response and multiply by the provider\'s current pricing. Store this data for analysis and optimization.',
        content_preview: 'Cost tracking is critical. Log token counts...'
      },
      {
        id: generateId(),
        conversation_id: conversations[1].id,
        role: 'user',
        content: 'What\'s the best approach to rate limiting?',
        content_preview: 'What\'s the best approach to rate limiting?'
      },
      {
        id: generateId(),
        conversation_id: conversations[1].id,
        role: 'assistant',
        content: 'Use token bucket or sliding window algorithms. Implement at multiple layers: API gateway, service level, and per-user basis.',
        content_preview: 'Use token bucket or sliding window algorithms...'
      }
    ];

    const insertMsg = db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, content_preview, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    messages.forEach(msg => {
      insertMsg.run(
        msg.id,
        msg.conversation_id,
        msg.role,
        msg.content,
        msg.content_preview,
        new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      );
    });

    console.log(`✅ Inserted ${messages.length} messages`);

    // Sample inference logs
    const inferenceLogData = [
      {
        id: generateId(),
        conversation_id: conversations[0].id,
        message_id: messages[0].id,
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        request_id: 'req-' + generateId().substring(0, 8),
        status: 'success',
        latency_ms: 450,
        input_tokens: 125,
        output_tokens: 320,
        total_tokens: 445,
        input_preview: 'How should I design an observable LLM system?',
        output_preview: 'An observable LLM system should include...',
        error_message: null,
        error_code: null,
        stream: false,
        pii_redacted: false
      },
      {
        id: generateId(),
        conversation_id: conversations[0].id,
        message_id: messages[2].id,
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        request_id: 'req-' + generateId().substring(0, 8),
        status: 'success',
        latency_ms: 380,
        input_tokens: 95,
        output_tokens: 210,
        total_tokens: 305,
        input_preview: 'What about cost tracking?',
        output_preview: 'Cost tracking is critical...',
        error_message: null,
        error_code: null,
        stream: false,
        pii_redacted: false
      },
      {
        id: generateId(),
        conversation_id: conversations[1].id,
        message_id: messages[4].id,
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        request_id: 'req-' + generateId().substring(0, 8),
        status: 'success',
        latency_ms: 250,
        input_tokens: 85,
        output_tokens: 150,
        total_tokens: 235,
        input_preview: 'What\'s the best approach to rate limiting?',
        output_preview: 'Use token bucket or sliding window algorithms...',
        error_message: null,
        error_code: null,
        stream: false,
        pii_redacted: false
      },
      {
        id: generateId(),
        conversation_id: conversations[2].id,
        message_id: null,
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        request_id: 'req-' + generateId().substring(0, 8),
        status: 'error',
        latency_ms: 1200,
        input_tokens: 200,
        output_tokens: 0,
        total_tokens: 200,
        input_preview: 'Query text...',
        output_preview: null,
        error_message: 'Rate limit exceeded',
        error_code: 'RATE_LIMIT_ERROR',
        stream: false,
        pii_redacted: false
      },
      {
        id: generateId(),
        conversation_id: conversations[3].id,
        message_id: null,
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        request_id: 'req-' + generateId().substring(0, 8),
        status: 'cancelled',
        latency_ms: 300,
        input_tokens: 75,
        output_tokens: 50,
        total_tokens: 125,
        input_preview: 'Question...',
        output_preview: null,
        error_message: 'User cancelled',
        error_code: 'CANCELLED',
        stream: false,
        pii_redacted: false
      }
    ];

    const insertLog = db.prepare(`
      INSERT INTO inference_logs (
        id, conversation_id, message_id, provider, model, request_id,
        status, latency_ms, input_tokens, output_tokens, total_tokens,
        input_preview, output_preview, error_message, error_code,
        stream, pii_redacted, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    inferenceLogData.forEach(log => {
      insertLog.run(
        log.id,
        log.conversation_id,
        log.message_id,
        log.provider,
        log.model,
        log.request_id,
        log.status,
        log.latency_ms,
        log.input_tokens,
        log.output_tokens,
        log.total_tokens,
        log.input_preview,
        log.output_preview,
        log.error_message,
        log.error_code,
        log.stream,
        log.pii_redacted,
        new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      );
    });

    console.log(`✅ Inserted ${inferenceLogData.length} inference logs`);

    // Sample events
    const events = [
      {
        id: generateId(),
        type: 'conversation.created',
        source: 'sdk',
        payload: JSON.stringify({ conversation_id: conversations[0].id, model: 'claude-3-sonnet' }),
        processed: true
      },
      {
        id: generateId(),
        type: 'inference.completed',
        source: 'sdk',
        payload: JSON.stringify({ request_id: 'req-123', tokens: 445, latency_ms: 450 }),
        processed: true
      },
      {
        id: generateId(),
        type: 'inference.failed',
        source: 'sdk',
        payload: JSON.stringify({ request_id: 'req-124', error: 'Rate limit exceeded' }),
        processed: true
      },
      {
        id: generateId(),
        type: 'log.ingested',
        source: 'sdk',
        payload: JSON.stringify({ count: 5, timestamp: new Date().toISOString() }),
        processed: false
      }
    ];

    const insertEvent = db.prepare(`
      INSERT INTO events (id, type, source, payload, processed, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    events.forEach(event => {
      insertEvent.run(
        event.id,
        event.type,
        event.source,
        event.payload,
        event.processed,
        new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      );
    });

    console.log(`✅ Inserted ${events.length} events`);

    // Print summary
    console.log('\n📊 Database Summary:');
    console.log(`   Conversations: ${conversations.length}`);
    console.log(`   Messages: ${messages.length}`);
    console.log(`   Inference Logs: ${inferenceLogData.length}`);
    console.log(`   Events: ${events.length}`);
    console.log('\n🎉 Seeding complete!');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
