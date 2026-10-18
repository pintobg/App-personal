import { useState, useEffect } from 'react';
import { SPENT_CATEGORIES } from '../../utils/constants';

const CATEGORY_ICONS = {
  'Vivienda': '🏠',
  'Alimentación': '🍔',
  'Transporte': '🚗',
  'Salud': '💊',
  'Entretenimiento': '🎉',
  'Compras': '🛍️',
  'Cuidado Personal': '💈',
  'Educación': '📚',
  'Deudas/Préstamos': '💳',
  'Otros': '📦'
};

export default function BudgetModal({
  isOpen,
  onClose,
  budgets = {},
  onSave,
  showToast
}) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...budgets });
    }
  }, [isOpen, budgets]);

  if (!isOpen) return null;

  const allCategories = Array.from(new Set([
    ...Object.keys(SPENT_CATEGORIES),
    ...Object.keys(budgets)
  ]));

  const handleChange = (cat, value) => {
    setFormData(prev => ({
      ...prev,
      [cat]: value
    }));
  };

  const handleClearCategory = (cat) => {
    setFormData(prev => {
      const updated = { ...prev };
      delete updated[cat];
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanBudgets = {};
    Object.entries(formData).forEach(([cat, val]) => {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        cleanBudgets[cat] = num;
      }
    });

    onSave(cleanBudgets);
    if (showToast) {
      showToast('Presupuestos actualizados');
    }
    onClose();
  };

  const totalBudget = Object.values(formData).reduce((acc, val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0 ? acc + num : acc;
  }, 0);

  const activeCount = Object.values(formData).filter(val => !isNaN(Number(val)) && Number(val) > 0).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          paddingTop: 'max(env(safe-area-inset-top), 0.5rem)',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))'
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: '0.4rem 0 0.65rem 0',
            marginBottom: '0.65rem',
            gap: '0.5rem'
          }}
        >
          <button
            type="button"
            className="modal-back-btn"
            onClick={onClose}
            aria-label="Atrás"
            style={{ padding: '5px 11px 5px 8px', fontSize: '0.8rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2 style={{ fontSize: '1.02rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Presupuestos Mensuales
          </h2>
          <div style={{ width: '58px', flexShrink: 0 }} />
        </div>

        {/* Resumen compacto superior */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.55rem 0.85rem',
            marginBottom: '0.65rem',
            borderRadius: '12px',
            backgroundColor: '#1b2230',
            border: '1px solid #2a3447',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
              Límite mensual total (USD)
            </span>
            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
              {activeCount} de {allCategories.length} categorías activas
            </span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>
            ${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '0.55rem',
              alignContent: 'start',
              paddingBottom: '0.5rem'
            }}
          >
            {allCategories.map(cat => {
              const icon = CATEGORY_ICONS[cat] || '🏷️';
              const val = formData[cat] != null ? formData[cat] : '';
              const hasValue = val !== '' && Number(val) > 0;

              return (
                <div
                  key={cat}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.4rem',
                    padding: '0.55rem 0.65rem',
                    borderRadius: '12px',
                    background: '#1b2230',
                    border: hasValue ? '1px solid #1f5143' : '1px solid #2a3447'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#f1f5f9',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {cat}
                      </span>
                    </div>
                    {hasValue && (
                      <button
                        type="button"
                        onClick={() => handleClearCategory(cat)}
                        title="Quitar presupuesto"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0 2px',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '0.78rem',
                          lineHeight: 1,
                          flexShrink: 0
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '0.55rem',
                        color: hasValue ? '#10b981' : '#94a3b8',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        pointerEvents: 'none'
                      }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="input-field"
                      placeholder="Sin límite"
                      value={val}
                      onChange={e => handleChange(cat, e.target.value)}
                      style={{
                        padding: '0.3rem 0.55rem 0.3rem 1.35rem',
                        fontSize: '15px',
                        height: '34px',
                        textAlign: 'right',
                        borderRadius: '8px',
                        width: '100%'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-actions" style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid #2a3447', flexShrink: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ height: '42px', fontSize: '0.9rem' }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ height: '42px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
