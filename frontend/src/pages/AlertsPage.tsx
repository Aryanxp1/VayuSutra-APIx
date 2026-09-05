import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, Plus, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { getAlerts, getAlertRules, createAlertRule, updateAlertStatus } from '@/lib/api';
import type { AlertRecord, AlertRulesResponse, AlertsResponse, AlertRuleInput } from '@/lib/types';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { apiErrorMessage } from '@/lib/errors';
import { tdStyle, thStyle } from '@/components/common/formStyles';

function fmt(value: number | string | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return typeof value === 'number' ? value.toFixed(digits) : String(value);
}

function severityClass(sev: string): string {
  const s = sev.toUpperCase();
  if (s === 'CRITICAL') return 'severity-critical';
  if (s === 'HIGH') return 'severity-high';
  if (s === 'MEDIUM') return 'severity-medium';
  return 'severity-low';
}

function statusClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'RESOLVED') return 'severity-resolved';
  if (s === 'ACKNOWLEDGED') return 'severity-acknowledged';
  return 'severity-detected';
}

interface AlertsState {
  alerts: AlertsResponse | null;
  rules: AlertRulesResponse | null;
}

export function AlertsPage() {
  const [data, setData] = useState<AlertsState>({ alerts: null, rules: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [form, setForm] = useState<AlertRuleInput>({
    rule_name: '',
    metric_target: 'pressure_score',
    condition_operator: '>',
    threshold_value: 70,
    severity: 'HIGH',
    is_enabled: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [alerts, rules] = await Promise.all([getAlerts(), getAlertRules()]);
      setData({ alerts, rules });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshAlerts = useCallback(async () => {
    try {
      const fresh = await getAlerts();
      setData((prev) => ({ ...prev, alerts: fresh }));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  const handleStatus = useCallback(async (alert: AlertRecord, newStatus: string) => {
    setBusyId(alert.alert_id);
    try {
      await updateAlertStatus(alert.alert_id, newStatus, 'clerk');
      await refreshAlerts();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }, [refreshAlerts]);

  const handleCreate = useCallback(async () => {
    setFormMsg(null);
    try {
      const res = await createAlertRule({ ...form, rule_name: form.rule_name.trim() || `${form.metric_target} rule` });
      setFormMsg(res.message as string);
      setShowForm(false);
      const freshRules = await getAlertRules();
      setData((prev) => ({ ...prev, rules: freshRules }));
    } catch (err) {
      setFormMsg(apiErrorMessage(err));
    }
  }, [form]);

  const filtered = useMemo(() => {
    const list = data.alerts?.alerts ?? [];
    return statusFilter === 'ALL' ? list : list.filter((a) => a.status.toUpperCase() === statusFilter);
  }, [data, statusFilter]);

  const labels = data.alerts?.metric_labels ?? {};
  const metrics = data.alerts?.current_metrics ?? {};
  const monitored: Array<[string, number | string | null]> = [
    ['daily_pct_change', (metrics.daily_pct_change as number) ?? null],
    ['bps_transport_impact', (metrics.bps_transport_impact as number) ?? null],
    ['pressure_score', (metrics.pressure_score as number) ?? null],
    ['overall_trust_score', (metrics.overall_trust_score as number) ?? null],
    ['anomaly_severity', (metrics.anomaly_severity as number) ?? null],
  ];

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Alert Center</h1>
          <p className="page-subtitle">
            Rule evaluation on read: every visit recomputes live metrics, persists any genuinely
            triggered alerts, and returns the full operational log.
          </p>
        </div>
        <span className="badge-phase">LIVE EVALUATION</span>
      </div>

      <div className="data-source-strip">
        <RefreshCw size={14} />
        <button className="action-btn" onClick={load}>Re-evaluate &amp; reload</button>
        <span style={{ marginLeft: 'auto' }}>
          {data.alerts?.count ?? 0} alerts · {filtered.length} in view
        </span>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-title">
          <BellRing size={16} style={{ color: 'var(--brand-saffron)' }} />
          Live Current Metrics
        </div>
        <div className="meta-grid">
          {monitored.map(([key, val]) => (
            <div className="meta-item" key={key}>
              <span className="meta-item-label">{labels[key] ?? key.replace(/_/g, ' ')}</span>
              <span className="meta-item-value">{fmt(val, 2)}</span>
            </div>
          ))}
          <div className="meta-item">
            <span className="meta-item-label">Active anomaly count</span>
            <span className="meta-item-value">{fmt(metrics.active_anomalies_count)}</span>
          </div>
        </div>
      </div>
      <div className="filter-bar">
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by alert status">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
            const count = filtered.filter((a) => a.severity.toUpperCase() === sev).length;
            if (count === 0) return null;
            return (
              <span key={sev} className={`severity-chip ${severityClass(sev)}`}>
                {sev} · {count}
              </span>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BellRing size={22} />}
            title="No alerts in this view"
            description="No genuinely triggered records match the current status filter."
          />
        </div>
      ) : (
        <div className="card">
          <div className="card-title">
            <BellRing size={16} style={{ color: 'var(--semantic-warning)' }} />
            Alert Log ({filtered.length})
          </div>
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Alert</th>
                  <th style={thStyle}>Rule</th>
                  <th style={thStyle}>Severity</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Triggered</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.alert_id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 280 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)', whiteSpace: 'nowrap' }}>{a.title}</div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.62rem', marginTop: 3 }}>{a.message}</div>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{a.rule_id ?? '—'}</td>
                    <td style={tdStyle}>
                      <span className={`severity-chip ${severityClass(a.severity)}`}>{a.severity}</span>
                    </td>
                    <td style={tdStyle}>
                      <span className={`severity-chip ${statusClass(a.status)}`}>{a.status}</span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{new Date(a.triggered_at).toLocaleString()}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {a.status.toUpperCase() === 'ACTIVE' && (
                        <button className="action-btn" disabled={busyId === a.alert_id} onClick={() => handleStatus(a, 'ACKNOWLEDGED')}>
                          Acknowledge
                        </button>
                      )}
                      {a.status.toUpperCase() !== 'RESOLVED' && (
                        <button className="action-btn" disabled={busyId === a.alert_id} onClick={() => handleStatus(a, 'RESOLVED')} style={{ marginLeft: 6 }}>
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <div className="card-title">
          <SlidersHorizontal size={16} style={{ color: 'var(--semantic-info)' }} />
          Configured Rules ({data.rules?.rules.length ?? 0})
          <button className="action-btn" onClick={() => { setShowForm((v) => !v); setFormMsg(null); }} style={{ marginLeft: 'auto' }}>
            <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
            {showForm ? 'Cancel' : 'New rule'}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--border-focus)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 'var(--space-3)', alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Rule name</div>
                <input className="filter-select" style={{ width: '100%' }} value={form.rule_name} placeholder="e.g. Pressure above X"
                  onChange={(e) => setForm((f) => ({ ...f, rule_name: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Metric</div>
                <select className="filter-select" style={{ width: '100%' }} value={form.metric_target}
                  onChange={(e) => setForm((f) => ({ ...f, metric_target: e.target.value }))}>
                  {Object.entries(labels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Operator</div>
                <select className="filter-select" style={{ width: '100%' }} value={form.condition_operator}
                  onChange={(e) => setForm((f) => ({ ...f, condition_operator: e.target.value as AlertRuleInput['condition_operator'] }))}>
                  {['>', '<', '>=', '<=', '=='].map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Threshold</div>
                <input className="filter-select" style={{ width: '100%' }} type="number" value={form.threshold_value}
                  onChange={(e) => setForm((f) => ({ ...f, threshold_value: Number(e.target.value) }))} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Severity</div>
                <select className="filter-select" style={{ width: '100%' }} value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              <button className="action-btn" onClick={handleCreate} style={{ padding: 'var(--space-2) var(--space-4)' }}>
                Create rule
              </button>
              {formMsg && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{formMsg}</span>}
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Rule</th>
                <th style={thStyle}>Target</th>
                <th style={thStyle}>Condition</th>
                <th style={thStyle}>Threshold</th>
                <th style={thStyle}>Severity</th>
                <th style={thStyle}>Enabled</th>
                <th style={thStyle}>Created</th>
              </tr>
            </thead>
            <tbody>
              {(data.rules?.rules ?? []).map((r) => (
                <tr key={r.rule_id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 200, color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{r.rule_name}</td>
                  <td style={tdStyle}>{r.metric_target}</td>
                  <td style={tdStyle}>{r.condition_operator}</td>
                  <td style={tdStyle}>{r.threshold_value}</td>
                  <td style={tdStyle}>
                    <span className={`severity-chip ${severityClass(r.severity)}`}>{r.severity}</span>
                  </td>
                  <td style={tdStyle}>{r.is_enabled ? 'Yes' : 'No'}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}