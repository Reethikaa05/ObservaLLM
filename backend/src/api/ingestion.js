import { Router } from 'express';
import { ingestLog, ingestBatch, getAnalytics } from '../services/ingestion.js';
import { getDb } from '../db/migrate.js';
import { addSSEClient } from '../events/bus.js';

const router = Router();

// Single log ingestion
router.post('/ingest', (req, res) => {
  try {
    const log = ingestLog(req.body);
    res.status(201).json({ success: true, log });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Batch ingestion
router.post('/ingest/batch', (req, res) => {
  try {
    const { logs } = req.body;
    if (!Array.isArray(logs)) return res.status(400).json({ error: 'logs must be array' });
    const result = ingestBatch(logs);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Analytics dashboard data
router.get('/analytics', (req, res) => {
  try {
    const { hours = 24, provider, model } = req.query;
    const analytics = getAnalytics({ hours: parseInt(hours), provider, model });
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List inference logs
router.get('/logs', (req, res) => {
  try {
    const db = getDb();
    const { limit = 50, offset = 0, conversation_id, status, provider } = req.query;
    
    let q = 'SELECT * FROM inference_logs WHERE 1=1';
    const params = [];
    
    if (conversation_id) { q += ' AND conversation_id = ?'; params.push(conversation_id); }
    if (status) { q += ' AND status = ?'; params.push(status); }
    if (provider) { q += ' AND provider = ?'; params.push(provider); }
    
    q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const logs = db.prepare(q).all(...params);
    res.json({ logs, total: logs.length });
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
router.get('/events', (req, res) => {
  try {
    const db = getDb();
    const { limit = 50, type } = req.query;
    let q = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    if (type) { q += ' AND type = ?'; params.push(type); }
    q += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    res.json({ events: db.prepare(q).all(...params) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
