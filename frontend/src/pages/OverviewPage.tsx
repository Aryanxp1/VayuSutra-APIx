import { useCallback, useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Fuel, Gauge, Info, ShieldCheck, TrendingUp } from 'lucide-react';
import { getDataQuality, getPressureScore, getRealtimeIndex, getTimeseries } from '@/lib/api';
import type { DataQualityResponse, PressureScoreResponse, RealtimeIndexResponse, TimeseriesResponse } from '@/lib/types';
import { StatCard } from '@/components/common/StatCard';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { useThemeStore } from '@/stores/themeStore';

interface OverviewData {
  realtime: RealtimeIndexResponse | null;
  timeseries: TimeseriesResponse | null;
  pressure: PressureScoreResponse | null;
  quality: DataQualityResponse | null;
}

function fmt(value: number | undefined | null, digits = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string | number }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: 'var(--chart-tooltip-bg)',
        border: '1px solid var(--chart-tooltip-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-xs)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{entry.name}: </span>
          {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value ?? '—'}
        </div>
      ))}
    </div>
  );
}

function useChartColors() {
  const theme = useThemeStore((s) => s.theme);
  const dark = theme === 'dark';
  return {
    axis: dark ? '#94A3B8' : '#64748B',
    grid: dark ? '#1E293B' : '#F1F5F9',
    saffron: dark ? '#F97316' : '#C2510A',
    info: dark ? '#60A5FA' : '#2563EB',
    success: dark ? '#22C55E' : '#16A34A',
  };
}

