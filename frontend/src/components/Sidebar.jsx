import { useStore } from '../stores/store.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MessageSquare, BarChart3, List, Zap, Plus, 
  X, ChevronRight, Radio, Settings, Database
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const navItems = [
  { path: '/', icon: MessageSquare, label: 'Chat' },
  { path: '/conversations', icon: List, label: 'Conversations' },
  { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { path: '/logs', icon: Database, label: 'Logs' },
  { path: '/events', icon: Zap, label: 'Events' },
  { path: '/database', icon: Settings, label: 'DB Manager' },
];


export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    conversations, activeConvId, sidebarOpen, setSidebarOpen,
    createConversation, selectConversation, recentEvents
  } = useStore();

  const liveCount = recentEvents.filter(e => Date.now() - e.ts < 5000).length;

  const handleNew = async () => {
    const conv = await createConversation();
    navigate('/');
  };

  const handleSelect = async (id) => {
    await selectConversation(id);
    navigate('/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={clsx(
        'fixed left-0 top-0 h-full z-30 flex flex-col transition-all duration-300',
        'bg-obsidian-900 border-r border-obsidian-700',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden lg:w-16'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-obsidian-700">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
              <Radio size={16} className="text-black" />
            </div>
            {liveCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-neon-green rounded-full animate-pulse" />
            )}
          </div>
          {sidebarOpen && (
            <div>
              <div className="font-display font-700 text-white text-sm leading-tight">LLM Observatory</div>
              <div className="text-obsidian-600 text-xs font-mono">v1.0.0</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="px-2 py-3 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                location.pathname === path
                  ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                  : 'text-gray-400 hover:text-white hover:bg-obsidian-800'
              )}
            >
              <Icon size={16} className="flex-shrink-0" />
              {sidebarOpen && <span className="font-sans">{label}</span>}
              {path === '/events' && liveCount > 0 && sidebarOpen && (
                <span className="ml-auto text-xs bg-neon-green/20 text-neon-green px-1.5 py-0.5 rounded-full font-mono">
                  {liveCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* New Chat button */}
        {sidebarOpen && (
          <div className="px-3 py-2">
            <button
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-neon-cyan/30 text-neon-cyan/70 hover:text-neon-cyan hover:border-neon-cyan/60 hover:bg-neon-cyan/5 transition-all text-sm font-sans"
            >
              <Plus size={14} />
              New Chat
            </button>
          </div>
        )}

        {/* Conversation list */}
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            <div className="px-2 py-1 text-xs text-gray-500 font-mono uppercase tracking-widest">
              Recent
            </div>
            {conversations.slice(0, 20).map(conv => (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={clsx(
                  'w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group',
                  activeConvId === conv.id
                    ? 'bg-obsidian-700 border border-obsidian-600'
                    : 'hover:bg-obsidian-800'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    conv.status === 'active' ? 'bg-neon-green' :
                    conv.status === 'cancelled' ? 'bg-neon-red' : 'bg-gray-500'
                  )} />
                  <span className="text-xs text-white truncate font-sans">{conv.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-3.5">
                  <span className="text-xs text-gray-500 font-mono">{conv.message_count} msgs</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-obsidian-700 border border-obsidian-600 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-obsidian-600 transition-all"
        >
          <ChevronRight size={12} className={clsx('transition-transform', sidebarOpen ? 'rotate-180' : '')} />
        </button>
      </aside>
    </>
  );
}
