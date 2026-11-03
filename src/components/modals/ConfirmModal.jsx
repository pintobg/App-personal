export default function ConfirmModal({
  config,
  onCancel
}) {
  if (!config || !config.isOpen) return null;

  const {
    title = 'Confirmar acción',
    message = '',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    onConfirm
  } = config;

  const isDanger = variant === 'danger';

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (onCancel) onCancel();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      style={{ zIndex: 3000 }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          padding: '1.5rem',
          borderRadius: '20px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: isDanger ? 'var(--color-danger-soft)' : 'var(--color-success-soft)',
              border: `1px solid ${isDanger ? 'var(--color-danger-border)' : 'var(--color-accent-border)'}`,
              color: isDanger ? 'var(--color-danger)' : 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {isDanger ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {title}
          </h2>
        </div>

        <p
          style={{
            margin: '0 0 1.5rem',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            whiteSpace: 'pre-line'
          }}
        >
          {message}
        </p>

        <div className="modal-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleConfirm}
            style={{
              backgroundColor: isDanger ? 'var(--color-danger-strong)' : 'var(--color-accent-strong)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
