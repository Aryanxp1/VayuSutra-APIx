import { Plane } from 'lucide-react';

interface LogoProps {
  variant?: 'full' | 'mark';
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ variant = 'full', size = 'md' }: LogoProps) {
  const mark = size === 'lg' ? 44 : size === 'sm' ? 28 : 36;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? 8 : 12, minWidth: 0 }}>
      <span
        style={{
          width: mark,
          height: mark,
          flexShrink: 0,
          borderRadius: size === 'lg' ? 'var(--radius-xl)' : 'var(--radius-lg)',
          background: 'linear-gradient(135deg, var(--brand-saffron), #F59E0B)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <Plane size={Math.round(mark * 0.52)} strokeWidth={2.1} />
      </span>
      {variant === 'full' && (
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontWeight: 'var(--font-bold)',
              fontSize: size === 'lg' ? 'var(--text-lg)' : 'var(--text-base)',
              color: 'var(--text-primary)',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              letterSpacing: '0.01em',
            }}
          >
            VayuSutra
          </span>
          <span
            style={{
              fontSize: size === 'sm' ? 8 : 9,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              whiteSpace: 'nowrap',
            }}
          >
            Aviation Intelligence
          </span>
        </span>
      )}
    </div>
  );
}