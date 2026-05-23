import { useEffect, useRef } from 'react';
import { useStore } from '../stores/store.js';

export function useSSE() {
  const addRecentEvent = useStore(s => s.addRecentEvent);
  const loadConversations = useStore(s => s.loadConversations);
  const esRef = useRef(null);

  useEffect(() => {
    const es = new EventSource('/api/events/stream');
    esRef.current = es;

    es.addEventListener('connected', () => {
      console.log('🔌 SSE connected');
    });

    es.addEventListener('inference.completed', (e) => {
      const data = JSON.parse(e.data);
      addRecentEvent({ type: 'inference.completed', data, ts: Date.now() });
    });

    es.addEventListener('inference.failed', (e) => {
      const data = JSON.parse(e.data);
      addRecentEvent({ type: 'inference.failed', data, ts: Date.now() });
    });

    es.addEventListener('conversation.created', (e) => {
      const data = JSON.parse(e.data);
      addRecentEvent({ type: 'conversation.created', data, ts: Date.now() });
    });

    es.addEventListener('conversation.cancelled', (e) => {
      const data = JSON.parse(e.data);
      addRecentEvent({ type: 'conversation.cancelled', data, ts: Date.now() });
      loadConversations();
    });

    es.addEventListener('log.ingested', (e) => {
      const data = JSON.parse(e.data);
      addRecentEvent({ type: 'log.ingested', data, ts: Date.now() });
    });

    es.onerror = () => {
      console.warn('SSE connection lost, will retry...');
    };

    return () => {
      es.close();
    };
  }, []);
}
