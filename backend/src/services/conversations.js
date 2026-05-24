import { getDb } from '../db/migrate.js';
import { nanoid } from 'nanoid';
import { emit, EventTypes } from '../events/bus.js';

export async function createConversation({ title, provider = 'anthropic', model = 'claude-sonnet-4-20250514', metadata = {} }) {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO conversations (id, title, provider, model, status, created_at, updated_at, metadata)
          VALUES (:id, :title, :provider, :model, 'active', :now, :now, :metadata)`,
    args: {
      id,
      title: title || `Chat ${now.slice(0, 10)}`,
      provider,
      model,
      now,
      metadata: JSON.stringify(metadata)
    }
  });

  const conv = await getConversation(id);
  await emit(EventTypes.CONVERSATION_CREATED, conv);
  return conv;
}

export async function getConversation(id) {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM conversations WHERE id = ?',
    args: [id]
  });
  const conv = result.rows[0];
  if (!conv) return null;
  return { ...conv, metadata: JSON.parse(conv.metadata || '{}') };
}

export async function listConversations({ limit = 20, offset = 0, status } = {}) {
  const db = getDb();

  let sql = 'SELECT * FROM conversations';
  const args = [];

  if (status) {
    sql += ' WHERE status = ?';
    args.push(status);
  }

  sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);

  const result = await db.execute({ sql, args });
  return result.rows.map(r => ({ ...r, metadata: JSON.parse(r.metadata || '{}') }));
}

export async function cancelConversation(id) {
  const db = getDb();
  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE conversations SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?`,
    args: [now, now, id]
  });
  const conv = await getConversation(id);
  await emit(EventTypes.CONVERSATION_CANCELLED, conv);
  return conv;
}

export async function resumeConversation(id) {
  const db = getDb();
  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE conversations SET status = 'active', cancelled_at = NULL, updated_at = ? WHERE id = ?`,
    args: [now, id]
  });
  const conv = await getConversation(id);
  await emit(EventTypes.CONVERSATION_RESUMED, conv);
  return conv;
}

export async function deleteConversation(id) {
  const db = getDb();
  // Delete messages first, then conversation
  await db.execute({ sql: 'DELETE FROM messages WHERE conversation_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM inference_logs WHERE conversation_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM conversations WHERE id = ?', args: [id] });
  return { id, deleted: true };
}

export async function addMessage({ conversationId, role, content }) {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();
  const preview = content.slice(0, 200);

  await db.execute({
    sql: `INSERT INTO messages (id, conversation_id, role, content, content_preview, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, conversationId, role, content, preview, now]
  });

  await db.execute({
    sql: `UPDATE conversations SET message_count = message_count + 1, updated_at = ? WHERE id = ?`,
    args: [now, conversationId]
  });

  const msgResult = await db.execute({
    sql: 'SELECT * FROM messages WHERE id = ?',
    args: [id]
  });
  const msg = msgResult.rows[0];
  await emit(EventTypes.MESSAGE_CREATED, msg);
  return msg;
}

export async function getMessages(conversationId) {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    args: [conversationId]
  });
  return result.rows;
}

export async function updateConversationTitle(id, title) {
  const db = getDb();
  await db.execute({
    sql: 'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?',
    args: [title, new Date().toISOString(), id]
  });
  return getConversation(id);
}
