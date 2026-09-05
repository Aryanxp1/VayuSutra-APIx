import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertOctagon,
  ArrowUp,
  BookOpenCheck,
  Info,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { getAnomalies } from '@/lib/api';
import type { AnomaliesResponse, Anomaly } from '@/lib/types';
import { StatCard } from '@/components/common/StatCard';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { apiErrorMessage } from '@/lib/errors';
import { useThemeStore } from '@/stores/themeStore';
import { badgeStyle, tdStyle, thStyle } from '@/components/common/formStyles';

function fmt(value: number | undefined | null, digits = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function fmtInr(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function severityClass(sev: string): string {
  const s = sev.toUpperCase();
  if (s === 'CRITICAL') return 'severity-critical';
  if (s === 'HIGH') return 'severity-high';
  if (s === 'MEDIUM') return 'severity-medium';
  return 'severity-low';
}

interface ChartTooltipEntry {
  name?: string | number;
  value?: number | string;
  payload?: Anomaly | null;
}
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: ChartTooltipEntry[]; label?: string | number }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  return (
    <div style={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
        Max deviation: {fmt(p.value as number)}%
      </div>
      {p.payload && (
        <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
          {p.payload.corridor_name} · {p.payload.anomaly_type}
        </div>
      )}
    </div>
  );
}

const renderTooltip = (props: unknown) => {
  const p = props as { active?: boolean; payload?: ChartTooltipEntry[]; label?: string | number };
  return <ChartTooltip {...p} />;
};
export function AnomalyDetectionPage() {
  const [data, setData] = useState<AnomaliesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const theme = useThemeStore((s) => s.theme);
  const dark = theme === 'dark';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnomalies();
      setData(res);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const severities = useMemo(() => Array.from(new Set((data?.anomalies ?? []).map((a) => a.severity))).sort(), [data]);
  const types = useMemo(() => Array.from(new Set((data?.anomalies ?? []).map((a) => a.anomaly_type))).sort(), [data]);

  const filtered = useMemo(() => {
    const list = data?.anomalies ?? [];
    return list
      .filter((a) => (sevFilter === 'ALL' ? true : a.severity.toUpperCase() === sevFilter))
      .filter((a) => (typeFilter === 'ALL' ? true : a.anomaly_type === typeFilter))
      .sort((a, b) => b.deviation_pct - a.deviation_pct);
  }, [data, sevFilter, typeFilter]);

  const chartData = useMemo(() => {
    const byRoute = new Map<string, { route_code: string; deviation_pct: number; corridor_name: string; anomaly_type: string }>();
    for (const a of filtered) {
      const cur = byRoute.get(a.route_code);
      if (!cur || a.deviation_pct > cur.deviation_pct) {
        byRoute.set(a.route_code, { route_code: a.route_code, deviation_pct: a.deviation_pct, corridor_name: a.corridor_name, anomaly_type: a.anomaly_type });
      }
    }
    return Array.from(byRoute.values())
      .sort((a, b) => b.deviation_pct - a.deviation_pct)
      .slice(0, 10);
  }, [filtered]);

  const stats = useMemo(() => {
    const list = filtered;
    return {
      total: list.length,
      critical: list.filter((a) => a.severity.toUpperCase() === 'CRITICAL').length,
      maxDev: list.reduce((m, a) => Math.max(m, a.deviation_pct), 0),
      avgConf: list.length ? list.reduce((s, a) => s + a.confidence_score, 0) / list.length : 0,
    };
  }, [filtered]);

  const methodology = data?.methodology;
  const colors = {
    axis: dark ? '#94A3B8' : '#64748B',
    grid: dark ? '#1E293B' : '#F1F5F9',
    saffron: dark ? '#F97316' : '#C2510A',
    error: dark ? '#F87171' : '#DC2626',
    warning: dark ? '#FBBF24' : '#D97706',
  };

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Anomaly Detection</h1>
          <p className="page-subtitle">
            Statistical route-surge surveillance on the live raw-quote panel. Every signal is
            computed from stored observations against corridor benchmark ranges — no synthetic fallbacks.
          </p>
        </div>
        <span className="badge-phase">REAL COMPUTED</span>
      </div>

      <div className="data-source-strip">
        <RefreshCw size={14} />
        {methodology?.engine ?? 'MarketAnomalyDetector'} · {data?.count ?? 0} active signals ·{' '}
        {methodology?.data_tag ?? data?.data_tag ?? 'REAL_COMPUTED'}
      </div>
      <div className="stat-grid">
        <StatCard label="Active Signals" value={stats.total} icon={<AlertOctagon size={16} />} mono />
        <StatCard label="Critical" value={stats.critical} icon={<ArrowUp size={16} />} mono />
        <StatCard label="Max Deviation" value={`${fmt(stats.maxDev, 1)}%`} subtitle="vs expected range" icon={<TrendingUp size={16} />} mono />
        <StatCard label="Avg Confidence" value={`${fmt(stats.avgConf * 100, 0)}%`} icon={<BookOpenCheck size={16} />} mono />
      </div>

      <div className="filter-bar">
        <select className="filter-select" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} aria-label="Filter by severity">
          <option value="ALL">All severities</option>
          {severities.map((s) => (
            <option key={s} value={s.toUpperCase()}>{s}</option>
          ))}
        </select>
        <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by anomaly type">
          <option value="ALL">All anomaly types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="action-btn" onClick={load} style={{ marginLeft: 'auto' }}>Refresh</button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<AlertOctagon size={22} />}
            title="No anomalies in this view"
            description="The detector found no signals matching the selected filters on the latest scan."
          />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div className="card">
              <div className="card-title">
                <TrendingUp size={16} style={{ color: colors.saffron }} />
                Top 10 Corridors by Deviation %
              </div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis dataKey="route_code" tick={{ fontSize: 11, fill: colors.axis }} />
                    <YAxis tick={{ fontSize: 11, fill: colors.axis }} unit="%" />
                    <Tooltip content={renderTooltip} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="deviation_pct" fill={colors.error} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-title">
                <Info size={16} style={{ color: colors.warning }} />
                Expected Range by Metric
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', flex: 1 }}>
                {Object.entries(methodology?.expected_ranges ?? {}).map(([metric, range]) => (
                  <div key={metric} style={{ padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      {range.label}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {fmtInr(range.min)} — {fmtInr(range.max)}
                    </div>
                  </div>
                ))}
                {(methodology?.detection_methods?.length ?? 0) > 0 && (
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                      Detection Methods
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {methodology!.detection_methods.map((m) => (
                        <span key={m} className="type-chip">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-title">
              <AlertOctagon size={16} style={{ color: colors.saffron }} />
              Signal Log ({filtered.length})
              <span style={{ ...badgeStyle, background: 'var(--brand-saffron-light)', color: 'var(--brand-saffron)' }}>
                {data?.data_tag ?? 'REAL_COMPUTED'}
              </span>
            </div>
            <div className="table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Route</th>
                    <th style={thStyle}>Corridor</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Severity</th>
                    <th style={thStyle}>Observed</th>
                    <th style={thStyle}>Expected Range</th>
                    <th style={thStyle}>Deviation</th>
                    <th style={thStyle}>Confidence</th>
                    <th style={thStyle}>Metric</th>
                    <th style={thStyle}>Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.anomaly_id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{a.route_code}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 150 }}>{a.corridor_name}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'normal' }}>
                        <span className="type-chip">{a.anomaly_type}</span>
                      </td>
                      <td style={{ ...tdStyle }}>
                        <span className={`severity-chip ${severityClass(a.severity)}`}>
                          {a.severity.toUpperCase() === 'CRITICAL' ? <ArrowUp size={12} /> : null}
                          {a.severity}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)' }}>{fmtInr(a.observed_value)}</td>
                      <td style={{ ...tdStyle }}>{fmtInr(a.expected_range_min)} — {fmtInr(a.expected_range_max)}</td>
                      <td style={{ ...tdStyle, color: 'var(--semantic-error)', fontWeight: 'var(--font-semibold)' }}>+{fmt(a.deviation_pct, 1)}%</td>
                      <td style={{ ...tdStyle }}>{fmt(a.confidence_score * 100, 0)}%</td>
                      <td style={{ ...tdStyle }}>
                        <span className="type-chip">{a.metric}</span>
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 260, color: 'var(--text-secondary)' }}>{a.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}