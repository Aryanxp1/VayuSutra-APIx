import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { findNavItem } from '@/config/navigation';

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);

  const navItem = findNavItem(location.pathname);
  const roleTitle = (user?.role ?? '').replace(/_/g, ' ');
  const displayName =
    roleTitle.toUpperCase() === 'SYSTEM ADMIN' ? 'Aryan Vishwakarma' : user?.full_name || user?.username;
  const initials = (displayName || 'VS')
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <button
        className="topbar-icon-btn menu-toggle"
        onClick={onMenuClick}
        aria-label="Toggle navigation"
      >
        <Menu size={18} />
      </button>

      <div className="topbar-title">
        <h1>{navItem?.label ?? 'VayuSutra'}</h1>
      </div>

      <div className="topbar-spacer" />

      <button
        className="topbar-icon-btn"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        aria-label="Toggle color theme"
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <div style={{ position: 'relative' }}>
        <button
          className="topbar-icon-btn"
          onClick={() => setNotifOpen((open) => !open)}
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={17} />
        </button>
        {notifOpen && (
          <div className="notif-popover">
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Notifications
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
              No active alerts right now.
            </p>
          </div>
        )}
      </div>

      <div className="topbar-user">
        <div className="avatar" style={{ background: user?.avatar_color || 'var(--brand-saffron)' }}>
          {initials}
        </div>
        <div className="topbar-user-meta">
          <span className="user-name">{displayName}</span>
          <span className="user-role">{roleTitle}</span>
        </div>
      </div>

      <button className="topbar-icon-btn" onClick={handleLogout} title="Sign out" aria-label="Sign out">
        <LogOut size={17} />
      </button>
    </header>
  );
}