 import axios from 'axios';
 import type {
   LoginRequest,
   LoginResponse,
   RealtimeIndex,
   TimeseriesResponse,
   HeatmapResponse,
   CpiDecomposition,
   ForecastReport,
   ScenarioResult,
   DecompositionResult,
   AiAnalystResponse,
   Anomaly,
   DataTrustScore,
   PressureScore,
 } from '@/types/api';

 const api = axios.create({
   baseURL: import.meta.env.VITE_API_BASE_URL || '',
   headers: { 'Content-Type': 'application/json' },
 });

 // Attach JWT token to every request
 api.interceptors.request.use((config) => {
   const token = localStorage.getItem('vayusutra_token');
   if (token) {
     config.headers.Authorization = `Bearer ${token}`;
   }
   return config;
 });

 // Handle 401 globally
 api.interceptors.response.use(
   (res) => res,
   (err) => {
     if (err.response?.status === 401) {
       localStorage.removeItem('vayusutra_token');
       localStorage.removeItem('vayusutra_user');
       window.location.href = '/login';
     }
     return Promise.reject(err);
   },
 );

 // ── Auth ──────────────────────────────────────────────
 export const authApi = {
   login: (data: LoginRequest) =>
     api.post<LoginResponse>('/api/v1/auth/login', data).then((r) => r.data),
   me: () => api.get<{ user: LoginResponse['user'] }>('/api/v1/auth/me').then((r) => r.data),
   switchRole: (role: string) =>
     api.post<{ user: LoginResponse['user'] }>('/api/v1/auth/switch-role', { role }).then((r) => r.data),
 };

 // ── Index ─────────────────────────────────────────────
 export const indexApi = {
   realtime: () => api.get<RealtimeIndex>('/api/v1/index/realtime').then((r) => r.data),
   timeseries: () => api.get<TimeseriesResponse>('/api/v1/index/timeseries').then((r) => r.data),
   superlative: () => api.get('/api/v1/index/superlative').then((r) => r.data),
   regional: () => api.get('/api/v1/index/regional').then((r) => r.data),
 };

 // ── Analytics ─────────────────────────────────────────
 export const analyticsApi = {
   heatmap: () => api.get<HeatmapResponse>('/api/v1/analytics/heatmap').then((r) => r.data),
   cpiDecomposition: () => api.get<CpiDecomposition>('/api/v1/analytics/cpi-decomposition').then((r) => r.data),
   pressureScore: () => api.get<PressureScore>('/api/v1/analytics/pressure-score').then((r) => r.data),
   cpiImpactMatrix: () => api.get('/api/v1/analytics/cpi-impact-matrix').then((r) => r.data),
   routeIntelligence: (code: string) =>
     api.get(`/api/v1/analytics/route-intelligence/${code}`).then((r) => r.data),
 };

 // ── Forecasting ───────────────────────────────────────
 export const forecastApi = {
   national: (horizonDays = 30) =>
     api.get<ForecastReport>(`/api/v1/forecast/national?horizon_days=${horizonDays}`).then((r) => r.data),
   route: (code: string) =>
     api.get<ForecastReport>(`/api/v1/forecast/route/${code}`).then((r) => r.data),
   models: () => api.get('/api/v1/forecasting/models').then((r) => r.data),
 };

 // ── Scenario ──────────────────────────────────────────
 export const scenarioApi = {
   simulate: (params: {
     scenario_name?: string;
     airfare_shock_pct: number;
     demand_change_pct: number;
     capacity_change_pct: number;
     atf_fuel_shock_pct: number;
     booking_horizon_shock?: string;
     seasonal_factor?: number;
   }) => api.post<ScenarioResult>('/api/v1/scenario/simulate', params).then((r) => r.data),
 };

 // ── Calculator ────────────────────────────────────────
 export const calculatorApi = {
   decompose: (params: { route_code: string; total_fare: number }) =>
     api.post<DecompositionResult>('/api/v1/calculator/decompose', params).then((r) => r.data),
 };

 // ── AI Analyst ────────────────────────────────────────
 export const aiAnalystApi = {
   query: (question: string, userRole = 'POLICY_ECONOMIST') =>
     api.post<AiAnalystResponse>('/api/v1/ai/analyst', { question, user_role: userRole }).then((r) => r.data),
 };

 // ── Anomalies ─────────────────────────────────────────
 export const anomalyApi = {
   list: () => api.get<{ anomalies: Anomaly[] }>('/api/v1/anomalies').then((r) => r.data),
 };

 // ── Data Quality ──────────────────────────────────────
 export const dataQualityApi = {
   trust: () => api.get<DataTrustScore>('/api/v1/data-quality').then((r) => r.data),
 };

 // ── Alerts ────────────────────────────────────────────
 export const alertApi = {
   rules: () => api.get('/api/v1/alerts/rules').then((r) => r.data),
   createRule: (rule: Record<string, unknown>) =>
     api.post('/api/v1/alerts/rules', rule).then((r) => r.data),
 };

 // ── Datasets & Export ─────────────────────────────────
 export const datasetApi = {
   quotes: () => api.get('/api/v1/datasets/quotes').then((r) => r.data),
   indices: () => api.get('/api/v1/datasets/indices').then((r) => r.data),
   exportCsv: () => api.get('/api/v1/export/csv', { responseType: 'blob' }).then((r) => r.data),
 };

 // ── Reports ───────────────────────────────────────────
 export const reportApi = {
   daily: () => api.get('/api/v1/reports/daily').then((r) => r.data),
   export: (format: string) =>
     api.get(`/api/v1/reports/export/${format}`, { responseType: 'blob' }).then((r) => r.data),
 };

 // ── Ingestion ─────────────────────────────────────────
 export const ingestApi = {
   run: () => api.post('/api/v1/ingest/run').then((r) => r.data),
 };

 export default api;