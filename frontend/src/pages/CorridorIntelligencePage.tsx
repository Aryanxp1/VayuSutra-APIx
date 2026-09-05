import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Info, MapPin, Network, TrendingUp, AlertTriangle } from 'lucide-react';
import { getHeatmap, getRoutes, getRouteIntelligence } from '@/lib/api';
import type {
  HeatmapResponse,
  HeatmapMatrixRow,
  HeatmapCellInfo,
  RoutesResponse,
  RouteSummary,
  RouteIntelligenceResponse,
} from '@/lib/types';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';

const HORIZON_KEYS = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'];

const HORIZON_LABELS: Record<string, string> = {
  'T+1': 'Spot / Emergency',
  'T+7': 'Urgent Business',
  'T+15': 'Standard Planned',
  'T+30': 'Planned Leisure',
  'T+45': 'Early Bird',
};

function fmt(value: number | undefined | null, digits = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function statusColors(status: string): { bg: string; text: string } {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  switch (status) {
    case 'SURGE':
      return dark ? { bg: 'rgba(220,38,38,0.28)', text: '#FCA5A5' } : { bg: 'rgba(220,38,38,0.14)', text: '#B91C1C' };
    case 'ELEVATED':
      return dark ? { bg: 'rgba(217,119,6,0.25)', text: '#FCD34D' } : { bg: 'rgba(217,119,6,0.14)', text: '#B45309' };
    case 'DISCOUNTED':
      return dark ? { bg: 'rgba(22,163,74,0.25)', text: '#86EFAC' } : { bg: 'rgba(22,163,74,0.14)', text: '#15803D' };
    default:
      return dark ? { bg: 'rgba(148,163,184,0.18)', text: '#CBD5E1' } : { bg: 'rgba(100,116,139,0.12)', text: '#475569' };
  }
}

function HeatmapTooltip({ cell, route }: { cell: HeatmapCellInfo | undefined; route: HeatmapMatrixRow }) {
  if (!cell) return null;
  const status = statusColors(cell.status);
  return (
    <div
      style={{
        background: 'var(--chart-tooltip-bg)',
        border: '1px solid var(--chart-tooltip-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-xs)',
        boxShadow: 'var(--shadow-md)',
        minWidth: 190,
      }}
    >
      <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)', marginBottom: 4 }}>
        {route.route_code} · {HORIZON_LABELS[cell.advance_window] ?? cell.advance_window}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, color: 'var(--text-secondary)' }}>
        <span>
          Fare: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>₹{fmt(cell.current_fare_inr)}</strong>
        </span>
        <span>Benchmark: ₹{fmt(cell.base_benchmark_fare)}</span>
        <span>
          vs benchmark: <strong style={{ color: status.text }}>{cell.price_change_pct >= 0 ? '+' : ''}{fmt(cell.price_change_pct, 1)}%</strong>
        </span>
        <span>Volatility: {fmt(cell.volatility_score, 2)}</span>
        <span>Sample size: {cell.sample_size}</span>
        <span>
          Status: <strong style={{ color: status.text }}>{cell.status}</strong>
        </span>
      </div>
    </div>
  );
}

interface CorridorData {
  heatmap: HeatmapResponse | null;
  routes: RoutesResponse | null;
}

