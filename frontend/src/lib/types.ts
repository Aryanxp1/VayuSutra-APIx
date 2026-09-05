/* VayuSutra API Type Definitions */

export interface LoginRequest {
  username_or_email: string;
  password: string;
}

export interface User {
  user_id?: string;
  id?: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  designation?: string;
  organization?: string;
  department?: string;
  avatar_color?: string;
  badge_theme?: string;
  key_features?: string[];
  description?: string;
  permissions?: string[];
  is_active?: boolean;
  last_login_at?: string;
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user: User;
  role_description?: string;
  accessible_features?: string[];
}

export interface DemoAccount {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  designation?: string;
  organization?: string;
  badge_theme?: string;
  avatar_color?: string;
  description?: string;
  key_features?: string[];
}

export interface RealtimeIndexResponse {
  calculation_date?: string;
  master_laspeyres_index: number;
  fisher_ideal_index: number;
  paasche_index: number;
  jevons_national_index: number;
  spot_t1_index?: number;
  spot_premium_over_early_bird_pct?: number;
  daily_movement?: {
    percentage_change?: number;
    previous_index?: number;
  };
  cpi_transmission?: {
    transport_subgroup_impact_bps?: number;
    headline_all_india_cpi_impact_bps?: number;
    transport_cpi_weight_pct?: number;
    airfare_transport_share_pct?: number;
    effective_headline_weight_pct?: number;
  };
  inflation_pressure_summary?: {
    pressure_score?: number;
    pressure_level?: string;
    policy_alert?: string;
  };
  data_trust_summary?: {
    overall_trust_score?: number;
    status_rating?: string;
  };
  data_tag?: string;
  statutory_compliance?: string;
}

export interface TimeseriesPoint {
  calculation_date: string;
  laspeyres_index: number;
  fisher_index?: number;
  paasche_index?: number;
  jevons_index?: number;
  spot_t1_index?: number;
  daily_pct_change?: number;
  bps_transport_impact?: number;
  bps_headline_cpi_impact?: number;
}

export interface TimeseriesResponse {
  count?: number;
  data: TimeseriesPoint[];
  series?: TimeseriesPoint[];
  data_tag?: string;
}

export interface HeatmapCellInfo {
  route_code: string;
  advance_window: string;
  days_advance: number;
  current_fare_inr: number;
  base_benchmark_fare: number;
  price_change_pct: number;
  volatility_score: number;
  status: string;
  sample_size: number;
}

export interface HeatmapMatrixRow {
  route_code: string;
  origin_city: string;
  destination_city: string;
  dgca_weight_pct: number;
  corridor_average_fare: number;
  composite_relative: number;
  horizon_cells: Record<string, HeatmapCellInfo>;
}

export interface HeatmapResponse {
  as_of_date: string;
  total_routes: number;
  total_horizons: number;
  matrix_rows: HeatmapMatrixRow[];
  summary_surge_count: number;
  summary_discount_count: number;
  generated_at: string;
}

export interface SuperlativeIndexResponse {
  calculation_date?: string;
  superlative_matrix?: {
    laspeyres_fixed_basket_index?: number;
    paasche_current_weight_index?: number;
    fisher_ideal_superlative_index?: number;
    tornqvist_geometric_superlative_index?: number;
    walsh_geometric_weight_index?: number;
    jevons_national_index?: number;
  };
  substitution_bias_analysis?: {
    laspeyres_vs_fisher_bias_index_points?: number;
    laspeyres_vs_fisher_bias_cpi_bps?: number;
    laspeyres_vs_tornqvist_bias_cpi_bps?: number;
    methodology_standard?: string;
    statutory_recommendation?: string;
  };
  data_tag?: string;
}

export interface RegionalHub {
  index: number;
  traffic_weight_pct: number;
  major_airports: string[];
}

export interface RegionalIndexResponse {
  calculation_date?: string;
  regional_hubs?: Record<string, RegionalHub>;
  data_tag?: string;
}

export interface RouteSummary {
  route_code: string;
  origin: string;
  destination: string;
  origin_city: string;
  destination_city: string;
  dgca_weight: number;
  weight_pct: number;
  distance_km: number;
  is_metro_metro: boolean;
  base_fare_benchmark: number;
  latest_composite_relative: number;
  latest_indexed_fare: number;
  windows_detail?: Record<string, {
    jevons_mean: number;
    benchmark: number;
    relative: number;
    sample_size: number;
  }>;
}

