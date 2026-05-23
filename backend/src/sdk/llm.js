import Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import { redactPII } from '../services/pii.js';
import { emit, EventTypes } from '../events/bus.js';

// Multi-provider config
const PROVIDERS = {
  anthropic: {
    name: 'anthropic',
    models: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-opus-4-20250514'],
    defaultModel: 'claude-sonnet-4-20250514',
  }
};

function createAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// SDK wrapper - captures all inference metadata
export class LLMObservatorySDK {
  constructor(options = {}) {
    this.provider = options.provider || 'anthropic';
    this.model = options.model || PROVIDERS[this.provider].defaultModel;
    this.enablePIIRedaction = options.enablePIIRedaction ?? true;
    this.logEndpoint = options.logEndpoint || null; // for external ingestion
    this._client = createAnthropicClient();
  }

  // Core inference call with full metadata capture
  async chat(messages, options = {}) {
    const requestId = nanoid();
    const startTime = Date.now();
    const conversationId = options.conversationId;

    // Emit start event
    await emit(EventTypes.INFERENCE_STARTED, {
      requestId,
      conversationId,
      provider: this.provider,
      model: this.model,
    });

    const metadata = {
      id: requestId,
      conversation_id: conversationId,
      provider: this.provider,
      model: this.model,
      request_id: requestId,
      status: 'success',
      stream: false,
      pii_redacted: false,
      created_at: new Date().toISOString(),
    };

    try {
      // Apply PII redaction if enabled
      let processedMessages = messages;
      if (this.enablePIIRedaction) {
        processedMessages = messages.map(m => {
          if (m.role === 'user') {
            const { text, redacted } = redactPII(m.content);
            if (redacted) metadata.pii_redacted = true;
            return { ...m, content: text };
          }
          return m;
        });
      }

      // Capture input preview
      const lastUserMsg = [...processedMessages].reverse().find(m => m.role === 'user');
      metadata.input_preview = lastUserMsg?.content?.slice(0, 200) || '';

      // Make API call
      const response = await this._client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens || 2048,
        messages: processedMessages,
        system: options.system,
      });

      const latencyMs = Date.now() - startTime;

      // Extract metadata
      metadata.latency_ms = latencyMs;
      metadata.input_tokens = response.usage?.input_tokens || 0;
      metadata.output_tokens = response.usage?.output_tokens || 0;
      metadata.total_tokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
      metadata.output_preview = response.content?.[0]?.text?.slice(0, 200) || '';
      metadata.status = 'success';

      const outputText = response.content?.[0]?.text || '';

      // Emit completion event
      await emit(EventTypes.INFERENCE_COMPLETED, metadata);

      return {
        text: outputText,
        metadata,
        usage: response.usage,
        model: response.model,
      };

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      metadata.latency_ms = latencyMs;
      metadata.status = error.name === 'AbortError' ? 'cancelled' : 'error';
      metadata.error_message = error.message;
      metadata.error_code = error.status || error.code || 'UNKNOWN';

      await emit(EventTypes.INFERENCE_FAILED, metadata);
      throw error;
    }
  }

  // Streaming chat with SSE
  async *chatStream(messages, options = {}) {
    const requestId = nanoid();
    const startTime = Date.now();
    const conversationId = options.conversationId;

    await emit(EventTypes.INFERENCE_STARTED, {
      requestId,
      conversationId,
      provider: this.provider,
      model: this.model,
      stream: true,
    });

    const metadata = {
      id: requestId,
      conversation_id: conversationId,
      provider: this.provider,
      model: this.model,
      request_id: requestId,
      status: 'success',
      stream: true,
      pii_redacted: false,
      created_at: new Date().toISOString(),
    };

    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      let processedMessages = messages;
      if (this.enablePIIRedaction) {
        processedMessages = messages.map(m => {
          if (m.role === 'user') {
            const { text, redacted } = redactPII(m.content);
            if (redacted) metadata.pii_redacted = true;
            return { ...m, content: text };
          }
          return m;
        });
      }

      const lastUserMsg = [...processedMessages].reverse().find(m => m.role === 'user');
      metadata.input_preview = lastUserMsg?.content?.slice(0, 200) || '';

      const stream = await this._client.messages.stream({
        model: this.model,
        max_tokens: options.maxTokens || 2048,
        messages: processedMessages,
        system: options.system,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          fullText += chunk.delta.text;
          yield { type: 'text', text: chunk.delta.text, requestId };
        }
        if (chunk.type === 'message_delta' && chunk.usage) {
          outputTokens = chunk.usage.output_tokens || 0;
        }
        if (chunk.type === 'message_start' && chunk.message?.usage) {
          inputTokens = chunk.message.usage.input_tokens || 0;
        }
      }

      const latencyMs = Date.now() - startTime;
      metadata.latency_ms = latencyMs;
      metadata.input_tokens = inputTokens;
      metadata.output_tokens = outputTokens;
      metadata.total_tokens = inputTokens + outputTokens;
      metadata.output_preview = fullText.slice(0, 200);
      metadata.status = 'success';

      await emit(EventTypes.INFERENCE_COMPLETED, metadata);
      yield { type: 'done', metadata };

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      metadata.latency_ms = latencyMs;
      metadata.status = 'error';
      metadata.error_message = error.message;
      metadata.error_code = error.status || 'UNKNOWN';

      await emit(EventTypes.INFERENCE_FAILED, metadata);
      yield { type: 'error', error: error.message, metadata };
    }
  }
}

export function createSDK(options = {}) {
  return new LLMObservatorySDK(options);
}
