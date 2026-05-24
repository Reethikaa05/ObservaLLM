import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import {
  Database, RefreshCw, Trash2, Plus, Edit2, Check, X,
  MessageSquare, FileText, Zap, CheckCircle, XCircle,
  Shield, ChevronDown, AlertTriangle, Search
} from 'lucide-react';

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-obsidian-800 border border-obsidian-600 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-neon-red/10 border border-neon-red/30 flex items-center justify-center">
            <AlertTriangle size={18} className="text-neon-red" />
          </div>
          <p className="text-white font-sans text-sm leading-snug">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-obsidian-700 hover:bg-obsidian-600 transition-all"
          >Cancel</button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm text-white bg-neon-red/80 hover:bg-neon-red transition-all font-medium"
          >Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Conversation Modal ────────────────────────────────────────────────
function CreateConvModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const conv = await api.createConversation({
        title: title || undefined,
        model: 'claude-sonnet-4-20250514'
      });
      onCreated(conv);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-obsidian-800 border border-obsidian-600 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-display font-600 text-base">New Conversation</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 font-mono uppercase tracking-wide mb-1.5">
              Title (optional)
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Research session"
              className="w-full bg-obsidian-900 border border-obsidian-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-cyan/50 transition-all"
            />
          </div>
          {error && <p className="text-neon-red text-xs font-mono">{error}</p>}
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-obsidian-700 hover:bg-obsidian-600 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded-lg text-sm text-black bg-neon-cyan hover:bg-neon-cyan/80 transition-all font-medium flex items-center gap-2 disabled:opacity-50">
              {loading && <RefreshCw size={12} className="animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Conversations Tab ────────────────────────────────────────────────────────
function ConversationsTab() {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listConversations({ limit: 100 });
      setConvs(data.conversations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveTitle = async (id) => {
    try {
      const updated = await api.updateTitle(id, editTitle);
      setConvs(cs => cs.map(c => c.id === id ? updated : c));
      setEditingId(null);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteConversation(id);
      setConvs(cs => cs.filter(c => c.id !== id));
      setConfirmId(null);
    } catch (err) { console.error(err); }
  };

  const filtered = convs.filter(c =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = {
    active: 'text-neon-green bg-neon-green/10 border-neon-green/20',
    cancelled: 'text-neon-red bg-neon-red/10 border-neon-red/20',
    completed: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  };

  return (
    <div>
      {showCreate && (
        <CreateConvModal
          onClose={() => setShowCreate(false)}
          onCreated={conv => setConvs(cs => [conv, ...cs])}
        />
      )}
      {confirmId && (
        <ConfirmDialog
          message="Delete this conversation and all its messages? This cannot be undone."
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-cyan/40 transition-all"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-sm hover:bg-neon-cyan/20 transition-all font-mono"
        >
          <Plus size={13} /> New
        </button>
        <button onClick={load} className="p-2 rounded-xl bg-obsidian-800 border border-obsidian-700 text-gray-400 hover:text-white transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-obsidian-700 border-t-neon-cyan rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">No conversations found.</div>
        ) : filtered.map(conv => (
          <div key={conv.id}
            className="bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-obsidian-600 transition-all group">
            <MessageSquare size={14} className="text-neon-cyan flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {editingId === conv.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(conv.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 bg-obsidian-800 border border-neon-cyan/40 rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
                  />
                  <button onClick={() => handleSaveTitle(conv.id)} className="text-neon-green hover:text-neon-green/70"><Check size={13} /></button>
                  <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white"><X size={13} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white truncate">{conv.title || 'Untitled'}</span>
                  <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full border font-mono flex-shrink-0', statusColor[conv.status] || statusColor.completed)}>
                    {conv.status}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-mono">
                <span>{conv.message_count} msgs</span>
                <span>·</span>
                <span>{conv.total_input_tokens + conv.total_output_tokens} tokens</span>
                <span>·</span>
                <span>{conv.created_at ? format(new Date(conv.created_at), 'MMM d, HH:mm') : '—'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { setEditingId(conv.id); setEditTitle(conv.title || ''); }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all"
              ><Edit2 size={12} /></button>
              <button
                onClick={() => setConfirmId(conv.id)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-neon-red hover:bg-neon-red/10 transition-all"
              ><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────
function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLogs({ limit: 100 });
      setLogs(data.logs || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await api.deleteLog(id);
      setLogs(ls => ls.filter(l => l.id !== id));
      setConfirmId(null);
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      {confirmId && (
        <ConfirmDialog
          message="Delete this inference log? This cannot be undone."
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 font-mono">{logs.length} log entries</span>
        <button onClick={load} className="p-2 rounded-xl bg-obsidian-800 border border-obsidian-700 text-gray-400 hover:text-white transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-obsidian-700 border-t-neon-cyan rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-obsidian-700">
                {['Status', 'Provider', 'Model', 'Latency', 'Tokens', 'Stream', 'PII', 'Time', ''].map(h => (
                  <th key={h} className="text-left py-3 px-3 text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-800">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-obsidian-800/50 transition-colors group animate-fade-in">
                  <td className="py-3 px-3">
                    <span className={clsx('flex items-center gap-1 w-fit px-2 py-0.5 rounded-full border',
                      log.status === 'success' ? 'text-neon-green bg-neon-green/10 border-neon-green/20' : 'text-neon-red bg-neon-red/10 border-neon-red/20'
                    )}>
                      {log.status === 'success' ? <CheckCircle size={9} /> : <XCircle size={9} />}
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-300">{log.provider}</td>
                  <td className="py-3 px-3 text-gray-400 max-w-[100px] truncate">{String(log.model || '').split('-').slice(0, 3).join('-')}</td>
                  <td className="py-3 px-3">
                    <span className={clsx(
                      Number(log.latency_ms) > 3000 ? 'text-neon-red' :
                      Number(log.latency_ms) > 1500 ? 'text-neon-amber' : 'text-neon-green'
                    )}>{log.latency_ms != null ? `${log.latency_ms}ms` : '—'}</span>
                  </td>
                  <td className="py-3 px-3 text-neon-cyan">{(Number(log.input_tokens) || 0) + (Number(log.output_tokens) || 0)}</td>
                  <td className="py-3 px-3">{log.stream ? <Zap size={11} className="text-neon-cyan" /> : <span className="text-gray-600">—</span>}</td>
                  <td className="py-3 px-3">{log.pii_redacted ? <Shield size={11} className="text-neon-amber" /> : <span className="text-gray-600">—</span>}</td>
                  <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                    {log.created_at ? format(new Date(log.created_at), 'HH:mm:ss') : '—'}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => setConfirmId(log.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-neon-red hover:bg-neon-red/10 transition-all"
                    ><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <div className="text-center py-12 text-gray-500">No logs yet.</div>}
        </div>
      )}
    </div>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────
function EventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEvents({ limit: 100 });
      setEvents(data.events || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await api.deleteEvent(id);
      setEvents(es => es.filter(e => e.id !== id));
      setConfirmId(null);
    } catch (err) { console.error(err); }
  };

  const typeColor = (type) => {
    if (type?.includes('completed')) return 'text-neon-green border-neon-green/30 bg-neon-green/10';
    if (type?.includes('error') || type?.includes('failed')) return 'text-neon-red border-neon-red/30 bg-neon-red/10';
    if (type?.includes('created')) return 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10';
    if (type?.includes('cancelled')) return 'text-neon-amber border-neon-amber/30 bg-neon-amber/10';
    return 'text-gray-400 border-gray-600 bg-gray-500/10';
  };

  return (
    <div>
      {confirmId && (
        <ConfirmDialog
          message="Delete this event? This cannot be undone."
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 font-mono">{events.length} events</span>
        <button onClick={load} className="p-2 rounded-xl bg-obsidian-800 border border-obsidian-700 text-gray-400 hover:text-white transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-obsidian-700 border-t-neon-cyan rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {events.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No events yet.</div>}
          {events.map(ev => (
            <div key={ev.id} className="bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-obsidian-600 transition-all group">
              <Zap size={14} className="text-neon-purple flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border font-mono flex-shrink-0', typeColor(ev.type))}>
                    {ev.type}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">{ev.source}</span>
                </div>
                <div className="text-xs text-gray-600 font-mono mt-1 truncate max-w-xl">
                  {ev.created_at ? format(new Date(ev.created_at), 'MMM d, HH:mm:ss') : '—'}
                </div>
              </div>
              <button
                onClick={() => setConfirmId(ev.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-neon-red hover:bg-neon-red/10 transition-all"
              ><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'logs', label: 'Inference Logs', icon: FileText },
  { id: 'events', label: 'Events', icon: Zap },
];

export function DatabasePage() {
  const [activeTab, setActiveTab] = useState('conversations');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-obsidian-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center flex-shrink-0">
            <Database size={16} className="text-black" />
          </div>
          <div>
            <h1 className="font-display font-600 text-white text-lg leading-tight">Database Manager</h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">Create · Read · Update · Delete — Turso (libSQL)</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-obsidian-900 rounded-xl p-1 w-fit border border-obsidian-700">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all font-sans',
                activeTab === id
                  ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                  : 'text-gray-400 hover:text-white hover:bg-obsidian-800'
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {activeTab === 'conversations' && <ConversationsTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'events' && <EventsTab />}
      </div>
    </div>
  );
}
