/**
 * Componente SectionHeader del Sistema de Diseño
 * Estandariza los títulos de sección con icono opcional, contador y acción derecha.
 */
export default function SectionHeader({
  title,
  subtitle,
  icon,
  count,
  action,
  rightAction,
  style = {},
  className = '',
  ...rest
}) {
  const finalAction = action || rightAction;

  return (
    <div
      className={`ui-section-header ${className}`.trim()}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-3)',
        gap: 'var(--space-3)',
        ...style
      }}
      {...rest}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
        {icon && (
          <span
            style={{
              fontSize: 'var(--font-xl)',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {icon}
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--font-lg)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {title}
            </h2>
            {count != null && (
              <span
                style={{
                  fontSize: 'var(--font-xs)',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  lineHeight: 1.2
                }}
              >
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 'var(--font-xs)',
                color: 'var(--text-secondary)'
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {finalAction && (
        <div style={{ flexShrink: 0 }}>
          {finalAction}
        </div>
      )}
    </div>
  );
}
