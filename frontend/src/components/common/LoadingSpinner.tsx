import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 24, text }: { size?: number; text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-8)' }}>
      <Loader2 size={size} className="animate-spin" style={{ color: 'var(--brand-saffron)' }} />
      {text && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{text}</span>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
      <LoadingSpinner size={32} text="Loading..." />
    </div>
  );
}