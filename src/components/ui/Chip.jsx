/**
 * Componente Chip del Sistema de Diseño
 * Píldoras compactas para filtros, categorías, estados y etiquetas.
 */
export default function Chip({
  children,
  variant = 'default', // 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
  size = 'md', // 'sm' | 'md'
  active = false,
  onClick,
  icon,
  className = '',
  style = {},
  ...rest
}) {
  const isClickable = Boolean(onClick);

  const sizeStyles = {
    sm: {
      padding: '2px 8px',
      fontSize: 'var(--font-xs)',
      borderRadius: 'var(--radius-pill)',
      gap: 'var(--space-1)'
    },
    md: {
      padding: 'var(--space-1) var(--space-3)',
      fontSize: 'var(--font-xs)',
      borderRadius: 'var(--radius-pill)',
      gap: 'var(--space-1)'
    }
  }[size] || sizeStyles.md;

  const variantStyles = {
    default: {
      backgroundColor: active ? 'var(--color-accent-strong)' : 'var(--bg-surface-elevated)',
      color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
      border: `1px solid ${active ? 'var(--color-accent)' : 'var(--border-color)'}`
    },
    accent: {
      backgroundColor: active ? 'var(--color-accent-strong)' : 'var(--color-accent-soft)',
      color: active ? 'var(--text-on-accent)' : 'var(--color-accent)',
      border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-accent-border)'}`
    },
    success: {
      backgroundColor: active ? 'var(--color-success-strong)' : 'var(--color-success-soft)',
      color: active ? 'var(--text-on-accent)' : 'var(--color-success)',
      border: `1px solid ${active ? 'var(--color-success)' : 'var(--color-success-border)'}`
    },
    warning: {
      backgroundColor: active ? 'var(--color-warning-strong)' : 'var(--color-warning-soft)',
      color: active ? 'var(--text-on-accent)' : 'var(--color-warning)',
      border: `1px solid ${active ? 'var(--color-warning)' : 'var(--color-warning-border)'}`
    },
    danger: {
      backgroundColor: active ? 'var(--color-danger-strong)' : 'var(--color-danger-soft)',
      color: active ? 'var(--text-on-accent)' : 'var(--color-danger)',
      border: `1px solid ${active ? 'var(--color-danger)' : 'var(--color-danger-border)'}`
    },
    info: {
      backgroundColor: active ? 'var(--color-info-strong)' : 'var(--color-info-soft)',
      color: active ? 'var(--text-on-accent)' : 'var(--color-info)',
      border: `1px solid ${active ? 'var(--color-info)' : 'var(--color-info-border)'}`
    }
  }[variant] || variantStyles.default;

  return (
    <span
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      className={`ui-chip ${active ? 'ui-chip-active' : ''} ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 600,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        ...sizeStyles,
        ...variantStyles,
        ...style
      }}
      {...rest}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
}
