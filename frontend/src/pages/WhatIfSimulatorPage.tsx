import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FlaskConical,
  Info,
  Play,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { simulateScenario } from '@/lib/api';
import type { ScenarioRequest, ScenarioResult } from '@/lib/types';
import { StatCard } from '@/components/common/StatCard';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useThemeStore } from '@/stores/themeStore';
import { apiErrorMessage } from '@/lib/errors';
import {
  badgeStyle,
  codeBlockStyle,
  fieldLabel,
  fieldNote,
  fieldWrap,
  inputStyle,
  primaryButton,
  selectStyle,
  sliderStyle,
  tdStyle,
  thStyle,
} from '@/components/common/formStyles';

const HORIZON_OPTIONS = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'];

const DEFAULT_INPUTS: ScenarioInputs = {
  scenario_name: 'Custom Macro Shock Simulation',
  airfare_shock_pct: 10,
  demand_change_pct: 5,
  capacity_change_pct: -3,
  atf_fuel_shock_pct: 12,
  booking_horizon_shock: 'T+7',
  seasonal_factor: 1,
};

const PRESET_SCENARIOS: Array<{ label: string; description: string; values: Partial<ScenarioInputs> }> = [
  {
    label: 'ATF Shock',
    description: 'Fuel price spike with mild fare pass-through',
    values: { scenario_name: 'ATF Fuel Shock', airfare_shock_pct: 5, demand_change_pct: 2, capacity_change_pct: -2, atf_fuel_shock_pct: 25, booking_horizon_shock: 'T+7', seasonal_factor: 1 },
  },
  {
    label: 'Demand Surge',
    description: 'Festival/peak demand elasticity shift',
    values: { scenario_name: 'Demand Surge', airfare_shock_pct: 8, demand_change_pct: 18, capacity_change_pct: 4, atf_fuel_shock_pct: 6, booking_horizon_shock: 'T+1', seasonal_factor: 1.15 },
  },
  {
    label: 'Capacity Crunch',
    description: 'Seat capacity contraction tightens pricing',
    values: { scenario_name: 'Capacity Crunch', airfare_shock_pct: 4, demand_change_pct: 3, capacity_change_pct: -12, atf_fuel_shock_pct: 8, booking_horizon_shock: 'T+15', seasonal_factor: 1 },
  },
  {
    label: 'Fare Suppression',
    description: 'Normalisation / moderation scenario',
    values: { scenario_name: 'Fare Normalisation', airfare_shock_pct: -8, demand_change_pct: -5, capacity_change_pct: 2, atf_fuel_shock_pct: -6, booking_horizon_shock: 'T+30', seasonal_factor: 0.9 },
  },
];

interface ScenarioInputs {
  scenario_name: string;
  airfare_shock_pct: number;
  demand_change_pct: number;
  capacity_change_pct: number;
  atf_fuel_shock_pct: number;
  booking_horizon_shock: string;
  seasonal_factor: number;
}

interface FieldSpec {
  key: keyof ScenarioInputs;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
}

const SHOCK_FIELDS: FieldSpec[] = [
  { key: 'airfare_shock_pct', label: 'Airfare Shock', min: -50, max: 100, step: 1, suffix: '%' },
  { key: 'demand_change_pct', label: 'Demand Change', min: -50, max: 100, step: 1, suffix: '%' },
  { key: 'capacity_change_pct', label: 'Capacity Change', min: -50, max: 100, step: 1, suffix: '%' },
  { key: 'atf_fuel_shock_pct', label: 'ATF Fuel Shock', min: -50, max: 150, step: 1, suffix: '%' },
  { key: 'seasonal_factor', label: 'Seasonal Factor', min: 0.5, max: 2, step: 0.05, suffix: '×' },
];

function fmt(value: number | undefined | null, digits = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function useChartColors() {
  const theme = useThemeStore((s) => s.theme);
  const dark = theme === 'dark';
  return {
    axis: dark ? '#94A3B8' : '#64748B',
    grid: dark ? '#1E293B' : '#F1F5F9',
    saffron: dark ? '#F97316' : '#C2510A',
    info: dark ? '#60A5FA' : '#2563EB',
  };
}

interface TooltipEntry {
  name?: number | string;
  value?: number | string;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
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
      {payload.map((entry, i) => (
        <div key={i} style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{entry.name}: </span>
          {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value ?? '—'}
        </div>
      ))}
    </div>
  );
}

