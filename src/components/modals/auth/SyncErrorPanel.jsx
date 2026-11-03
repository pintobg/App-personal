import React from 'react';
import { syncService } from '../../../services/syncService';

const TABLE_NAMES = {
  obligations: 'Deudas / Compromisos (obligations)',
  transactions: 'Movimientos (transactions)',
  assets: 'Cuentas / Activos (assets)',
  budgets: 'Presupuestos (budgets)',
  goals: 'Metas de Ahorro (goals)'
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
      background: '#181f2c',
      border: '1px solid #ef444444',
      borderRadius: '12px',
      padding: '0.85rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171' }}>
          Elementos pendientes con error ({queueItems.length})
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          ✕ Cerrar
        </button>
      </div>

      {queueItems.length === 0 ? (
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '0.5rem 0' }}>
          No hay elementos pendientes en la cola.
        </div>
      ) : (
        queueItems.map((item, idx) => (
          <div
            key={item.id || item.timestamp || idx}
            style={{
              background: '#232c3d',
              border: '1px solid #2a3447',
              borderRadius: '8px',
              padding: '0.65rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              fontSize: '0.78rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                Tabla: <span style={{ color: '#38bdf8' }}>{TABLE_NAMES[item.table] || item.table}</span>
              </span>
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                background: item.action === 'delete' ? '#7f1d1d' : '#1e3a8a',
                color: item.action === 'delete' ? '#fca5a5' : '#93c5fd'
              }}>
                {ACTION_NAMES[item.action] || item.action}
              </span>
            </div>

            <div style={{ color: '#94a3b8' }}>
              Intentos: <strong style={{ color: '#e2e8f0' }}>{item.attempts || 0}</strong>
            </div>

            <div style={{
              background: '#161d2a',
              border: '1px solid #451a1a',
              borderRadius: '6px',
              padding: '0.4rem 0.5rem',
              color: '#fca5a5',
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
                  background: '#2563eb',
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
                  color: '#f87171',
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
