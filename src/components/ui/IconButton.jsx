/**
 * Componente IconButton del Sistema de Diseño
 * EXIGE obligatoriamente un atributo de accesibilidad (aria-label o ariaLabel).
 */
export default function IconButton({
  icon,
  'aria-label': ariaLabelAttr,
  ariaLabel,
  title,
  variant = 'ghost', // 'ghost' | 'secondary' | 'primary' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  style = {},
  ...rest
}) {
  const finalLabel = ariaLabelAttr || ariaLabel || title;

  if (process.env.NODE_ENV !== 'production' && !finalLabel) {
    console.warn('[IconButton] Advertencia de accesibilidad: Se requiere un prop aria-label o title para botones de solo icono.');
  }

  const sizeStyles = {
    sm: {
      width: '36px',
      height: '36px',
      fontSize: 'var(--font-sm)',
      borderRadius: 'var(--radius-sm)'
    },
    md: {
      width: '44px',
      height: '44px',
      fontSize: 'var(--font-base)',
      borderRadius: 'var(--radius-md)'
    },
    lg: {
      width: '48px',
      height: '48px',
      fontSize: 'var(--font-lg)',
      borderRadius: 'var(--radius-md)'
    }
  }[size] || sizeStyles.md;

  const variantStyles = {
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent'
    },
    secondary: {
      backgroundColor: 'var(--bg-surface-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)'
    },
    primary: {
      backgroundColor: 'var(--color-accent-strong)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent'
    },
    danger: {
      backgroundColor: 'var(--color-danger-soft)',
      color: 'var(--color-danger)',
      border: '1px solid var(--color-danger-border)'
    }
  }[variant] || variantStyles.ghost;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={finalLabel || 'Acción'}
      title={title || finalLabel}
      className={`ui-icon-btn ui-icon-btn-${variant} ui-icon-btn-${size} ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.15s ease',
        flexShrink: 0,
        boxSizing: 'border-box',
        ...sizeStyles,
        ...variantStyles,
        ...style
      }}
      {...rest}
    >
      {icon}
    </button>
  );
}
