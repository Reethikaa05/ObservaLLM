import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config();

let db;

export function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) throw new Error('TURSO_DATABASE_URL is not set');

    db = createClient({ url, authToken });
  }
  return db;
}

export async function migrate() {
  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      provider TEXT NOT NULL DEFAULT 'anthropic',
      model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      message_count INTEGER DEFAULT 0,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      total_latency_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      cancelled_at TEXT,
      metadata TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      content_preview TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inference_logs (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      message_id TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      request_id TEXT,
      status TEXT NOT NULL,
      latency_ms INTEGER,
      input_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      input_preview TEXT,
      output_preview TEXT,
      error_message TEXT,
      error_code TEXT,
      stream INTEGER DEFAULT 0,
      pii_redacted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      raw_payload TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'sdk',
      payload TEXT NOT NULL,
      processed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  console.log('✅ Turso database migrated successfully');
  return db;
}
