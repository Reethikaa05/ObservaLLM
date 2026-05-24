import { Router } from 'express';
import { ingestLog, ingestBatch, getAnalytics, deleteLog, deleteEvent } from '../services/ingestion.js';
import { getDb } from '../db/migrate.js';
import { addSSEClient } from '../events/bus.js';

const router = Router();

// Single log ingestion
router.post('/ingest', async (req, res) => {
  try {
    const log = await ingestLog(req.body);
    res.status(201).json({ success: true, log });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Batch ingestion
router.post('/ingest/batch', async (req, res) => {
  try {
    const { logs } = req.body;
    if (!Array.isArray(logs)) return res.status(400).json({ error: 'logs must be array' });
    const result = await ingestBatch(logs);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Analytics dashboard data
router.get('/analytics', async (req, res) => {
  try {
    const { hours = 24, provider, model } = req.query;
    const analytics = await getAnalytics({ hours: parseInt(hours), provider, model });
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List inference logs
router.get('/logs', async (req, res) => {
  try {
    const db = getDb();
    const { limit = 50, offset = 0, conversation_id, status, provider } = req.query;

    let sql = 'SELECT * FROM inference_logs WHERE 1=1';
    const args = [];

    if (conversation_id) { sql += ' AND conversation_id = ?'; args.push(conversation_id); }
    if (status) { sql += ' AND status = ?'; args.push(status); }
    if (provider) { sql += ' AND provider = ?'; args.push(provider); }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(parseInt(limit), parseInt(offset));

    const result = await db.execute({ sql, args });
    res.json({ logs: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single log
router.delete('/logs/:id', async (req, res) => {
  try {
    const result = await deleteLog(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE stream for real-time events
router.get('/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('event: connected\ndata: {"status":"connected"}\n\n');

  const unsubscribe = addSSEClient(res);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// Events list
router.get('/events', async (req, res) => {
  try {
    const db = getDb();
    const { limit = 50, type } = req.query;

    let sql = 'SELECT * FROM events WHERE 1=1';
    const args = [];

    if (type) { sql += ' AND type = ?'; args.push(type); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    args.push(parseInt(limit));

    const result = await db.execute({ sql, args });
    res.json({ events: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single event
router.delete('/events/:id', async (req, res) => {
  try {
    const result = await deleteEvent(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
