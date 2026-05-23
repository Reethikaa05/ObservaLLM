import { useEffect, useState } from 'react';
import { useStore } from '../stores/store.js';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { formatDistanceToNow, format } from 'date-fns';
import {
  MessageSquare, StopCircle, RotateCcw, Plus,
  Filter, Clock, Coins, Hash, Search
} from 'lucide-react';

const STATUS_COLORS = {
  active: { dot: 'bg-neon-green', badge: 'bg-neon-green/10 text-neon-green border-neon-green/20' },
  cancelled: { dot: 'bg-neon-red', badge: 'bg-neon-red/10 text-neon-red border-neon-red/20' },
  completed: { dot: 'bg-gray-500', badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export function ConversationsPage() {
  const navigate = useNavigate();
  const {
    conversations, loadConversations, loadingConvs,
    cancelConversation, resumeConversation, createConversation,
    selectConversation, loadingMessages
  } = useStore();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const filtered = conversations.filter(c => {
    const matchStatus = filter === 'all' || c.status === filter;
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleOpen = async (conv) => {
    await selectConversation(conv.id);
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-obsidian-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display font-600 text-white text-lg">Conversations</h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">{conversations.length} total sessions</p>
          </div>
          <button
            onClick={async () => { await createConversation(); navigate('/'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20 transition-all text-sm font-sans"
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>

        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-obsidian-800 border border-obsidian-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-neon-cyan/40 transition-all font-sans"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1 bg-obsidian-800 border border-obsidian-700 rounded-xl p-1">
            {['all', 'active', 'cancelled'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-mono transition-all capitalize',
                  filter === s
                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                    : 'text-gray-500 hover:text-white'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loadingConvs ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-obsidian-700 border-t-neon-cyan rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <MessageSquare size={32} className="text-gray-700" />
            <p className="text-gray-500 text-sm font-sans">No conversations found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(conv => {
              const colors = STATUS_COLORS[conv.status] || STATUS_COLORS.active;
              return (
                <div
                  key={conv.id}
                  className="group flex items-center gap-4 p-4 rounded-xl bg-obsidian-800 border border-obsidian-700 hover:border-obsidian-600 transition-all cursor-pointer animate-fade-in"
                  onClick={() => handleOpen(conv)}
                >
                  {/* Status dot */}
                  <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', colors.dot)} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-sans text-white truncate">{conv.title}</span>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', colors.badge)}>
                        {conv.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                      <span className="flex items-center gap-1">
                        <Hash size={10} />
                        {conv.message_count} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins size={10} className="text-neon-amber" />
                        {(conv.total_input_tokens || 0) + (conv.total_output_tokens || 0)} tokens
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} className="text-neon-cyan" />
                        {conv.total_latency_ms || 0}ms total
                      </span>
                      <span className="text-gray-600">{formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Model badge */}
                  <span className="text-xs font-mono text-gray-500 bg-obsidian-900 px-2 py-1 rounded-lg border border-obsidian-700 flex-shrink-0 hidden md:block">
                    {conv.model?.split('-').slice(0, 2).join('-') || 'claude'}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {conv.status === 'active' ? (
                      <button
                        onClick={() => cancelConversation(conv.id)}
                        title="Cancel"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-neon-red/10 text-neon-red border border-neon-red/20 hover:bg-neon-red/20 transition-all"
                      >
                        <StopCircle size={13} />
                      </button>
                    ) : conv.status === 'cancelled' ? (
                      <button
                        onClick={() => resumeConversation(conv.id)}
                        title="Resume"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition-all"
                      >
                        <RotateCcw size={13} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
