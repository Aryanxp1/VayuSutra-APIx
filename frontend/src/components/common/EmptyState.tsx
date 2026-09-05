import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-4)',
      padding: 'var(--space-12)',
      textAlign: 'center',
    }}>
      {icon && (
        <div style={{
          width: 48, height: 48,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-tertiary)',
        }}>
          {icon}
        </div>
      )}
      <p style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontWeight: 'var(--font-medium)' }}>
        {title}
      </p>
      {description && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: 360 }}>
          {description}
        </p>
      )}
    </div>
  );
}