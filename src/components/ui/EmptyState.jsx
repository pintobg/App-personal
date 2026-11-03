/**
 * Componente EmptyState del Sistema de Diseño
 * Muestra un estado vacío consistente con icono, título, descripción y acción opcional.
 */
export default function EmptyState({
  icon = '📭',
  title,
  message,
  description,
  action,
  className = '',
  style = {},
  ...rest
}) {
  const displayTitle = title || message || 'Sin elementos';

  return (
    <div
      className={`ui-empty-state ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-6) var(--space-4)',
        backgroundColor: 'var(--bg-surface)',
        border: '1px dashed var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxSizing: 'border-box',
        width: '100%',
        ...style
      }}
      {...rest}
    >
      {icon && (
        <div
          style={{
            fontSize: '2rem',
            marginBottom: 'var(--space-2)',
            lineHeight: 1
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          margin: 0,
          fontSize: 'var(--font-base)',
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em'
        }}
      >
        {displayTitle}
      </h3>
      {description && (
        <p
          style={{
            margin: 'var(--space-1) 0 0',
            fontSize: 'var(--font-xs)',
            color: 'var(--text-secondary)',
            maxWidth: '320px',
            lineHeight: 1.45
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          {action}
        </div>
      )}
    </div>
  );
}
