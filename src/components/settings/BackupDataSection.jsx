import { useRef } from 'react';
import { exportBackup, validateBackupData } from '../../utils/backup';

export default function BackupDataSection({
  assets = [],
  transactions = [],
  obligations = [],
  veRates = {},
  budgets = {},
  showToast,
  onRestoreBackup,
  onRequestConfirm,
  onClearAllData,
  onInjectTestData
}) {
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      const filename = await exportBackup({ assets, transactions, obligations, veRates, budgets });
      if (showToast) {
        showToast(`Copia de seguridad exportada con éxito (${filename})`);
      }
    } catch (err) {
      if (err?.message && String(err.message).toLowerCase().includes('cancel')) {
        return;
      }
      if (showToast) {
        showToast('Error al exportar copia de seguridad', 'error');
      }
      console.error(err);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('El archivo seleccionado no tiene un formato JSON válido.');
      }

      const validation = validateBackupData(data);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const totalAssets = data.assets.length;
      const totalTxs = data.transactions.length;
      const totalObs = data.obligations.length;

      const applyRestore = () => {
        localStorage.setItem('personal_assets', JSON.stringify(data.assets));
        localStorage.setItem('personal_transactions', JSON.stringify(data.transactions));
        localStorage.setItem('obligations', JSON.stringify(data.obligations));
        if (data.veRates) {
          localStorage.setItem('veRates', JSON.stringify(data.veRates));
        }
        if (data.budgets) {
          localStorage.setItem('personal_budgets', JSON.stringify(data.budgets));
        }

        if (onRestoreBackup) {
          onRestoreBackup(data);
        }
        if (showToast) {
          showToast('Copia de seguridad restaurada con éxito');
        }
      };

      if (onRequestConfirm) {
        onRequestConfirm({
          title: 'Restaurar copia de seguridad',
          message: `Se reemplazarán tus datos actuales con:\n• ${totalAssets} cuentas\n• ${totalTxs} movimientos\n• ${totalObs} deudas/créditos\n\nEsta acción no se puede deshacer.`,
          confirmText: 'Restaurar datos',
          variant: 'danger',
          onConfirm: applyRestore
        });
      } else {
        applyRestore();
      }
    } catch (err) {
      if (showToast) {
        showToast(err.message || 'Error al procesar el archivo de copia de seguridad', 'error');
      }
      console.error(err);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1rem 1.15rem', borderRadius: '16px', marginBottom: '1.25rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.25rem' }}>💾</span>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>Respaldo y Exportación</h3>
      </div>
      <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        Guarda o recupera localmente tus cuentas, transacciones y deudas en formato JSON.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          type="button"
          className="btn"
          onClick={handleExport}
          style={{
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Exportar Copia de Seguridad
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          style={{ display: 'none' }}
        />

        <button
          type="button"
          className="btn"
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface-elevated)',
            color: 'var(--color-info)',
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Restaurar Copia de Seguridad
        </button>

        {onClearAllData && (
          <button
            type="button"
            className="btn"
            onClick={onClearAllData}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--color-danger-border)',
              background: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
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
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Eliminar Datos Precargados / Limpiar App
          </button>
        )}

        {onInjectTestData && (
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onInjectTestData}
              style={{
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              🛠 Cargar Datos de Prueba
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
