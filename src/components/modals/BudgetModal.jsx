import { formatAmount } from '../../utils/formatters';
import { useState, useEffect, useContext } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { budgetAmount } from '../../domain/dashboard';
import CategoryPicker from '../common/CategoryPicker';
import { useCategories } from '../../hooks/useCategories';
import { parseAmount, round, add } from '../../domain/money';

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
  showToast,
  monthlyLimit: monthlyLimitProp,
  onSaveMonthlyLimit
}) {
  const finance = useContext(FinanceContext);
  const monthlyLimit = monthlyLimitProp ?? finance?.monthlyLimit ?? 0;
  const saveMonthlyLimit = onSaveMonthlyLimit || finance?.setMonthlyLimit;
  const [formData, setFormData] = useState({});
  const [capValue, setCapValue] = useState('');
  const [selectedPickerCategory, setSelectedPickerCategory] = useState(null);
  const { activeExpenseCategories } = useCategories();

  useEffect(() => {
    if (isOpen) {
      // Los presupuestos pueden venir como número o como { amount } (formato migrado)
      const flat = {};
      Object.entries(budgets || {}).forEach(([cat, val]) => {
        const amount = budgetAmount(val);
        flat[cat] = amount > 0 ? amount : '';
      });
      setFormData(flat);
      setCapValue(monthlyLimit > 0 ? String(monthlyLimit) : '');
    }
  }, [isOpen, budgets, monthlyLimit]);

  if (!isOpen) return null;

  const allCategories = Array.from(new Set([
    ...activeExpenseCategories.map(c => c.name),
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
    for (const [cat, val] of Object.entries(formData)) {
      if (val === '' || val === null || val === undefined) continue;
      const parsed = parseAmount(val);
      if (parsed === null) {
        if (showToast) {
          showToast(`Monto inválido para ${cat}`, 'error');
        }
        return;
      }
      if (parsed > 0) {
        cleanBudgets[cat] = round(parsed, 'USD');
      }
    }

    let parsedCap = 0;
    if (capValue !== '' && capValue !== null) {
      parsedCap = parseAmount(capValue);
      if (parsedCap === null || parsedCap < 0) {
        if (showToast) showToast('Monto inválido para el tope del mes', 'error');
        return;
      }
    }

    onSave(cleanBudgets);
    if (saveMonthlyLimit && round(parsedCap || 0, 'USD') !== round(monthlyLimit || 0, 'USD')) {
      saveMonthlyLimit(parsedCap > 0 ? round(parsedCap, 'USD') : 0);
    }
    if (showToast) {
      showToast('Presupuestos actualizados');
    }
    onClose();
  };

  const totalBudget = Object.values(formData).reduce((acc, val) => {
    const parsed = parseAmount(val);
    return parsed !== null && parsed > 0 ? add(acc, parsed) : acc;
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

        {/* Tope total del mes: cuenta todos los gastos, tengan o no presupuesto */}
        <div className="budget-cap-field">
          <label htmlFor="budget-monthly-cap">
            <span className="budget-cap-title">Tope total del mes</span>
            <span className="budget-cap-help">Suma todos tus gastos, también los de categorías sin presupuesto.</span>
          </label>
          <div className="budget-cap-input">
            <span aria-hidden="true">$</span>
            <input
              id="budget-monthly-cap"
              type="text"
              inputMode="decimal"
              className="input-field"
              placeholder="Sin tope"
              value={capValue}
              onChange={e => setCapValue(e.target.value)}
            />
          </div>
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
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Suma por categorías (USD)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600 }}>
              {activeCount} de {allCategories.length} categorías activas
            </span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ${formatAmount(totalBudget, 'USD')}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ marginBottom: '0.65rem' }}>
            <CategoryPicker
              kind="expense"
              selectedCategoryId={selectedPickerCategory}
              onChange={({ categoryId, categoryName }) => {
                setSelectedPickerCategory(categoryId);
                if (formData[categoryName] == null && formData[categoryId] == null) {
                  setFormData(prev => ({ ...prev, [categoryName]: '' }));
                }
              }}
              showCreate={true}
            />
          </div>

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
              const catObj = activeExpenseCategories.find(c => c.name === cat || c.id === cat);
              const icon = catObj?.icon || CATEGORY_ICONS[cat] || '🏷️';
              const color = catObj?.color || 'var(--color-accent)';
              const isHighlighted = selectedPickerCategory && (catObj?.id === selectedPickerCategory || cat === selectedPickerCategory);
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
                    background: isHighlighted ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    border: isHighlighted ? `1.5px solid ${color}` : (hasValue ? '1px solid var(--color-success-border)' : '1px solid var(--border-color)'),
                    boxShadow: isHighlighted ? `0 0 0 1px ${color}` : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
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
                        aria-label="Quitar presupuesto"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-danger)',
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
                        color: hasValue ? 'var(--color-accent)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        pointerEvents: 'none'
                      }}
                    >
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
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

          <div className="modal-actions" style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
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
