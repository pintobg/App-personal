import React from 'react';
import { syncService } from '../../../services/syncService';

const TABLE_NAMES = {
  obligations: 'Deudas / Compromisos (obligations)',
  transactions: 'Movimientos (transactions)',
  assets: 'Cuentas / Activos (assets)',
  budgets: 'Presupuestos (budgets)',
  goals: 'Metas de Ahorro (goals)',
  user_categories: 'Categorías (user_categories)',
  shopping_lists: 'Listas de compras (shopping_lists)',
  shopping_items: 'Artículos de compras (shopping_items)',
  shopping_products: 'Catálogo de productos (shopping_products)'
};

const ACTION_NAMES = {
  upsert: 'Guardar / Actualizar',
  delete: 'Eliminar'
};

export default function SyncErrorPanel({
  queueItems = [],
  setQueueItems,
  onClose,
  onSyncNow,
  onRequestConfirm,
  setConfirmDialog,
  showToast
}) {
  return (
    <div style={{
      background: 'var(--plomo-800)',
      border: '1px solid #ef444444',
      borderRadius: '12px',
      padding: '0.85rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-danger)' }}>
          Elementos pendientes con error ({queueItems.length})
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          ✕ Cerrar
        </button>
      </div>

      {queueItems.length === 0 ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem 0' }}>
          No hay elementos pendientes en la cola.
        </div>
      ) : (
        queueItems.map((item, idx) => (
          <div
            key={item.id || item.timestamp || idx}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.65rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              fontSize: '0.78rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Tabla: <span style={{ color: 'var(--color-accent)' }}>{TABLE_NAMES[item.table] || item.table}</span>
              </span>
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                background: item.action === 'delete' ? 'var(--color-danger-border)' : 'var(--color-info-border)',
                color: item.action === 'delete' ? 'var(--color-danger)' : 'var(--color-info)'
              }}>
                {ACTION_NAMES[item.action] || item.action}
              </span>
            </div>

            <div style={{ color: 'var(--text-secondary)' }}>
              Intentos: <strong style={{ color: 'var(--text-primary)' }}>{item.attempts || 0}</strong>
            </div>

            <div style={{
              background: 'var(--plomo-800)',
              border: '1px solid var(--color-danger-soft)',
              borderRadius: '6px',
              padding: '0.4rem 0.5rem',
              color: 'var(--color-danger)',
              fontSize: '0.72rem',
              wordBreak: 'break-word',
              lineHeight: 1.35
            }}>
              <strong>Error:</strong> {item.lastError || 'Pendiente por sincronizar'}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                onClick={async () => {
                  if (onSyncNow) await onSyncNow();
                  setQueueItems(syncService.getQueue());
                }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'var(--color-info-hover)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => {
                  const doDiscard = () => {
                    syncService.discardQueueItem(item.id || item.timestamp);
                    const updated = syncService.getQueue();
                    setQueueItems(updated);
                    if (updated.length === 0) {
                      onClose();
                    }
                    if (showToast) showToast('Cambio descartado');
                  };

                  if (onRequestConfirm) {
                    onRequestConfirm({
                      title: 'Descartar cambio pendiente',
                      message: '¿Estás seguro de que quieres descartar este cambio? No se sincronizará con la nube.',
                      confirmText: 'Descartar',
                      variant: 'danger',
                      onConfirm: doDiscard
                    });
                  } else {
                    setConfirmDialog({
                      title: 'Descartar cambio pendiente',
                      message: '¿Estás seguro de que quieres descartar este cambio? No se sincronizará con la nube.',
                      confirmText: 'Descartar',
                      variant: 'danger',
                      onConfirm: () => {
                        doDiscard();
                        setConfirmDialog(null);
                      }
                    });
                  }
                }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'transparent',
                  color: 'var(--color-danger)',
                  border: '1px solid #ef444466',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Descartar este cambio
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
