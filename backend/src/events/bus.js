import { getDb } from '../db/migrate.js';
import { nanoid } from 'nanoid';

// In-memory event listeners
const listeners = new Map();

export const EventTypes = {
  INFERENCE_COMPLETED: 'inference.completed',
  INFERENCE_FAILED: 'inference.failed',
  INFERENCE_STARTED: 'inference.started',
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_CANCELLED: 'conversation.cancelled',
  CONVERSATION_RESUMED: 'conversation.resumed',
  MESSAGE_CREATED: 'message.created',
  LOG_INGESTED: 'log.ingested',
};

// Subscribe to events
export function on(eventType, handler) {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, []);
  }
  listeners.get(eventType).push(handler);
  return () => off(eventType, handler); // return unsubscribe fn
}

// Unsubscribe
export function off(eventType, handler) {
  const handlers = listeners.get(eventType) || [];
  listeners.set(eventType, handlers.filter(h => h !== handler));
}

// Emit event - stores in DB and notifies listeners
export async function emit(eventType, payload, source = 'system') {
  const event = {
    id: nanoid(),
    type: eventType,
    source,
    payload: JSON.stringify(payload),
    processed: 0,
    created_at: new Date().toISOString()
  };

  // Persist to DB
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO events (id, type, source, payload, processed, created_at)
      VALUES (@id, @type, @source, @payload, @processed, @created_at)
    `).run(event);
  } catch (err) {
    console.error('Event persistence failed:', err.message);
  }

  // Notify in-memory listeners
  const handlers = listeners.get(eventType) || [];
  const wildcardHandlers = listeners.get('*') || [];
  
  for (const handler of [...handlers, ...wildcardHandlers]) {
    try {
      await handler({ type: eventType, payload, source, id: event.id });
    } catch (err) {
      console.error(`Event handler error for ${eventType}:`, err.message);
    }
  }

  return event;
}

// SSE clients for real-time streaming
const sseClients = new Set();

export function addSSEClient(res) {
  sseClients.add(res);
  return () => sseClients.delete(res);
}

// Broadcast to SSE clients
export function broadcastSSE(eventType, data) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Wire up event → SSE bridge
on('*', ({ type, payload }) => {
  broadcastSSE(type, payload);
});

// Override emit to also broadcast SSE
const originalEmit = emit;
