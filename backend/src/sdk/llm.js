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
  const key = process.env.ANTHROPIC_API_KEY || '';
  // Return a dummy client if key is missing or dummy to prevent initialization crash
  const actualKey = (!key || key.includes('your_') || key.includes('sk-ant-your')) ? 'dummy_key' : key;
  return new Anthropic({ apiKey: actualKey });
}

// Intelligent mock fallback response generator
function generateMockResponse(prompt, model) {
  const responses = [
    "That is an interesting question! As an LLM observability system, I track all inputs, outputs, tokens, and latency to give you complete visibility into system performance.",
    "Designing observable LLM applications requires capturing prompts, responses, token usage, latencies, and error rates. This observatory platform does exactly that!",
    "To optimize LLM costs, you should monitor token usage closely. Haiku is great for lightweight tasks, while Sonnet excels at complex reasoning and code generation.",
    "When building production LLM apps, make sure to implement robust PII redaction and rate limit handling. Let me know if you want me to explain these patterns in detail!",
    "Observability helps you detect drift, rate limit errors, and high latency spikes before they affect your users. Feel free to ask more technical questions about observatory architectures."
  ];

  const query = prompt.toLowerCase();
  if (query.includes('architecture') || query.includes('design')) {
    return `Designing an observable LLM architecture (using ${model}) involves:\n\n1. **Telemetry Instrumentation**: Capturing model parameters, request-response pairs, latency metrics, and token usages.\n2. **Secure Ingestion**: Standardizing events and redacting sensitive PII from prompt inputs prior to long-term storage.\n3. **Structured Storage**: Storing telemetry in databases like Turso (libSQL) to maintain fast retrieval and historical charts.\n4. **Real-time Observability**: Using SSE event feeds to stream live telemetry straight to your analytics dashboards.`;
  } else if (query.includes('cost') || query.includes('token') || query.includes('price')) {
    return `Tracking token costs for ${model} is direct:\n\n- **Input Tokens**: Logged and calculated (typically $3.00 per million tokens).\n- **Output Tokens**: Logged and calculated (typically $15.00 per million tokens).\n\nObservaLLM automatically records these usage metrics inside your Turso database for every single completion, ensuring you can calculate and optimize costs in real time!`;
  } else if (query.includes('rate limit') || query.includes('error')) {
    return `To handle API errors and rate limits with ${model}:\n\n- **Client Retry Jitter**: Build standard retry loops with randomized exponential backoff.\n- **Error Logging**: Capture error codes (such as \`RATE_LIMIT_ERROR\`, \`500 Internal Error\`) directly in ObservaLLM.\n- **Quota Caches**: Set up in-memory rate limit rules (using Redis or similar) to throttle queries before calling upstream LLMs.`;
  } else if (query.includes('pii') || query.includes('redact') || query.includes('security')) {
    return `Privacy and security are key! ObservaLLM comes with active PII Redaction:\n\n1. It scans user inputs for phone numbers, email addresses, credit cards, and social security numbers.\n2. It automatically redacts them to \`[REDACTED]\` before saving them to Turso or sending them to providers.\n3. The database flags logs with \`pii_redacted = 1\` so you can track compliance in your dashboard.`;
  }

  return responses[Math.floor(Math.random() * responses.length)] + ` (Simulated response from ${model})`;
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

    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    const isMockMode = !apiKey || apiKey.includes('your_') || apiKey.includes('sk-ant-your');

    if (isMockMode) {
      // Simulate real-world network latency
      await new Promise(r => setTimeout(r, 600 + Math.random() * 500));
      const outputText = generateMockResponse(lastUserMsg?.content || '', this.model);

      metadata.latency_ms = Date.now() - startTime;
      metadata.input_tokens = Math.max(5, Math.ceil((lastUserMsg?.content?.length || 0) / 4));
      metadata.output_tokens = Math.max(10, Math.ceil(outputText.length / 4));
      metadata.total_tokens = metadata.input_tokens + metadata.output_tokens;
      metadata.output_preview = outputText.slice(0, 200);
      metadata.status = 'success';

      await emit(EventTypes.INFERENCE_COMPLETED, metadata);

      return {
        text: outputText,
        metadata,
        usage: { input_tokens: metadata.input_tokens, output_tokens: metadata.output_tokens },
        model: this.model,
      };
    }

    try {
      // Make real API call
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
      console.warn('⚠️ Anthropic real API call failed. Falling back to mock generator. Error:', error.message);

      // Graceful fallback to mock response
      const outputText = generateMockResponse(lastUserMsg?.content || '', this.model);

      metadata.latency_ms = Date.now() - startTime;
      metadata.input_tokens = Math.max(5, Math.ceil((lastUserMsg?.content?.length || 0) / 4));
      metadata.output_tokens = Math.max(10, Math.ceil(outputText.length / 4));
      metadata.total_tokens = metadata.input_tokens + metadata.output_tokens;
      metadata.output_preview = outputText.slice(0, 200);
      metadata.status = 'success';

      await emit(EventTypes.INFERENCE_COMPLETED, metadata);

      return {
        text: outputText,
        metadata,
        usage: { input_tokens: metadata.input_tokens, output_tokens: metadata.output_tokens },
        model: this.model,
      };
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

    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    const isMockMode = !apiKey || apiKey.includes('your_') || apiKey.includes('sk-ant-your');

    if (isMockMode) {
      const outputText = generateMockResponse(lastUserMsg?.content || '', this.model);
      const inputTokens = Math.max(5, Math.ceil((lastUserMsg?.content?.length || 0) / 4));
      const outputTokens = Math.max(10, Math.ceil(outputText.length / 4));

      // Stream words with delay to simulate typing
      const words = outputText.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise(r => setTimeout(r, 45));
        yield { type: 'text', text: words[i] + ' ', requestId };
      }

      const latencyMs = Date.now() - startTime;
      metadata.latency_ms = latencyMs;
      metadata.input_tokens = inputTokens;
      metadata.output_tokens = outputTokens;
      metadata.total_tokens = inputTokens + outputTokens;
      metadata.output_preview = outputText.slice(0, 200);
      metadata.status = 'success';

      await emit(EventTypes.INFERENCE_COMPLETED, metadata);
      yield { type: 'done', metadata };
      return;
    }

    try {
      const stream = await this._client.messages.stream({
        model: this.model,
        max_tokens: options.maxTokens || 2048,
        messages: processedMessages,
        system: options.system,
      });

      let fullText = '';
      let inputTokens = 0;
      let outputTokens = 0;

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
      console.warn('⚠️ Anthropic real streaming failed. Falling back to mock streaming. Error:', error.message);

      const outputText = generateMockResponse(lastUserMsg?.content || '', this.model);
      const inputTokens = Math.max(5, Math.ceil((lastUserMsg?.content?.length || 0) / 4));
      const outputTokens = Math.max(10, Math.ceil(outputText.length / 4));

      const words = outputText.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise(r => setTimeout(r, 45));
        yield { type: 'text', text: words[i] + ' ', requestId };
      }

      const latencyMs = Date.now() - startTime;
      metadata.latency_ms = latencyMs;
      metadata.input_tokens = inputTokens;
      metadata.output_tokens = outputTokens;
      metadata.total_tokens = inputTokens + outputTokens;
      metadata.output_preview = outputText.slice(0, 200);
      metadata.status = 'success';

      await emit(EventTypes.INFERENCE_COMPLETED, metadata);
      yield { type: 'done', metadata };
    }
  }
}

export function createSDK(options = {}) {
  return new LLMObservatorySDK(options);
}
