import CustomSelect from '../common/CustomSelect';
import { SPENT_CATEGORIES } from '../../utils/constants';
import { calculateInstallmentPlan } from '../../domain/installmentPurchase';
import { formatAmount } from '../../utils/formatters';

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

  // Cálculo en vivo si es compra en cuotas
  let installmentPlan = null;
  if (isInstallment) {
    try {
      installmentPlan = calculateInstallmentPlan({
        totalAmount: newOb.totalPurchaseAmount || 0,
        downPayment: newOb.downPayment || 0,
        installmentsCount: newOb.installmentsCount || 3,
        currency: newOb.currency || 'USD'
      });
    } catch {
      installmentPlan = null;
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isInstallment && installmentPlan) {
      // Ajustar amount y totalInstallments según el plan antes de enviar
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

          {/* PLANTILLA DE COMPRA EN CUOTAS (ESTILO CASHEA) */}
          {isNewDebt && (
            <div
              style={{
                background: isInstallment ? 'rgba(2, 132, 199, 0.08)' : '#1b2230',
                border: isInstallment ? '1px solid #0284c7' : '1px solid #2a3447',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
                <input
                  type="checkbox"
                  checked={Boolean(newOb.isInstallmentPurchase)}
                  onChange={e => {
                    const checked = e.target.checked;
                    setNewOb({
                      ...newOb,
                      isInstallmentPurchase: checked,
                      frequency: checked ? (newOb.frequency === 'one-time' ? 'semi-monthly' : (newOb.frequency || 'semi-monthly')) : newOb.frequency,
                      installmentsCount: checked ? (newOb.installmentsCount || '4') : (newOb.totalInstallments || '1'),
                      totalPurchaseAmount: checked ? (newOb.totalPurchaseAmount || newOb.amount || '') : '',
                      downPayment: checked ? (newOb.downPayment || '') : ''
                    });
                  }}
                  style={{ accentColor: '#0284c7', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>🛍️ Compra en cuotas (estilo Cashea)</span>
              </label>
              {isInstallment && (
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
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

          {/* CAMPOS SI ES COMPRA EN CUOTAS */}
          {isInstallment ? (
            <>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 2 }}>
                  <label>Monto Total de la Compra</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field"
                    placeholder="120,00"
                    value={newOb.totalPurchaseAmount || ''}
                    onChange={e => setNewOb({ ...newOb, totalPurchaseAmount: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group" style={{ flex: 1.2 }}>
                  <label>Moneda</label>
                  <CustomSelect
                    placeholder="Moneda"
                    title="Moneda"
                    value={newOb.currency}
                    onChange={e => setNewOb({ ...newOb, currency: e.target.value })}
                    options={[
                      { value: 'USD', label: 'USD' },
                      { value: 'VES', label: 'VES' },
                      { value: 'EUR', label: 'EUR' },
                      { value: 'USDT', label: 'USDT' }
                    ]}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Inicial Pagada</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field"
                    placeholder="40,00"
                    value={newOb.downPayment || ''}
                    onChange={e => setNewOb({ ...newOb, downPayment: e.target.value })}
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Número de Cuotas</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder="4"
                    value={newOb.installmentsCount || '4'}
                    onChange={e => setNewOb({ ...newOb, installmentsCount: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Selector de cuenta para pago de inicial si > 0 */}
              {Number(newOb.downPayment) > 0 && (
                <div className="input-group">
                  <label>Cuenta de donde se pagó la inicial</label>
                  <CustomSelect
                    placeholder="Seleccionar cuenta para registrar gasto"
                    title="Cuenta de pago inicial"
                    value={newOb.downPaymentAssetId || ''}
                    onChange={e => setNewOb({ ...newOb, downPaymentAssetId: e.target.value })}
                    options={assets.map(a => ({
                      value: a.id,
                      label: `${a.location} (${a.name} - Saldo: ${a.amount})`
                    }))}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Se descontará de esta cuenta y se guardará automáticamente como gasto.
                  </div>
                </div>
              )}

              {/* Resumen dinámico del plan de cuotas */}
              {installmentPlan && (
                <div style={{
                  background: 'rgba(2, 132, 199, 0.1)',
                  border: '1px solid rgba(2, 132, 199, 0.3)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.9rem',
                  marginBottom: '1rem',
                  fontSize: '0.82rem',
                  color: '#38bdf8',
                  lineHeight: '1.45'
                }}>
                  <div>Total: <strong>${formatAmount(installmentPlan.total, newOb.currency)}</strong> — Inicial: <strong>${formatAmount(installmentPlan.initial, newOb.currency)}</strong></div>
                  <div>Restan: <strong>${formatAmount(installmentPlan.remaining, newOb.currency)}</strong> en <strong>{installmentPlan.installmentsCount} cuotas de ${formatAmount(installmentPlan.installmentAmount, newOb.currency)}</strong> c/u</div>
                </div>
              )}
            </>
          ) : (
            /* CAMPOS ESTÁNDAR */
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

          {/* OPCIÓN: SE PAGA EN BOLÍVARES A TASA DEL DÍA */}
          {(newOb.currency || '').toUpperCase() !== 'VES' && (
            <div
              style={{
                background: '#1b2230',
                border: '1px solid #2a3447',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
                <input
                  type="checkbox"
                  checked={Boolean(newOb.payInBs)}
                  onChange={e => {
                    const checked = e.target.checked;
                    setNewOb({
                      ...newOb,
                      payInBs: checked,
                      indexRateType: checked ? (newOb.indexRateType || ((newOb.currency || '').toUpperCase() === 'EUR' ? 'BCV_EUR' : 'BCV_USD')) : ''
                    });
                  }}
                  style={{ accentColor: '#10b981', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Se paga en bolívares a tasa del día</span>
              </label>

              {newOb.payInBs && (
                <div style={{ marginTop: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Tasa de referencia para el pago en Bs.
                  </label>
                  <CustomSelect
                    placeholder="Seleccionar tasa"
                    title="Tasa para pago en Bs."
                    value={newOb.indexRateType || ((newOb.currency || '').toUpperCase() === 'EUR' ? 'BCV_EUR' : 'BCV_USD')}
                    onChange={e => setNewOb({ ...newOb, indexRateType: e.target.value })}
                    options={[
                      { value: 'BCV_USD', label: 'BCV USD' },
                      { value: 'BCV_EUR', label: 'BCV EUR' },
                      { value: 'PARALELO', label: 'Paralelo' }
                    ]}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                    El monto en Bs. se recalculará automáticamente según la cotización oficial o paralela de cada día.
                  </div>
                </div>
              )}
            </div>
          )}

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
            <CustomSelect
              placeholder="Seleccionar Categoría"
              title="Seleccionar Categoría"
              value={newOb.category}
              onChange={e => setNewOb({ ...newOb, category: e.target.value })}
              options={Object.keys(SPENT_CATEGORIES).map(cat => ({ value: cat, label: cat }))}
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

          {/* RECORDATORIOS LOCALES */}
          <div
            style={{
              background: '#1b2230',
              border: '1px solid #2a3447',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}
          >
            <input
              type="checkbox"
              id="reminderEnabledCheck"
              checked={newOb.reminderEnabled !== false}
              onChange={e => setNewOb({ ...newOb, reminderEnabled: e.target.checked })}
              style={{ accentColor: '#10b981', width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
            />
            <label htmlFor="reminderEnabledCheck" style={{ cursor: 'pointer', margin: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                🔔 Recordatorios de vencimiento
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                Aviso a las 9:00 a.m. del día anterior y el mismo día del vencimiento.
              </div>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
