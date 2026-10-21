import CustomSelect from '../common/CustomSelect';
import { SPENT_CATEGORIES } from '../../utils/constants';

export default function ObligationModal({
  isOpen,
  onClose,
  newOb,
  setNewOb,
  onSubmit
}) {
  if (!isOpen) return null;

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
        <form onSubmit={onSubmit}>
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
                onClick={() => setNewOb({ ...newOb, type: 'receive' })}
              >
                Me deben
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Título / Descripción</label>
            <input
              type="text"
              className="input-field"
              placeholder="ej. Netflix, Juan Pérez, Tarjeta de Crédito"
              value={newOb.title}
              onChange={e => setNewOb({ ...newOb, title: e.target.value })}
              required
            />
          </div>

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
                  { value: 'USDT', label: 'USDT' }
                ]}
              />
            </div>
          </div>

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

          <div className="input-group">
            <label>Fecha de Vencimiento</label>
            <input
              type="date"
              className="input-field"
              value={newOb.dueDate}
              onChange={e => setNewOb({ ...newOb, dueDate: e.target.value })}
            />
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
