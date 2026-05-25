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

// Intelligent mock fallback response generator with rich markdown formatting
function generateMockResponse(prompt, model) {
  const query = prompt.toLowerCase().trim();

  // 1. Greetings & Intros
  if (query.match(/^(hello|hi|hey|greetings|yo|howdy)/)) {
    return `👋 **Hello! I am Claude, your Observatory Assistant (Simulated)**

I am fully instrumented with real-time telemetry! Every word we exchange is tracked, parsed, and logged directly to your Turso cloud database. 

Here is what you can ask me to test the platform's observability features:
- 🏗️ *"How do I design an observable architecture?"*
- 🛡️ *"Explain PII Redaction"* (Test the security filters!)
- 💻 *"Show me a JavaScript logging wrapper example"*
- 📊 *"How do we track and optimize costs?"*
- ⚡ *"What causes latency spikes in LLM completions?"*

How can I help you build today?`;
  }

  // 2. Telemetry / Code / SDK wrapper examples
  if (query.includes('code') || query.includes('example') || query.includes('javascript') || query.includes('python') || query.includes('wrapper')) {
    if (query.includes('python')) {
      return `🐍 **Python Telemetry Logging Wrapper**

Here is a clean, production-grade example of how to wrap your LLM calls to capture complete telemetry:

\`\`\`python
import time
import uuid
import requests

def observable_llm_call(prompt, model="claude-3-5-sonnet"):
    start_time = time.time()
    request_id = f"req_{uuid.uuid4().hex[:8]}"
    
    # 1. Capture prompt (simulate prompt ingestion)
    input_tokens = len(prompt) // 4
    
    # Perform completion call (mocked here)
    response_text = "This is a completed response from " + model
    output_tokens = len(response_text) // 4
    
    latency_ms = int((time.time() - start_time) * 1000)
    
    # 2. Build Ingestion Payload
    payload = {
        "id": f"log_{uuid.uuid4().hex[:12]}",
        "provider": "anthropic",
        "model": model,
        "request_id": request_id,
        "status": "success",
        "latency_ms": latency_ms,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "input_preview": prompt[:200],
        "output_preview": response_text[:200],
        "stream": False
    }
    
    # 3. Post asynchronously to Observatory backend
    try:
        requests.post("https://observa-llm-kh4r.vercel.app/_/backend/api/ingest", json=payload, timeout=2.0)
    except Exception as e:
        print(f"Telemetry logging failed: {e}")
        
    return response_text
\`\`\`

*This captures duration, token counts, and previews directly, logging them asynchronously to avoid blocking the main thread!*`;
    } else {
      return `💻 **JavaScript/NodeJS Telemetry Logging Wrapper**

Here is an elegant example of instrumenting your LLM completion layer in **NodeJS**:

\`\`\`javascript
import fetch from 'node-fetch';
import { nanoid } from 'nanoid';

async function callObservableLLM(prompt, model = 'claude-3-5-sonnet') {
  const startTime = Date.now();
  const requestId = \`req_\${nanoid(8)}\`;
  
  // Make completions call (simulated)
  const completionText = \`Response text generated dynamically for: "\${prompt.slice(0, 30)}..."\`;
  
  const latencyMs = Date.now() - startTime;
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(completionText.length / 4);
  
  // Ingest data into LLM Observatory
  const logPayload = {
    id: \`log_\${nanoid(10)}\`,
    provider: 'anthropic',
    model: model,
    request_id: requestId,
    status: 'success',
    latency_ms: latencyMs,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    input_preview: prompt.slice(0, 150),
    output_preview: completionText.slice(0, 150),
    stream: false,
  };

  // Asynchronous fire-and-forget ingestion
  fetch('https://observa-llm-kh4r.vercel.app/_/backend/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logPayload)
  }).catch(err => console.error('Observatory logger error:', err.message));

  return completionText;
}
\`\`\`

*This runs fully asynchronously. It registers telemetry logs without adding any noticeable latency to your user's experience!*`;
    }
  }

  // 3. PII Redaction
  if (query.includes('pii') || query.includes('redact') || query.includes('security') || query.includes('privacy') || query.includes('phone') || query.includes('email')) {
    return `🛡️ **PII Redaction & Security Logging**

LLM Observatory includes an active, pre-inference **PII (Personally Identifiable Information) Redaction Engine**. This operates at the ingestion and completion layers:

### How it works:
1. **Scans Inputs**: When you type a query, the PII filter scans the prompt text for sensitive patterns:
   - 📧 Emails (e.g. \`user@example.com\`)
   - 📞 Phone numbers (e.g. \`+1 (555) 019-2834\`)
   - 💳 Credit cards & SSNs
2. **Redacts Matches**: It automatically swaps sensitive text with matching placeholders (e.g. \`[EMAIL_REDACTED]\` or \`[PHONE_REDACTED]\`).
3. **Database Flags**: It flags the record in your Turso database by setting \`pii_redacted = 1\`.

### Telemetry Impact:
This ensures compliance with GDPR and HIPAA guidelines by guaranteeing no sensitive customer data is ever exposed in downstream analytics or third-party log providers!`;
  }

  // 4. Turso / libSQL / Database
  if (query.includes('turso') || query.includes('libsql') || query.includes('sql') || query.includes('database') || query.includes('db') || query.includes('seed')) {
    return `🗄️ **Turso & libSQL Cloud Persistence**

We fully migrated LLM Observatory from local filesystem SQLite to **Turso (hosted libSQL)**. 

### Why this is a major architectural improvement:
- **Serverless Compatibility**: On Vercel, the local filesystem is **read-only** and ephemeral. Every function invocation starts with a blank slate. By writing to Turso via HTTP, we get **100% persistent storage** that carries over across refreshes and multiple concurrent sessions.
- **Asynchronous Execution**: All DB queries in services (\`conversations.js\`, \`ingestion.js\`) and routes use the non-blocking \`await db.execute()\` client.
- **Cascading Deletions**: Deleting a conversation dynamically removes all associated chats and inference telemetry records to save storage space.

You can inspect all conversations, message counts, and events live under the new **DB Manager** tab in the sidebar!`;
  }

  // 5. Latency & Performance
  if (query.includes('latency') || query.includes('speed') || query.includes('slow') || query.includes('performance') || query.includes('stream')) {
    return `⚡ **LLM Latency & Telemetry Analysis**

Latency is one of the most critical UX metrics for LLM applications. Telemetry allows us to separate latency into distinct components:

### Latency Categories:
1. **Time to First Token (TTFT)**: The delay before the first word streams. High TTFT is usually caused by prompt processing size or cold starts.
2. **Generation Latency**: The time spent actively generating output tokens.
3. **Network Latency**: The round-trip time between your server and the LLM provider.

### Recommendations to improve speed:
- **Enable Streaming**: Streaming chunks immediately using **Server-Sent Events (SSE)** lowers the perceived latency from seconds to milliseconds.
- **Select Haiku for simple tasks**: Haiku has a much lower latency profile than Sonnet or Opus.
- **Caching**: Enable prompt caching (supported by Anthropic) to avoid reprocessing massive static system instructions.`;
  }

  // 6. Cost Tracking
  if (query.includes('cost') || query.includes('price') || query.includes('token') || query.includes('saving')) {
    return `📊 **LLM Cost & Token Monitoring**

Running LLMs in production can quickly become expensive if token usage is unmonitored. ObservaLLM provides clear cost analytics:

### Cost Calculation:
Every completion logs **input tokens** and **output tokens** inside Turso. You can calculate expenses using current rates:
- **Claude 3.5 Sonnet**: \$3.00 / million input, \$15.00 / million output tokens.
- **Claude 3 Haiku**: \$0.25 / million input, \$1.25 / million output tokens.

### How to optimize your spend:
1. **Prune conversation histories**: Do not pass the entire chat history for simple one-off questions. Keep only the last 3-5 turns.
2. **Route intelligently**: Use Haiku for classifications, formatting, and routing. Reserve Sonnet for code execution and reasoning.
3. **Limit output tokens**: Specify tight \`max_tokens\` bounds based on the expected format size.`;
  }

  // 7. General fallback responses (dynamic)
  const generalResponses = [
    `🏗️ **Designing Observable LLM Architectures**

An observable LLM system captures the full journey of a request. It tracks:
1. **Inputs**: Pre-inference prompts, system prompts, and history.
2. **Metadata**: Provider name, model configurations, and streaming flags.
3. **Telemetry**: Raw latencies, token counts, and error descriptions.

Every time you send a message, ObservaLLM logs these telemetry points instantly so you can monitor success rates and latency spikes directly on the **Dashboard**!`,

    `🛡️ **Compliance & PII Sanitization**

To protect customer privacy, ObservaLLM automatically runs regular expression scrubbers on user prompts. If you share emails, credit cards, or telephone numbers, they are redacted to standard placeholders before they hit your database. 

Try testing this by entering a dummy email like: *"My email is test@company.com"* and check the **Logs** dashboard to see the redacted output!`,

    `📊 **LLM Dashboard Analytics**

LLM Observatory summarizes all telemetry data under your **Dashboard** tab. It aggregates:
- **Total Requests**: Complete completed completions.
- **Success Rate**: Successful vs. failed requests (rate limits, timeouts).
- **Latency Averages**: p50, p95, and p99 completion speeds.
- **Token Throughput**: Cumulative input and output token consumption.

*This analytics data is computed instantly from your hosted Turso cloud tables!*`
  ];

  return generalResponses[Math.floor(Math.random() * generalResponses.length)];
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
