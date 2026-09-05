import { useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { findNavItem } from '@/config/navigation';

export function InDevelopmentPage() {
  const location = useLocation();
  const item = findNavItem(location.pathname);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{item?.label ?? 'VayuSutra'}</h1>
          <p className="page-subtitle">
            {item?.description ?? 'This section has not been configured yet.'}
          </p>
        </div>
      </div>

      <div className="card panel-block">
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)',
          }}
        >
          <Wrench size={26} />
        </span>
        <p style={{ color: 'var(--text-primary)', fontSize: 'var(--text-md)', fontWeight: 'var(--font-medium)' }}>
          This capability is not part of the current release
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: 460 }}>
          The interface for{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{item?.label ?? 'this feature'}</strong>{' '}
          is still under development. The underlying VayuSutra API is already operational and will be
          wired to this screen when the capability is delivered.
        </p>
      </div>
    </div>
  );
}