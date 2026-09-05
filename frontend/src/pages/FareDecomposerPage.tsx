import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, Info, RefreshCw, Receipt, TrendingUp } from 'lucide-react';
import { decomposeFare, getRoutes } from '@/lib/api';
import type { DecomposeQueryParams, DecomposeResult, RouteSummary } from '@/lib/types';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { StatCard } from '@/components/common/StatCard';
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
  tdStyle,
  thStyle,
} from '@/components/common/formStyles';

const AIRLINES = [
  { code: '6E', name: 'IndiGo (6E)' },
  { code: 'AI', name: 'Air India (AI)' },
  { code: 'IX', name: 'Air India Express (IX)' },
  { code: 'QP', name: 'Akasa Air (QP)' },
  { code: 'SG', name: 'SpiceJet (SG)' },
  { code: 'OTHER', name: 'Alliance / Regional' },
];

const WINDOWS = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'];

function fmt(value: number | undefined | null, digits = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

export function FareDecomposerPage() {
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [route_code, setRouteCode] = useState('DEL-BOM');
  const [airline_code, setAirlineCode] = useState('6E');
  const [advance_window, setAdvanceWindow] = useState('T+7');
  const [fareInput, setFareInput] = useState('6800');
  const [is_ota, setIsOta] = useState(false);
  const [result, setResult] = useState<DecomposeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true);
    setRoutesError(null);
    try {
      const data = await getRoutes();
      setRoutes(data.routes ?? []);
    } catch (err) {
      setRoutesError(apiErrorMessage(err));
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes().catch(() => undefined);
  }, [loadRoutes]);

  const routeCodes = useMemo(
    () => (routes.length > 0 ? routes.map((r) => r.route_code) : ['DEL-BOM', 'DEL-BLR', 'BOM-DEL', 'DEL-CCU', 'DEL-HYD']),
    [routes]
  );

  const handleDecompose = useCallback(async () => {
    const errors: string[] = [];
    if (!fareInput.trim()) {
      errors.push('Fare amount is required.');
    } else {
      const fareValue = Number(fareInput);
      if (Number.isNaN(fareValue)) {
        errors.push('Fare must be a valid number.');
      } else if (fareValue < 500 || fareValue > 100000) {
        errors.push('Fare must be between ₹500 and ₹100,000.');
      }
    }
    setValidationErrors(errors);
    if (errors.length > 0) return;

    const payload: DecomposeQueryParams = {
      route_code,
      airline_code,
      advance_window,
      base_plus_fuel_fare: Number(fareInput),
      is_ota,
    };
    setError(null);
    setLoading(true);
    try {
      const res = await decomposeFare(payload);
      setResult(res);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [route_code, airline_code, advance_window, fareInput, is_ota]);

  const statutoryRows = useMemo(() => {
    if (!result) return [];
    const d = result.statutory_price_decomposition;
    return [
      { label: 'Base Fare', key: 'base_fare_inr', value: d.base_fare_inr, hint: '≈65% of base + fuel' },
      { label: 'Fuel Surcharge', key: 'fuel_surcharge_inr', value: d.fuel_surcharge_inr, hint: '≈35% of base + fuel' },
      { label: 'Airport UDF', key: 'airport_udf_inr', value: d.airport_udf_inr, hint: result.input_parameters.route_code.includes('GOI') ? 'Non-metro UDF' : 'Metro UDF' },
      { label: 'Passenger Service Fee (PSF)', key: 'airport_psf_inr', value: d.airport_psf_inr, hint: 'Rs. 91 / passenger' },
      { label: 'Aviation Security Fee (ASF)', key: 'aviation_security_fee_asf_inr', value: d.aviation_security_fee_asf_inr, hint: 'Rs. 200 / passenger' },
      { label: 'GST (Economy, 5%)', key: 'gst_economy_5_pct_inr', value: d.gst_economy_5_pct_inr, hint: '5% on base + fuel' },
      { label: 'OTA Convenience Fee', key: 'convenience_fee_inr', value: d.convenience_fee_inr, hint: result.input_parameters.is_ota_booking ? 'Rs. 299 (3rd party)' : 'Rs. 0 (direct)' },
    ];
  }, [result]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.route_code === route_code) ?? null,
    [routes, route_code]
  );
return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fare Decomposer &amp; CPI Calculator</h1>
          <p className="page-subtitle">
            Break a quoted airfare into its statutory components (base fare, fuel surcharge, airport
            fees, GST, OTA fees) and measure its CPI transmission in basis points.
          </p>
        </div>
        {result && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'right' }}>
            <span className="badge-demo">LIVE CALCULATION</span>
            <br />
            {result.input_parameters.route_code} · {result.input_parameters.advance_window}
          </div>
        )}
      </div>

      <div className="data-source-strip">
        <Info size={14} style={{ color: 'var(--semantic-info)', flexShrink: 0 }} />
        <span>
          The calculator posts your selections to <code>POST /api/v1/calculator/decompose</code> as{' '}
          <strong>query parameters</strong> (the API accepts no JSON body). The <strong>left column is user
          input</strong>; the <strong>right column is the live statutory decomposition + CPI transmission</strong>.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
        {/* ── User input card ─────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">
            <Calculator size={16} style={{ color: 'var(--brand-saffron)' }} />
            Fare Inputs
            <span style={{ ...badgeStyle, background: 'var(--semantic-info-bg)', color: 'var(--semantic-info)' }}>USER INPUT</span>
          </div>

          <div style={fieldWrap}>
            <label style={fieldLabel} htmlFor="decompose-route">Route Corridor</label>
            <select id="decompose-route" style={selectStyle} value={route_code} onChange={(e) => setRouteCode(e.target.value)}>
              {routeCodes.map((code) => (<option key={code} value={code}>{code}</option>))}
            </select>
            {selectedRoute && <span style={fieldNote}>{selectedRoute.origin_city} → {selectedRoute.destination_city}</span>}
          </div>

          <div style={{ ...fieldWrap, marginTop: 'var(--space-4)' }}>
            <label style={fieldLabel} htmlFor="decompose-airline">Airline</label>
            <select id="decompose-airline" style={selectStyle} value={airline_code} onChange={(e) => setAirlineCode(e.target.value)}>
              {AIRLINES.map((a) => (<option key={a.code} value={a.code}>{a.name}</option>))}
            </select>
          </div>

          <div style={{ ...fieldWrap, marginTop: 'var(--space-4)' }}>
            <label style={fieldLabel} htmlFor="decompose-window">Advance Purchase Window</label>
            <select id="decompose-window" style={selectStyle} value={advance_window} onChange={(e) => setAdvanceWindow(e.target.value)}>
              {WINDOWS.map((w) => (<option key={w} value={w}>{w} days ahead</option>))}
            </select>
          </div>

          <div style={{ ...fieldWrap, marginTop: 'var(--space-4)' }}>
            <label style={fieldLabel} htmlFor="decompose-fare">Base + Fuel Fare Amount (₹)</label>
            <input
              id="decompose-fare"
              type="number"
              min={500}
              max={100000}
              style={inputStyle}
              value={fareInput}
              onChange={(e) => setFareInput(e.target.value)}
              placeholder="e.g. 6800"
            />
            <span style={fieldNote}>API enforces ₹500 – ₹100,000.</span>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-4)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
            }}
          >
            <input
              type="checkbox"
              checked={is_ota}
              onChange={(e) => setIsOta(e.target.checked)}
              style={{ accentColor: 'var(--brand-saffron)', width: 16, height: 16 }}
            />
            Booked via 3rd-party OTA (adds ₹299 convenience fee)
          </label>

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
            onClick={handleDecompose}
            disabled={loading || routesLoading}
            style={{ ...primaryButton, width: '100%', justifyContent: 'center', marginTop: 'var(--space-5)', opacity: loading || routesLoading ? 0.7 : 1 }}
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Receipt size={15} />}
            {loading ? 'Calculating…' : 'Decompose Fare'}
          </button>
        </div>

        {/* ── Calculated output column ────────────────────────────── */}
        <div>
          {routesLoading ? (
            <div className="card"><PageLoading /></div>
          ) : routesError ? (
            <div className="card">
              <ErrorState message={`Route directory unavailable: ${routesError}`} onRetry={loadRoutes} />
            </div>
          ) : loading ? (
            <div className="card"><PageLoading /></div>
          ) : error ? (
            <div className="card"><ErrorState message={error} onRetry={handleDecompose} /></div>
          ) : !result ? (
            <div className="card">
              <EmptyState
                icon={<Calculator size={24} />}
                title="No fare has been decomposed"
                description="Pick a corridor, airline, window and fare amount, then run the decomposition. The backend returns the live statutory breakdown and CPI basis points."
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
<div className="card">
                <div className="card-title">
                  <Receipt size={16} style={{ color: 'var(--brand-saffron)' }} />
                  Statutory Price Decomposition
                  <span style={{ ...badgeStyle, background: 'var(--brand-saffron-light)', color: 'var(--brand-saffron)' }}>CALCULATED OUTPUT</span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-5)',
                  }}
                >
                  {[
                    ['Route', result.input_parameters.route_code],
                    ['Corridor', `${result.input_parameters.origin_city} → ${result.input_parameters.destination_city}`],
                    ['Airline', result.input_parameters.airline],
                    ['Window', result.input_parameters.advance_window],
                    ['Booking', result.input_parameters.is_ota_booking ? 'OTA (3rd party)' : 'Direct'],
                  ].map(([label, value]) => (
                    <div key={label} style={fieldWrap}>
                      <span style={fieldLabel}>{label}</span>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{value}</span>
                    </div>
                  ))}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Component</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Amount (₹)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Share</th>
                      <th style={thStyle}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statutoryRows.map((row) => (
                      <tr key={row.key}>
                        <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 'var(--font-medium)', whiteSpace: 'normal', minWidth: 160 }}>{row.label}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>₹{fmt(row.value, 2)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {fmt((row.value / result.statutory_price_decomposition.total_gross_fare_payable_inr) * 100, 2)}%
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 120, color: 'var(--text-tertiary)' }}>{row.hint}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 'var(--font-bold)', borderTop: '2px solid var(--border-primary)' }}>Total Gross Fare Payable</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'var(--font-bold)', color: 'var(--brand-saffron)', borderTop: '2px solid var(--border-primary)' }}>
                        ₹{fmt(result.statutory_price_decomposition.total_gross_fare_payable_inr, 2)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', borderTop: '2px solid var(--border-primary)' }}>100%</td>
                      <td style={{ ...tdStyle, borderTop: '2px solid var(--border-primary)' }}>What the passenger pays</td>
                    </tr>
                  </tbody>
                </table>
              </div>
<div className="card">
                <div className="card-title">
                  <TrendingUp size={16} style={{ color: 'var(--brand-saffron)' }} />
                  Econometric CPI Transmission
                  <span style={{ ...badgeStyle, background: 'var(--brand-saffron-light)', color: 'var(--brand-saffron)' }}>CALCULATED OUTPUT</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
                  <StatCard
                    label="Transport Subgroup Impact"
                    value={`${fmt(result.econometric_cpi_transmission.transport_subgroup_impact_bps, 4)} bps`}
                    subtitle="route × window weights"
                    mono
                  />
                  <StatCard
                    label="Headline CPI Impact"
                    value={`${fmt(result.econometric_cpi_transmission.headline_cpi_impact_bps, 6)} bps`}
                    subtitle="T&C weight applied"
                    mono
                  />
                  <StatCard
                    label="Price Relative (R)"
                    value={fmt(result.econometric_cpi_transmission.price_relative_r, 4)}
                    subtitle="Gross fare ÷ P0"
                    mono
                  />
                  <StatCard
                    label="Deviation from Base"
                    value={`${fmt(result.econometric_cpi_transmission.percentage_deviation_from_base, 2)}%`}
                    subtitle={`Base period P0 = ₹${fmt(result.econometric_cpi_transmission.base_period_benchmark_p0_inr, 2)}`}
                    mono
                  />
                </div>
                <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {result.econometric_cpi_transmission.effective_transmission_note}
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