export interface RoutesResponse {
  latest_calculation_date?: string;
  total_routes?: number;
  total_weight?: number;
  data_tag?: string;
  routes: RouteSummary[];
}

export interface RouteIntelligenceResponse {
  route_code: string;
  corridor_name: string;
  metadata?: {
    origin_iata?: string;
    destination_iata?: string;
    origin_city?: string;
    destination_city?: string;
    distance_km?: number;
    is_metro_corridor?: boolean;
    dgca_volume_weight_pct?: number;
    base_fare_benchmark_inr?: number;
  };
  current_metrics?: {
    representative_jevons_fare_inr?: number;
    composite_price_relative?: number;
    change_24h_pct?: number;
    change_7d_pct?: number;
    change_30d_pct?: number;
    volatility_score?: number;
    source_consensus_score?: number;
    cpi_transport_impact_bps?: number;
    headline_cpi_impact_bps?: number;
  };
  horizon_breakdown?: Record<string, {
    window_name?: string;
    days_advance?: number;
    fare_inr?: number;
    base_benchmark_fare?: number;
    relative?: number;
    weight_pct?: number;
  }>;
  historical_trend_30d?: Array<{ date: string; fare_inr: number; index_relative: number }>;
  forecast_14d?: ForecastResponse;
  recent_anomalies?: Array<{ anomaly_id?: string; anomaly_type?: string; severity?: string; description?: string; z_score?: number }>;
  carrier_distribution?: Array<{ carrier: string; fare_inr: number; market_share_pct: number; flights_per_day: number }>;
  generated_at?: string;
}

export interface ForecastingModel {
  model_name: string;
  display_name: string;
  category: string;
  description: string;
  is_default: boolean;
}

export interface ForecastingModelsResponse {
  catalogue: ForecastingModel[];
  selection_strategy?: string;
  data_tag?: string;
}


export interface WaterfallEntry {
  route_code: string;
  corridor_name?: string;
  cpi_contribution_bps: number;
  weight_pct?: number;
}

export interface CpiDecompositionResponse {
  route_waterfall: WaterfallEntry[];
  total_transport_impact_bps?: number;
  total_headline_cpi_bps?: number;
}

export interface ForecastHorizon {
  target_date: string;
  horizon_days: number;
  forecast_value: number;
  lower_bound_95: number;
  upper_bound_95: number;
  confidence_level?: number;
  daily_change_pct?: number;
  projected_transport_impact_bps?: number;
  projected_headline_cpi_impact_bps?: number;
}

export interface ForecastResponse {
  target_type: string;
  target_code: string;
  as_of_date: string;
  current_index: number;
  best_model_name: string;
  model_version?: string;
  horizons: Record<string, ForecastHorizon>;
  daily_trajectory: ForecastHorizon[];
  model_evaluation_leaderboard: Array<{
    model_name: string;
    mae: number;
    rmse: number;
    mape: number;
    smape: number;
    r2: number;
    is_best_selected: boolean;
  }>;
  summary_mean_forecast_30d: number;
  net_cpi_transport_impact_bps: number;
  net_headline_cpi_impact_bps: number;
  data_tag?: string;
  generated_at?: string;
}

export interface ScenarioRequest {
  scenario_name?: string;
  airfare_shock_pct: number;
  demand_change_pct: number;
  capacity_change_pct: number;
  atf_fuel_shock_pct: number;
  booking_horizon_shock?: string;
  seasonal_factor?: number;
}

export interface ScenarioResult {
  scenario_id: string;
  scenario_name: string;
  inputs: Record<string, unknown>;
  baseline_airfare_index: number;
  projected_airfare_index: number;
  net_airfare_index_change_pct: number;
  projected_transport_subgroup_impact_bps: number;
  projected_headline_cpi_impact_bps: number;
  projected_inflation_pressure_score: number;
  projected_pressure_level: string;
  confidence_interval_95: { lower_bound: number; upper_bound: number };
  top_affected_corridors: Array<{
    route_code: string;
    corridor_name: string;
    route_weight_pct: number;
    baseline_indexed_fare: number;
    projected_indexed_fare: number;
    projected_price_delta_pct: number;
    marginal_transport_impact_bps: number;
    marginal_headline_cpi_bps: number;
  }>;
  policy_implication_brief: string;
  data_tag?: string;
  simulated_at?: string;
}

export interface DecomposeQueryParams {
  route_code: string;
  airline_code: string;
  advance_window: string;
  base_plus_fuel_fare: number;
  is_ota: boolean;
}

