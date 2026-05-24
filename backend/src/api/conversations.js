import { Router } from 'express';
import { createSDK } from '../sdk/llm.js';
import {
  createConversation, getConversation, getMessages,
  addMessage, cancelConversation, resumeConversation,
  listConversations, updateConversationTitle, deleteConversation
} from '../services/conversations.js';
import { ingestLog } from '../services/ingestion.js';

const router = Router();

// List conversations
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;
    const convs = await listConversations({ limit: parseInt(limit), offset: parseInt(offset), status });
    res.json({ conversations: convs, total: convs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create conversation
router.post('/', async (req, res) => {
  try {
    const { title, provider, model } = req.body;
    const conv = await createConversation({ title, provider, model });
    res.status(201).json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get conversation + messages
router.get('/:id', async (req, res) => {
  try {
    const conv = await getConversation(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    const messages = await getMessages(req.params.id);
    res.json({ ...conv, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete conversation
router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteConversation(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel conversation
router.post('/:id/cancel', async (req, res) => {
  try {
    const conv = await cancelConversation(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resume conversation
router.post('/:id/resume', async (req, res) => {
  try {
    const conv = await resumeConversation(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update title
router.patch('/:id', async (req, res) => {
  try {
    const { title } = req.body;
    const conv = await updateConversationTitle(req.params.id, title);
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message (non-streaming)
router.post('/:id/messages', async (req, res) => {
  const conv = await getConversation(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  if (conv.status === 'cancelled') return res.status(400).json({ error: 'Conversation is cancelled' });

  const { content, model } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

  const userMsg = await addMessage({ conversationId: conv.id, role: 'user', content });
  const history = await getMessages(conv.id);
  const messages = history.map(m => ({ role: m.role, content: m.content }));
  const sdk = createSDK({ provider: conv.provider, model: model || conv.model });

  try {
    const result = await sdk.chat(messages, { conversationId: conv.id });
    const assistantMsg = await addMessage({ conversationId: conv.id, role: 'assistant', content: result.text });
    await ingestLog({ ...result.metadata, message_id: assistantMsg.id });

    if (history.length <= 2) {
      const title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
      await updateConversationTitle(conv.id, title);
    }

    res.json({ message: assistantMsg, usage: result.usage, latency_ms: result.metadata.latency_ms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Streaming message endpoint
router.post('/:id/messages/stream', async (req, res) => {
  const conv = await getConversation(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  if (conv.status === 'cancelled') return res.status(400).json({ error: 'Conversation is cancelled' });

  const { content, model } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const userMsg = await addMessage({ conversationId: conv.id, role: 'user', content });
  res.write(`event: user_message\ndata: ${JSON.stringify(userMsg)}\n\n`);

  const history = await getMessages(conv.id);
  const messages = history.map(m => ({ role: m.role, content: m.content }));
  const sdk = createSDK({ provider: conv.provider, model: model || conv.model });

  let fullText = '';
  let finalMetadata = null;

  for await (const chunk of sdk.chatStream(messages, { conversationId: conv.id })) {
    if (chunk.type === 'text') {
      fullText += chunk.text;
      res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
    } else if (chunk.type === 'done') {
      finalMetadata = chunk.metadata;
    } else if (chunk.type === 'error') {
      res.write(`event: error\ndata: ${JSON.stringify({ error: chunk.error })}\n\n`);
      res.end();
      return;
    }
  }

  const assistantMsg = await addMessage({ conversationId: conv.id, role: 'assistant', content: fullText });

  if (finalMetadata) {
    await ingestLog({ ...finalMetadata, message_id: assistantMsg.id });
  }

  if (history.length <= 2) {
    const title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
    await updateConversationTitle(conv.id, title);
  }

  res.write(`event: done\ndata: ${JSON.stringify({ message: assistantMsg, metadata: finalMetadata })}\n\n`);
  res.end();
});

export default router;
