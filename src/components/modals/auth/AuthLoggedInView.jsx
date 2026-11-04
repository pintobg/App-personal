import React, { useState } from 'react';
import { Icon } from '../../ui';
import NotificationSettingsSection from '../../common/NotificationSettingsSection';
import SyncErrorPanel from './SyncErrorPanel';

export default function AuthLoggedInView({
  user,
  syncStatus,
  pendingCount,
  isSupabaseConfigured,
  queueItems,
  setQueueItems,
  onSyncNow,
  onSignOut,
  onExportBackup,
  onNavigateCategories,
  onOpenSecurityModal,
  hasPin,
  referenceRate: _referenceRate,
  setReferenceRate: _setReferenceRate,
  showToast,
  localState,
  onRequestConfirm,
  setConfirmDialog,
  onClose
}) {
  const [showErrorPanel, setShowErrorPanel] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'var(--color-success-strong)',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
              {user.email}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              ID: {user.id?.slice(0, 12)}...
            </div>
          </div>
        </div>

        {/* Status pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          borderRadius: '10px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          fontSize: '0.8rem'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>Estado de sincronización:</span>
          <span style={{
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: (syncStatus === 'synced' && pendingCount === 0) ? 'var(--color-success)' : syncStatus === 'syncing' ? 'var(--color-info)' : syncStatus === 'error' ? 'var(--color-danger)' : (syncStatus === 'offline' || pendingCount > 0) ? 'var(--color-warning)' : 'var(--color-danger)'
          }}>
            {syncStatus === 'syncing' && 'Sincronizando…'}
            {syncStatus !== 'syncing' && syncStatus === 'offline' && 'Sin conexión'}
            {syncStatus !== 'syncing' && syncStatus !== 'offline' && syncStatus === 'error' && (
              <button
                type="button"
                onClick={() => setShowErrorPanel(prev => !prev)}
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
                No se pudo sincronizar. Toca para reintentar
              </button>
            )}
            {syncStatus !== 'syncing' && syncStatus !== 'offline' && syncStatus !== 'error' && pendingCount > 0 && `⏳ Pendiente (${pendingCount})`}
            {syncStatus !== 'syncing' && syncStatus !== 'offline' && syncStatus !== 'error' && pendingCount === 0 && syncStatus === 'synced' && '● Sincronizado'}
            {syncStatus === 'guest' && 'Sin sincronizar'}
          </span>
        </div>

        {showErrorPanel && (
          <SyncErrorPanel
            queueItems={queueItems}
            setQueueItems={setQueueItems}
            onClose={() => setShowErrorPanel(false)}
            onSyncNow={onSyncNow}
            onRequestConfirm={onRequestConfirm}
            setConfirmDialog={setConfirmDialog}
            showToast={showToast}
          />
        )}
      </div>

      {!isSupabaseConfigured && (
        <div
          style={{
            background: 'var(--color-warning-soft)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: '14px',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <span className="section-icon"><Icon name="phone" /></span>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-warning)', lineHeight: '1.35', fontWeight: 500 }}>
              Tus datos están guardados solo en este teléfono. Haz respaldos frecuentes.
            </div>
          </div>
          {onExportBackup && (
            <div>
              <button
                type="button"
                onClick={onExportBackup}
                style={{
                  background: 'var(--color-warning-strong)',
                  color: 'var(--color-warning-soft)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Exportar respaldo
              </button>
            </div>
          )}
        </div>
      )}

      {onNavigateCategories && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onNavigateCategories();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '0.85rem 1rem',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="section-icon"><Icon name="tag" /></span>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Administrar Categorías</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Configurar catálogo de gastos e ingresos</div>
            </div>
          </div>
          <span style={{ color: 'var(--text-secondary)', display: 'inline-flex' }}><Icon name="chevronRight" size={18} /></span>
        </button>
      )}

      {/* AJUSTE GLOBAL: TASA DE REFERENCIA */}
      <div
        style={{
          background: 'var(--plomo-800)',
          border: '1px solid var(--plomo-700)',
          borderRadius: '14px',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="section-icon"><Icon name="exchange" /></span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Tasa para tus totales</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Valora tus bolívares en dólares
              </div>
            </div>
          </div>
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Se cambia en Tasas</span>
        </div>
      </div>

      {/* SECCIÓN NOTIFICACIONES Y RECORDATORIOS */}
      <NotificationSettingsSection
        obligations={localState?.obligations || []}
        showToast={showToast}
      />

      {onOpenSecurityModal && (
        <div
          onClick={() => {
            onClose();
            onOpenSecurityModal();
          }}
          style={{
            background: 'var(--plomo-800)',
            border: '1px solid var(--plomo-700)',
            borderRadius: '14px',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="section-icon"><Icon name="lock" /></span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Seguridad y Bloqueo</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {hasPin ? 'PIN y biometría activados' : 'Configurar PIN de 4 a 6 dígitos'}
              </div>
            </div>
          </div>
          <span style={{ color: 'var(--color-info)', fontSize: '0.82rem', fontWeight: 600 }}>
            {hasPin ? 'Ajustar →' : 'Activar →'}
          </span>
        </div>
      )}

      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onSignOut}
          style={{ color: 'var(--color-danger)' }}
        >
          Cerrar sesión
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSyncNow}
          style={{ gap: '0.4rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Sincronizar
        </button>
      </div>
    </div>
  );
}
