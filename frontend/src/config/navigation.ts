import type { LucideIcon } from 'lucide-react';
import {
  AlertOctagon,
  BarChart3,
  Bell,
  Bot,
  Calculator,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Network,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export type NavStatus = 'done' | 'phase4';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  status: NavStatus;
  description: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Analytics',
    items: [
      { label: 'Overview', path: '/overview', icon: LayoutDashboard, status: 'done', description: 'Consolidated national airfare price-pressure view built on live APIx endpoints.' },
      { label: 'Index Analytics', path: '/analytics/indices', icon: BarChart3, status: 'done', description: 'Superlative indices, substitution bias, and regional hub analytics from live APIx endpoints.' },
      { label: 'Corridor Intelligence', path: '/analytics/corridors', icon: Network, status: 'done', description: '20×5 airfare heatmap matrix and corridor-level intelligence dossiers from live APIx endpoints.' },
    ],
  },
  {
    title: 'Forecasting & Simulation',
    items: [
      { label: 'Forecasting', path: '/forecasting', icon: TrendingUp, status: 'done', description: 'Multi-model forecasts with 95% confidence fan-charts from live APIx endpoints.' },
      { label: 'What-If Simulator', path: '/simulator/whatif', icon: FlaskConical, status: 'done', description: 'Policy shock scenario pass-through simulator.' },
      { label: 'Fare Decomposer', path: '/simulator/decomposer', icon: Calculator, status: 'done', description: 'Airfare component decomposition calculator.' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'AI Policy Analyst', path: '/intelligence/analyst', icon: Bot, status: 'done', description: 'Deterministic policy Q&A with statutory citations.' },
      { label: 'Anomaly Detection', path: '/intelligence/anomalies', icon: AlertOctagon, status: 'done', description: 'Live route surge & outlier surveillance with real detection signals from the APIx anomaly engine.' },
    ],
  },
  {
    title: 'Data & Operations',
    items: [
      { label: 'Datasets', path: '/data/datasets', icon: Database, status: 'done', description: 'Explore and export VayuSutra datasets — live registry with real counts and coverage.' },
      { label: 'Data Trust', path: '/data/trust', icon: ShieldCheck, status: 'done', description: 'Live data quality scorecard, per-source health and cryptographic provenance vault.' },
      { label: 'Reports', path: '/data/reports', icon: FileText, status: 'done', description: 'Automated daily intelligence dossier with statutory CSV exports.' },
      { label: 'Alerts', path: '/alerts', icon: Bell, status: 'done', description: 'Live threshold alert stream evaluated from current APIx metrics.' },
    ],
  },
];

export const STATUS_LABELS: Record<NavStatus, string> = {
  done: 'Available',
  phase4: 'Phase 4',
};

export function findNavItem(pathname: string): NavItem | undefined {
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((i) => i.path === pathname);
    if (item) return item;
  }
  return undefined;
}