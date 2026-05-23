import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../data/observatory.db');

// Ensure data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

export function migrate() {
  const db = getDb();

  db.exec(`
    -- Conversations table
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      provider TEXT NOT NULL DEFAULT 'anthropic',
      model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'completed')),
      message_count INTEGER DEFAULT 0,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      total_latency_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      cancelled_at TEXT,
      metadata TEXT DEFAULT '{}'
    );

    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      content_preview TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    -- Inference logs table (core SDK output)
    CREATE TABLE IF NOT EXISTS inference_logs (
      id TEXT PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
      message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      request_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('success', 'error', 'cancelled', 'timeout')),
      latency_ms INTEGER,
      input_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      input_preview TEXT,
      output_preview TEXT,
      error_message TEXT,
      error_code TEXT,
      stream BOOLEAN DEFAULT 0,
      pii_redacted BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      raw_payload TEXT
    );

    -- Events table (for event-based architecture)
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'sdk',
      payload TEXT NOT NULL,
      processed BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_logs_conv ON inference_logs(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_logs_created ON inference_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_provider ON inference_logs(provider);
    CREATE INDEX IF NOT EXISTS idx_logs_status ON inference_logs(status);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_processed ON events(processed);
    CREATE INDEX IF NOT EXISTS idx_convs_status ON conversations(status);
    CREATE INDEX IF NOT EXISTS idx_convs_created ON conversations(created_at);
  `);

  console.log('✅ Database migrated successfully');
  return db;
}
