export default function Toast({ message, toast }) {
  const payload = message || toast;
  if (!payload) return null;

  const isObject = typeof payload === 'object' && payload !== null;
  const text = isObject ? payload.message : payload;
  const isError = isObject ? payload.type === 'error' : false;

  return (
    <div
      className="toast-pill"
      style={{
        position: 'fixed',
        top: 'calc(20px + env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1b2230',
        border: `1px solid ${isError ? '#4d2631' : '#1f5143'}`,
        borderRadius: '16px',
        padding: '0.65rem 1.15rem',
        color: '#f1f5f9',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '0.55rem',
        zIndex: 9999,
        width: 'auto',
        maxWidth: '92vw',
        boxSizing: 'border-box',
        animation: 'slideDownFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: isError ? '#311b22' : '#14332b',
          color: isError ? '#ef4444' : '#10b981',
          fontSize: '0.75rem',
          fontWeight: 700,
          flexShrink: 0
        }}
      >
        {isError ? '✕' : '✓'}
      </span>
      <span style={{ wordBreak: 'break-word', lineHeight: 1.35 }}>{text}</span>
    </div>
  );
}

