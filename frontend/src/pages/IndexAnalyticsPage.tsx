import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info, MapPin, Scale, TrendingUp } from 'lucide-react';
import { getRealtimeIndex, getTimeseries, getSuperlativeIndex, getRegionalIndex } from '@/lib/api';
import type {
  RealtimeIndexResponse,
  TimeseriesResponse,
  SuperlativeIndexResponse,
  RegionalIndexResponse,
} from '@/lib/types';
import { StatCard } from '@/components/common/StatCard';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { useThemeStore } from '@/stores/themeStore';

interface IndexAnalyticsData {
  realtime: RealtimeIndexResponse | null;
  timeseries: TimeseriesResponse | null;
  superlative: SuperlativeIndexResponse | null;
  regional: RegionalIndexResponse | null;
}

const SUPERLATIVE_ROWS: Array<{ key: string; label: string; short: string }> = [
  { key: 'laspeyres_fixed_basket_index', label: 'Laspeyres Fixed-Basket Index', short: 'Laspeyres' },
  { key: 'paasche_current_weight_index', label: 'Paasche Current-Weight Index', short: 'Paasche' },
  { key: 'fisher_ideal_superlative_index', label: 'Fisher Ideal Superlative Index', short: 'Fisher' },
  { key: 'tornqvist_geometric_superlative_index', label: 'Törnqvist Geometric Superlative Index', short: 'Törnqvist' },
  { key: 'walsh_geometric_weight_index', label: 'Walsh Geometric Weight Index', short: 'Walsh' },
  { key: 'jevons_national_index', label: 'Jevons National Index', short: 'Jevons' },
];

function fmt(value: number | undefined | null, digits = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
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
    violet: dark ? '#A78BFA' : '#7C3AED',
    rose: dark ? '#FB7185' : '#E11D48',
  };
}

export function IndexAnalyticsPage() {
  const [data, setData] = useState<IndexAnalyticsData>({ realtime: null, timeseries: null, superlative: null, regional: null });
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
      getSuperlativeIndex(),
      getRegionalIndex(),
    ] as const);
    const [realtimeResult, timeseriesResult, superlativeResult, regionalResult] = settled;
    setData({
      realtime: realtimeResult.status === 'fulfilled' ? realtimeResult.value : null,
      timeseries: timeseriesResult.status === 'fulfilled' ? timeseriesResult.value : null,
      superlative: superlativeResult.status === 'fulfilled' ? superlativeResult.value : null,
      regional: regionalResult.status === 'fulfilled' ? regionalResult.value : null,
    });
    const failures = settled.filter((result) => result.status === 'rejected').length;
    if (failures > 0) {
      setError(`${failures} of 4 index data sources could not be loaded. Showing available data.`);
    }
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(
    () =>
      (data.timeseries?.data ?? data.timeseries?.series ?? []).map((point) => ({
        date: point.calculation_date,
        Laspeyres: point.laspeyres_index,
        Fisher: point.fisher_index ?? undefined,
        Paasche: point.paasche_index ?? undefined,
        Jevons: point.jevons_index ?? undefined,
      })),
    [data.timeseries]
  );

  const superlativeMatrix = data.superlative?.superlative_matrix;
  const superlativeBarData = SUPERLATIVE_ROWS.filter((row) => superlativeMatrix?.[row.key as keyof typeof superlativeMatrix] !== undefined).map((row) => ({
    name: row.short,
    Index: superlativeMatrix?.[row.key as keyof typeof superlativeMatrix] as number,
  }));

  const regionData = Object.entries(data.regional?.regional_hubs ?? {}).map(([key, hub]) => ({
    name: key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace('Corridor', 'Corridor')
      .replace('Hub', 'Hub'),
    key,
    Index: hub.index,
    ['Traffic Weight %']: hub.traffic_weight_pct,
  }));

  const renderTooltip = (props: unknown) => {
    const tooltipProps = props as { active?: boolean; payload?: TooltipEntry[]; label?: string | number } | null;
    return tooltipProps ? <ChartTooltip {...tooltipProps} /> : null;
  };

  if (loading) return <PageLoading />;

  const realtime = data.realtime;
  const dataTag = realtime?.data_tag || data.timeseries?.data_tag || data.superlative?.data_tag || data.regional?.data_tag || 'MODELLED';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Index Analytics</h1>
          <p className="page-subtitle">
            Superlative price-index comparison, historical index movement, substitution-bias analysis, and regional
            airfare hub disaggregation computed by the VayuSutra engine.
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
          Index values are computed by the VayuSutra engine from statistically simulated market inputs and are{' '}
          <strong>not</strong> official government statistics. Base period: 100 at the 2026 basket benchmark.
          Server data tag: <code>{dataTag}</code>
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <ErrorState message={error} onRetry={load} />
        </div>
      )}

