import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
  mono?: boolean;
}

export function StatCard({ label, value, subtitle, trend, trendValue, icon, mono = false }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-primary)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-medium)',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {label}
        </span>
        {icon && <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>}
      </div>
      <div style={{
        fontSize: 'var(--text-2xl)',
        fontWeight: 'var(--font-bold)',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        color: 'var(--text-primary)',
        lineHeight: 'var(--leading-tight)',
      }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {trend && trendValue && (
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-medium)',
            color: trend === 'up' ? 'var(--semantic-error)' : trend === 'down' ? 'var(--semantic-success)' : 'var(--text-secondary)',
          }}>
            {trend === 'up' ? '+' : ''}{trendValue}
          </span>
        )}
        {subtitle && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}