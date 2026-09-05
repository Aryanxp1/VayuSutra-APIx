import type { CSSProperties } from 'react';

/* Shared form-control styles following the VayuSutra design-token system. */

export const fieldWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 0,
};

export const fieldLabel: CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--font-semibold)',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-1)',
};

export const fieldNote: CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-tertiary)',
};

export const inputStyle: CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-primary)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-mono)',
  width: '100%',
};

export const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const sliderStyle: CSSProperties = {
  width: '100%',
  accentColor: 'var(--brand-saffron)',
  cursor: 'pointer',
};

export const primaryButton: CSSProperties = {
  padding: 'var(--space-2) var(--space-5)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--brand-saffron)',
  color: 'var(--text-on-brand)',
  fontWeight: 'var(--font-semibold)',
  fontSize: 'var(--text-sm)',
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  transition: 'background var(--transition-fast), opacity var(--transition-fast)',
};

export const secondaryButton: CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  fontWeight: 'var(--font-medium)',
  fontSize: 'var(--text-xs)',
  border: '1px solid var(--border-primary)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  transition: 'border-color var(--transition-fast), background var(--transition-fast)',
};

export const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: '0.6875rem',
  fontWeight: 'var(--font-semibold)',
  padding: '2px 8px',
  borderRadius: 'var(--radius-sm)',
  whiteSpace: 'nowrap',
};

export const codeBlockStyle: CSSProperties = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-primary)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
  fontSize: 'var(--text-xs)',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-secondary)',
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
};

export const thStyle: CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--font-semibold)',
  color: 'var(--text-secondary)',
  padding: 'var(--space-2) var(--space-3)',
  borderBottom: '1px solid var(--border-primary)',
  whiteSpace: 'nowrap',
  textAlign: 'left',
};

export const tdStyle: CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-secondary)',
  padding: 'var(--space-2) var(--space-3)',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--font-mono)',
};