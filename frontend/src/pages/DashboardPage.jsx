import { useEffect, useState } from 'react';
import { useStore } from '../stores/store.js';
import { clsx } from 'clsx';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Zap, Clock, CheckCircle, XCircle, TrendingUp,
  Activity, Coins, RefreshCw, Server
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

function StatCard({ label, value, sub, icon: Icon, color = 'cyan', trend }) {
  const colorMap = {
    cyan: 'text-neon-cyan border-neon-cyan/20 bg-neon-cyan/5',
    green: 'text-neon-green border-neon-green/20 bg-neon-green/5',
    red: 'text-neon-red border-neon-red/20 bg-neon-red/5',
    amber: 'text-neon-amber border-neon-amber/20 bg-neon-amber/5',
    purple: 'text-neon-purple border-neon-purple/20 bg-neon-purple/5',
  };
  return (
    <div className={clsx('rounded-xl border p-4 transition-all hover:scale-[1.01]', colorMap[color])}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={14} className="opacity-60" />}
      </div>
      <div className="font-display font-700 text-2xl text-white mb-1">{value ?? '—'}</div>
      {sub && <div className="text-xs font-mono text-gray-500">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-obsidian-800 border border-obsidian-600 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function DashboardPage() {
  const { analytics, loadAnalytics, loadingAnalytics } = useStore();
  const [hours, setHours] = useState(24);

  useEffect(() => {
    loadAnalytics({ hours });
    const interval = setInterval(() => loadAnalytics({ hours }), 30000);
    return () => clearInterval(interval);
  }, [hours]);

  const s = analytics?.summary;
  const throughput = analytics?.throughput || [];
  const byProvider = analytics?.byProvider || [];
  const errors = analytics?.errors || [];

  const chartData = throughput.map(t => ({
    time: t.bucket ? format(parseISO(t.bucket), 'HH:mm') : '',
    requests: t.requests,
    errors: t.errors,
    latency: t.avg_latency,
  }));

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-obsidian-700 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="font-display font-600 text-white text-lg">Observatory Dashboard</h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">Real-time inference monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex gap-1 bg-obsidian-800 border border-obsidian-700 rounded-xl p-1">
            {[6, 24, 72, 168].map(h => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-mono transition-all',
                  hours === h
                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                    : 'text-gray-500 hover:text-white'
                )}
              >
                {h < 24 ? `${h}h` : h === 24 ? '1d' : h === 72 ? '3d' : '7d'}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadAnalytics({ hours })}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-obsidian-800 border border-obsidian-700 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all"
          >
            <RefreshCw size={13} className={loadingAnalytics ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Requests" value={s?.total_requests ?? 0} icon={Activity} color="cyan" />
          <StatCard label="Success Rate" value={s ? `${s.success_rate}%` : '—'} icon={CheckCircle} color="green" />
          <StatCard label="Errors" value={s?.errors ?? 0} icon={XCircle} color="red" />
          <StatCard label="Avg Latency" value={s?.avg_latency_ms ? `${Math.round(s.avg_latency_ms)}ms` : '—'} sub={`p95: ${s?.p95_latency_ms ?? '—'}ms`} icon={Clock} color="amber" />
          <StatCard label="Total Tokens" value={s ? ((s.total_input_tokens || 0) + (s.total_output_tokens || 0)).toLocaleString() : '—'} icon={Coins} color="purple" />
          <StatCard label="Streamed" value={s?.streamed ?? 0} icon={Zap} color="cyan" />
        </div>

        {/* Latency percentiles */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'P50 Latency', value: s?.p50_latency_ms, color: '#39ff14' },
            { label: 'P95 Latency', value: s?.p95_latency_ms, color: '#ffb300' },
            { label: 'P99 Latency', value: s?.p99_latency_ms, color: '#ff3366' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-obsidian-700 bg-obsidian-800 p-4">
              <div className="text-xs font-mono text-gray-400 mb-2">{label}</div>
              <div className="font-display font-700 text-xl" style={{ color }}>
                {value != null ? `${value}ms` : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Throughput chart */}
        <div className="rounded-xl border border-obsidian-700 bg-obsidian-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-500 text-white text-sm">Requests Over Time</h3>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-neon-cyan inline-block" />Requests</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-neon-red inline-block" />Errors</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="red" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3366" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff3366" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#22223b" />
              <XAxis dataKey="time" stroke="#444" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis stroke="#444" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="requests" stroke="#00f5ff" fill="url(#cyan)" strokeWidth={2} name="Requests" />
              <Area type="monotone" dataKey="errors" stroke="#ff3366" fill="url(#red)" strokeWidth={2} name="Errors" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Latency chart */}
        <div className="rounded-xl border border-obsidian-700 bg-obsidian-800 p-5">
          <h3 className="font-display font-500 text-white text-sm mb-4">Avg Latency Over Time</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22223b" />
              <XAxis dataKey="time" stroke="#444" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis stroke="#444" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} unit="ms" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="latency" stroke="#ffb300" strokeWidth={2} dot={false} name="Latency (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider breakdown */}
          <div className="rounded-xl border border-obsidian-700 bg-obsidian-800 p-5">
            <h3 className="font-display font-500 text-white text-sm mb-4">Provider Breakdown</h3>
            {byProvider.length === 0 ? (
              <p className="text-gray-500 text-xs font-mono text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-3">
                {byProvider.map(p => (
                  <div key={`${p.provider}-${p.model}`} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-white truncate">{p.model}</span>
                        <span className="text-xs font-mono text-gray-400">{p.requests} reqs</span>
                      </div>
                      <div className="w-full bg-obsidian-900 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple"
                          style={{ width: `${(p.requests / (byProvider[0]?.requests || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-mono text-neon-amber flex-shrink-0">{p.avg_latency}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error breakdown */}
          <div className="rounded-xl border border-obsidian-700 bg-obsidian-800 p-5">
            <h3 className="font-display font-500 text-white text-sm mb-4">Error Breakdown</h3>
            {errors.length === 0 ? (
              <div className="flex items-center justify-center py-6 gap-2 text-neon-green">
                <CheckCircle size={16} />
                <span className="text-sm font-mono">No errors in period</span>
              </div>
            ) : (
              <div className="space-y-2">
                {errors.map(err => (
                  <div key={err.error_code} className="flex items-center justify-between p-2 rounded-lg bg-obsidian-900 border border-neon-red/10">
                    <span className="text-xs font-mono text-neon-red">{err.error_code || 'UNKNOWN'}</span>
                    <span className="text-xs font-mono text-gray-400">{err.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
