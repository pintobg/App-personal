import React from 'react';
import CustomSelect from '../common/CustomSelect';
import CategoryPicker from '../common/CategoryPicker';
import { calculateInstallmentPlan, DEFAULT_INSTALLMENTS } from '../../domain/installmentPurchase';
import { parseAmount } from '../../domain/money';
import InstallmentPurchaseFields from './obligation/InstallmentPurchaseFields';
import ObligationPayInBsField from './obligation/ObligationPayInBsField';
import ObligationReminderField from './obligation/ObligationReminderField';

export default function ObligationModal({
  isOpen,
  onClose,
  newOb,
  setNewOb,
  assets = [],
  onSubmit
}) {
  if (!isOpen) return null;

  const isNewDebt = !newOb.id && newOb.type === 'pay';
  const isInstallment = Boolean(newOb.isInstallmentPurchase && isNewDebt);

  const rawCount = newOb.installmentsCount;
  const hasValidCount = rawCount !== '' && rawCount !== null && rawCount !== undefined && parseInt(rawCount, 10) > 0;

  const parsedDown = parseAmount(newOb.downPayment) || 0;
  const parsedTotal = parseAmount(newOb.totalPurchaseAmount) || 0;
  const isDownPaymentTooHigh = Boolean(newOb.totalPurchaseAmount && parsedDown > parsedTotal);

  let installmentPlan = null;
  let planError = null;

  if (isInstallment) {
    if (!hasValidCount) {
      planError = 'Indica el número de cuotas';
    } else if (isDownPaymentTooHigh) {
      planError = 'La inicial no puede ser mayor que el total';
    } else {
      try {
        installmentPlan = calculateInstallmentPlan({
          totalAmount: newOb.totalPurchaseAmount || 0,
          downPayment: newOb.downPayment || 0,
          installmentsCount: newOb.installmentsCount,
          currency: newOb.currency || 'USD'
        });
      } catch (err) {
        planError = err.message || 'Error al calcular cuotas';
      }
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isInstallment) {
      if (!hasValidCount || isDownPaymentTooHigh || !installmentPlan) {
        return;
      }
      const updatedOb = {
        ...newOb,
        amount: String(installmentPlan.installmentAmount),
        totalInstallments: String(installmentPlan.installmentsCount)
      };
      onSubmit(e, updatedOb);
    } else {
      onSubmit(e);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>
            {newOb.id
              ? (newOb.type === 'pay' ? 'Editar Deuda' : 'Editar Crédito')
              : (newOb.type === 'pay' ? 'Añadir Deuda' : 'Añadir Crédito')}
          </h2>
          <div style={{ width: '64px' }} />
        </div>
        <form onSubmit={handleFormSubmit}>
          <div className="input-group">
            <label>Tipo</label>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-btn ${newOb.type === 'pay' ? 'active-danger' : ''}`}
                onClick={() => setNewOb({ ...newOb, type: 'pay' })}
              >
                Lo que debo / Cuentas
              </button>
              <button
                type="button"
                className={`segmented-btn ${newOb.type === 'receive' ? 'active-success' : ''}`}
                onClick={() => setNewOb({ ...newOb, type: 'receive', isInstallmentPurchase: false })}
              >
                Me deben
              </button>
            </div>
          </div>

          {/* Plantilla cuotas */}
          {isNewDebt && (
            <div
              style={{
                background: isInstallment ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'var(--bg-surface)',
                border: isInstallment ? '1px solid var(--color-accent-strong)' : '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={Boolean(newOb.isInstallmentPurchase)}
                  onChange={e => {
                    const checked = e.target.checked;
                    setNewOb({
                      ...newOb,
                      isInstallmentPurchase: checked,
                      frequency: checked ? (newOb.frequency === 'one-time' ? 'semi-monthly' : (newOb.frequency || 'semi-monthly')) : newOb.frequency,
                      installmentsCount: checked ? (newOb.installmentsCount || String(DEFAULT_INSTALLMENTS)) : (newOb.totalInstallments || '1'),
                      totalPurchaseAmount: checked ? (newOb.totalPurchaseAmount || newOb.amount || '') : '',
                      downPayment: checked ? (newOb.downPayment || '') : ''
                    });
                  }}
                  style={{ accentColor: 'var(--color-accent)', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>🛍️ Compra en cuotas (estilo Cashea)</span>
              </label>
              {isInstallment && (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Indica el total y la inicial pagada. Se creará la deuda con las cuotas restantes y la inicial se registrará como gasto.
                </div>
              )}
            </div>
          )}

          <div className="input-group">
            <label>Título / Descripción</label>
            <input
              type="text"
              className="input-field"
              placeholder={isInstallment ? "ej. Zapatos Traki (Cashea), Celular Daka" : "ej. Netflix, Juan Pérez, Tarjeta de Crédito"}
              value={newOb.title}
              onChange={e => setNewOb({ ...newOb, title: e.target.value })}
              required
            />
          </div>

          {isInstallment ? (
            <InstallmentPurchaseFields
              newOb={newOb}
              setNewOb={setNewOb}
              assets={assets}
              installmentPlan={installmentPlan}
              planError={planError}
            />
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="input-group" style={{ flex: 2 }}>
                <label>Monto</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-field"
                  placeholder="0,00"
                  value={newOb.amount}
                  onChange={e => setNewOb({ ...newOb, amount: e.target.value })}
                  required
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Moneda</label>
                <CustomSelect
                  placeholder="Seleccionar"
                  title="Seleccionar Moneda"
                  value={newOb.currency}
                  onChange={e => setNewOb({ ...newOb, currency: e.target.value })}
                  options={[
                    { value: 'VES', label: 'VES' },
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'USDT', label: 'USDT' }
                  ]}
                />
              </div>
            </div>
          )}

          <ObligationPayInBsField
            newOb={newOb}
            setNewOb={setNewOb}
          />

          <div className="input-group">
            <label>Frecuencia</label>
            <CustomSelect
              placeholder="Frecuencia"
              title="Frecuencia de Pago"
              value={newOb.frequency}
              onChange={e => {
                const val = e.target.value;
                if (val === 'one-time') {
                  setNewOb({ ...newOb, frequency: val, totalInstallments: '1' });
                } else {
                  setNewOb({ ...newOb, frequency: val });
                }
              }}
              options={[
                { value: 'one-time', label: 'Un solo pago' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'bi-weekly', label: 'Cada 15 días' },
                { value: 'semi-monthly', label: 'Quincenal (15 y último)' },
                { value: 'monthly', label: 'Mensual' }
              ]}
            />
          </div>

          <div className="input-group">
            <label>Categoría</label>
            <CategoryPicker
              kind={newOb.type === 'receive' ? 'income' : 'expense'}
              selectedCategoryId={newOb.category_id}
              selectedSubcategoryId={newOb.subcategory_id}
              onChange={({ categoryId, categoryName, subcategoryId, subcategoryName }) => {
                setNewOb({
                  ...newOb,
                  category: categoryName,
                  category_id: categoryId,
                  subcategory: subcategoryName || '',
                  subcategory_id: subcategoryId || null
                });
              }}
            />
          </div>

          {!isInstallment && (
            <div className="input-group">
              <label>Total de Pagos / Cuotas {newOb.frequency !== 'one-time' && '(Opcional)'}</label>
              <input
                type="number"
                className="input-field"
                placeholder={newOb.frequency === 'one-time' ? '1' : 'ej. 3, 6, 12 (dejar en blanco si es indefinido)'}
                value={newOb.frequency === 'one-time' ? '1' : newOb.totalInstallments}
                onChange={e => setNewOb({ ...newOb, totalInstallments: e.target.value })}
                disabled={newOb.frequency === 'one-time'}
              />
            </div>
          )}

          <div className="input-group">
            <label>Fecha de Vencimiento</label>
            <input
              type="date"
              className="input-field"
              value={newOb.dueDate}
              onChange={e => setNewOb({ ...newOb, dueDate: e.target.value })}
            />
          </div>

          <ObligationReminderField
            newOb={newOb}
            setNewOb={setNewOb}
          />

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isInstallment && (!hasValidCount || isDownPaymentTooHigh || !installmentPlan)}
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
