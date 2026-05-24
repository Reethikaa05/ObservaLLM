import mongoose from 'mongoose';

// Conversation Schema
const conversationSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('crypto').randomUUID() },
  title: String,
  provider: { type: String, default: 'anthropic' },
  model: String,
  status: { 
    type: String, 
    enum: ['active', 'cancelled', 'completed'], 
    default: 'active' 
  },
  message_count: { type: Number, default: 0 },
  total_input_tokens: { type: Number, default: 0 },
  total_output_tokens: { type: Number, default: 0 },
  total_latency_ms: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  cancelled_at: Date,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

// Message Schema
const messageSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('crypto').randomUUID() },
  conversation_id: { type: String, required: true, index: true },
  role: { 
    type: String, 
    enum: ['user', 'assistant', 'system'], 
    required: true 
  },
  content: String,
  content_preview: String,
  created_at: { type: Date, default: Date.now }
}, { _id: false });

// Inference Log Schema
const inferenceLogSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('crypto').randomUUID() },
  conversation_id: { type: String, index: true },
  message_id: String,
  provider: String,
  model: String,
  request_id: String,
  status: { 
    type: String, 
    enum: ['success', 'error', 'cancelled', 'timeout'],
    index: true
  },
  latency_ms: Number,
  input_tokens: Number,
  output_tokens: Number,
  total_tokens: Number,
  input_preview: String,
  output_preview: String,
  error_message: String,
  error_code: String,
  stream: { type: Boolean, default: false },
  pii_redacted: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now, index: true },
  raw_payload: String
}, { _id: false });

// Event Schema
const eventSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('crypto').randomUUID() },
  type: { type: String, index: true },
  source: { type: String, default: 'sdk' },
  payload: mongoose.Schema.Types.Mixed,
  processed: { type: Boolean, default: false, index: true },
  created_at: { type: Date, default: Date.now }
}, { _id: false });

export const Conversation = mongoose.model('Conversation', conversationSchema);
export const Message = mongoose.model('Message', messageSchema);
export const InferenceLog = mongoose.model('InferenceLog', inferenceLogSchema);
export const Event = mongoose.model('Event', eventSchema);