export function OverviewPage() {
  const [data, setData] = useState<OverviewData>({ realtime: null, timeseries: null, pressure: null, quality: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const colors = useChartColors();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const settled = await Promise.allSettled([
      getRealtimeIndex(),
      getTimeseries(),
      getPressureScore(),
      getDataQuality(),
    ] as const);
    const [realtimeResult, timeseriesResult, pressureResult, qualityResult] = settled;
    const realtime =
      realtimeResult.status === 'fulfilled' ? realtimeResult.value : null;
    const timeseries =
      timeseriesResult.status === 'fulfilled' ? timeseriesResult.value : null;
    const pressure =
      pressureResult.status === 'fulfilled' ? pressureResult.value : null;
    const quality =
      qualityResult.status === 'fulfilled' ? qualityResult.value : null;
    setData({ realtime, timeseries, pressure, quality });
    const failures = settled.filter((result) => result.status === 'rejected').length;
    if (failures > 0) {
      setError(`${failures} of 4 data sources could not be loaded. Showing partial data where available.`);
    }
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoading />;

  const { realtime, timeseries, pressure, quality } = data;
  const dataTag =
    realtime?.data_tag ||
    timeseries?.data_tag ||
    pressure?.data_tag ||
    quality?.data_tag ||
    'Model-Simulated Data';

  const chartData = (timeseries?.data ?? timeseries?.series ?? []).map((point) => ({
    date: point.calculation_date,
    Laspeyres: point.laspeyres_index,
    Fisher: point.fisher_index ?? undefined,
    Jevons: point.jevons_index ?? undefined,
  }));

  const bpsHeadline = realtime?.cpi_transmission?.headline_all_india_cpi_impact_bps;
  const dailyChange = realtime?.daily_movement?.percentage_change;
  const pressureLevel = (pressure?.pressure_level ?? 'unknown').replace(/_/g, ' ');

  const renderTooltip = (props: unknown) => {
    const tooltipProps = props as {
      active?: boolean;
      payload?: TooltipEntry[];
      label?: string | number;
    } | null;
    return tooltipProps ? <ChartTooltip {...tooltipProps} /> : null;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">National Airfare Price-Pressure Overview</h1>
          <p className="page-subtitle">
            Real-time statistical index, CPI transmission basis points, inflation pressure gauge, and data
            trust — computed by the VayuSutra analytics engine.
          </p>
        </div>
        {lastUpdated && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'right' }}>
            Last refreshed {lastUpdated}
            <br />
            <span className="badge-demo">{dataTag}</span>
          </div>
        )}
      </div>

      <div className="data-source-strip">
        <Info size={14} style={{ color: 'var(--semantic-info)', flexShrink: 0 }} />
        <span>
          <strong>Demonstration dataset</strong> — index values are computed by the VayuSutra engine from
          statistically simulated market inputs and are <strong>not</strong> official government statistics.
          Server data tag: <code>{dataTag}</code>
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <ErrorState message={error} onRetry={load} />
        </div>
      )}

      {!realtime && !timeseries && !pressure && !quality ? (
        <ErrorState
          message="Unable to reach the VayuSutra API. Ensure the backend is running at 127.0.0.1:8000 and the Vite proxy is active."
          onRetry={load}
        />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Master Laspeyres Index"
              value={fmt(realtime?.master_laspeyres_index)}
              icon={<TrendingUp size={16} />}
              subtitle={realtime?.calculation_date ? `as of ${realtime.calculation_date}` : undefined}
              mono
            />
            <StatCard
              label="Fisher Ideal Index"
              value={fmt(realtime?.fisher_ideal_index)}
              subtitle={realtime?.paasche_index ? `Paasche ${fmt(realtime.paasche_index)}` : undefined}
              mono
            />
            <StatCard
              label="Jevons National Index"
              value={fmt(realtime?.jevons_national_index)}
              icon={<Activity size={16} />}
              subtitle="compounded geometric mean"
              mono
            />
            <StatCard
              label="Daily Movement — CPI Impact"
              value={`${fmt(bpsHeadline)} bps`}
              trend={(bpsHeadline ?? 0) > 0 ? 'up' : 'down'}
              trendValue={`${fmt(Math.abs(dailyChange ?? 0))}% daily`}
              subtitle="headline CPI"
              icon={<Fuel size={16} />}
              mono
            />
          </div>
          <div className="grid-two">
            <div className="card">
              <div className="card-title">
                <TrendingUp size={16} style={{ color: colors.saffron }} />
                Index Series — National Average
              </div>
              {chartData.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', padding: 'var(--space-10) 0', textAlign: 'center' }}>
                  No index series available yet.
                </p>
              ) : (
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                      <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: colors.axis }}
                        tickLine={false}
                        axisLine={{ stroke: colors.grid }}
                        minTickGap={32}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 11, fill: colors.axis }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={renderTooltip} />
                      <Line type="monotone" dataKey="Laspeyres" stroke={colors.saffron} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Fisher" stroke={colors.info} strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="Jevons" stroke={colors.success} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title">
                <Gauge size={16} style={{ color: colors.saffron }} />
                Inflation Pressure Score
              </div>
              {pressure ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
                    <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {fmt(pressure.pressure_score, 1)}
                    </span>
                    <span className="badge-phase" style={{ textTransform: 'uppercase' }}>{pressureLevel}</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                    Composite of {Object.keys(pressure.components ?? {}).length || 0} monitored components · change {fmt(pressure.score_change_24h)} pts / 24h
                  </p>
                  {pressure.ranked_drivers?.length ? (
                    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Ranked drivers
                      </span>
                      {pressure.ranked_drivers.slice(0, 5).map((driver, i) => (
                        <div key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-2)' }}>
                          <span style={{ color: colors.saffron }}>•</span>
                          <span>{driver}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Pressure gauge unavailable.</p>
              )}
            </div>
          </div>
          <div className="grid-two-rev">
            <div className="card">
              <div className="card-title">
                <ShieldCheck size={16} style={{ color: colors.success }} />
                Data Trust Snapshot
              </div>
              {quality ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
                    <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {fmt(quality.overall_trust_score, 0)}
                    </span>
                    <span className="badge-demo">{quality.status_rating}</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                    Snapshot: {quality.snapshot_date ?? '—'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                    <TrustBar label="Freshness" value={quality.freshness_pct} />
                    <TrustBar label="Completeness" value={quality.completeness_pct} />
                    <TrustBar label="Route coverage" value={quality.route_coverage_pct} />
                    <TrustBar label="Source health" value={quality.source_health_pct} />
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Data quality snapshot unavailable.</p>
              )}
            </div>

            <div className="card">
              <div className="card-title">
                <Activity size={16} style={{ color: colors.saffron }} />
                Real-time Series — Jevons Component
              </div>
              {chartData.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No series data available.</p>
              ) : (
                <div style={{ width: '100%', height: 232 }}>
                  <ResponsiveContainer>
                    <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                      <defs>
                        <linearGradient id="jevonsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.saffron} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={colors.saffron} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: colors.axis }}
                        tickLine={false}
                        axisLine={{ stroke: colors.grid }}
                        minTickGap={40}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 11, fill: colors.axis }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={renderTooltip} />
                      <Area type="monotone" dataKey="Jevons" stroke={colors.saffron} strokeWidth={2} fill="url(#jevonsFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TrustBar({ label, value }: { label: string; value: number | undefined }) {
  const pct = value ?? 0;
  const barColor = pct >= 90 ? 'var(--semantic-success)' : pct >= 70 ? 'var(--semantic-warning)' : 'var(--semantic-error)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: barColor,
            borderRadius: 3,
            transition: 'width var(--transition-slow)',
          }}
        />
      </div>
    </div>
  );
}