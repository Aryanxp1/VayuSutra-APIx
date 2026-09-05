import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Database,
  Download,
  ExternalLink,
  FileJson,
  HardDrive,
  RefreshCw,
  Search,
  Table2,
} from 'lucide-react';
import { getDatasetCatalog, getFlightQuotes } from '@/lib/api';
import type { DatasetCatalogResponse, DatasetSourceType, FlightQuotesResponse } from '@/lib/types';
import { StatCard } from '@/components/common/StatCard';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { apiErrorMessage } from '@/lib/errors';
import { tdStyle, thStyle } from '@/components/common/formStyles';

const TYPE_LABELS: Record<DatasetSourceType, string> = {
  official: 'OFFICIAL',
  derived: 'DERIVED',
  modelled: 'MODELLED',
};
const TYPE_COLORS: Record<DatasetSourceType, { color: string; bg: string }> = {
  official: { color: 'var(--semantic-info)', bg: 'var(--semantic-info-bg)' },
  derived: { color: 'var(--semantic-warning)', bg: 'var(--semantic-warning-bg)' },
  modelled: { color: 'var(--semantic-error)', bg: 'var(--semantic-error-bg)' },
};

function fmtCount(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-IN');
}

export function DatasetExplorerPage() {
  const [catalog, setCatalog] = useState<DatasetCatalogResponse | null>(null);
  const [quotes, setQuotes] = useState<FlightQuotesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, qtRes] = await Promise.all([getDatasetCatalog(), getFlightQuotes(10)]);
      setCatalog(catRes);
      setQuotes(qtRes);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const entries = useMemo(() => {
    const list = catalog?.catalog ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((d) => {
      const matchesType = typeFilter === 'ALL' ? true : d.source_type === typeFilter;
      const matchesQuery = q.length === 0
        ? true
        : `${d.dataset_id} ${d.name} ${d.source}`.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [catalog, query, typeFilter]);

  const totalRecords = useMemo(() => (catalog?.catalog ?? []).reduce((s, d) => s + d.record_count, 0), [catalog]);
  const breakdown = catalog?.source_type_breakdown ?? { official: 0, derived: 0, modelled: 0 };

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dataset Explorer</h1>
          <p className="page-subtitle">
            Live registry of every VayuSutra dataset. Counts, coverage windows and timestamps are
            computed from the database and statutory CSV archives on every request.
          </p>
        </div>
        <span className="badge-phase">REAL TRACEABLE</span>
      </div>

      <div className="data-source-strip">
        <RefreshCw size={14} />
        {catalog?.total_datasets ?? 0} datasets · {fmtCount(totalRecords)} total records
      </div>

      <div className="stat-grid">
        <StatCard label="Datasets" value={catalog?.total_datasets ?? 0} icon={<Database size={16} />} mono />
        <StatCard label="Official" value={breakdown.official} icon={<HardDrive size={16} />} mono />
        <StatCard label="Derived" value={breakdown.derived} icon={<Table2 size={16} />} mono />
        <StatCard label="Modelled" value={breakdown.modelled} icon={<FileJson size={16} />} mono />
      </div>
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 420 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-tertiary)' }} />
          <input
            className="filter-select"
            style={{ width: '100%', paddingLeft: 30 }}
            placeholder="Search dataset id, name or source…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by source type">
          <option value="ALL">All source types</option>
          <option value="official">Official</option>
          <option value="derived">Derived</option>
          <option value="modelled">Modelled</option>
        </select>
        <button className="action-btn" onClick={load}>Refresh</button>
      </div>

      {entries.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Database size={22} />}
            title="No datasets match the current filters"
            description="Try clearing the search query or choosing a different source type."
          />
        </div>
      ) : (
        <div className="card-grid-3">
          {entries.map((d) => {
            const c = TYPE_COLORS[d.source_type];
            return (
              <div className="card" key={d.dataset_id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span className="type-chip">{d.dataset_id}</span>
                  <span className="type-chip" style={{ color: c.color, background: c.bg }}>
                    {TYPE_LABELS[d.source_type]}
                  </span>
                </div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  {d.name}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, flex: 1 }}>
                  {d.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className="type-chip">{d.source.split('—')[0]}</span>
                  <span className="data-tag-chip">{d.data_tag}</span>
                </div>
                <div className="meta-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="meta-item">
                    <span className="meta-item-label">Records</span>
                    <span className="meta-item-value">{fmtCount(d.record_count)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-item-label">Frequency</span>
                    <span className="meta-item-value" style={{ fontSize: 'var(--text-xs)' }}>{d.update_frequency}</span>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  Coverage: <span style={{ fontFamily: 'var(--font-mono)' }}>{d.coverage ?? '—'}</span>
                  <br />
                  Last updated: {d.last_updated ?? '—'}
                </div>
                <a
                  className="action-btn"
                  href={d.download_endpoint}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: 'var(--space-2)' }}
                >
                  <Download size={14} /> Access dataset <ExternalLink size={12} />
                </a>
              </div>
            );
          })}
        </div>
      )}
      {quotes && quotes.quotes.length > 0 && (
        <>
          <div style={{ height: 'var(--space-5)' }} />
          <div className="card">
            <div className="card-title">
              <Table2 size={16} style={{ color: 'var(--semantic-info)' }} />
              Live Flight Quote Sample ({quotes.count})
              <span className="data-tag-chip">{quotes.data_tag}</span>
            </div>
            <div className="table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Route</th>
                    <th style={thStyle}>Airline</th>
                    <th style={thStyle}>Portal</th>
                    <th style={thStyle}>Window</th>
                    <th style={thStyle}>Base Fare</th>
                    <th style={thStyle}>Total Fare</th>
                    <th style={thStyle}>Booking</th>
                    <th style={thStyle}>Travel</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.quotes.map((q) => (
                    <tr key={q.quote_id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{q.route_code}</td>
                      <td style={tdStyle}>{q.airline_name}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'normal' }}>{q.source_portal}</td>
                      <td style={tdStyle}>{q.advance_window}</td>
                      <td style={tdStyle}>₹{q.base_fare.toLocaleString('en-IN')}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>₹{q.total_fare.toLocaleString('en-IN')}</td>
                      <td style={tdStyle}>{q.booking_date}</td>
                      <td style={tdStyle}>{q.travel_date}</td>
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