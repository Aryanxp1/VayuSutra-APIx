import { useCallback, useEffect, useState } from 'react';
import { Award, CheckCircle2, Fingerprint, ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';
import { getDataQuality, getDataQualitySources, getProvenanceCertificate } from '@/lib/api';
import type { DataQualityResponse, DataQualitySourcesResponse, ProvenanceCertificate } from '@/lib/types';
import { StatCard } from '@/components/common/StatCard';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { apiErrorMessage } from '@/lib/errors';
import { tdStyle, thStyle } from '@/components/common/formStyles';

function fmt(value: number | undefined | null, digits = 1): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function healthClass(h: string): string {
  const s = h.toUpperCase();
  if (s === 'HEALTHY') return 'health-healthy';
  if (s === 'AT_RISK') return 'health-at-risk';
  if (s === 'DEGRADED') return 'health-degraded';
  return 'health-unknown';
}

const DIMENSIONS: Array<{ key: keyof Pick<DataQualityResponse, 'freshness_pct' | 'completeness_pct' | 'route_coverage_pct' | 'source_health_pct' | 'validation_success_pct' | 'consensus_score'>; label: string }> = [
  { key: 'freshness_pct', label: 'Freshness' },
  { key: 'completeness_pct', label: 'Completeness' },
  { key: 'route_coverage_pct', label: 'Route Coverage' },
  { key: 'source_health_pct', label: 'Source Health' },
  { key: 'validation_success_pct', label: 'Validation Success' },
  { key: 'consensus_score', label: 'Cross-Source Consensus' },
];

interface TrustData {
  quality: DataQualityResponse | null;
  sources: DataQualitySourcesResponse | null;
  provenance: ProvenanceCertificate | null;
}

export function DataTrustPage() {
  const [data, setData] = useState<TrustData>({ quality: null, sources: null, provenance: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealHash, setRevealHash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [quality, sources, provenance] = await Promise.all([
        getDataQuality(),
        getDataQualitySources(),
        getProvenanceCertificate(),
      ]);
      setData({ quality, sources, provenance });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = data.quality;
  const weights = q?.weights_breakdown ?? {};
  const tv = q?.overall_trust_score ?? 0;
  const fillColor = tv >= 85 ? 'var(--semantic-success)' : tv >= 70 ? 'var(--semantic-info)' : tv >= 55 ? 'var(--semantic-warning)' : 'var(--semantic-error)';

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Trust Center</h1>
          <p className="page-subtitle">
            Seven-dimension quality scorecard and cryptographic provenance vault, computed live from
            the observation pipeline — no hardcoded ratings.
          </p>
        </div>
        <span className="badge-phase">REAL COMPUTED</span>
      </div>

      <div className="data-source-strip">
        <RefreshCw size={14} />
        Snapshot {q?.snapshot_date ?? '—'} · {q?.data_tag ?? 'REAL_COMPUTED'} ·{' '}
        {data.sources?.healthy_count ?? 0}/{data.sources?.count ?? 0} sources healthy
      </div>

      <div className="card" style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <div style={{ width: 180, flexShrink: 0 }}>
          <div style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', fontFamily: 'var(--font-mono)', color: fillColor, lineHeight: 1 }}>
            {fmt(tv, 1)}
          </div>
          <div className="progress-track" style={{ margin: 'var(--space-2) 0' }}>
            <div className="progress-fill" style={{ width: `${tv}%`, background: fillColor }} />
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: fillColor }}>
            <ShieldCheck size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            {q?.status_rating}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="meta-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="meta-item">
              <span className="meta-item-label">Consensus</span>
              <span className="meta-item-value">{fmt(q?.consensus_score)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-item-label">Outlier rate</span>
              <span className="meta-item-value">{fmt(q?.outlier_rate_pct)}%</span>
            </div>
            <div className="meta-item">
              <span className="meta-item-label">Duplicate rate</span>
              <span className="meta-item-value">{fmt(q?.duplicate_rate_pct)}%</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="card-title">
            <ShieldCheck size={16} style={{ color: fillColor }} />
            Quality Dimensions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {DIMENSIONS.map((d) => {
              const raw = q?.[d.key];
              const value = typeof raw === 'number' ? raw : 0;
              const color = value >= 85 ? 'var(--semantic-success)' : value >= 70 ? 'var(--semantic-info)' : value >= 55 ? 'var(--semantic-warning)' : 'var(--semantic-error)';
              return (
                <div key={d.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)', fontFamily: 'var(--font-mono)' }}>{fmt(value)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${value}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <Award size={16} style={{ color: 'var(--semantic-warning)' }} />
            Dimension Weights
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Explicit coefficient of each dimension in the composite trust formulation. The consensus
              dimension is populated from the live cross-source disagreement analysis.
            </p>
            {Object.keys(weights).length === 0 ? (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                weights_breakdown not returned by engine
              </div>
            ) : (
              Object.entries(weights).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{fmt(v as number, 3)}</span>
                </div>
              ))
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'auto' }}>
              <div className="meta-item">
                <span className="meta-item-label">Validation</span>
                <span className="meta-item-value">{fmt(q?.validation_success_pct)}%</span>
              </div>
              <div className="meta-item">
                <span className="meta-item-label">Snapshot</span>
                <span className="meta-item-value" style={{ fontSize: 'var(--text-xs)' }}>{q?.snapshot_date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="stat-grid">
        <StatCard label="Sources Monitored" value={data.sources?.count ?? 0} icon={<ShieldAlert size={16} />} mono />
        <StatCard label="Healthy" value={data.sources?.healthy_count ?? 0} icon={<CheckCircle2 size={16} />} mono />
        <StatCard label="At Risk" value={data.sources?.at_risk_count ?? 0} icon={<ShieldAlert size={16} />} mono />
        <StatCard label="Panel Observations" value={(data.sources?.total_observations ?? 0).toLocaleString('en-IN')} icon={<Fingerprint size={16} />} mono />
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-title">
          <ShieldCheck size={16} style={{ color: 'var(--semantic-info)' }} />
          Per-Source Health Panel
          <span className="data-tag-chip">REAL COMPUTED</span>
        </div>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Health</th>
                <th style={thStyle}>Observations</th>
                <th style={thStyle}>Share</th>
                <th style={thStyle}>Coverage</th>
                <th style={thStyle}>Avg Fare</th>
                <th style={thStyle}>Success 24h</th>
                <th style={thStyle}>Latency</th>
                <th style={thStyle}>Errors 24h</th>
              </tr>
            </thead>
            <tbody>
              {(data.sources?.sources ?? []).map((s) => (
                <tr key={s.source_id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 170 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{s.source_name}</div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.6rem' }}>{s.source_id}</div>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'normal' }}>
                    <span className="type-chip">{s.source_type}</span>
                  </td>
                  <td style={tdStyle}>
                    <span className={`health-chip ${healthClass(s.health)}`}>{s.health}</span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-primary)' }}>{s.observations.toLocaleString('en-IN')}</td>
                  <td style={tdStyle}>{s.share_of_panel_pct !== null && s.share_of_panel_pct !== undefined ? fmt(s.share_of_panel_pct) + '%' : '—'}</td>
                  <td style={tdStyle}>{s.coverage_start ?? '—'} → {s.coverage_end ?? '—'}</td>
                  <td style={tdStyle}>{s.avg_total_fare_inr ? `₹${s.avg_total_fare_inr.toLocaleString('en-IN')}` : '—'}</td>
                  <td style={tdStyle}>{fmt(s.success_rate_24h)}%</td>
                  <td style={tdStyle}>{fmt(s.avg_latency_ms)} ms</td>
                  <td style={tdStyle}>{s.error_count_24h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)' }}>
          {data.sources?.methodology}
        </p>
      </div>
      <div className="card">
        <div className="card-title">
          <Fingerprint size={16} style={{ color: 'var(--semantic-success)' }} />
          Cryptographic Provenance Vault
          <span className="type-chip">{data.provenance?.provenance_status ?? '—'}</span>
        </div>
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-item-label">Certificate</span>
            <span className="meta-item-value" style={{ fontSize: 'var(--text-xs)' }}>{data.provenance?.audit_certificate_id}</span>
          </div>
          <div className="meta-item">
            <span className="meta-item-label">Raw quotes hashed</span>
            <span className="meta-item-value">{(data.provenance?.verified_batch_telemetry.total_raw_quotes_hashed ?? 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="meta-item">
            <span className="meta-item-label">Cleaned verified</span>
            <span className="meta-item-value">{(data.provenance?.verified_batch_telemetry.total_cleaned_quotes_verified ?? 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="meta-item">
            <span className="meta-item-label">Latest calc date</span>
            <span className="meta-item-value" style={{ fontSize: 'var(--text-xs)' }}>{data.provenance?.verified_batch_telemetry.latest_calculation_date ?? '—'}</span>
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
          {revealHash ? data.provenance?.cryptographic_hash_sha256 : `${(data.provenance?.cryptographic_hash_sha256 ?? '').slice(0, 24)}…`}
          <button className="action-btn" style={{ marginLeft: 'var(--space-2)' }} onClick={() => setRevealHash((v) => !v)}>
            {revealHash ? 'Hide' : 'Reveal'} SHA-256
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{data.provenance?.compliance}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Verified {data.provenance?.verified_at ? new Date(data.provenance.verified_at).toLocaleString() : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}