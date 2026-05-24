// Use /_/backend/api on Vercel, /api in development
const BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/_/backend/api'
  : '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Conversations
  listConversations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/conversations${qs ? '?' + qs : ''}`);
  },
  createConversation: (body) => req('/conversations', { method: 'POST', body }),
  getConversation: (id) => req(`/conversations/${id}`),
  cancelConversation: (id) => req(`/conversations/${id}/cancel`, { method: 'POST' }),
  resumeConversation: (id) => req(`/conversations/${id}/resume`, { method: 'POST' }),
  updateTitle: (id, title) => req(`/conversations/${id}`, { method: 'PATCH', body: { title } }),
  deleteConversation: (id) => req(`/conversations/${id}`, { method: 'DELETE' }),

  // Messages
  sendMessage: (convId, content, model) =>
    req(`/conversations/${convId}/messages`, { method: 'POST', body: { content, model } }),

  // Analytics
  getAnalytics: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/analytics${qs ? '?' + qs : ''}`);
  },

  // Logs
  getLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/logs${qs ? '?' + qs : ''}`);
  },
  deleteLog: (id) => req(`/logs/${id}`, { method: 'DELETE' }),

  // Events
  getEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/events${qs ? '?' + qs : ''}`);
  },
  deleteEvent: (id) => req(`/events/${id}`, { method: 'DELETE' }),

  // Streaming message
  streamMessage: (convId, content, { onChunk, onDone, onError, onUserMessage } = {}) => {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(`${BASE}/conversations/${convId}/messages/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          let eventType = null;
          let dataLine = null;

          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            if (line.startsWith('data: ')) dataLine = line.slice(6).trim();
            if (line === '' && eventType && dataLine) {
              try {
                const data = JSON.parse(dataLine);
                if (eventType === 'chunk') onChunk?.(data.text);
                if (eventType === 'user_message') onUserMessage?.(data);
                if (eventType === 'done') { onDone?.(data); resolve(data); }
                if (eventType === 'error') { onError?.(data.error); reject(new Error(data.error)); }
              } catch {}
              eventType = null;
              dataLine = null;
            }
          }
        }
      } catch (err) {
        onError?.(err.message);
        reject(err);
      }
    });
  },
};
