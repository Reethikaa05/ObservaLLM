import { getDb } from '../db/migrate.js';
import { nanoid } from 'nanoid';
import { emit, EventTypes } from '../events/bus.js';

export function createConversation({ title, provider = 'anthropic', model = 'claude-sonnet-4-20250514', metadata = {} }) {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO conversations (id, title, provider, model, status, created_at, updated_at, metadata)
    VALUES (@id, @title, @provider, @model, 'active', @now, @now, @metadata)
  `).run({ id, title: title || `Chat ${now.slice(0, 10)}`, provider, model, now, metadata: JSON.stringify(metadata) });

  const conv = getConversation(id);
  emit(EventTypes.CONVERSATION_CREATED, conv);
  return conv;
}

export function getConversation(id) {
  const db = getDb();
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  if (!conv) return null;
  conv.metadata = JSON.parse(conv.metadata || '{}');
  return conv;
}

export function listConversations({ limit = 20, offset = 0, status } = {}) {
  const db = getDb();
  let q = 'SELECT * FROM conversations';
  const params = [];
  if (status) { q += ' WHERE status = ?'; params.push(status); }
  q += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const rows = db.prepare(q).all(...params);
  return rows.map(r => ({ ...r, metadata: JSON.parse(r.metadata || '{}') }));
}

export function cancelConversation(id) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE conversations SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?
  `).run(now, now, id);
  const conv = getConversation(id);
  emit(EventTypes.CONVERSATION_CANCELLED, conv);
  return conv;
}

export function resumeConversation(id) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE conversations SET status = 'active', cancelled_at = NULL, updated_at = ? WHERE id = ?
  `).run(now, id);
  const conv = getConversation(id);
  emit(EventTypes.CONVERSATION_RESUMED, conv);
  return conv;
}

export function addMessage({ conversationId, role, content }) {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();
  const preview = content.slice(0, 200);

  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, content_preview, created_at)
    VALUES (@id, @conversationId, @role, @content, @preview, @now)
  `).run({ id, conversationId, role, content, preview, now });

  db.prepare(`
    UPDATE conversations SET 
      message_count = message_count + 1, 
      updated_at = @now
      ${role === 'assistant' ? ', title = CASE WHEN title LIKE "Chat%" THEN title ELSE title END' : ''}
    WHERE id = @conversationId
  `).run({ now, conversationId });

  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  emit(EventTypes.MESSAGE_CREATED, msg);
  return msg;
}

export function getMessages(conversationId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
  `).all(conversationId);
}

export function updateConversationTitle(id, title) {
  const db = getDb();
  db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?')
    .run(title, new Date().toISOString(), id);
  return getConversation(id);
}