{!realtime && !data.timeseries && !data.superlative && !data.regional ? (
        <ErrorState message="Unable to reach the VayuSutra API. Ensure the backend is running and the Vite proxy is active." onRetry={load} />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Master Laspeyres Index"
              value={fmt(superlativeMatrix?.laspeyres_fixed_basket_index ?? realtime?.master_laspeyres_index)}
              icon={<TrendingUp size={16} />}
              subtitle={realtime?.calculation_date ? `as of ${realtime.calculation_date}` : undefined}
              mono
            />
            <StatCard
              label="Fisher Ideal Index"
              value={fmt(superlativeMatrix?.fisher_ideal_superlative_index ?? realtime?.fisher_ideal_index)}
              icon={<Scale size={16} />}
              subtitle="UN/ILO superlative class"
              mono
            />
            <StatCard
              label="Jevons National Index"
              value={fmt(superlativeMatrix?.jevons_national_index ?? realtime?.jevons_national_index)}
              icon={<TrendingUp size={16} />}
              subtitle="compounded geometric mean"
              mono
            />
            <StatCard
              label="Paasche Index"
              value={fmt(superlativeMatrix?.paasche_current_weight_index ?? realtime?.paasche_index)}
              icon={<TrendingUp size={16} />}
              subtitle="current-expenditure weights"
              mono
            />
          </div>

          {realtime?.daily_movement && (
            <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
              <div className="card-title">
                <TrendingUp size={16} style={{ color: colors.saffron }} />
                Daily Movement — {realtime.calculation_date ?? ''}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Day-over-day change</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {fmt(realtime.daily_movement.percentage_change, 2)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Previous index</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {fmt(realtime.daily_movement.previous_index, 2)}
                  </div>
                </div>
                {realtime.cpi_transmission && (
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Headline CPI impact (bps)</div>
                    <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {fmt(realtime.cpi_transmission.headline_all_india_cpi_impact_bps, 4)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-title">
              <TrendingUp size={16} style={{ color: colors.saffron }} />
              Historical Index Time Series
            </div>
            {chartData.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No series data available.</p>
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
                      label={{ value: 'Index (base 100)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: colors.axis } }}
                    />
                    <Tooltip content={renderTooltip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Laspeyres" stroke={colors.saffron} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Fisher" stroke={colors.info} strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="Paasche" stroke={colors.violet} strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="Jevons" stroke={colors.success} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

<div className="grid-two" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card">
              <div className="card-title">
                <Scale size={16} style={{ color: colors.saffron }} />
                Superlative Index Comparison Matrix
              </div>
              {!data.superlative ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Superlative matrix unavailable.</p>
              ) : (
                <>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={superlativeBarData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: colors.axis }} tickLine={false} interval={0} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: colors.axis }} tickLine={false} axisLine={false} />
                        <Tooltip content={renderTooltip} />
                        <Bar dataKey="Index" fill={colors.saffron} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {data.superlative.substitution_bias_analysis && (
                    <div
                      style={{
                        marginTop: 'var(--space-4)',
                        borderTop: '1px solid var(--border-secondary)',
                        paddingTop: 'var(--space-3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-1)',
                      }}
                    >
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Substitution bias analysis
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {data.superlative.substitution_bias_analysis.methodology_standard ?? '—'}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        Laspeyres vs Fisher: {fmt(data.superlative.substitution_bias_analysis.laspeyres_vs_fisher_bias_index_points, 4)} index pts · {fmt(data.superlative.substitution_bias_analysis.laspeyres_vs_fisher_bias_cpi_bps, 4)} bps CPI
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        Laspeyres vs Törnqvist: {fmt(data.superlative.substitution_bias_analysis.laspeyres_vs_tornqvist_bias_cpi_bps, 4)} bps CPI
                      </span>
                      {data.superlative.substitution_bias_analysis.statutory_recommendation && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--semantic-info)', marginTop: 'var(--space-1)' }}>
                          {data.superlative.substitution_bias_analysis.statutory_recommendation}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="card">
              <div className="card-title">
                <Scale size={16} style={{ color: colors.info }} />
                Index Values — {data.superlative?.calculation_date ?? '—'}
              </div>
              {!data.superlative ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No superlative data.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {SUPERLATIVE_ROWS.map((row) => {
                    const value = superlativeMatrix?.[row.key as keyof typeof superlativeMatrix];
                    return (
                      <div
                        key={row.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'var(--space-3)',
                          padding: 'var(--space-2) var(--space-3)',
                          background: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{row.label}</span>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {fmt(value as number, 2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

<div className="grid-two-rev">
            <div className="card">
              <div className="card-title">
                <MapPin size={16} style={{ color: colors.info }} />
                Regional Breakdown
              </div>
              {regionData.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No regional data available.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {regionData.map((region) => (
                    <div
                      key={region.key}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-1)',
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{region.name}</span>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {fmt(region.Index, 2)}
                        </span>
                      </div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        Traffic weight {region['Traffic Weight %']}% · {data.regional?.regional_hubs?.[region.key]?.major_airports?.join(', ') ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title">
                <MapPin size={16} style={{ color: colors.saffron }} />
                Regional Hub Indices
              </div>
              {regionData.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No regional data available.</p>
              ) : (
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={regionData} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 12 }}>
                      <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: colors.axis }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: colors.axis }} tickLine={false} axisLine={false} />
                      <Tooltip content={renderTooltip} />
                      <Bar dataKey="Index" fill={colors.info} radius={[0, 4, 4, 0]} />
                    </BarChart>
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