export interface DecomposeResult {
  input_parameters: {
    route_code: string;
    origin_city: string;
    destination_city: string;
    airline: string;
    advance_window: string;
    is_ota_booking: boolean;
  };
  statutory_price_decomposition: {
    base_fare_inr: number;
    fuel_surcharge_inr: number;
    airport_udf_inr: number;
    airport_psf_inr: number;
    aviation_security_fee_asf_inr: number;
    gst_economy_5_pct_inr: number;
    convenience_fee_inr: number;
    total_gross_fare_payable_inr: number;
  };
  econometric_cpi_transmission: {
    base_period_benchmark_p0_inr: number;
    price_relative_r: number;
    percentage_deviation_from_base: number;
    transport_subgroup_impact_bps: number;
    headline_cpi_impact_bps: number;
    effective_transmission_note: string;
  };
}

export interface AnomalyMethodology {
  engine: string;
  detection_methods: string[];
  expected_ranges: Record<string, { min: number; max: number; label: string }>;
  severity_mapping: Record<string, string>;
  confidence_guidance?: Record<string, string>;
  data_tag: string;
}

export interface Anomaly {
  anomaly_id: string;
  timestamp: string;
  route_code: string;
  corridor_name: string;
  anomaly_type: string;
  severity: string;
  observed_value: number;
  expected_range_min: number;
  expected_range_max: number;
  deviation_pct: number;
  confidence_score: number;
  explanation: string;
  metric: string;
  data_tag: string;
  status: string;
}

export interface AnomaliesResponse {
  anomalies: Anomaly[];
  count: number;
  data_tag: string;
  methodology?: AnomalyMethodology;
}

export interface DataQualityResponse {
  snapshot_date: string;
  overall_trust_score: number;
  freshness_pct: number;
  completeness_pct: number;
  route_coverage_pct: number;
  source_health_pct: number;
  duplicate_rate_pct: number;
  outlier_rate_pct: number;
  validation_success_pct: number;
  consensus_score: number;
  status_rating: string;
  weights_breakdown?: Record<string, number>;
  data_tag?: string;
  generated_at?: string;
}

export interface AnalystQuery {
  question: string;
  user_role?: string;
}

export interface AnalystResponse {
  question: string;
  detected_intent: string;
  answer_summary: string;
  detailed_explanation: string;
  numerical_evidence: Record<string, unknown>;
  affected_routes: string[];
  statutory_citations: string[];
  data_tag?: string;
  timestamp: string;
}

export interface PressureScoreResponse {
  as_of_date?: string;
  pressure_score: number;
  pressure_level: string;
  previous_score?: number;
  score_change_24h?: number;
  components: Record<string, number>;
  component_weights?: Record<string, number>;
  ranked_drivers: string[];
  rbi_monetary_policy_alert?: string;
  data_tag?: string;
  generated_at?: string;
}
// ─── Alerts (Phase 4) ─────────────────────────────────────
export interface AlertRecord {
  alert_id: string;
  rule_id: string | null;
  title: string;
  message: string;
  severity: string;
  status: string; // ACTIVE | ACKNOWLEDGED | RESOLVED
  triggered_at: string;
  resolved_at: string | null;
  acknowledged_by: string | null;
}

export interface AlertsResponse {
  count: number;
  alerts: AlertRecord[];
  current_metrics: Record<string, number | string | null>;
  metric_labels: Record<string, string>;
}

export interface AlertRule {
  rule_id: string;
  rule_name: string;
  metric_target: string;
  condition_operator: string;
  threshold_value: number;
  severity: string;
  is_enabled: number;
  created_at: string;
}

export interface AlertRulesResponse {
  rules: AlertRule[];
}

export interface AlertRuleInput {
  rule_name: string;
  metric_target: string;
  condition_operator?: string;
  threshold_value: number;
  severity?: string;
  is_enabled?: number;
}

export interface AlertStatusUpdateResponse {
  status: string; // SUCCESS | NOT_FOUND
  message: string;
  alert_id: string;
  updated_at?: string;
}

// ─── Dataset Catalog (Phase 4) ────────────────────────────
export type DatasetSourceType = 'official' | 'derived' | 'modelled';

export interface DatasetCatalogEntry {
  dataset_id: string;
  name: string;
  description: string;
  source: string;
  source_type: DatasetSourceType;
  methodology: string;
  coverage: string | null;
  update_frequency: string;
  record_count: number;
  last_updated: string | null;
  status: string;
  data_tag: string;
  download_endpoint: string;
}

