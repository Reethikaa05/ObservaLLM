import { create } from 'zustand';
import { api } from '../lib/api.js';

export const useStore = create((set, get) => ({
  // Conversations
  conversations: [],
  activeConvId: null,
  activeConv: null,
  messages: [],
  loadingConvs: false,
  loadingMessages: false,
  streaming: false,
  streamingText: '',

  // Analytics
  analytics: null,
  loadingAnalytics: false,

  // Logs
  logs: [],
  loadingLogs: false,

  // Events (real-time)
  recentEvents: [],

  // Sidebar
  sidebarOpen: true,

  // Actions
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  loadConversations: async (params) => {
    set({ loadingConvs: true });
    try {
      const data = await api.listConversations(params);
      set({ conversations: data.conversations });
    } catch (err) {
      console.error(err);
    } finally {
      set({ loadingConvs: false });
    }
  },

  selectConversation: async (id) => {
    set({ activeConvId: id, loadingMessages: true, messages: [], streamingText: '' });
    try {
      const data = await api.getConversation(id);
      set({ activeConv: data, messages: data.messages || [] });
    } catch (err) {
      console.error(err);
    } finally {
      set({ loadingMessages: false });
    }
  },

  createConversation: async (opts = {}) => {
    const conv = await api.createConversation(opts);
    set(s => ({ conversations: [conv, ...s.conversations], activeConvId: conv.id, activeConv: conv, messages: [] }));
    return conv;
  },

  cancelConversation: async (id) => {
    const updated = await api.cancelConversation(id);
    set(s => ({
      conversations: s.conversations.map(c => c.id === id ? updated : c),
      activeConv: s.activeConvId === id ? updated : s.activeConv,
    }));
  },

  resumeConversation: async (id) => {
    const updated = await api.resumeConversation(id);
    set(s => ({
      conversations: s.conversations.map(c => c.id === id ? updated : c),
      activeConv: s.activeConvId === id ? updated : s.activeConv,
    }));
  },

  sendMessage: async (content) => {
    const { activeConvId } = get();
    if (!activeConvId) return;

    const tempUserMsg = { id: 'temp-user', role: 'user', content, created_at: new Date().toISOString() };
    set(s => ({ messages: [...s.messages, tempUserMsg], streaming: true, streamingText: '' }));

    let finalMessages = null;

    try {
      await api.streamMessage(activeConvId, content, {
        onUserMessage: (msg) => {
          set(s => ({
            messages: s.messages.map(m => m.id === 'temp-user' ? msg : m)
          }));
        },
        onChunk: (text) => {
          set(s => ({ streamingText: s.streamingText + text }));
        },
        onDone: (data) => {
          const assistantMsg = data.message;
          set(s => ({
            messages: [...s.messages, assistantMsg],
            streamingText: '',
            streaming: false,
          }));
          // Update conversation
          get().loadConversations();
        },
        onError: (err) => {
          console.error('Stream error:', err);
          set({ streaming: false, streamingText: '' });
        }
      });
    } catch (err) {
      console.error(err);
      set({ streaming: false, streamingText: '' });
    }
  },

  loadAnalytics: async (params = {}) => {
    set({ loadingAnalytics: true });
    try {
      const data = await api.getAnalytics(params);
      set({ analytics: data });
    } catch (err) {
      console.error(err);
    } finally {
      set({ loadingAnalytics: false });
    }
  },

  loadLogs: async (params = {}) => {
    set({ loadingLogs: true });
    try {
      const data = await api.getLogs(params);
      set({ logs: data.logs });
    } catch (err) {
      console.error(err);
    } finally {
      set({ loadingLogs: false });
    }
  },

  addRecentEvent: (event) => {
    set(s => ({ recentEvents: [event, ...s.recentEvents].slice(0, 50) }));
  },
}));
