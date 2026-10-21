import CustomSelect from '../common/CustomSelect';
import { SPENT_CATEGORIES } from '../../utils/constants';
import { formatAmount, getCurrencySymbol } from '../../utils/formatters';
import { todayLocal, toLocalDateString } from '../../utils/dates';
import { parseAmount, add, sub, round } from '../../domain/money';

export default function TransactionModal({
  mode, // 'select' | 'form' | null
  onClose,
  newTx,
  setNewTx,
  setMode,
  assets,
  transactions = [],
  validationError,
  setValidationError,
  onSubmit
}) {
  if (!mode) return null;

  const uniqueAssetNames = Array.from(new Set(assets.map(a => a.name)));
  const availableAssetsForTx = newTx.currency
    ? assets.filter(a => (a.name || '').toUpperCase() === newTx.currency.toUpperCase())
    : assets;

  if (mode === 'select') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              <span>Atrás</span>
            </button>
            <h2>Tipo de Transacción</h2>
            <div style={{ width: '64px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn"
              style={{
                padding: '1.15rem',
                fontSize: '1.05rem',
                borderRadius: '14px',
                border: '1px solid #1f5143',
                color: '#10b981',
                background: '#14332b',
                fontWeight: 700
              }}
              onClick={() => {
                setNewTx({ id: '', assetId: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal() });
                setMode('form');
              }}
            >
              Ingreso (+)
            </button>
            <button
              type="button"
              className="btn"
              style={{
                padding: '1.15rem',
                fontSize: '1.05rem',
                borderRadius: '14px',
                border: '1px solid #4d2631',
                color: '#ef4444',
                background: '#311b22',
                fontWeight: 700
              }}
              onClick={() => {
                setNewTx({ id: '', assetId: '', type: 'spent', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal() });
                setMode('form');
              }}
            >
              Gasto (-)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isEditing = Boolean(newTx.id);
  const oldTx = isEditing ? transactions.find(t => t.id === newTx.id) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>
            {isEditing
              ? (newTx.type === 'income' ? 'Editar Ingreso' : 'Editar Gasto')
              : (newTx.type === 'income' ? 'Nuevo Ingreso' : 'Nuevo Gasto')}
          </h2>
          <div style={{ width: '64px' }} />
        </div>
        <form onSubmit={onSubmit}>
          <div className="input-group">
            <label>Tipo de Transacción</label>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-btn ${newTx.type === 'income' ? 'active-success' : ''}`}
                onClick={() => setNewTx({ ...newTx, type: 'income', category: '', subcategory: '' })}
              >
                Ingreso (+)
              </button>
              <button
                type="button"
                className={`segmented-btn ${newTx.type === 'spent' ? 'active-danger' : ''}`}
                onClick={() => setNewTx({ ...newTx, type: 'spent' })}
              >
                Gasto (-)
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Moneda</label>
            <CustomSelect
              placeholder="Seleccionar Moneda"
              title="Seleccionar Moneda"
              value={newTx.currency}
              onChange={e => {
                const newCurrency = e.target.value;
                const currentAsset = assets.find(a => a.id === newTx.assetId);
                const isStillValid = currentAsset && (currentAsset.name || '').toUpperCase() === newCurrency.toUpperCase();
                setNewTx({
                  ...newTx,
                  currency: newCurrency,
                  assetId: isStillValid ? newTx.assetId : '',
                  origin: isStillValid ? newTx.origin : ''
                });
              }}
              options={uniqueAssetNames.map(name => ({ value: name, label: name }))}
            />
          </div>

          <div className="input-group">
            <label>Monto</label>
            <input
              type="text"
              inputMode="decimal"
              className="input-field"
              placeholder="0,00"
              value={newTx.amount}
              onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label>{newTx.type === 'income' ? 'Destino (Cuenta Bancaria / Billetera)' : 'Origen (Cuenta Bancaria / Billetera)'}</label>
            <CustomSelect
              placeholder={newTx.type === 'income' ? 'Seleccionar Destino' : 'Seleccionar Origen'}
              title={newTx.type === 'income' ? 'Seleccionar Cuenta Destino' : 'Seleccionar Cuenta Origen'}
              value={newTx.assetId || ''}
              onChange={e => {
                const selectedAsset = assets.find(a => a.id === e.target.value);
                if (selectedAsset) {
                  setNewTx({
                    ...newTx,
                    assetId: selectedAsset.id,
                    currency: selectedAsset.name,
                    origin: selectedAsset.location
                  });
                } else {
                  setNewTx({
                    ...newTx,
                    assetId: '',
                    origin: ''
                  });
                }
              }}
              options={availableAssetsForTx.map(a => ({
                value: a.id,
                label: `${a.location} (${a.name}) - Saldo: ${formatAmount(a.amount, a.name)}`
              }))}
            />

            {(newTx.assetId || (newTx.currency && newTx.origin)) && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#232c3d', border: '1px solid #2a3447', borderRadius: '8px', fontSize: '0.875rem' }}>
                {(() => {
                  const asset = assets.find(a => a.id === newTx.assetId) ||
                                assets.find(a => (a.name || '').toUpperCase() === (newTx.currency || '').toUpperCase() && a.location === newTx.origin);
                  const currentBalance = asset ? Number(asset.amount) : 0;
                  const parsedEntered = parseAmount(newTx.amount);
                  const amountEntered = parsedEntered !== null ? parsedEntered : 0;
                  const isSameAccount = oldTx && (
                    (oldTx.assetId && newTx.assetId ? oldTx.assetId === newTx.assetId : false) ||
                    ((oldTx.currency || '').toUpperCase() === (newTx.currency || '').toUpperCase() && oldTx.origin === newTx.origin)
                  );
                  let newBalance = 0;
                  if (isSameAccount) {
                    const oldAmount = Number(oldTx.amount) || 0;
                    if (oldTx.type === 'spent' && newTx.type === 'spent') {
                      newBalance = sub(add(currentBalance, oldAmount), amountEntered);
                    } else if (oldTx.type === 'income' && newTx.type === 'income') {
                      newBalance = add(sub(currentBalance, oldAmount), amountEntered);
                    } else if (oldTx.type === 'spent' && newTx.type === 'income') {
                      newBalance = add(add(currentBalance, oldAmount), amountEntered);
                    } else {
                      newBalance = sub(sub(currentBalance, oldAmount), amountEntered);
                    }
                  } else {
                    newBalance = newTx.type === 'income' ? add(currentBalance, amountEntered) : sub(currentBalance, amountEntered);
                  }
                  newBalance = round(newBalance, newTx.currency);
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Balance Actual:</span>
                        <span>{getCurrencySymbol(newTx.currency)}{formatAmount(currentBalance, newTx.currency)} {newTx.currency}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: newBalance < 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                        <span>Balance Final:</span>
                        <span>{getCurrencySymbol(newTx.currency)}{formatAmount(newBalance, newTx.currency)} {newTx.currency}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="input-group">
            <label>Fecha</label>
            <input
              type="date"
              className="input-field"
              value={newTx.date ? toLocalDateString(newTx.date) : ''}
              onChange={e => setNewTx({ ...newTx, date: e.target.value })}
              required
            />
          </div>

          {newTx.type === 'spent' && (
            <>
              <div className="input-group">
                <label>Categoría</label>
                <CustomSelect
                  placeholder="Seleccionar Categoría"
                  title="Seleccionar Categoría"
                  value={newTx.category}
                  onChange={e => setNewTx({ ...newTx, category: e.target.value, subcategory: '' })}
                  options={Object.keys(SPENT_CATEGORIES).map(cat => ({ value: cat, label: cat }))}
                />
              </div>

              {newTx.category && (
                <div className="input-group">
                  <label>Subcategoría</label>
                  <CustomSelect
                    placeholder="Seleccionar Subcategoría"
                    title={`Subcategoría de ${newTx.category}`}
                    value={newTx.subcategory}
                    onChange={e => setNewTx({ ...newTx, subcategory: e.target.value })}
                    options={SPENT_CATEGORIES[newTx.category].map(sub => ({ value: sub, label: sub }))}
                  />
                </div>
              )}
            </>
          )}

          {validationError && (
            <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
              {validationError}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                onClose();
                if (setValidationError) setValidationError('');
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Actualizar Transacción' : 'Guardar Transacción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
