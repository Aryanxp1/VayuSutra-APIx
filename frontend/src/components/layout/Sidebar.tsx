import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import vayuSutraLogo from '@/assets/VayuSutra_logo.png';
import { NAV_SECTIONS } from '@/config/navigation';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggle, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="sidebar-header">
        {collapsed ? (
          <div className="sidebar-logo sidebar-logo-mark">
            <img src={vayuSutraLogo} alt="VayuSutra" />
          </div>
        ) : (
          <div className="sidebar-logo sidebar-logo-full">
            <img src={vayuSutraLogo} alt="VayuSutra" />
            <span className="sidebar-logo-text">
              <span className="sidebar-logo-name">VayuSutra</span>
              <span className="sidebar-logo-subtitle">Aviation Intelligence</span>
            </span>
          </div>
        )}
        <button
          className="sidebar-collapse-btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {NAV_SECTIONS.map((section) => (
          <div className="nav-section" key={section.title}>
            <div className="nav-section-title">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-item-icon">
                  <item.icon size={17} strokeWidth={2} />
                </span>
                <span className="nav-item-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            VayuSutra V3
            <br />
            Demonstration dataset — not official statistics
          </div>
        )}
      </div>
    </aside>
  );
}