import CustomSelect from '../common/CustomSelect';
import { formatAmount } from '../../utils/formatters';

export default function TransferModal({
  isOpen,
  onClose,
  newTransfer,
  setNewTransfer,
  assets,
  validationError,
  setValidationError,
  onSubmit
}) {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    if (setValidationError) setValidationError('');
  };

  const src = assets.find(a => a.id === newTransfer.sourceAssetId);
  const dest = assets.find(a => a.id === newTransfer.destAssetId);
  const isSameCurrency = src && dest && src.name === dest.name;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={handleClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>Transferencia / Cambio</h2>
          <div style={{ width: '64px' }} />
        </div>
        <form onSubmit={onSubmit}>
          <div className="input-group">
            <label>Cuenta de Origen</label>
            <CustomSelect
              placeholder="Seleccionar Origen"
              title="Seleccionar Cuenta de Origen"
              value={newTransfer.sourceAssetId}
              onChange={e => {
                const selectedSrc = assets.find(a => a.id === e.target.value);
                const currentDest = assets.find(a => a.id === newTransfer.destAssetId);
                let autoFill = newTransfer.amountReceived;
                if (selectedSrc && currentDest && selectedSrc.name === currentDest.name && newTransfer.amountDeducted) {
                  autoFill = newTransfer.amountDeducted;
                }
                setNewTransfer({ ...newTransfer, sourceAssetId: e.target.value, amountReceived: autoFill });
              }}
              options={assets.map(a => ({
                value: a.id,
                label: `${a.location} (${a.name}) - Bal: ${formatAmount(a.amount, a.name)}`
              }))}
            />
          </div>

          <div className="input-group">
            <label>Cuenta de Destino</label>
            <CustomSelect
              placeholder="Seleccionar Destino"
              title="Seleccionar Cuenta de Destino"
              value={newTransfer.destAssetId}
              onChange={e => {
                const selectedDest = assets.find(a => a.id === e.target.value);
                const currentSrc = assets.find(a => a.id === newTransfer.sourceAssetId);
                let autoFill = newTransfer.amountReceived;
                if (currentSrc && selectedDest && currentSrc.name === selectedDest.name && newTransfer.amountDeducted) {
                  autoFill = newTransfer.amountDeducted;
                }
                setNewTransfer({ ...newTransfer, destAssetId: e.target.value, amountReceived: autoFill });
              }}
              options={assets.filter(a => a.id !== newTransfer.sourceAssetId).map(a => ({
                value: a.id,
                label: `${a.location} (${a.name})`
              }))}
            />
          </div>

          <div className="input-group">
            <label>{isSameCurrency ? 'Monto a transferir' : 'Monto Deducido'}</label>
            <input
              type="number"
              className="input-field"
              step="any"
              min="0.01"
              value={newTransfer.amountDeducted}
              onChange={e => {
                let autoFill = newTransfer.amountReceived;
                if (isSameCurrency) {
                  autoFill = e.target.value;
                }
                setNewTransfer({ ...newTransfer, amountDeducted: e.target.value, amountReceived: autoFill });
              }}
              placeholder="0.00"
              required
            />
          </div>

          {!isSameCurrency && (
            <div className="input-group">
              <label>Monto Recibido</label>
              <input
                type="number"
                className="input-field"
                step="any"
                min="0.01"
                value={newTransfer.amountReceived}
                onChange={e => setNewTransfer({ ...newTransfer, amountReceived: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          )}

          {isSameCurrency && (
            <div
              className="input-group"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1rem',
                marginBottom: newTransfer.hasCommission ? '0' : '1rem'
              }}
            >
              <input
                type="checkbox"
                id="hasCommission"
                checked={newTransfer.hasCommission}
                onChange={e => setNewTransfer({ ...newTransfer, hasCommission: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="hasCommission" style={{ marginBottom: 0, cursor: 'pointer' }}>
                ¿Hubo comisión bancaria?
              </label>
            </div>
          )}

          {isSameCurrency && newTransfer.hasCommission && (
            <div className="input-group">
              <label>Monto de la comisión</label>
              <input
                type="number"
                className="input-field"
                step="any"
                min="0.01"
                value={newTransfer.commissionAmount}
                onChange={e => setNewTransfer({ ...newTransfer, commissionAmount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          )}

          {!isSameCurrency && newTransfer.amountDeducted && newTransfer.amountReceived && src && dest && (
            <div
              style={{
                marginTop: '0.5rem',
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: '#232c3d',
                border: '1px solid #2a3447',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            >
              <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Tasa de cambio aplicada:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: 600, color: '#10b981' }}>
                <div>
                  1 {src.name} = {(Number(newTransfer.amountReceived) / Number(newTransfer.amountDeducted)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {dest.name}
                </div>
                <div style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.75rem' }}>
                  1 {dest.name} = {(Number(newTransfer.amountDeducted) / Number(newTransfer.amountReceived)).toLocaleString(undefined, { maximumFractionDigits: 6 })} {src.name}
                </div>
              </div>
            </div>
          )}

          {validationError && (
            <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
              {validationError}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Completar Transferencia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
