import { useStore } from '../stores/store.js';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { Zap, CheckCircle, XCircle, MessageSquare, StopCircle, Radio, Activity } from 'lucide-react';

const EVENT_STYLES = {
  'inference.completed': { icon: CheckCircle, color: 'text-neon-green', bg: 'bg-neon-green/10 border-neon-green/20', label: 'Inference OK' },
  'inference.failed': { icon: XCircle, color: 'text-neon-red', bg: 'bg-neon-red/10 border-neon-red/20', label: 'Inference Error' },
  'inference.started': { icon: Zap, color: 'text-neon-cyan', bg: 'bg-neon-cyan/10 border-neon-cyan/20', label: 'Inference Start' },
  'conversation.created': { icon: MessageSquare, color: 'text-neon-purple', bg: 'bg-neon-purple/10 border-neon-purple/20', label: 'Conv Created' },
  'conversation.cancelled': { icon: StopCircle, color: 'text-neon-amber', bg: 'bg-neon-amber/10 border-neon-amber/20', label: 'Conv Cancelled' },
  'log.ingested': { icon: Activity, color: 'text-neon-cyan', bg: 'bg-neon-cyan/5 border-neon-cyan/10', label: 'Log Ingested' },
};

export function EventsPage() {
  const { recentEvents } = useStore();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-obsidian-700 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="font-display font-600 text-white text-lg">Event Stream</h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">Live event bus activity</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
          <span className="text-xs font-mono text-neon-green">LIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {recentEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Radio size={32} className="text-gray-700 animate-pulse" />
            <p className="text-gray-500 text-sm font-sans">Waiting for events…</p>
            <p className="text-gray-600 text-xs font-mono">Start chatting to see real-time events</p>
          </div>
        ) : (
          recentEvents.map((evt, i) => {
            const style = EVENT_STYLES[evt.type] || { icon: Activity, color: 'text-gray-400', bg: 'bg-obsidian-800 border-obsidian-700', label: evt.type };
            const Icon = style.icon;
            const d = evt.data;
            const isNew = Date.now() - evt.ts < 3000;

            return (
              <div
                key={`${evt.ts}-${i}`}
                className={clsx(
                  'flex items-start gap-3 p-4 rounded-xl border transition-all animate-fade-in',
                  style.bg,
                  isNew && 'shadow-lg'
                )}
              >
                <div className={clsx('mt-0.5 flex-shrink-0', style.color)}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={clsx('text-xs font-mono font-medium', style.color)}>{style.label}</span>
                    {isNew && (
                      <span className="text-[10px] font-mono bg-neon-green/20 text-neon-green px-1.5 py-0.5 rounded-full">NEW</span>
                    )}
                    <span className="text-xs font-mono text-gray-500 ml-auto">
                      {format(new Date(evt.ts), 'HH:mm:ss.SSS')}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-gray-400">
                    {d?.provider && <span>provider: <span className="text-gray-200">{d.provider}</span></span>}
                    {d?.model && <span>model: <span className="text-gray-200">{d.model?.split('-').slice(0,2).join('-')}</span></span>}
                    {d?.latency_ms != null && <span>latency: <span className="text-neon-amber">{d.latency_ms}ms</span></span>}
                    {d?.total_tokens != null && <span>tokens: <span className="text-neon-cyan">{d.total_tokens}</span></span>}
                    {d?.status && <span>status: <span className={d.status === 'success' ? 'text-neon-green' : 'text-neon-red'}>{d.status}</span></span>}
                    {d?.conversation_id && <span>conv: <span className="text-gray-300">{d.conversation_id?.slice(0, 8)}…</span></span>}
                    {d?.error_message && <span className="text-neon-red">err: {d.error_message.slice(0, 60)}</span>}
                    {d?.pii_redacted && <span className="text-neon-amber">🛡 PII redacted</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
