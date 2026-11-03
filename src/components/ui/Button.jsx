/**
 * Componente Button del Sistema de Diseño
 * Variantes: primario (primary), secundario (secondary), fantasma (ghost), peligro (danger)
 */
export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon,
  iconRight,
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  style = {},
  ariaLabel,
  ...rest
}) {
  const sizeStyles = {
    sm: {
      padding: 'var(--space-1) var(--space-3)',
      fontSize: 'var(--font-xs)',
      height: '32px',
      gap: 'var(--space-1)',
      borderRadius: 'var(--radius-sm)'
    },
    md: {
      padding: 'var(--space-2) var(--space-4)',
      fontSize: 'var(--font-sm)',
      height: '42px',
      gap: 'var(--space-2)',
      borderRadius: 'var(--radius-md)'
    },
    lg: {
      padding: 'var(--space-3) var(--space-6)',
      fontSize: 'var(--font-base)',
      height: '48px',
      gap: 'var(--space-2)',
      borderRadius: 'var(--radius-md)'
    }
  }[size] || sizeStyles.md;

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--color-accent-strong)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent'
    },
    secondary: {
      backgroundColor: 'var(--bg-surface-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent'
    },
    danger: {
      backgroundColor: 'var(--color-danger-strong)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent'
    }
  }[variant] || variantStyles.primary;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`ui-btn ui-btn-${variant} ui-btn-${size} ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...sizeStyles,
        ...variantStyles,
        ...style
      }}
      {...rest}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
      {iconRight && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{iconRight}</span>}
    </button>
  );
}