function pressureColor(level: string): string {
  const lvl = level.toUpperCase();
  if (lvl === 'CRITICAL') return 'var(--semantic-error)';
  if (lvl === 'HIGH') return 'var(--semantic-warning)';
  if (lvl === 'MODERATE') return 'var(--semantic-info)';
  return 'var(--semantic-success)';
}
export function WhatIfSimulatorPage() {
  const [inputs, setInputs] = useState<ScenarioInputs>(DEFAULT_INPUTS);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [lastRunLabel, setLastRunLabel] = useState<string | null>(null);
  const colors = useChartColors();

  const setField = useCallback(<K extends keyof ScenarioInputs>(key: K, value: ScenarioInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((values: Partial<ScenarioInputs>) => {
    setInputs((prev) => ({ ...prev, ...values }));
  }, []);

  const validate = useCallback((): string[] => {
    const errors: string[] = [];
    if (!inputs.scenario_name.trim()) errors.push('Scenario name is required.');
    if (inputs.airfare_shock_pct < -50 || inputs.airfare_shock_pct > 100) errors.push('Airfare shock must be between -50% and +100%.');
    if (inputs.demand_change_pct < -50 || inputs.demand_change_pct > 100) errors.push('Demand change must be between -50% and +100%.');
    if (inputs.capacity_change_pct < -50 || inputs.capacity_change_pct > 100) errors.push('Capacity change must be between -50% and +100%.');
    if (inputs.atf_fuel_shock_pct < -50 || inputs.atf_fuel_shock_pct > 150) errors.push('ATF fuel shock must be between -50% and +150%.');
    if (inputs.seasonal_factor < 0.5 || inputs.seasonal_factor > 2) errors.push('Seasonal factor must be between 0.5 and 2.0.');
    return errors;
  }, [inputs]);

  const runSimulation = useCallback(async () => {
    const errors = validate();
    setValidationErrors(errors);
    if (errors.length > 0) return;
    setError(null);
    setLoading(true);
    const payload: ScenarioRequest = {
      scenario_name: inputs.scenario_name.trim(),
      airfare_shock_pct: inputs.airfare_shock_pct,
      demand_change_pct: inputs.demand_change_pct,
      capacity_change_pct: inputs.capacity_change_pct,
      atf_fuel_shock_pct: inputs.atf_fuel_shock_pct,
      seasonal_factor: inputs.seasonal_factor,
    };
    if (inputs.booking_horizon_shock) {
      payload.booking_horizon_shock = inputs.booking_horizon_shock;
    }
    try {
      const res = await simulateScenario(payload);
      setResult(res);
      setLastRunLabel(new Date().toLocaleTimeString());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [inputs, validate]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return [
      {
        name: 'National Airfare Index',
        Baseline: result.baseline_airfare_index,
        Simulated: result.projected_airfare_index,
      },
    ];
  }, [result]);

  const renderTooltip = (props: unknown) => {
    const tooltipProps = props as { active?: boolean; payload?: TooltipEntry[] } | null;
    return tooltipProps ? <ChartTooltip {...tooltipProps} /> : null;
  };

  const corridors = result?.top_affected_corridors ?? [];
return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">What-If Policy Simulator</h1>
          <p className="page-subtitle">
            Shock the national airfare basket with macroeconomic inputs and observe projected CPI
            pass-through, pressure scores, and corridor-level impacts. Every output below is computed
            live by the backend from your inputs.
          </p>
        </div>
        {result && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'right' }}>
            <span className="badge-demo">{result.data_tag}</span>
            <br />
            {result.scenario_id}
            {lastRunLabel && (
              <>
                <br />
                <span style={{ color: 'var(--text-secondary)' }}>Last run: {lastRunLabel}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="data-source-strip">
        <Info size={14} style={{ color: 'var(--semantic-info)', flexShrink: 0 }} />
        <span>
          The simulator posts your inputs to <code>POST /api/v1/scenario/simulate</code>. The{' '}
          <strong>left column is user input</strong>; the{' '}
          <strong>right column is calculated output</strong> from the actual backend response — nothing is
          hardcoded or estimated on the client.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5.5fr) minmax(0, 6.5fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
        {/* ── User input card ─────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">
            <FlaskConical size={16} style={{ color: 'var(--brand-saffron)' }} />
            Scenario Inputs
            <span style={{ ...badgeStyle, background: 'var(--semantic-info-bg)', color: 'var(--semantic-info)' }}>USER INPUT</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Quick presets</span>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {PRESET_SCENARIOS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.values)}
                  title={preset.description}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-medium)',
                    cursor: 'pointer',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div style={fieldWrap}>
            <label style={fieldLabel} htmlFor="whatif-name">Scenario Name</label>
            <input
              id="whatif-name"
              type="text"
              style={inputStyle}
              value={inputs.scenario_name}
              onChange={(e) => setField('scenario_name', e.target.value)}
            />
          </div>

          {SHOCK_FIELDS.map((field) => (
            <div key={field.key} style={{ ...fieldWrap, marginTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={fieldLabel} htmlFor={`whatif-${field.key}`}>
                  {field.label}
                  <span style={{ fontWeight: 'var(--font-normal)', color: 'var(--text-tertiary)', textTransform: 'none' }}>({field.min}…{field.max}{field.suffix})</span>
                </label>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={inputs[field.key]}
                  onChange={(e) => setField(field.key, e.target.value === '' ? 0 : Number(e.target.value))}
                  style={{ ...inputStyle, width: 96, textAlign: 'right' }}
                />
              </div>
              <input
                id={`whatif-${field.key}`}
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={inputs[field.key]}
                onChange={(e) => setField(field.key, Number(e.target.value))}
                style={sliderStyle}
              />
            </div>
          ))}

          <div style={{ ...fieldWrap, marginTop: 'var(--space-4)' }}>
            <label style={fieldLabel} htmlFor="whatif-horizon">Booking Horizon Shock (optional)</label>
            <select
              id="whatif-horizon"
              style={selectStyle}
              value={inputs.booking_horizon_shock}
              onChange={(e) => setField('booking_horizon_shock', e.target.value)}
            >
              <option value="">None (national basket)</option>
              {HORIZON_OPTIONS.map((horizon) => (
                <option key={horizon} value={horizon}>{horizon}</option>
              ))}
            </select>
            <span style={fieldNote}>Optional target advance-purchase window used by the simulator.</span>
          </div>

          {validationErrors.length > 0 && (
            <div
              style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--semantic-error-bg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                fontSize: 'var(--text-xs)',
                color: 'var(--semantic-error)',
              }}
            >
              {validationErrors.map((message) => <span key={message}>• {message}</span>)}
            </div>
          )}

          <button
            type="button"
            onClick={runSimulation}
            disabled={loading}
            style={{ ...primaryButton, width: '100%', justifyContent: 'center', marginTop: 'var(--space-5)', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
            {loading ? 'Running simulation…' : 'Run Simulation'}
          </button>
        </div>

        {/* ── Calculated output column ────────────────────────────── */}
        <div>
          {loading ? (
            <div className="card"><PageLoading /></div>
          ) : error ? (
            <div className="card"><ErrorState message={error} onRetry={runSimulation} /></div>
          ) : !result ? (
            <div className="card">
              <EmptyState
                icon={<FlaskConical size={24} />}
                title="No simulation has been run"
                description="Configure your scenario inputs and run the simulation. The backend will return baseline vs. scenario results."
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          <div className="stat-grid" style={{ marginBottom: 0 }}>
                  <StatCard
                    label="Baseline Index"
                    value={fmt(result.baseline_airfare_index)}
                    mono
                    icon={<TrendingUp size={16} />}
                    subtitle="Live national index"
                  />
                  <StatCard
                    label="Projected Index"
                    value={fmt(result.projected_airfare_index)}
                    mono
                    icon={<TrendingUp size={16} />}
                    subtitle="After simulated shocks"
                  />
                  <StatCard
                    label="Net Index Change"
                    value={`${result.net_airfare_index_change_pct >= 0 ? '+' : ''}${fmt(result.net_airfare_index_change_pct)}%`}
                    mono
                    trend={result.net_airfare_index_change_pct >= 0 ? 'up' : 'down'}
                    trendValue={`${result.net_airfare_index_change_pct >= 0 ? '+' : ''}${fmt(result.net_airfare_index_change_pct, 2)}%`}
                    subtitle="Modelled shift"
                  />
                  <StatCard
                    label="Pressure Score"
                    value={`${fmt(result.projected_inflation_pressure_score, 1)} / 100`}
                    mono
                    subtitle={result.projected_pressure_level}
                    icon={<AlertTriangle size={16} />}
                  />
                </div>

                <div className="card">
                  <div className="card-title">
                    <ArrowRight size={16} style={{ color: 'var(--brand-saffron)' }} />
                    CPI Transmission
                    <span style={{ ...badgeStyle, background: 'var(--brand-saffron-light)', color: 'var(--brand-saffron)' }}>CALCULATED OUTPUT</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
                    {[
                      { label: 'Transport Subgroup Impact', value: `${result.projected_transport_subgroup_impact_bps >= 0 ? '+' : ''}${fmt(result.projected_transport_subgroup_impact_bps, 2)} bps`, hint: 'Group 6.1.03' },
                      { label: 'Headline CPI Impact', value: `${result.projected_headline_cpi_impact_bps >= 0 ? '+' : ''}${fmt(result.projected_headline_cpi_impact_bps, 4)} bps`, hint: 'National CPI' },
                      { label: '95% Confidence Interval', value: `${fmt(result.confidence_interval_95.lower_bound)} – ${fmt(result.confidence_interval_95.upper_bound)}`, hint: 'Projected index' },
                      { label: 'Scenario ID', value: result.scenario_id, hint: result.simulated_at ?? '' },
                    ].map((item) => (
                      <div key={item.label} style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{item.label}</div>
                        <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 2 }}>{item.value}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{item.hint}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <TrendingUp size={16} style={{ color: 'var(--semantic-info)' }} />
                    Baseline vs. Scenario Index
                    <span style={{ ...badgeStyle, background: 'var(--brand-saffron-light)', color: 'var(--brand-saffron)' }}>CALCULATED OUTPUT</span>
                  </div>
                  <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: colors.axis }} tickLine={false} axisLine={{ stroke: colors.grid }} />
                        <YAxis tick={{ fontSize: 11, fill: colors.axis }} tickLine={false} axisLine={false} />
                        <Tooltip content={renderTooltip} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Baseline" fill={colors.info} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Simulated" fill={colors.saffron} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
<div className="card">
                  <div className="card-title">
                    <FlaskConical size={16} style={{ color: colors.saffron }} />
                    Top Affected Corridors
                    <span style={{ ...badgeStyle, background: 'var(--brand-saffron-light)', color: 'var(--brand-saffron)' }}>CALCULATED OUTPUT</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Route</th>
                          <th style={thStyle}>Corridor</th>
                          <th style={thStyle}>Weight</th>
                          <th style={thStyle}>Baseline ₹</th>
                          <th style={thStyle}>Projected ₹</th>
                          <th style={thStyle}>Δ %</th>
                          <th style={thStyle}>Transport bps</th>
                          <th style={thStyle}>CPI bps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {corridors.map((corridor) => (
                          <tr key={corridor.route_code}>
                            <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{corridor.route_code}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 140 }}>{corridor.corridor_name}</td>
                            <td style={tdStyle}>{fmt(corridor.route_weight_pct)}%</td>
                            <td style={tdStyle}>{fmt(corridor.baseline_indexed_fare, 2)}</td>
                            <td style={tdStyle}>{fmt(corridor.projected_indexed_fare, 2)}</td>
                            <td style={{ ...tdStyle, color: corridor.projected_price_delta_pct >= 0 ? 'var(--semantic-error)' : 'var(--semantic-success)' }}>
                              {corridor.projected_price_delta_pct >= 0 ? '+' : ''}{fmt(corridor.projected_price_delta_pct)}%
                            </td>
                            <td style={tdStyle}>{fmt(corridor.marginal_transport_impact_bps, 4)}</td>
                            <td style={tdStyle}>{fmt(corridor.marginal_headline_cpi_bps, 6)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <AlertTriangle size={16} style={{ color: colors.saffron }} />
                    Policy Implication Brief
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {result.policy_implication_brief}
                  </p>
                </div>

                <details>
                  <summary style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    View raw backend response
                  </summary>
                  <pre style={{ ...codeBlockStyle, marginTop: 'var(--space-2)' }}>{JSON.stringify(result, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}