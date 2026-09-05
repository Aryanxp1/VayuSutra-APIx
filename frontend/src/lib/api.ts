import axios from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  User,
  RealtimeIndexResponse,
  TimeseriesResponse,
  HeatmapResponse,
  CpiDecompositionResponse,
  ForecastResponse,
  ScenarioRequest,
  ScenarioResult,
  DecomposeQueryParams,
  DecomposeResult,
  AnomaliesResponse,
  DataQualityResponse,
  DataQualitySourcesResponse,
  DatasetCatalogResponse,
  FlightQuotesResponse,
  ProvenanceCertificate,
  DailyReportResponse,
  AlertsResponse,
  AlertRulesResponse,
  AlertRuleInput,
  AlertStatusUpdateResponse,
  AnalystQuery,
  AnalystResponse,
  PressureScoreResponse,
  DemoAccount,
  SuperlativeIndexResponse,
  RegionalIndexResponse,
  RoutesResponse,
  RouteIntelligenceResponse,
  ForecastingModelsResponse,
} from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vayusutra_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vayusutra_token');
      localStorage.removeItem('vayusutra_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────
export async function loginUser(data: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/api/v1/auth/login', data);
  return res.data;
}

export async function getCurrentUser(): Promise<User> {
  const res = await api.get<User>('/api/v1/auth/me');
  return res.data;
}

export async function switchRole(role: string): Promise<{ role: string }> {
  const res = await api.post('/api/v1/auth/switch-role', { role });
  return res.data;
}

export async function demoLogin(roleSlug: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>(`/api/v1/auth/demo-login/${encodeURIComponent(roleSlug)}`);
  return res.data;
}

export async function getDemoUsers(): Promise<{ status: string; demo_accounts: DemoAccount[]; note: string }> {
  const res = await api.get('/api/v1/auth/demo-users');
  return res.data;
}

export async function logoutUser(): Promise<{ status: string; message: string }> {
  const res = await api.post('/api/v1/auth/logout');
  return res.data;
}

// ─── Index / KPIs ───────────────────────────────────────
export async function getRealtimeIndex(): Promise<RealtimeIndexResponse> {
  const res = await api.get<RealtimeIndexResponse>('/api/v1/index/realtime');
  return res.data;
}

export async function getTimeseries(): Promise<TimeseriesResponse> {
  const res = await api.get<TimeseriesResponse>('/api/v1/index/timeseries');
  return res.data;
}

export async function getSuperlativeIndex(): Promise<SuperlativeIndexResponse> {
  const res = await api.get<SuperlativeIndexResponse>('/api/v1/index/superlative');
  return res.data;
}

export async function getRegionalIndex(): Promise<RegionalIndexResponse> {
  const res = await api.get<RegionalIndexResponse>('/api/v1/index/regional');
  return res.data;
}

// ─── Analytics ───────────────────────────────────────────
export async function getHeatmap(): Promise<HeatmapResponse> {
  const res = await api.get<HeatmapResponse>('/api/v1/analytics/heatmap');
  return res.data;
}

export async function getCpiDecomposition(): Promise<CpiDecompositionResponse> {
  const res = await api.get<CpiDecompositionResponse>('/api/v1/analytics/cpi-decomposition');
  return res.data;
}

export async function getRoutes(): Promise<RoutesResponse> {
  const res = await api.get<RoutesResponse>('/api/v1/routes');
  return res.data;
}

export async function getRouteIntelligence(routeCode: string): Promise<RouteIntelligenceResponse> {
  const res = await api.get<RouteIntelligenceResponse>(`/api/v1/routes/${encodeURIComponent(routeCode)}/intelligence`);
  return res.data;
}

export async function getPressureScore(): Promise<PressureScoreResponse> {
  const res = await api.get<PressureScoreResponse>('/api/v1/analytics/pressure');
  return res.data;
}

// ─── Forecasting ─────────────────────────────────────────
export async function getNationalForecast(horizonDays = 30): Promise<ForecastResponse> {
  const res = await api.get<ForecastResponse>(`/api/v1/forecast/national?horizon_days=${horizonDays}`);
  return res.data;
}

export async function getRouteForecast(routeCode: string, horizonDays = 30): Promise<ForecastResponse> {
  const res = await api.get<ForecastResponse>(`/api/v1/forecast/route/${encodeURIComponent(routeCode)}?horizon_days=${horizonDays}`);
  return res.data;
}

export async function getForecastingModels(): Promise<ForecastingModelsResponse> {
  const res = await api.get<ForecastingModelsResponse>('/api/v1/forecasting/models');
  return res.data;
}

// ─── Scenario ────────────────────────────────────────────
export async function simulateScenario(data: ScenarioRequest): Promise<ScenarioResult> {
  const res = await api.post<ScenarioResult>('/api/v1/scenario/simulate', data);
  return res.data;
}

// ─── Fare Decomposer ────────────────────────────────────
export async function decomposeFare(data: DecomposeQueryParams): Promise<DecomposeResult> {
  const res = await api.post<DecomposeResult>('/api/v1/calculator/decompose', null, { params: data });
  return res.data;
}

// ─── Anomalies ──────────────────────────────────────────
export async function getAnomalies(): Promise<AnomaliesResponse> {
  const res = await api.get<AnomaliesResponse>('/api/v1/anomalies');
  return res.data;
}

// ─── Data Quality ───────────────────────────────────────
export async function getDataQuality(): Promise<DataQualityResponse> {
  const res = await api.get<DataQualityResponse>('/api/v1/data-quality');
  return res.data;
}

export async function getDataQualitySources(): Promise<DataQualitySourcesResponse> {
  const res = await api.get<DataQualitySourcesResponse>('/api/v1/data-quality/sources');
  return res.data;
}

export async function getProvenanceCertificate(): Promise<ProvenanceCertificate> {
  const res = await api.get<ProvenanceCertificate>('/api/v1/audit/provenance');
  return res.data;
}

// ─── AI Analyst ─────────────────────────────────────────
export async function queryAnalyst(data: AnalystQuery): Promise<AnalystResponse> {
  const res = await api.post<AnalystResponse>('/api/v1/ai/analyst', data);
  return res.data;
}

// ─── Alerts ─────────────────────────────────────────────
export async function getAlerts(statusFilter?: string): Promise<AlertsResponse> {
  const res = await api.get<AlertsResponse>('/api/v1/alerts', {
    params: statusFilter ? { status: statusFilter } : undefined,
  });
  return res.data;
}

export async function updateAlertStatus(alertId: string, newStatus: string, actor?: string): Promise<AlertStatusUpdateResponse> {
  const res = await api.patch<AlertStatusUpdateResponse>(`/api/v1/alerts/${encodeURIComponent(alertId)}`, null, {
    params: { new_status: newStatus, ...(actor ? { actor } : {}) },
  });
  return res.data;
}

export async function getAlertRules(): Promise<AlertRulesResponse> {
  const res = await api.get<AlertRulesResponse>('/api/v1/alerts/rules');
  return res.data;
}

export async function createAlertRule(data: AlertRuleInput): Promise<Record<string, unknown>> {
  const res = await api.post('/api/v1/alerts/rules', data);
  return res.data;
}

// ─── Datasets ───────────────────────────────────────────
export async function getDatasetCatalog(): Promise<DatasetCatalogResponse> {
  const res = await api.get<DatasetCatalogResponse>('/api/v1/datasets/catalog');
  return res.data;
}

export async function getFlightQuotes(limit = 12): Promise<FlightQuotesResponse> {
  const res = await api.get<FlightQuotesResponse>('/api/v1/datasets/flight-quotes', { params: { limit } });
  return res.data;
}

export async function exportCsv(): Promise<Blob> {
  const res = await api.get('/api/v1/export/csv', { responseType: 'blob' });
  return res.data;
}

// ─── Reports ────────────────────────────────────────────
export async function getDailyReport(): Promise<DailyReportResponse> {
  const res = await api.get<DailyReportResponse>('/api/v1/reports/daily');
  return res.data;
}

export async function exportReportCsv(): Promise<Blob> {
  const res = await api.get('/api/v1/reports/export', { responseType: 'blob' });
  return res.data;
}

export default api;