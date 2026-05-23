import { useEffect } from 'react';
import { useStore } from '../stores/store.js';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, Coins, Zap, Shield, RefreshCw } from 'lucide-react';

export function LogsPage() {
  const { logs, loadLogs, loadingLogs } = useStore();

  useEffect(() => {
    loadLogs({ limit: 100 });
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-obsidian-700 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="font-display font-600 text-white text-lg">Inference Logs</h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">{logs.length} log entries</p>
        </div>
        <button
          onClick={() => loadLogs({ limit: 100 })}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-obsidian-800 border border-obsidian-700 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all text-xs font-mono"
        >
          <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {loadingLogs ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-obsidian-700 border-t-neon-cyan rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-obsidian-700">
                  {['Status', 'Provider', 'Model', 'Latency', 'Tokens In', 'Tokens Out', 'Streamed', 'PII', 'Time'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-gray-500 font-medium uppercase tracking-wide text-[10px] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-800">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-obsidian-800/50 transition-colors group animate-fade-in">
                    <td className="py-3 px-3">
                      <span className={clsx(
                        'flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full border',
                        log.status === 'success'
                          ? 'text-neon-green bg-neon-green/10 border-neon-green/20'
                          : 'text-neon-red bg-neon-red/10 border-neon-red/20'
                      )}>
                        {log.status === 'success' ? <CheckCircle size={9} /> : <XCircle size={9} />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-300">{log.provider}</td>
                    <td className="py-3 px-3 text-gray-400 max-w-[120px] truncate">{log.model?.split('-').slice(0,3).join('-')}</td>
                    <td className="py-3 px-3">
                      <span className={clsx(
                        log.latency_ms > 3000 ? 'text-neon-red' :
                        log.latency_ms > 1500 ? 'text-neon-amber' : 'text-neon-green'
                      )}>
                        {log.latency_ms != null ? `${log.latency_ms}ms` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neon-cyan">{log.input_tokens ?? '—'}</td>
                    <td className="py-3 px-3 text-neon-purple">{log.output_tokens ?? '—'}</td>
                    <td className="py-3 px-3">
                      {log.stream ? <Zap size={11} className="text-neon-cyan" /> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-3 px-3">
                      {log.pii_redacted ? <Shield size={11} className="text-neon-amber" /> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {log.created_at ? format(new Date(log.created_at), 'HH:mm:ss') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="text-center py-12 text-gray-500">No logs yet. Start chatting!</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
