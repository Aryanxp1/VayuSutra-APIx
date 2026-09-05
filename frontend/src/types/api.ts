 export interface User {
   username: string;
   full_name: string;
   role: string;
   email?: string;
 }

 export interface LoginResponse {
   access_token: string;
   token_type: string;
   user: User;
 }

 export interface LoginRequest {
   username_or_email: string;
   password: string;
 }

 export interface RealtimeIndex {
   master_laspeyres_index: number;
   fisher_ideal_index: number;
   paasche_index: number;
   jevons_national_index: number;
   daily_movement: {
     bps_transport_impact: number;
     bps_headline_cpi_impact: number;
   };
 }

 export interface TimeseriesPoint {
   calculation_date: string;
   laspeyres_index: number;
   fisher_index?: number;
   paasche_index?: number;
   jevons_index?: number;
 }

 export interface TimeseriesResponse {
   series: TimeseriesPoint[];
 }

 export interface HeatmapCell {
   route_code: string;
   origin: string;
   destination: string;
   horizon: string;
   jevons_index: number;
   avg_fare_inr: number;
   sample_count: number;
 }

 export interface HeatmapResponse {
   matrix: HeatmapCell[];
 }

 export interface WaterfallRoute {
   route_code: string;
   weight_pct: number;
   contribution_bps: number;
   avg_fare_inr: number;
 }

 export interface CpiDecomposition {
   route_waterfall: WaterfallRoute[];
   total_transport_bps: number;
   total_headline_bps: number;
 }

 export interface ForecastHorizon {
   target_date: string;
   horizon_days: number;
   forecast_value: number;
   lower_bound_95: number;
   upper_bound_95: number;
   daily_change_pct?: number;
   projected_transport_impact_bps?: number;
   projected_headline_cpi_impact_bps?: number;
 }

 export interface ForecastReport {
   target_type: string;
   target_code: string;
   as_of_date: string;
   current_index: number;
   best_model_name: string;
   horizons: Record<string, ForecastHorizon>;
   daily_trajectory: ForecastHorizon[];
   model_evaluation_leaderboard: ModelScore[];
   summary_mean_forecast_30d: number;
   net_cpi_transport_impact_bps: number;
   net_headline_cpi_impact_bps: number;
 }

 export interface ModelScore {
   model_name: string;
   mae: number;
   rmse: number;
   mape: number;
   smape: number;
   r2: number;
   is_best_selected: boolean;
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
   confidence_interval_95: { lower: number; upper: number };
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
   data_tag: string;
 }

 export interface DecompositionResult {
   route_code: string;
   total_fare: number;
   base_fare: number;
   fuel_surcharge: number;
   gst_amount: number;
   airport_fees: {
     udf: number;
     psf: number;
     asf: number;
   };
   indexed_contribution: number;
 }

 export interface AiAnalystResponse {
   question: string;
   detected_intent: string;
   answer_summary: string;
   detailed_explanation: string;
   numerical_evidence: Record<string, unknown>;
   affected_routes: string[];
   statutory_citations: string[];
   data_tag: string;
   timestamp: string;
 }

 export interface Anomaly {
   anomaly_id: string;
   route_code: string;
   horizon: string;
   anomaly_type: string;
   severity: string;
   description: string;
   detected_at: string;
   z_score?: number;
 }

 export interface DataTrustScore {
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
   weights_breakdown: Record<string, number>;
 }

 export interface PressureScore {
   overall_score: number;
   level: string;
   components: Record<string, number>;
 }