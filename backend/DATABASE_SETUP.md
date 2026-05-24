# LLM Observatory - Database Setup Guide

## Quick Start

### 1. **Automatic Setup (Recommended)**
Run this single command to migrate and seed your database:
```bash
cd backend
npm run setup
```

This will:
- Create the SQLite database at `backend/data/observatory.db`
- Create all tables with proper schema
- Seed it with realistic sample data

### 2. **Manual Setup**
If you prefer to run steps separately:

```bash
# Migrate (create tables)
npm run migrate

# Seed (populate with sample data)
npm run seed
```

### 3. **Development**
```bash
# Start backend with auto-migration (happens on every startup)
npm run dev
```

The database automatically triggers migrations on startup, so you just need to seed once.

---

## Database Structure

### Tables

#### **conversations**
- Stores LLM conversation sessions
- Fields: `id`, `title`, `provider`, `model`, `status`, `message_count`, token usage, latency, timestamps, metadata

#### **messages**
- Stores individual messages in conversations
- Links to `conversations` via `conversation_id`
- Fields: `id`, `role` (user/assistant/system), `content`, `content_preview`, `created_at`

#### **inference_logs**
- Core SDK output and API call tracking
- Records every LLM API request/response
- Fields: provider, model, status, latency, token counts, error details, request_id

#### **events**
- Event-based architecture storage
- Types: `conversation.created`, `inference.completed`, `inference.failed`, `log.ingested`
- Fields: `type`, `payload`, `processed` flag

---

## Sample Data Included

The seed script creates:
- **4 conversations**: Various models (Sonnet, Haiku, Opus) with different statuses
- **6 messages**: Real-world Q&A examples
- **5 inference logs**: Success and error scenarios
- **4 events**: Example event paybook

---

## Location of Database File

```
llm-observatory/
├── backend/
│   ├── data/
│   │   └── observatory.db  ← SQLite database file
│   └── src/
```

The database uses WAL (Write-Ahead Logging) mode for better concurrency.

---

## Queries to Try

### Get All Conversations
```sql
SELECT * FROM conversations;
```

### Get Messages in a Conversation
```sql
SELECT * FROM messages WHERE conversation_id = 'conv-id' ORDER BY created_at;
```

### Get API Performance Metrics
```sql
SELECT 
  model, 
  COUNT(*) as calls,
  AVG(latency_ms) as avg_latency,
  SUM(input_tokens + output_tokens) as total_tokens,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
FROM inference_logs
GROUP BY model;
```

### Get Active vs Completed Conversations
```sql
SELECT status, COUNT(*) as count FROM conversations GROUP BY status;
```

---

## Integration Points

The sample data shows:
- **Anthropic API** calls with real model names
- **Token usage tracking** (input/output counts)
- **Latency measurement** in milliseconds
- **Error scenarios** (rate limits, cancellations)
- **Event-driven architecture** with async processing

---

## Resetting the Database

To start fresh:
```bash
# Delete the database
rm backend/data/observatory.db

# Run setup again
npm run setup
```

---

## Environment Variables

You can override the database path:
```bash
# In .env file
DB_PATH=/custom/path/observatory.db
```

Default: `backend/data/observatory.db`

---

## What's Next?

1. ✅ Database is now set up and seeded
2. Start the backend: `npm run dev`
3. Start the frontend: `cd frontend && npm run dev`
4. View live data in the UI
5. Make API calls and watch them populate the database

---

## Troubleshooting

### Database is locked
- Check if multiple processes are accessing it
- Restart the backend server

### Permission denied
- Ensure `backend/data/` folder is writable
- Run with appropriate permissions

### Need to seed again?
```bash
npm run seed
# Note: It will skip if data already exists
# Delete observatory.db first if you want to re-seed
```
