import CustomSelect from '../common/CustomSelect';
import { formatAmount } from '../../utils/formatters';

export default function PayObligationModal({
  payingOb,
  onClose,
  payData,
  setPayData,
  assets,
  veRates,
  onSubmit
}) {
  if (!payingOb) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>{payingOb.type === 'pay' ? 'Registrar Pago' : 'Recibir Pago'}</h2>
          <div style={{ width: '64px' }} />
        </div>
        <form onSubmit={onSubmit}>
          <div style={{ padding: '1rem', marginBottom: '1rem', background: '#232c3d', border: '1px solid #2a3447', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Objetivo de la Obligación</div>
            <div style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 600 }}>{payingOb.title}</div>
            <div
              style={{
                color: payingOb.type === 'pay' ? '#ef4444' : '#10b981',
                fontSize: '1.5rem',
                fontWeight: 700,
                marginBottom: '0.25rem'
              }}
            >
              {payingOb.amount} {payingOb.currency}
            </div>
          </div>

          <div className="input-group">
            <label>Seleccionar Cuenta (Origen / Destino)</label>
            <CustomSelect
              placeholder="Seleccionar Cuenta"
              title="Seleccionar Cuenta de Pago"
              value={payData.assetId}
              onChange={e => {
                const selectedAsset = assets.find(a => a.id === e.target.value);
                if (!selectedAsset) return;

                let prefillAmount = payingOb.amount;
                if (selectedAsset.name !== payingOb.currency) {
                  let rate = 1;
                  if (payData.rateType === 'BCV_USD') rate = veRates.bcvUsd || 1;
                  else if (payData.rateType === 'PARALELO') rate = veRates.paralelo || 1;
                  else if (payData.rateType === 'EUR') rate = veRates.bcvEur || 1;
                  else if (payData.rateType === 'CUSTOM') rate = Number(payData.customRate) || 1;

                  const isObForeign = ['USD', 'USDT', 'EUR'].includes(payingOb.currency);
                  const isAssetForeign = ['USD', 'USDT', 'EUR'].includes(selectedAsset.name);

                  if (isObForeign && !isAssetForeign) {
                    prefillAmount = (Number(payingOb.amount) * rate).toFixed(2);
                  } else if (!isObForeign && isAssetForeign) {
                    prefillAmount = (Number(payingOb.amount) / rate).toFixed(2);
                  } else {
                    prefillAmount = payingOb.amount;
                  }
                }
                setPayData({ ...payData, assetId: e.target.value, actualAmount: prefillAmount.toString() });
              }}
              options={assets.map(a => ({
                value: a.id,
                label: `${a.location} - ${a.name} (Balance: ${formatAmount(a.amount, a.name)})`
              }))}
            />
          </div>

          {payData.assetId && assets.find(a => a.id === payData.assetId)?.name !== payingOb.currency && (
            <>
              <div className="input-group">
                <label>Tasa de Cambio a Usar</label>
                <CustomSelect
                  placeholder="Seleccionar Tasa"
                  title="Tasa de Cambio a Usar"
                  value={payData.rateType || 'BCV_USD'}
                  onChange={e => {
                    const newRateType = e.target.value;
                    const selectedAsset = assets.find(a => a.id === payData.assetId);
                    let rate = 1;
                    if (newRateType === 'BCV_USD') rate = veRates.bcvUsd || 1;
                    else if (newRateType === 'PARALELO') rate = veRates.paralelo || 1;
                    else if (newRateType === 'EUR') rate = veRates.bcvEur || 1;
                    else if (newRateType === 'CUSTOM') rate = Number(payData.customRate) || 1;

                    let prefillAmount = payingOb.amount;
                    const isObForeign = ['USD', 'USDT', 'EUR'].includes(payingOb.currency);
                    const isAssetForeign = ['USD', 'USDT', 'EUR'].includes(selectedAsset?.name);

                    if (isObForeign && !isAssetForeign) prefillAmount = (Number(payingOb.amount) * rate).toFixed(2);
                    else if (!isObForeign && isAssetForeign) prefillAmount = (Number(payingOb.amount) / rate).toFixed(2);

                    setPayData({ ...payData, rateType: newRateType, actualAmount: prefillAmount.toString() });
                  }}
                  options={[
                    { value: 'BCV_USD', label: `Oficial (BCV) - ${veRates.bcvUsd || '---'}` },
                    { value: 'PARALELO', label: `Paralelo (Binance) - ${veRates.paralelo || '---'}` },
                    { value: 'EUR', label: `Euro Oficial - ${veRates.bcvEur || '---'}` },
                    { value: 'CUSTOM', label: 'Personalizada' }
                  ]}
                />
              </div>
              {payData.rateType === 'CUSTOM' && (
                <div className="input-group">
                  <label>Tasa Personalizada</label>
                  <input
                    type="number"
                    step="any"
                    className="input-field"
                    value={payData.customRate}
                    onChange={e => {
                      const newCustomRate = e.target.value;
                      const selectedAsset = assets.find(a => a.id === payData.assetId);
                      const rate = Number(newCustomRate) || 1;
                      let prefillAmount = payingOb.amount;
                      const isObForeign = ['USD', 'USDT', 'EUR'].includes(payingOb.currency);
                      const isAssetForeign = ['USD', 'USDT', 'EUR'].includes(selectedAsset?.name);

                      if (isObForeign && !isAssetForeign) prefillAmount = (Number(payingOb.amount) * rate).toFixed(2);
                      else if (!isObForeign && isAssetForeign) prefillAmount = (Number(payingOb.amount) / rate).toFixed(2);

                      setPayData({ ...payData, customRate: newCustomRate, actualAmount: prefillAmount.toString() });
                    }}
                    placeholder="Ej. 45.5"
                  />
                </div>
              )}
            </>
          )}

          {payData.assetId && (
            <div className="input-group">
              <label>Monto Real Deducido ({assets.find(a => a.id === payData.assetId)?.name})</label>
              <input
                type="number"
                step="any"
                className="input-field"
                value={payData.actualAmount}
                onChange={e => setPayData({ ...payData, actualAmount: e.target.value })}
                required
              />
              <div style={{ fontSize: '0.75rem', color: '#98989d', marginBottom: '0.25rem' }}>
                {assets.find(a => a.id === payData.assetId)?.name !== payingOb.currency
                  ? 'El monto se calculó automáticamente, pero puedes ajustarlo si la tasa varió.'
                  : 'Ajusta esto si la cantidad real fue distinta.'}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
