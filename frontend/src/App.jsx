import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.jsx';
import { ChatPage } from './pages/ChatPage.jsx';
import { ConversationsPage } from './pages/ConversationsPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LogsPage } from './pages/LogsPage.jsx';
import { EventsPage } from './pages/EventsPage.jsx';
import { useStore } from './stores/store.js';
import { useSSE } from './hooks/useSSE.js';
import { clsx } from 'clsx';

function AppInner() {
  const { sidebarOpen, loadConversations } = useStore();
  useSSE();

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <div className="flex h-screen bg-obsidian-950 text-white overflow-hidden">
      <Sidebar />
      <main className={clsx(
        'flex-1 min-w-0 transition-all duration-300 overflow-hidden',
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      )}>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/events" element={<EventsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
