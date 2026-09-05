import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info, TrendingUp, Cpu, CalendarRange } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import {
  getNationalForecast,
  getRouteForecast,
  getForecastingModels,
  getRoutes,
  getTimeseries,
  getRouteIntelligence,
} from '@/lib/api';
import type {
  ForecastResponse,
  ForecastingModelsResponse,
  RoutesResponse,
  TimeseriesResponse,
  RouteIntelligenceResponse,
} from '@/lib/types';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';

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
  };
}

const HORIZON_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
];

interface ForecastData {
  forecast: ForecastResponse | null;
  history: TimeseriesResponse | null;
  routeIntel: RouteIntelligenceResponse | null;
}

interface ForecastModelsState {
  catalogue: ForecastingModelsResponse | null;
  routes: RoutesResponse | null;
}

export function ForecastingPage() {
  const [scope, setScope] = useState<'national' | 'route'>('national');
  const [routeCode, setRouteCode] = useState<string>('DEL-BOM');
  const [horizonDays, setHorizonDays] = useState(30);
  const [modelsState, setModelsState] = useState<ForecastModelsState>({ catalogue: null, routes: null });
  const [data, setData] = useState<ForecastData>({ forecast: null, history: null, routeIntel: null });
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const colors = useChartColors();

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getForecastingModels(), getRoutes()]).then(([m, r]) => {
      if (cancelled) return;
      setModelsState({
        catalogue: m.status === 'fulfilled' ? m.value : null,
        routes: r.status === 'fulfilled' ? r.value : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const settled =
      scope === 'national'
        ? await Promise.allSettled([getNationalForecast(horizonDays), getTimeseries()])
        : await Promise.allSettled([getRouteForecast(routeCode, horizonDays), getRouteIntelligence(routeCode)]);
    const [forecastResult, secondResult] = settled;
    setData({
      forecast: forecastResult.status === 'fulfilled' ? forecastResult.value : null,
      history: scope === 'national' && secondResult.status === 'fulfilled' ? (secondResult.value as TimeseriesResponse) : null,
      routeIntel: scope === 'route' && secondResult.status === 'fulfilled' ? (secondResult.value as RouteIntelligenceResponse) : null,
    });
    const failures = settled.filter((s) => s.status === 'rejected').length;
    if (failures > 0) {
      setError(`${failures} of 2 forecast data sources could not be loaded. Showing available data.`);
    }
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, [scope, routeCode, horizonDays]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data.forecast?.best_model_name) {
      setSelectedModel(data.forecast.best_model_name);
    }
  }, [data.forecast?.best_model_name]);

  const modelCatalogue = useMemo(() => {
    const names = new Set<string>();
    (modelsState.catalogue?.catalogue ?? []).forEach((m) => names.add(m.model_name));
    (data.forecast?.model_evaluation_leaderboard ?? []).forEach((m) => names.add(m.model_name));
    const displayMap = new Map<string, string>();
    (modelsState.catalogue?.catalogue ?? []).forEach((m) => displayMap.set(m.model_name, m.display_name));
    return Array.from(names).map((name) => ({ model_name: name, display_name: displayMap.get(name) ?? name.replace(/_/g, ' ') }));
  }, [modelsState.catalogue, data.forecast]);

  const chartData = useMemo(() => {
    const rows: Array<Record<string, string | number | undefined>> = [];
    if (scope === 'national' && data.history) {
      (data.history.data ?? data.history.series ?? []).forEach((p) => {
        rows.push({
          date: p.calculation_date,
          Historical: p.laspeyres_index,
          band_low: undefined,
          band_high: undefined,
          ['Forecast (output)']: undefined,
        });
      });
    }
    if (data.forecast) {
      data.forecast.daily_trajectory.forEach((p) => {
        rows.push({
          date: p.target_date,
          Historical: undefined,
          band_low: p.lower_bound_95,
          band_high: p.upper_bound_95,
          ['Forecast (output)']: p.forecast_value,
        });
      });
    }
    return rows;
  }, [scope, data.history, data.forecast]);

  const routeOptions = useMemo(() => {
    const seen = new Set<string>();
    return (modelsState.routes?.routes ?? []).filter((r) => {
      if (seen.has(r.route_code)) return false;
      seen.add(r.route_code);
      return true;
    });
  }, [modelsState.routes]);

  const renderTooltip = (props: unknown) => {
    const tooltipProps = props as { active?: boolean; payload?: TooltipEntry[]; label?: string | number } | null;
    return tooltipProps ? <ChartTooltip {...tooltipProps} /> : null;
  };

  if (loading) return <PageLoading />;

  const forecast = data.forecast;
  const dataTag = forecast?.data_tag ?? modelsState.catalogue?.data_tag ?? 'MODELLED';
  const leaderboard = forecast?.model_evaluation_leaderboard ?? [];

return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Forecasting</h1>
          <p className="page-subtitle">
            Multi-model econometric forecasts for national and route-level airfare indices with 95% confidence
            interval fan-charts, generated by the VayuSutra forecasting engine.
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
          Forecasts are <strong>model outputs</strong> (data tag <code>{dataTag}</code>) produced by automatic
          walk-forward model selection. They are not official statistics.
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <ErrorState message={error} onRetry={load} />
        </div>
      )}

      {!forecast ? (
        <ErrorState message="Unable to reach the VayuSutra API. Ensure the backend is running and the Vite proxy is active." onRetry={load} />
      ) : (<>
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card-title">
            <Cpu size={16} style={{ color: 'var(--brand-saffron, #C2510A)' }} />
            Forecast Controls
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Scope</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button onClick={() => setScope('national')} style={toggleStyle(scope === 'national')}>National</button>
                <button onClick={() => setScope('route')} style={toggleStyle(scope === 'route')}>Route</button>
              </div>
            </div>

            {scope === 'route' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Route</span>
                <select
                  value={routeCode}
                  onChange={(e) => setRouteCode(e.target.value)}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {routeOptions.map((r) => (
                    <option key={r.route_code} value={r.route_code}>
                      {r.route_code} — {r.origin_city} → {r.destination_city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <CalendarRange size={11} style={{ verticalAlign: -2 }} /> Horizon
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {HORIZON_OPTIONS.map((h) => (
                  <button key={h.value} onClick={() => setHorizonDays(h.value)} style={toggleStyle(horizonDays === h.value)}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-grid">
          <StatCardBox label="Current Index" value={fmt(forecast.current_index)} mono />
          <StatCardBox label="Best Model" value={forecast.best_model_name ?? '—'} mono={false} />
          <StatCardBox label="Mean Forecast (30d)" value={fmt(forecast.summary_mean_forecast_30d)} mono />
          <StatCardBox label="Net CPI Transport Impact" value={`${fmt(forecast.net_cpi_transport_impact_bps)} bps`} mono />
        </div>

<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card-title">
            <TrendingUp size={16} style={{ color: 'var(--brand-saffron, #C2510A)' }} />
            {scope === 'national' ? 'National' : forecast.target_code} Forecast Trajectory
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
            As of {forecast.as_of_date ?? '—'} · champion model: <strong>{forecast.best_model_name ?? '—'}</strong> ({forecast.model_version ?? '—'}) · 95% confidence band shown
          </div>
          {chartData.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No forecast trajectory available.</p>
          ) : (
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.saffron} stopOpacity={0.22} />
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
                    label={{ value: scope === 'national' ? 'Index value' : 'Index (relative × 100)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: colors.axis } }}
                  />
                  <Tooltip content={renderTooltip} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="Historical"
                    stroke={colors.info}
                    strokeWidth={2}
                    fill="transparent"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="band_high"
                    stackId="ci"
                    stroke="none"
                    fill="url(#bandFill)"
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="band_low"
                    stackId="ci"
                    stroke="none"
                    fill="url(#bandFill)"
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="Forecast (output)"
                    stroke={colors.saffron}
                    strokeWidth={2}
                    fill="transparent"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

<div className="grid-two" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card">
            <div className="card-title">
              <Cpu size={16} style={{ color: colors.info }} />
              Model Catalogue
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
              {modelsState.catalogue?.selection_strategy ?? 'Models are selected automatically by walk-forward validation.'}
            </p>
            {modelCatalogue.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No model metadata available.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {modelCatalogue.map((m) => {
                  const score = leaderboard.find((l) => l.model_name === m.model_name);
                  const isActive = selectedModel === m.model_name;
                  return (
                    <button
                      key={m.model_name}
                      onClick={() => setSelectedModel(m.model_name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        border: '1px solid var(--border-primary)',
                        background: isActive ? 'var(--brand-saffron-light, rgba(194,81,10,0.08))' : 'var(--bg-tertiary)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {m.display_name}
                          {score?.is_best_selected === true && <span style={{ marginLeft: 6, color: 'var(--semantic-success)' }}>★ champion</span>}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{m.model_name}</div>
                      </div>
                      {score && (
                        <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          sMAPE {fmt(score.smape, 2)}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

<div className="card" style={{ overflowX: 'auto' }}>
            <div className="card-title">
              <TrendingUp size={16} style={{ color: colors.saffron }} />
              Model Evaluation Leaderboard
            </div>
            {leaderboard.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No leaderboard returned by the forecast API.</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 480 }}>
                <thead>
                  <tr>
                    {['Model', 'MAE', 'RMSE', 'MAPE %', 'sMAPE %', 'R²'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((score) => (
                    <tr
                      key={score.model_name}
                      style={{
                        borderTop: '1px solid var(--border-secondary)',
                        background: selectedModel === score.model_name ? 'var(--brand-saffron-light, rgba(194,81,10,0.08))' : undefined,
                      }}
                    >
                      <td style={tdStyle}>
                        <strong style={{ color: 'var(--text-primary)' }}>{score.model_name.replace(/_/g, ' ')}</strong>
                        {score.is_best_selected && <span style={{ color: 'var(--semantic-success)', marginLeft: 6 }}>★</span>}
                      </td>
                      <td style={tdStyle}>{fmt(score.mae, 3)}</td>
                      <td style={tdStyle}>{fmt(score.rmse, 3)}</td>
                      <td style={tdStyle}>{fmt(score.mape, 2)}</td>
                      <td style={tdStyle}>{fmt(score.smape, 2)}</td>
                      <td style={tdStyle}>{fmt(score.r2, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

<div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card-title">
            <TrendingUp size={16} style={{ color: colors.saffron }} />
            Forecast Snapshot by Horizon
          </div>
          {Object.keys(forecast.horizons ?? {}).length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No horizon snapshots returned.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
              {Object.values(forecast.horizons ?? {}).map((h) => (
                <div key={h.horizon_days} style={{ padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h.horizon_days}d · {h.target_date}
                  </div>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', margin: '4px 0' }}>
                    {fmt(h.forecast_value)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    95% CI: [{fmt(h.lower_bound_95)} — {fmt(h.upper_bound_95)}]
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {h.confidence_level !== undefined ? `Confidence ${(h.confidence_level * 100).toFixed(0)}%` : 'Confidence 95%'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}

function toggleStyle(active: boolean): CSSProperties {
  return {
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--font-medium)',
    cursor: 'pointer',
    border: '1px solid var(--border-primary)',
    background: active ? 'var(--brand-saffron, #C2510A)' : 'var(--bg-tertiary)',
    color: active ? '#fff' : 'var(--text-secondary)',
  };
}

function StatCardBox({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', color: 'var(--text-primary)', lineHeight: 'var(--leading-tight)' }}>
        {value}
      </span>
    </div>
  );
}

const thStyle: CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--font-semibold)',
  color: 'var(--text-secondary)',
  padding: 'var(--space-2) var(--space-3)',
  borderBottom: '1px solid var(--border-primary)',
  whiteSpace: 'nowrap',
  textAlign: 'left',
};

const tdStyle: CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-secondary)',
  padding: 'var(--space-2) var(--space-3)',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--font-mono)',
};