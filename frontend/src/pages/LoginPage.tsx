import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import { loginUser } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { Logo } from '@/components/Logo';
import { DemoAccessPanel } from '@/components/auth/DemoAccessPanel';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both username/email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await loginUser({ username_or_email: identifier.trim(), password });
      setAuth(res.user, res.access_token);
      navigate('/overview', { replace: true });
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Sign-in failed. Please verify your credentials and ensure the API service is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button
        className="theme-toggle-corner"
        onClick={toggleTheme}
        aria-label="Toggle color theme"
        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="login-card">
        <div className="login-brand">
          <Logo size="lg" />
          <p className="login-brand-title">National Aviation Price-Pressure Intelligence</p>
          <p className="login-brand-body">
            VayuSutra monitors domestic airfare price indices and their transmission to headline CPI —
            spanning MoSPI statistical conventions, RBI monetary policy analysis, and DGCA regulatory
            surveillance across the DGCA top-20 domestic corridors.
          </p>
          <div className="login-brand-foot">
            <ShieldCheck size={14} />
            <span>RBAC-protected · REST API · Model-Simulated Demonstration Data</span>
          </div>
        </div>

        <div className="login-form-side">
          <form className="login-form" onSubmit={handleSubmit}>
            <h2 className="login-form-title">Executive Sign-In</h2>
            <label className="login-label" htmlFor="identifier">Username or Email</label>
            <input
              id="identifier"
              className="login-input"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. mospi_admin"
              autoComplete="username"
            />
            <label className="login-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoComplete="current-password"
            />
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in to VayuSutra'}
            </button>
          </form>

          <div className="login-divider">
            <span>or use a demo persona</span>
          </div>

          <DemoAccessPanel onError={setError} onLoggedIn={() => navigate('/overview', { replace: true })} />

          <p className="login-footnote">Authorized Government &amp; Institutional Access Only</p>
        </div>
      </div>
    </div>
  );
}