import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed((value) => !value)}
        onNavigate={() => setMobileOpen(false)}
      />
      <div className={`main-area${collapsed ? ' sidebar-collapsed' : ''}`}>
        <TopBar onMenuClick={() => setMobileOpen((open) => !open)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}