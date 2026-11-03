import React, { useState } from 'react';
import ReferenceRateSelector from '../common/ReferenceRateSelector';

export default function RatesSettingsSection({
  referenceRate,
  setReferenceRate,
  setCustomRate,
  refreshRates,
  isFetchingRates,
  veRates,
  showToast
}) {
  const [customRateInput, setCustomRateInput] = useState(veRates?.custom ? String(veRates.custom) : '');

  const handleSaveCustomRate = (e) => {
    e.preventDefault();
    const val = parseFloat(customRateInput);
    if (!isNaN(val) && val > 0) {
      if (setCustomRate) setCustomRate(val);
      if (showToast) showToast(`Tasa personalizada guardada: Bs. ${val.toFixed(2)}`);
    } else {
      if (showToast) showToast('Ingresa una tasa numérica válida', 'error');
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1rem 1.15rem', borderRadius: '16px', marginBottom: '1.25rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.25rem' }}>💱</span>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>Monedas y Tasas</h3>
      </div>
      <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        Elige qué tasa usar como referencia principal en el balance y define tasas manuales.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>
            Tasa de referencia para el total
          </label>
          <ReferenceRateSelector
            referenceRate={referenceRate}
            setReferenceRate={setReferenceRate}
          />
        </div>

        <form onSubmit={handleSaveCustomRate} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Tasa personalizada (Bs. por USD)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              step="any"
              className="input-field"
              placeholder="Ej. 65.50"
              value={customRateInput}
              onChange={(e) => setCustomRateInput(e.target.value)}
              style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '10px', fontSize: '16px' }}
            />
            <button
              type="submit"
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--color-info)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Guardar
            </button>
          </div>
        </form>

        {refreshRates && (
          <button
            type="button"
            onClick={refreshRates}
            disabled={isFetchingRates}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              cursor: isFetchingRates ? 'not-allowed' : 'pointer',
              opacity: isFetchingRates ? 0.6 : 1
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            {isFetchingRates ? 'Actualizando tasas...' : 'Actualizar tasas ahora'}
          </button>
        )}
      </div>
    </div>
  );
}
