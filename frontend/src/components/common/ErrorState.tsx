import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
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
      <div style={{
        width: 48, height: 48,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--semantic-error-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertTriangle size={24} style={{ color: 'var(--semantic-error)' }} />
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: 360 }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            border: '1px solid var(--border-primary)',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}