export interface DatasetCatalogResponse {
  catalog: DatasetCatalogEntry[];
  total_datasets: number;
  source_type_breakdown: Record<DatasetSourceType, number>;
  generated_at: string;
}

// ─── Per-Source Health (Phase 4) ───────────────────────────
export interface SourceHealth {
  source_id: string;
  source_name: string;
  source_type: string;
  base_url: string;
  status: string;
  is_active: boolean;
  success_rate_24h: number;
  avg_latency_ms: number;
  error_count_24h: number;
  last_scraped_at: string | null;
  health: string;
  health_reason: string;
  observations: number;
  share_of_panel_pct: number | null;
  coverage_start: string | null;
  coverage_end: string | null;
  avg_total_fare_inr: number | null;
  data_tag: string;
}

export interface DataQualitySourcesResponse {
  count: number;
  sources: SourceHealth[];
  healthy_count: number;
  at_risk_count: number;
  total_observations: number;
  methodology: string;
  generated_at: string;
}

// ─── Flight Quotes Panel (Phase 4) ─────────────────────────
export interface FlightQuote {
  quote_id: string;
  route_code: string;
  origin: string;
  destination: string;
  airline_code: string;
  airline_name: string;
  flight_number: string;
  source_portal: string;
  booking_date: string;
  travel_date: string;
  advance_window: string;
  departure_time: string;
  arrival_time: string;
  base_fare: number;
  fuel_surcharge: number;
  udf: number;
  psf: number;
  asf: number;
  gst: number;
  convenience_fee: number;
  total_fare: number;
  is_direct: number;
  currency: string;
  scraped_at: string;
}

export interface FlightQuotesResponse {
  count: number;
  data_tag: string;
  quotes: FlightQuote[];
}

// ─── Audit Provenance Certificate (Phase 4) ───────────────
export interface ProvenanceCertificate {
  audit_certificate_id: string;
  cryptographic_hash_sha256: string;
  provenance_status: string;
  verified_batch_telemetry: {
    total_raw_quotes_hashed: number;
    total_cleaned_quotes_verified: number;
    latest_calculation_date: string | null;
    master_index_snapshot: number | null;
  };
  compliance: string;
  verified_at: string;
}

export interface CorridorMovement {
  rank: number;
  route_code: string;
  corridor_name: string;
  route_weight_pct: number;
  price_movement_pct: number;
  transport_subgroup_impact_bps: number;
  headline_cpi_impact_bps: number;
  share_of_total_inflation_pct: number;
  cumulative_headline_bps: number;
  contribution_direction: string;
}

export interface ForecastHorizonSample {
  target_date: string;
  horizon_days: number;
  forecast_value: number;
  lower_bound_95: number;
  upper_bound_95: number;
  confidence_level: number;
  daily_change_pct: number;
  projected_transport_impact_bps: number;
  projected_headline_cpi_impact_bps: number;
}

// ─── Daily Intelligence Report (Phase 4) ───────────────────
export interface DailyReportResponse {
  report_id: string;
  report_title: string;
  publication_date: string;
  executive_summary?: string;
  national_airfare_index?: {
    master_laspeyres_index: number;
    paasche_index: number;
    fisher_ideal_index: number;
    spot_t1_index: number;
    daily_percentage_change: number;
  };
  cpi_inflation_transmission?: {
    transport_subgroup_impact_bps: number;
    headline_cpi_impact_bps: number;
    effective_headline_weight: number;
  };
  inflation_pressure_score?: PressureScoreResponse;
  data_trust_and_quality?: DataQualityResponse;
  top_moving_corridors?: {
    top_rising_contributors: CorridorMovement[];
    top_declining_contributors: CorridorMovement[];
  };
  active_market_anomalies?: Anomaly[];
  forward_14d_nowcast?: {
    champion_model: string;
    mean_forecast_index: number;
    projected_headline_cpi_bps: number;
    sample_horizon_7d: ForecastHorizonSample;
    sample_horizon_14d: ForecastHorizonSample;
  };
  cross_source_consensus?: {
    market_consensus_score: number;
    high_disagreement_routes_count: number;
  };
  methodology_metadata?: {
    cpi_base_year: string;
    elementary_aggregation: string;
    route_basket: string;
    statutory_source: string;
    superlative_formula: string;
  };
  data_tags?: Record<string, string>;
  generated_at: string;
}