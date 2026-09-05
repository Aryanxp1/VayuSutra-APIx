import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { demoLogin } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface DemoAccount {
  slug: string;
  title: string;
  organization: string;
}

/**
 * Pre-configured executive personas exposed by the backend `POST /api/v1/auth/demo-login/{slug}`
 * endpoint. No plaintext passwords are embedded in the frontend — authentication is performed
 * entirely server-side so this panel stays safe to ship as a public demo landing.
 */
const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    slug: 'mospi',
    title: 'MoSPI Administrator',
    organization: 'Ministry of Statistics & Programme Implementation',
  },
  {
    slug: 'rbi',
    title: 'RBI Monetary Policy',
    organization: 'Reserve Bank of India',
  },
  {
    slug: 'dgca',
    title: 'DGCA Regulator',
    organization: 'Directorate General of Civil Aviation',
  },
  {
    slug: 'admin',
    title: 'System Administrator',
    organization: 'Team VayuSutra',
  },
  {
    slug: 'auditor',
    title: 'Public Auditor',
    organization: 'Independent Public Observation',
  },
];

interface DemoAccessPanelProps {
  onError: (message: string) => void;
  onLoggedIn: () => void;
}

export function DemoAccessPanel({ onError, onLoggedIn }: DemoAccessPanelProps) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const handleDemo = async (account: DemoAccount) => {
    if (busySlug) return;
    setBusySlug(account.slug);
    try {
      const res = await demoLogin(account.slug);
      setAuth(res.user, res.access_token);
      onLoggedIn();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      onError(detail || 'Demo sign-in failed. Please ensure the VayuSutra API service is running.');
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div className="demo-list">
      {DEMO_ACCOUNTS.map((account) => (
        <button
          key={account.slug}
          type="button"
          className="demo-row"
          disabled={busySlug !== null}
          onClick={() => handleDemo(account)}
        >
          <span className="demo-row-main">
            <span className="demo-row-title">{account.title}</span>
            <span className="demo-row-org">{account.organization}</span>
          </span>
          <span className="demo-row-action">
            {busySlug === account.slug ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              'One-click'
            )}
          </span>
        </button>
      ))}
    </div>
  );
}