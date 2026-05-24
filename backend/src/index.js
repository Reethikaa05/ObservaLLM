import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { migrate } from './db/migrate.js';
import { on, EventTypes, broadcastSSE } from './events/bus.js';
import conversationsRouter from './api/conversations.js';
import ingestionRouter from './api/ingestion.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security & middleware
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// API routes
app.use('/api/conversations', conversationsRouter);
app.use('/api', ingestionRouter);

// Wire up event bus → SSE broadcasting
on(EventTypes.INFERENCE_COMPLETED, (event) => {
  broadcastSSE('inference.completed', event.payload);
});
on(EventTypes.INFERENCE_FAILED, (event) => {
  broadcastSSE('inference.failed', event.payload);
});
on(EventTypes.CONVERSATION_CREATED, (event) => {
  broadcastSSE('conversation.created', event.payload);
});
on(EventTypes.CONVERSATION_CANCELLED, (event) => {
  broadcastSSE('conversation.cancelled', event.payload);
});
on(EventTypes.LOG_INGESTED, (event) => {
  broadcastSSE('log.ingested', event.payload);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Initialize DB (async) then start server
migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🔭 LLM Observatory Backend`);
      console.log(`   → http://localhost:${PORT}`);
      console.log(`   → Health: http://localhost:${PORT}/health`);
      console.log(`   → API:    http://localhost:${PORT}/api\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  });

export default app;
