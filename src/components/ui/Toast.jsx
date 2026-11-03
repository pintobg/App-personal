/**
 * Componente Toast del Sistema de Diseño
 * Soporta mensajes de éxito, error, advertencia y acción opcional "Deshacer".
 */
export default function Toast({
  message,
  toast,
  type = 'success', // 'success' | 'error' | 'warning' | 'info'
  onUndo,
  undoText = 'Deshacer',
  onClose,
  className = '',
  style = {},
  ...rest
}) {
  const payload = message || toast;
  if (!payload) return null;

  const isObject = typeof payload === 'object' && payload !== null;
  const text = isObject ? payload.message : payload;
  const finalType = isObject ? (payload.type || type) : type;
  const finalUndo = isObject ? (payload.onUndo || onUndo) : onUndo;
  const finalUndoText = isObject ? (payload.undoText || undoText) : undoText;

  const isError = finalType === 'error';
  const isWarning = finalType === 'warning';

  const borderColor = isError
    ? 'var(--color-danger-border)'
    : isWarning
      ? 'var(--color-warning-border)'
      : 'var(--color-success-border)';

  const iconBg = isError
    ? 'var(--color-danger-soft)'
    : isWarning
      ? 'var(--color-warning-soft)'
      : 'var(--color-success-soft)';

  const iconColor = isError
    ? 'var(--color-danger)'
    : isWarning
      ? 'var(--color-warning)'
      : 'var(--color-success)';

  const iconSymbol = isError ? '✕' : isWarning ? '⚠️' : '✓';

  return (
    <div
      className={`ui-toast toast-pill ${className}`.trim()}
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(20px + env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--bg-surface)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        padding: '0.65rem 1.15rem',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-lg)',
        fontSize: 'var(--font-sm)',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        zIndex: 9999,
        width: 'auto',
        maxWidth: '92vw',
        boxSizing: 'border-box',
        animation: 'slideDownFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        ...style
      }}
      {...rest}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: iconBg,
          color: iconColor,
          fontSize: 'var(--font-xs)',
          fontWeight: 700,
          flexShrink: 0
        }}
      >
        {iconSymbol}
      </span>

      <span style={{ wordBreak: 'break-word', lineHeight: 1.35, flex: 1 }}>
        {text}
      </span>

      {finalUndo && (
        <button
          type="button"
          onClick={() => {
            finalUndo();
            if (onClose) onClose();
          }}
          style={{
            marginLeft: 'var(--space-2)',
            backgroundColor: 'var(--color-accent-soft)',
            border: '1px solid var(--color-accent-border)',
            color: 'var(--color-accent)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            fontSize: 'var(--font-xs)',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background-color 0.15s ease'
          }}
        >
          {finalUndoText}
        </button>
      )}
    </div>
  );
}