export function CorridorIntelligencePage() {
  const [data, setData] = useState<CorridorData>({ heatmap: null, routes: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{ rowIdx: number; horizon: string } | null>(null);
  const [intel, setIntel] = useState<RouteIntelligenceResponse | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [heatmapResult, routesResult] = await Promise.allSettled([getHeatmap(), getRoutes()]);
    setData({
      heatmap: heatmapResult.status === 'fulfilled' ? heatmapResult.value : null,
      routes: routesResult.status === 'fulfilled' ? routesResult.value : null,
    });
    const failures = [heatmapResult, routesResult].filter((r) => r.status === 'rejected').length;
    if (failures > 0) setError(`${failures} of 2 corridor data sources could not be loaded. Showing available data.`);
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const routeByCode = useMemo(() => {
    const map = new Map<string, RouteSummary>();
    (data.routes?.routes ?? []).forEach((r) => map.set(r.route_code, r));
    return map;
  }, [data.routes]);

  const selectRoute = useCallback(
    async (routeCode: string) => {
      setSelectedRoute(routeCode);
      setIntel(null);
      setIntelError(null);
      setIntelLoading(true);
      try {
        const report = await getRouteIntelligence(routeCode);
        setIntel(report);
      } catch (err) {
        setIntelError(err instanceof Error ? err.message : `Route intelligence for ${routeCode} failed to load.`);
      } finally {
        setIntelLoading(false);
      }
    },
    []
  );

  if (loading) return <PageLoading />;

  const heatmap = data.heatmap;
  const dataTag = heatmap ? 'REAL_COMPUTED' : data.routes?.data_tag ?? 'MODELLED';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Corridor Intelligence</h1>
          <p className="page-subtitle">
            The 20×5 airfare heatmap matrix across DGCA top corridors and booking horizons, with surge status and
            per-route intelligence dossiers.
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
          Heatmap values are computed by the VayuSutra engine from simulated market feeds. Select a route row to load
          its corridor intelligence dossier.
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <ErrorState message={error} onRetry={load} />
        </div>
      )}

{!heatmap && !data.routes ? (
        <ErrorState message="Unable to reach the VayuSutra API. Ensure the backend is running and the Vite proxy is active." onRetry={load} />
      ) : (
        <>
          {heatmap && (
            <div className="card" style={{ marginBottom: 'var(--space-5)', overflowX: 'auto' }}>
              <div className="card-title">
                <Network size={16} style={{ color: 'var(--brand-saffron, #C2510A)' }} />
                20×{heatmap.total_horizons ?? 5} Airfare Heatmap Matrix — {heatmap.as_of_date ?? '—'}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <span>{heatmap.total_routes ?? 0} corridors</span>
                <span>SURGE: {heatmap.summary_surge_count ?? 0}</span>
                <span>DISCOUNTED: {heatmap.summary_discount_count ?? 0}</span>
                <span>As of {heatmap.as_of_date ?? '—'}</span>
              </div>

              {heatmap.matrix_rows.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No heatmap rows available.</p>
              ) : (
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Route</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>DGCA Wt %</th>
                      {HORIZON_KEYS.map((h) => (
                        <th key={h} style={{ ...thStyle, textAlign: 'center' }}>
                          {h}
                          <div style={{ fontWeight: 'var(--font-normal)', color: 'var(--text-tertiary)' }}>{HORIZON_LABELS[h]}</div>
                        </th>
                      ))}
                      <th style={{ ...thStyle, textAlign: 'right' }}>Avg Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatmap.matrix_rows.map((row, idx) => (
                      <tr
                        key={row.route_code}
                        onClick={() => selectRoute(row.route_code)}
                        style={{
                          cursor: 'pointer',
                          background: selectedRoute === row.route_code ? 'var(--brand-saffron-light, rgba(194,81,10,0.08))' : undefined,
                          borderTop: '1px solid var(--border-secondary)',
                        }}
                      >
                        <td style={{ ...tdStyle, textAlign: 'left' }}>
                          <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-xs)' }}>{row.route_code}</strong>
                          <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{row.origin_city} ↔ {row.destination_city}</div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {fmt(row.dgca_weight_pct, 2)}
                        </td>
                        {HORIZON_KEYS.map((h) => {
                          const cell = row.horizon_cells[h];
                          const status = statusColors(cell?.status ?? 'NORMAL');
                          const hovered = hoverCell?.rowIdx === idx && hoverCell.horizon === h;
                          return (
                            <td
                              key={h}
                              style={{
                                ...tdStyle,
                                textAlign: 'center',
                                background: cell ? status.bg : undefined,
                                boxShadow: hovered ? 'inset 0 0 0 1px var(--border-focus)' : undefined,
                                position: 'relative',
                              }}
                              onMouseEnter={() => setHoverCell({ rowIdx: idx, horizon: h })}
                              onMouseLeave={() => setHoverCell(null)}
                            >
                              {cell ? (
                                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: status.text, fontFamily: 'var(--font-mono)' }}>
                                  ₹{fmt(cell.current_fare_inr, 0)}
                                </div>
                              ) : (
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>
                              )}
                              {hovered && <HeatmapTooltip cell={cell} route={row} />}
                            </td>
                          );
                        })}
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          ₹{fmt(row.corridor_average_fare, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

{!heatmap && (
            <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Heatmap unavailable. Route selection below still works from the DGCA basket.</p>
            </div>
          )}

          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-title">
              <MapPin size={16} style={{ color: 'var(--semantic-info)' }} />
              Route Selector
            </div>
            {(data.routes?.routes ?? []).length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No routes available.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {(data.routes?.routes ?? [])
                  .filter((r, i, arr) => arr.findIndex((x) => x.route_code === r.route_code) === i)
                  .map((r) => (
                    <button
                      key={r.route_code}
                      onClick={() => selectRoute(r.route_code)}
                      style={{
                        padding: 'var(--space-1) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-medium)',
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        border: '1px solid var(--border-primary)',
                        background: selectedRoute === r.route_code ? 'var(--brand-saffron, #C2510A)' : 'var(--bg-tertiary)',
                        color: selectedRoute === r.route_code ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {r.route_code}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {intelLoading && <div style={{ padding: 'var(--space-6)' }}><PageLoading /></div>}

          {intelError && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <ErrorState message={intelError} onRetry={() => selectedRoute && selectRoute(selectedRoute)} />
            </div>
          )}

          {intel && <RouteIntelligencePanel data={intel} />}
        </>
      )}
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
};

const tdStyle: CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-secondary)',
  padding: 'var(--space-2) var(--space-3)',
  whiteSpace: 'nowrap',
};

function RouteIntelligencePanel({ data }: { data: RouteIntelligenceResponse }) {
  const meta = data.metadata;
  const metrics = data.current_metrics;
  const horizons = Object.values(data.horizon_breakdown ?? {});
  const trend = data.historical_trend_30d ?? [];
  const carriers = data.carrier_distribution ?? [];
  const anomalies = data.recent_anomalies ?? [];

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-title">
          <MapPin size={16} style={{ color: 'var(--brand-saffron, #C2510A)' }} />
          Route Intelligence — {data.route_code}
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          {data.corridor_name}
        </p>
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
            <Metric label="Representative Jevons Fare" value={`₹${fmt(metrics.representative_jevons_fare_inr)}`} />
            <Metric label="Composite Price Relative" value={fmt(metrics.composite_price_relative, 4)} />
            <Metric label="Change 24h" value={`${metrics.change_24h_pct !== undefined && metrics.change_24h_pct >= 0 ? '+' : ''}${fmt(metrics.change_24h_pct)}%`} />
            <Metric label="Change 7d" value={`${metrics.change_7d_pct !== undefined && metrics.change_7d_pct >= 0 ? '+' : ''}${fmt(metrics.change_7d_pct)}%`} />
            <Metric label="Change 30d" value={`${metrics.change_30d_pct !== undefined && metrics.change_30d_pct >= 0 ? '+' : ''}${fmt(metrics.change_30d_pct)}%`} />
            <Metric label="CPI Transport Impact" value={`${fmt(metrics.cpi_transport_impact_bps, 3)} bps`} />
            <Metric label="Headline CPI Impact" value={`${fmt(metrics.headline_cpi_impact_bps, 4)} bps`} />
            <Metric label="Volatility Score" value={fmt(metrics.volatility_score, 2)} />
            <Metric label="Source Consensus" value={`${fmt(metrics.source_consensus_score, 1)} / 100`} />
          </div>
        )}
        {meta && (
          <div
            style={{
              marginTop: 'var(--space-4)',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--border-secondary)',
              display: 'flex',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
            }}
          >
            <span>{meta.origin_city} ({meta.origin_iata}) → {meta.destination_city} ({meta.destination_iata})</span>
            <span>Distance: {meta.distance_km} km</span>
            <span>DGCA weight: {meta.dgca_volume_weight_pct}%</span>
            <span>Base benchmark: ₹{fmt(meta.base_fare_benchmark_inr)}</span>
            {meta.is_metro_corridor && <span>Metro corridor</span>}
          </div>
        )}
      </div>

<div className="grid-two" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="card-title">
            <TrendingUp size={16} style={{ color: 'var(--brand-saffron, #C2510A)' }} />
            Booking-Horizon Fare Breakdown
          </div>
          {horizons.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No horizon data.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {horizons.map((h) => (
                <div
                  key={h.window_name ?? h.days_advance}
                  style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{h.window_name ?? '—'} · {h.days_advance}d</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      ₹{fmt(h.fare_inr)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    Benchmark ₹{fmt(h.base_benchmark_fare)} · relative {fmt(h.relative, 3)} · window weight {fmt(h.weight_pct, 1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <AlertTriangle size={16} style={{ color: 'var(--semantic-warning)' }} />
            Recent Anomalies
          </div>
          {anomalies.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>No anomalies flagged.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {anomalies.slice(0, 5).map((a) => (
                <div key={a.anomaly_id ?? a.description} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{a.anomaly_type}</strong> · {a.severity}
                  {a.z_score !== undefined && <span> · z={fmt(a.z_score, 2)}</span>}
                  <div style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{a.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

{(trend.length > 0 || carriers.length > 0) && (
        <div className="grid-two-rev">
          {trend.length > 0 && (
            <div className="card">
              <div className="card-title">
                <TrendingUp size={16} style={{ color: 'var(--semantic-info)' }} />
                Historical Trend (30d)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', maxHeight: 260, overflowY: 'auto' }}>
                {trend.map((t) => (
                  <div key={t.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px var(--space-1)' }}>
                    <span>{t.date}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>₹{fmt(t.fare_inr)} · {fmt(t.index_relative, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {carriers.length > 0 && (
            <div className="card">
              <div className="card-title">
                <TrendingUp size={16} style={{ color: 'var(--brand-saffron, #C2510A)' }} />
                Carrier Distribution
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {carriers.map((c) => (
                  <div key={c.carrier}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 3 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{c.carrier}</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        ₹{fmt(c.fare_inr)} · {fmt(c.market_share_pct, 1)}%
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, c.market_share_pct)}%`, background: 'var(--brand-saffron, #C2510A)', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
    </div>
  );
}