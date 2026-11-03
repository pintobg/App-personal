import React from 'react';

export default function AuthGuestWarning({ onExportBackup }) {
  return (
    <div
      style={{
        background: '#231c12',
        border: '1px solid #5a3e1b',
        borderRadius: '14px',
        padding: '0.85rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
        <span style={{ fontSize: '1.1rem', lineHeight: '1.2' }}>📱</span>
        <div style={{ fontSize: '0.82rem', color: '#fde68a', lineHeight: '1.35', fontWeight: 500 }}>
          Tus datos están guardados solo en este teléfono. Haz respaldos frecuentes.
        </div>
      </div>
      {onExportBackup && (
        <div>
          <button
            type="button"
            onClick={onExportBackup}
            style={{
              background: '#f59e0b',
              color: '#1a1306',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Descargar respaldo ahora</span>
            <span style={{ fontSize: '0.9rem' }}>↓</span>
          </button>
        </div>
      )}
    </div>
  );
}
