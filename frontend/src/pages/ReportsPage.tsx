import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileText,
  RefreshCw,
  Bell,
  LineChart as LineChartIcon,
  Scale,
} from 'lucide-react';
import { getDailyReport, exportReportCsv, exportCsv } from '@/lib/api';
import type { DailyReportResponse } from '@/lib/types';
import { StatCard } from '@/components/common/StatCard';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { apiErrorMessage } from '@/lib/errors';
import { tdStyle, thStyle } from '@/components/common/formStyles';

function fmt(value: number | undefined | null, digits = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [report, setReport] = useState<DailyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getDailyReport());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async (kind: 'report' | 'statutory') => {
    setExporting(true);
    try {
      const blob = kind === 'report' ? await exportReportCsv() : await exportCsv();
      downloadBlob(blob, kind === 'report'
        ? `vayusutra_daily_report_${report?.publication_date ?? 'latest'}.csv`
        : `mospi_esankhyiki_cpi_${report?.publication_date ?? 'latest'}.csv`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const idx = report?.national_airfare_index;
  const cpi = report?.cpi_inflation_transmission;
  const fwd = report?.forward_14d_nowcast;
  const cs = report?.cross_source_consensus;
  const rising = report?.top_moving_corridors?.top_rising_contributors ?? [];
  const declining = report?.top_moving_corridors?.top_declining_contributors ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Exports</h1>
          <p className="page-subtitle">
            Automated daily intelligence dossier assembled from live index, consensus, trust and
            anomaly endpoints, with downloadable CSV artifacts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button className="action-btn" onClick={() => handleExport('statutory')} disabled={exporting}>
            <Download size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
            MoSPI Statutory CSV
          </button>
          <button className="action-btn" onClick={() => handleExport('report')} disabled={exporting}>
            <Download size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
            {exporting ? 'Preparing…' : 'Report CSV'}
          </button>
        </div>
      </div>

      <div className="data-source-strip">
        <RefreshCw size={14} />
        {report?.report_id} · {report?.report_title} · generated{' '}
        {report?.generated_at ? new Date(report.generated_at).toLocaleString() : '—'}
      </div>

      <div className="stat-grid">
        <StatCard label="Report ID" value={report?.report_id ?? '—'} icon={<FileText size={16} />} subtitle={report?.publication_date} />
        <StatCard label="Master Laspeyres" value={fmt(idx?.master_laspeyres_index)} icon={<Scale size={16} />} mono />
        <StatCard label="DoD Change" value={`${idx?.daily_percentage_change ?? 0 >= 0 ? '+' : ''}${fmt(idx?.daily_percentage_change)}%`} trend={idx && idx.daily_percentage_change >= 0 ? 'up' : 'down'} trendValue={fmt(Math.abs(idx?.daily_percentage_change ?? 0)) + '%'} mono />
        <StatCard label="Headline CPI bps" value={fmt(cpi?.headline_cpi_impact_bps, 4)} icon={<Bell size={16} />} mono />
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-title">
          <FileText size={16} style={{ color: 'var(--brand-saffron)' }} />
          Executive Summary
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
          {report?.executive_summary}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="card-title">
            <LineChartIcon size={16} style={{ color: 'var(--semantic-info)' }} />
            14-Day Forward Nowcast
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="meta-item">
              <span className="meta-item-label">Champion model</span>
              <span className="meta-item-value" style={{ fontSize: 'var(--text-sm)' }}>{fwd?.champion_model ?? '—'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-item-label">Mean forecast index</span>
              <span className="meta-item-value">{fmt(fwd?.mean_forecast_index)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-item-label">Projected headline bps</span>
              <span className="meta-item-value">{fmt(fwd?.projected_headline_cpi_bps, 4)}</span>
            </div>
            {fwd?.sample_horizon_7d && fwd.sample_horizon_14d && (
              <div className="meta-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="meta-item">
                  <span className="meta-item-label">T+7 · {fwd.sample_horizon_7d.target_date}</span>
                  <span className="meta-item-value">{fmt(fwd.sample_horizon_7d.forecast_value)}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    CI [{fmt(fwd.sample_horizon_7d.lower_bound_95)} — {fmt(fwd.sample_horizon_7d.upper_bound_95)}]
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-item-label">T+14 · {fwd.sample_horizon_14d.target_date}</span>
                  <span className="meta-item-value">{fmt(fwd.sample_horizon_14d.forecast_value)}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    CI [{fmt(fwd.sample_horizon_14d.lower_bound_95)} — {fmt(fwd.sample_horizon_14d.upper_bound_95)}]
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <Scale size={16} style={{ color: 'var(--semantic-warning)' }} />
            Index & Transmission Snapshot
          </div>
          <div className="meta-grid">
            <div className="meta-item">
              <span className="meta-item-label">Laspeyres</span>
              <span className="meta-item-value">{fmt(idx?.master_laspeyres_index)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-item-label">Fisher Ideal</span>
              <span className="meta-item-value">{fmt(idx?.fisher_ideal_index)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-item-label">Paasche</span>
              <span className="meta-item-value">{fmt(idx?.paasche_index)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-item-label">Spot T+1</span>
              <span className="meta-item-value">{fmt(idx?.spot_t1_index)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-item-label">Transport bps</span>
              <span className="meta-item-value">{fmt(cpi?.transport_subgroup_impact_bps)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-item-label">Effective weight</span>
              <span className="meta-item-value" style={{ fontSize: 'var(--text-xs)' }}>{fmt(cpi?.effective_headline_weight, 5)}</span>
            </div>
          </div>
          {cs && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              <span className="type-chip">Market consensus {fmt(cs.market_consensus_score)}</span>
              <span className="type-chip">{cs.high_disagreement_routes_count} high-disagreement corridors</span>
            </div>
          )}
        </div>
      </div>
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-title">
          <ArrowUpRight size={16} style={{ color: 'var(--semantic-error)' }} />
          Top Rising Corridors
          <span className="type-chip">{rising.length} corridors</span>
        </div>
        {rising.length === 0 ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No rising contributors in this report.</p>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Route</th>
                  <th style={thStyle}>Corridor</th>
                  <th style={thStyle}>Weight</th>
                  <th style={thStyle}>Movement</th>
                  <th style={thStyle}>Transport bps</th>
                  <th style={thStyle}>Headline bps</th>
                  <th style={thStyle}>Share of Δ</th>
                </tr>
              </thead>
              <tbody>
                {rising.map((c) => (
                  <tr key={`${c.route_code}-${c.rank}`} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{c.route_code}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 150 }}>{c.corridor_name}</td>
                    <td style={tdStyle}>{fmt(c.route_weight_pct)}%</td>
                    <td style={{ ...tdStyle, color: 'var(--semantic-error)', fontWeight: 'var(--font-semibold)' }}>+{fmt(c.price_movement_pct)}%</td>
                    <td style={tdStyle}>{fmt(c.transport_subgroup_impact_bps)}</td>
                    <td style={tdStyle}>{fmt(c.headline_cpi_impact_bps, 4)}</td>
                    <td style={tdStyle}>{fmt(c.share_of_total_inflation_pct)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-title">
          <ArrowDownRight size={16} style={{ color: 'var(--semantic-success)' }} />
          Declining Corridors
          <span className="type-chip">{declining.length} corridors</span>
        </div>
        {declining.length === 0 ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No decliners in this report.</p>
        ) : (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Route</th>
                  <th style={thStyle}>Corridor</th>
                  <th style={thStyle}>Movement</th>
                  <th style={thStyle}>Transport bps</th>
                  <th style={thStyle}>Headline bps</th>
                </tr>
              </thead>
              <tbody>
                {declining.map((c) => (
                  <tr key={`${c.route_code}-${c.rank}`} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{c.route_code}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 150 }}>{c.corridor_name}</td>
                    <td style={{ ...tdStyle, color: 'var(--semantic-success)', fontWeight: 'var(--font-semibold)' }}>{fmt(c.price_movement_pct)}%</td>
                    <td style={tdStyle}>{fmt(c.transport_subgroup_impact_bps)}</td>
                    <td style={tdStyle}>{fmt(c.headline_cpi_impact_bps, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="card-title">
            <Scale size={16} style={{ color: 'var(--brand-saffron)' }} />
            Methodology Metadata
          </div>
          <div className="meta-grid">
            {Object.entries(report?.methodology_metadata ?? {}).map(([k, v]) => (
              <div className="meta-item" key={k}>
                <span className="meta-item-label">{k.replace(/_/g, ' ')}</span>
                <span className="meta-item-value" style={{ fontSize: 'var(--text-xs)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            <FileText size={16} style={{ color: 'var(--semantic-info)' }} />
            Section Data Tags
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {Object.entries(report?.data_tags ?? {}).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {k.replace(/_/g, ' ')}
                </span>
                <span className="data-tag-chip">{v}</span>
              </div>
            ))}
            {Object.keys(report?.data_tags ?? {}).length === 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No section tags returned.</p>
            )}
          </div>
        </div>
      </div>

      {(report?.active_market_anomalies?.length ?? 0) > 0 && (
        <div className="card">
          <div className="card-title">
            <Bell size={16} style={{ color: 'var(--semantic-error)' }} />
            Active Market Anomalies in Report
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {report!.active_market_anomalies!.map((a) => (
              <div key={a.anomaly_id} className="meta-item" style={{ minWidth: 220, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="meta-item-label">{a.route_code} · {a.metric}</span>
                  <span className="severity-chip severity-critical">{a.severity}</span>
                </div>
                <span className="meta-item-value">+{fmt(a.deviation_pct, 1)}% deviation</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{a.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}