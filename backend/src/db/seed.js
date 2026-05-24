import { migrate } from './migrate.js';
import { Conversation, Message, InferenceLog, Event } from './models.js';
import { randomUUID } from 'crypto';

async function seedDatabase() {
  try {
    await migrate();
    
    // Check if data already exists
    const conversationCount = await Conversation.countDocuments();
    
    if (conversationCount > 0) {
      console.log('⚠️  Database already seeded. Skipping...');
      process.exit(0);
    }

    console.log('🌱 Seeding database with sample data...\n');

    // Sample conversations
    const conversations = [
      {
        _id: randomUUID(),
        title: 'LLM Observable Architecture Discussion',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        status: 'completed',
        message_count: 8,
        total_input_tokens: 2450,
        total_output_tokens: 1820,
        total_latency_ms: 3200,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        cancelled_at: null,
        metadata: { tags: ['architecture', 'observability'] }
      },
      {
        _id: randomUUID(),
        title: 'API Rate Limiting Best Practices',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        status: 'completed',
        message_count: 12,
        total_input_tokens: 3200,
        total_output_tokens: 2500,
        total_latency_ms: 4100,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        cancelled_at: null,
        metadata: { tags: ['api', 'performance'] }
      },
      {
        _id: randomUUID(),
        title: 'Database Optimization Strategies',
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        status: 'active',
        message_count: 5,
        total_input_tokens: 1800,
        total_output_tokens: 1200,
        total_latency_ms: 2100,
        created_at: new Date(Date.now() - 30 * 60 * 1000),
        updated_at: new Date(Date.now() - 5 * 60 * 1000),
        cancelled_at: null,
        metadata: { tags: ['database', 'optimization'] }
      },
      {
        _id: randomUUID(),
        title: 'Error Handling Patterns',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        status: 'cancelled',
        message_count: 3,
        total_input_tokens: 900,
        total_output_tokens: 500,
        total_latency_ms: 1200,
        created_at: new Date(Date.now() - 3 * 60 * 1000),
        updated_at: new Date(Date.now() - 2 * 60 * 1000),
        cancelled_at: new Date(Date.now() - 2 * 60 * 1000),
        metadata: { tags: ['errors', 'patterns'] }
      }
    ];

    // Insert conversations
    const insertedConvs = await Conversation.insertMany(conversations);
    console.log(`✅ Inserted ${insertedConvs.length} conversations`);

    // Sample messages
    const messages = [
      {
        _id: randomUUID(),
        conversation_id: conversations[0]._id,
        role: 'user',
        content: 'How should I design an observable LLM system?',
        content_preview: 'How should I design an observable LLM system?',
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        conversation_id: conversations[0]._id,
        role: 'assistant',
        content: 'An observable LLM system should include: 1) Structured logging for all API calls 2) Distributed tracing 3) Metrics collection for token usage and latency 4) Error tracking and alerting. You might consider using tools like OpenTelemetry for instrumentation.',
        content_preview: 'An observable LLM system should include: 1) Structured logging...',
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        conversation_id: conversations[0]._id,
        role: 'user',
        content: 'What about cost tracking?',
        content_preview: 'What about cost tracking?',
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        conversation_id: conversations[0]._id,
        role: 'assistant',
        content: 'Cost tracking is critical. Log token counts from each API response and multiply by the provider\'s current pricing. Store this data for analysis and optimization.',
        content_preview: 'Cost tracking is critical. Log token counts...',
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        conversation_id: conversations[1]._id,
        role: 'user',
        content: 'What\'s the best approach to rate limiting?',
        content_preview: 'What\'s the best approach to rate limiting?',
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        conversation_id: conversations[1]._id,
        role: 'assistant',
        content: 'Use token bucket or sliding window algorithms. Implement at multiple layers: API gateway, service level, and per-user basis.',
        content_preview: 'Use token bucket or sliding window algorithms...',
        created_at: new Date()
      }
    ];

    const insertedMsgs = await Message.insertMany(messages);
    console.log(`✅ Inserted ${insertedMsgs.length} messages`);

    // Sample inference logs
    const inferenceLogData = [
      {
        _id: randomUUID(),
        conversation_id: conversations[0]._id,
        message_id: messages[0]._id,
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        request_id: 'req-' + randomUUID().substring(0, 8),
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
        pii_redacted: false,
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        conversation_id: conversations[0]._id,
        message_id: messages[2]._id,
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        request_id: 'req-' + randomUUID().substring(0, 8),
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
        pii_redacted: false,
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        conversation_id: conversations[1]._id,
        message_id: messages[4]._id,
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        request_id: 'req-' + randomUUID().substring(0, 8),
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
        pii_redacted: false,
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        conversation_id: conversations[2]._id,
        message_id: null,
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        request_id: 'req-' + randomUUID().substring(0, 8),
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
        pii_redacted: false,
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        conversation_id: conversations[3]._id,
        message_id: null,
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        request_id: 'req-' + randomUUID().substring(0, 8),
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
        pii_redacted: false,
        created_at: new Date()
      }
    ];

    const insertedLogs = await InferenceLog.insertMany(inferenceLogData);
    console.log(`✅ Inserted ${insertedLogs.length} inference logs`);

    // Sample events
    const events = [
      {
        _id: randomUUID(),
        type: 'conversation.created',
        source: 'sdk',
        payload: { conversation_id: conversations[0]._id, model: 'claude-3-sonnet' },
        processed: true,
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        type: 'inference.completed',
        source: 'sdk',
        payload: { request_id: 'req-123', tokens: 445, latency_ms: 450 },
        processed: true,
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        type: 'inference.failed',
        source: 'sdk',
        payload: { request_id: 'req-124', error: 'Rate limit exceeded' },
        processed: true,
        created_at: new Date()
      },
      {
        _id: randomUUID(),
        type: 'log.ingested',
        source: 'sdk',
        payload: { count: 5, timestamp: new Date().toISOString() },
        processed: false,
        created_at: new Date()
      }
    ];

    const insertedEvents = await Event.insertMany(events);
    console.log(`✅ Inserted ${insertedEvents.length} events`);

    // Print summary
    console.log('\n📊 Database Summary:');
    console.log(`   Conversations: ${conversations.length}`);
    console.log(`   Messages: ${messages.length}`);
    console.log(`   Inference Logs: ${inferenceLogData.length}`);
    console.log(`   Events: ${events.length}`);
    console.log('\n🎉 Seeding complete!');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
