import React from 'react';
import { Icon } from '../ui';

export default function SecuritySettingsSection({
  appLock,
  onOpenSecurityModal
}) {
  return (
    <div className="glass-card" style={{ padding: '1rem 1.15rem', borderRadius: '16px', marginBottom: '1.25rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="section-icon"><Icon name="lock" /></span>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>Seguridad</h3>
        </div>
        <span style={{
          fontSize: '0.72rem',
          padding: '3px 8px',
          borderRadius: '8px',
          background: appLock?.hasPin ? 'var(--color-accent-soft)' : 'var(--bg-surface-elevated)',
          color: appLock?.hasPin ? 'var(--color-accent)' : 'var(--text-secondary)',
          fontWeight: 600,
          border: '1px solid var(--border-color)'
        }}>
          {appLock?.hasPin ? 'PIN Activado' : 'Sin Protección'}
        </span>
      </div>

      <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        Bloquea el acceso a la aplicación con un código PIN y desbloqueo biométrico (huella o rostro).
      </p>

      <button
        type="button"
        onClick={onOpenSecurityModal}
        style={{
          width: '100%',
          padding: '0.85rem 1rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-surface-elevated)',
          color: 'var(--text-primary)',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{appLock?.hasPin ? 'Cambiar PIN o biometría' : 'Configurar PIN de bloqueo'}</span>
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>&rsaquo;</span>
      </button>
    </div>
  );
}
