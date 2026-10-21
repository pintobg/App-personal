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
                setNewTx({
                  id: '',
                  assetId: '',
                  type: 'income',
                  currency: '',
                  amount: '',
                  origin: '',
                  category: '',
                  subcategory: '',
                  date: todayLocal(),
                  includeIgtf: false,
                  igtfAmount: '',
                  includeCommission: false,
                  commissionAmount: '',
                  paymentMethod: '',
                  referenceNumber: '',
                  bank: '',
                  recipientId: ''
                });
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
                setNewTx({
                  id: '',
                  assetId: '',
                  type: 'spent',
                  currency: '',
                  amount: '',
                  origin: '',
                  category: '',
                  subcategory: '',
                  date: todayLocal(),
                  includeIgtf: false,
                  igtfAmount: '',
                  includeCommission: false,
                  commissionAmount: '',
                  paymentMethod: '',
                  referenceNumber: '',
                  bank: '',
                  recipientId: ''
                });
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

  const selectedAsset = assets.find(a => a.id === newTx.assetId) ||
    assets.find(a => (a.name || '').toUpperCase() === (newTx.currency || '').toUpperCase() && a.location === newTx.origin) || null;

  const handleAmountChange = (val) => {
    const parsedAmt = parseAmount(val);
    let nextIgtf = newTx.igtfAmount;
    let nextIncludeIgtf = newTx.includeIgtf;
    let nextComm = newTx.commissionAmount;
    let nextIncludeComm = newTx.includeCommission;

    if (selectedAsset && newTx.type === 'spent') {
      if (selectedAsset.name !== 'VES' && selectedAsset.appliesIgtf) {
        if (parsedAmt !== null && parsedAmt > 0) {
          const igtfRate = selectedAsset.igtfPercent != null ? Number(selectedAsset.igtfPercent) : 3;
          const calcIgtf = round((parsedAmt * igtfRate) / 100, selectedAsset.name);
          nextIgtf = calcIgtf.toString();
          if (nextIncludeIgtf === undefined || nextIncludeIgtf === false) nextIncludeIgtf = true;
        } else {
          nextIgtf = '';
        }
      }

      if (selectedAsset.hasTransferCommission || selectedAsset.commissionPercent > 0 || selectedAsset.commissionFixed > 0) {
        if (parsedAmt !== null && parsedAmt > 0) {
          const pct = Number(selectedAsset.commissionPercent) || 0;
          const fix = Number(selectedAsset.commissionFixed) || 0;
          const calcComm = round((parsedAmt * (pct / 100)) + fix, selectedAsset.name);
          if (calcComm > 0) {
            nextComm = calcComm.toString();
            if (nextIncludeComm === undefined || nextIncludeComm === false) nextIncludeComm = true;
          }
        } else {
          nextComm = '';
        }
      }
    }

    setNewTx(prev => ({
      ...prev,
      amount: val,
      igtfAmount: nextIgtf,
      includeIgtf: nextIncludeIgtf ?? prev.includeIgtf,
      commissionAmount: nextComm,
      includeCommission: nextIncludeComm ?? prev.includeCommission
    }));
  };

  const handleAssetSelect = (assetId) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) {
      setNewTx(prev => ({ ...prev, assetId: '', origin: '' }));
      return;
    }
    const parsedAmt = parseAmount(newTx.amount);
    let nextIgtf = '';
    let nextIncludeIgtf = false;
    let nextComm = '';
    let nextIncludeComm = false;

    if (newTx.type === 'spent') {
      if (target.name !== 'VES' && target.appliesIgtf) {
        nextIncludeIgtf = true;
        if (parsedAmt !== null && parsedAmt > 0) {
          const igtfRate = target.igtfPercent != null ? Number(target.igtfPercent) : 3;
          nextIgtf = round((parsedAmt * igtfRate) / 100, target.name).toString();
        }
      }
      if (target.hasTransferCommission || target.commissionPercent > 0 || target.commissionFixed > 0) {
        if (parsedAmt !== null && parsedAmt > 0) {
          const pct = Number(target.commissionPercent) || 0;
          const fix = Number(target.commissionFixed) || 0;
          const calcComm = round((parsedAmt * (pct / 100)) + fix, target.name);
          if (calcComm > 0) {
            nextIncludeComm = true;
            nextComm = calcComm.toString();
          }
        }
      }
    }

    setNewTx(prev => ({
      ...prev,
      assetId: target.id,
      currency: target.name,
      origin: target.location,
      includeIgtf: nextIncludeIgtf,
      igtfAmount: nextIgtf,
      includeCommission: nextIncludeComm,
      commissionAmount: nextComm
    }));
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
              onChange={e => handleAmountChange(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>{newTx.type === 'income' ? 'Destino (Cuenta Bancaria / Billetera)' : 'Origen (Cuenta Bancaria / Billetera)'}</label>
            <CustomSelect
              placeholder={newTx.type === 'income' ? 'Seleccionar Destino' : 'Seleccionar Origen'}
              title={newTx.type === 'income' ? 'Seleccionar Cuenta Destino' : 'Seleccionar Cuenta Origen'}
              value={newTx.assetId || ''}
              onChange={e => handleAssetSelect(e.target.value)}
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
                  const igtfEntered = (newTx.type === 'spent' && newTx.includeIgtf && newTx.igtfAmount) ? (parseAmount(newTx.igtfAmount) || 0) : 0;
                  const commEntered = (newTx.type === 'spent' && newTx.includeCommission && newTx.commissionAmount) ? (parseAmount(newTx.commissionAmount) || 0) : 0;
                  const totalDeducted = add(add(amountEntered, igtfEntered), commEntered);

                  const isSameAccount = oldTx && (
                    (oldTx.assetId && newTx.assetId ? oldTx.assetId === newTx.assetId : false) ||
                    ((oldTx.currency || '').toUpperCase() === (newTx.currency || '').toUpperCase() && oldTx.origin === newTx.origin)
                  );
                  let newBalance = 0;
                  if (isSameAccount) {
                    const oldAmount = Number(oldTx.amount) || 0;
                    if (oldTx.type === 'spent' && newTx.type === 'spent') {
                      newBalance = sub(add(currentBalance, oldAmount), totalDeducted);
                    } else if (oldTx.type === 'income' && newTx.type === 'income') {
                      newBalance = add(sub(currentBalance, oldAmount), amountEntered);
                    } else if (oldTx.type === 'spent' && newTx.type === 'income') {
                      newBalance = add(add(currentBalance, oldAmount), amountEntered);
                    } else {
                      newBalance = sub(sub(currentBalance, oldAmount), totalDeducted);
                    }
                  } else {
                    newBalance = newTx.type === 'income' ? add(currentBalance, amountEntered) : sub(currentBalance, totalDeducted);
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

          {/* Comisiones e IGTF vinculados calculados */}
          {newTx.type === 'spent' && selectedAsset && (selectedAsset.appliesIgtf || selectedAsset.hasTransferCommission || selectedAsset.commissionPercent > 0 || selectedAsset.commissionFixed > 0) && (
            <div style={{ marginBottom: '1rem', padding: '0.85rem', background: '#151b26', borderRadius: '12px', border: '1px solid #2a3447' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🧾</span>
                <span>Comisiones e IGTF vinculados (editables)</span>
              </div>

              {/* IGTF */}
              {selectedAsset.name !== 'VES' && selectedAsset.appliesIgtf && (
                <div style={{ marginBottom: (selectedAsset.hasTransferCommission || selectedAsset.commissionPercent > 0 || selectedAsset.commissionFixed > 0) ? '0.75rem' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(newTx.includeIgtf)}
                        onChange={e => setNewTx(prev => ({ ...prev, includeIgtf: e.target.checked }))}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>Cobrar IGTF ({selectedAsset.igtfPercent || 3}%)</span>
                    </label>
                    {newTx.includeIgtf && (
                      <div style={{ width: '110px' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="input-field"
                          placeholder="0,00"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', textAlign: 'right' }}
                          value={newTx.igtfAmount || ''}
                          onChange={e => setNewTx(prev => ({ ...prev, igtfAmount: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comisión bancaria */}
              {(selectedAsset.hasTransferCommission || selectedAsset.commissionPercent > 0 || selectedAsset.commissionFixed > 0) && (
                <div style={{ paddingTop: selectedAsset.name !== 'VES' && selectedAsset.appliesIgtf ? '0.65rem' : '0', borderTop: selectedAsset.name !== 'VES' && selectedAsset.appliesIgtf ? '1px solid #232c3d' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(newTx.includeCommission)}
                        onChange={e => setNewTx(prev => ({ ...prev, includeCommission: e.target.checked }))}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>Comisión bancaria</span>
                    </label>
                    {newTx.includeCommission && (
                      <div style={{ width: '110px' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="input-field"
                          placeholder="0,00"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', textAlign: 'right' }}
                          value={newTx.commissionAmount || ''}
                          onChange={e => setNewTx(prev => ({ ...prev, commissionAmount: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detalles opcionales para movimientos en Bs. */}
          {newTx.currency === 'VES' && (
            <div style={{ marginBottom: '1rem', padding: '0.85rem', background: '#151b26', borderRadius: '12px', border: '1px solid #2a3447' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🇻🇪</span>
                <span>Detalles de pago en Bolívares (Opcional)</span>
              </div>

              {/* Tipo de pago */}
              <div style={{ marginBottom: '0.65rem' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Tipo de pago</label>
                <div className="segmented-control" style={{ flexWrap: 'wrap' }}>
                  {['Pago Móvil', 'Transferencia', 'Punto de venta', 'Efectivo'].map(method => (
                    <button
                      key={method}
                      type="button"
                      className={`segmented-btn ${newTx.paymentMethod === method ? 'active-success' : ''}`}
                      onClick={() => setNewTx(prev => ({
                        ...prev,
                        paymentMethod: prev.paymentMethod === method ? '' : method
                      }))}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nro Referencia y Banco */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                    Nro. de Referencia
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. 849201"
                    style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                    value={newTx.referenceNumber || ''}
                    onChange={e => setNewTx(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                    Banco
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. Banesco, BDV..."
                    style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                    value={newTx.bank || ''}
                    onChange={e => setNewTx(prev => ({ ...prev, bank: e.target.value }))}
                  />
                </div>
              </div>

              {/* Destinatario */}
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                  Teléfono o Cédula / RIF del destinatario
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej. V-12345678 o 0414-1234567"
                  style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                  value={newTx.recipientId || ''}
                  onChange={e => setNewTx(prev => ({ ...prev, recipientId: e.target.value }))}
                />
              </div>
            </div>
          )}

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
