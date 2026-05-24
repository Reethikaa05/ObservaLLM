import mongoose from 'mongoose';
import { Conversation, Message, InferenceLog, Event } from './models.js';

let db;

export async function getDb() {
  if (!db) {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/observatory';
    
    try {
      await mongoose.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
      db = mongoose.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }
  return db;
}

export async function migrate() {
  try {
    await getDb();
    
    // Create indexes
    await Conversation.collection.createIndex({ created_at: -1 });
    await Conversation.collection.createIndex({ status: 1 });
    await Message.collection.createIndex({ conversation_id: 1, created_at: -1 });
    await InferenceLog.collection.createIndex({ created_at: -1 });
    await InferenceLog.collection.createIndex({ status: 1 });
    await InferenceLog.collection.createIndex({ provider: 1 });
    await Event.collection.createIndex({ type: 1 });
    await Event.collection.createIndex({ processed: 1 });
    
    console.log('✅ Database migrated successfully');
    return db;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

export { Conversation, Message, InferenceLog, Event };

