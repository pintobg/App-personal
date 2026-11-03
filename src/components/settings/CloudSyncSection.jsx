export default function CloudSyncSection({ auth, onSyncNow, onOpenAuthModal }) {
  return (
    <div className="glass-card" style={{ padding: '1rem 1.15rem', borderRadius: '16px', marginBottom: '1.25rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>☁️</span>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>Cuenta y Sincronización</h3>
        </div>
        <span style={{
          fontSize: '0.72rem',
          padding: '3px 8px',
          borderRadius: '8px',
          background: auth?.user ? 'var(--color-accent-soft)' : 'var(--bg-surface-elevated)',
          color: auth?.user ? 'var(--color-accent)' : 'var(--text-secondary)',
          fontWeight: 600,
          border: '1px solid var(--border-color)'
        }}>
          {auth?.user ? 'Multidispositivo' : 'Modo Local'}
        </span>
      </div>

      <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        {auth?.user
          ? `Conectado como ${auth.user.email}. Tus datos se respaldan y sincronizan automáticamente.`
          : 'Usa la app en modo local o inicia sesión para sincronizar tus finanzas en todos tus dispositivos.'}
      </p>

      {auth?.user ? (
        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.6rem 0.85rem',
            borderRadius: '12px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-color)',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>Estado de sincronización:</span>
            <span style={{
              fontWeight: 600,
              color: (auth.syncStatus === 'synced' && (auth.pendingCount || 0) === 0)
                ? 'var(--color-accent)'
                : auth.syncStatus === 'syncing'
                ? 'var(--color-info)'
                : auth.syncStatus === 'error'
                ? 'var(--color-danger)'
                : (auth.syncStatus === 'offline' || (auth.pendingCount || 0) > 0)
                ? 'var(--color-warning)'
                : 'var(--color-danger)'
            }}>
              {auth.syncStatus === 'syncing' && '🔄 Sincronizando...'}
              {auth.syncStatus !== 'syncing' && auth.syncStatus === 'offline' && '⚠️ Sin conexión'}
              {auth.syncStatus !== 'syncing' && auth.syncStatus !== 'offline' && auth.syncStatus === 'error' && (
                <button
                  type="button"
                  onClick={onSyncNow}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 600,
                    textDecoration: 'underline'
                  }}
                >
                  ✕ Error, reintentar
                </button>
              )}
              {auth.syncStatus !== 'syncing' && auth.syncStatus !== 'offline' && auth.syncStatus !== 'error' && (auth.pendingCount || 0) > 0 && `⏳ Pendiente (${auth.pendingCount})`}
              {auth.syncStatus !== 'syncing' && auth.syncStatus !== 'offline' && auth.syncStatus !== 'error' && (auth.pendingCount || 0) === 0 && auth.syncStatus === 'synced' && '● Sincronizado'}
              {auth.syncStatus === 'guest' && '👤 Local'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onSyncNow}
              style={{
                flex: 1,
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--color-accent-border)',
                background: 'var(--color-accent-soft)',
                color: 'var(--color-accent)',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                cursor: 'pointer'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              Sincronizar ahora
            </button>
            <button
              type="button"
              onClick={onOpenAuthModal}
              style={{
                flex: 1,
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Mi Cuenta
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenAuthModal}
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            border: '1px solid var(--color-accent-border)',
            background: 'var(--color-accent-soft)',
            color: 'var(--color-accent)',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
          </svg>
          Iniciar Sesión / Activar Sincronización
        </button>
      )}
    </div>
  );
}
