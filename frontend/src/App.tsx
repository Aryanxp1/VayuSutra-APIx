import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { IndexAnalyticsPage } from './pages/IndexAnalyticsPage';
import { CorridorIntelligencePage } from './pages/CorridorIntelligencePage';
import { ForecastingPage } from './pages/ForecastingPage';
import { WhatIfSimulatorPage } from './pages/WhatIfSimulatorPage';
import { FareDecomposerPage } from './pages/FareDecomposerPage';
import { AIPolicyAnalystPage } from './pages/AIPolicyAnalystPage';
import { AnomalyDetectionPage } from './pages/AnomalyDetectionPage';
import { DatasetExplorerPage } from './pages/DatasetExplorerPage';
import { DataTrustPage } from './pages/DataTrustPage';
import { ReportsPage } from './pages/ReportsPage';
import { AlertsPage } from './pages/AlertsPage';
import { InDevelopmentPage } from './pages/InDevelopmentPage';

export default function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="analytics/indices" element={<IndexAnalyticsPage />} />
        <Route path="analytics/corridors" element={<CorridorIntelligencePage />} />
        <Route path="forecasting" element={<ForecastingPage />} />
        <Route path="simulator/whatif" element={<WhatIfSimulatorPage />} />
        <Route path="simulator/decomposer" element={<FareDecomposerPage />} />
        <Route path="intelligence/analyst" element={<AIPolicyAnalystPage />} />
        <Route path="intelligence/anomalies" element={<AnomalyDetectionPage />} />
        <Route path="data/datasets" element={<DatasetExplorerPage />} />
        <Route path="data/trust" element={<DataTrustPage />} />
        <Route path="data/reports" element={<ReportsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="*" element={<InDevelopmentPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
