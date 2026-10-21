import CustomSelect from '../common/CustomSelect';
import { formatAmount } from '../../utils/formatters';
import { parseAmount, convertForPayment } from '../../domain/money';

export default function PayObligationModal({
  payingOb,
  onClose,
  payData,
  setPayData,
  assets,
  rates = {},
  veRates = {},
  onSubmit
}) {
  if (!payingOb) return null;

  const selectedAsset = assets.find(a => a.id === payData.assetId);
  const isVesInvolved = Boolean(
    selectedAsset && (
      (selectedAsset.name || '').toUpperCase() === 'VES' ||
      (payingOb?.currency || '').toUpperCase() === 'VES'
    )
  );

  const getActiveVeRate = (rateType, customRateInput) => {
    if (rateType === 'BCV_USD') return veRates?.bcvUsd || null;
    if (rateType === 'PARALELO') return veRates?.paralelo || null;
    if (rateType === 'EUR') return veRates?.bcvEur || null;
    if (rateType === 'CUSTOM') return parseAmount(customRateInput) || null;
    if ((payingOb?.currency || '').toUpperCase() === 'EUR') {
      return veRates?.bcvEur || null;
    }
    return veRates?.bcvUsd || null;
  };

  const calculateProposedAmount = (asset, rateType, customRate) => {
    if (!asset || !payingOb) return '';
    const activeVeRate = getActiveVeRate(rateType, customRate);
    const converted = convertForPayment(
      payingOb.amount,
      payingOb.currency,
      asset.name,
      { ...rates, ...veRates },
      activeVeRate
    );
    return converted != null ? converted.toString() : '';
  };

  // Formato para "Equivale a X [moneda] a tasa Y"
  const getEquivalenceString = () => {
    if (!selectedAsset || selectedAsset.name === payingOb.currency) return null;
    let rateText = '';
    if (isVesInvolved) {
      const activeVeRate = getActiveVeRate(payData.rateType, payData.customRate);
      rateText = activeVeRate ? `Bs. ${formatAmount(activeVeRate, 'VES')}` : '---';
    } else {
      const debtRateUsd = ['USD', 'USDT', 'USDC'].includes(payingOb.currency) ? 1 : (Number(rates?.[payingOb.currency]) || 1);
      const accRateUsd = ['USD', 'USDT', 'USDC'].includes(selectedAsset.name) ? 1 : (Number(rates?.[selectedAsset.name]) || 1);
      const ratio = accRateUsd > 0 ? debtRateUsd / accRateUsd : 1;
      rateText = `${formatAmount(ratio, selectedAsset.name)} ${selectedAsset.name}/${payingOb.currency}`;
    }
    return `Equivale a ${formatAmount(payingOb.amount, payingOb.currency)} ${payingOb.currency} a tasa ${rateText}`;
  };

  const equivalenceText = getEquivalenceString();

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
              {formatAmount(payingOb.amount, payingOb.currency)} {payingOb.currency}
            </div>
          </div>

          <div className="input-group">
            <label>Seleccionar Cuenta (Origen / Destino)</label>
            <CustomSelect
              placeholder="Seleccionar Cuenta"
              title="Seleccionar Cuenta de Pago"
              value={payData.assetId}
              onChange={e => {
                const newAsset = assets.find(a => a.id === e.target.value);
                if (!newAsset) return;

                const defaultRateType = payData.rateType || (payingOb.currency === 'EUR' ? 'EUR' : 'BCV_USD');
                const prefill = calculateProposedAmount(newAsset, defaultRateType, payData.customRate);

                setPayData({
                  ...payData,
                  assetId: newAsset.id,
                  rateType: defaultRateType,
                  actualAmount: prefill
                });
              }}
              options={assets.map(a => ({
                value: a.id,
                label: `${a.location} - ${a.name} (Balance: ${formatAmount(a.amount, a.name)})`
              }))}
            />
          </div>

          {/* Selector de tasa venezolana SOLO si uno de los lados es VES y son monedas distintas */}
          {payData.assetId && isVesInvolved && selectedAsset?.name !== payingOb.currency && (
            <>
              <div className="input-group">
                <label>Tasa de Cambio a Usar</label>
                <CustomSelect
                  placeholder="Seleccionar Tasa"
                  title="Tasa de Cambio a Usar"
                  value={payData.rateType || (payingOb.currency === 'EUR' ? 'EUR' : 'BCV_USD')}
                  onChange={e => {
                    const newRateType = e.target.value;
                    const prefill = calculateProposedAmount(selectedAsset, newRateType, payData.customRate);
                    setPayData({ ...payData, rateType: newRateType, actualAmount: prefill });
                  }}
                  options={[
                    { value: 'BCV_USD', label: `Oficial (BCV) - ${veRates.bcvUsd ? formatAmount(veRates.bcvUsd, 'VES') : 'Sin tasa'}` },
                    { value: 'PARALELO', label: `Paralelo - ${veRates.paralelo ? formatAmount(veRates.paralelo, 'VES') : 'Sin tasa'}` },
                    { value: 'EUR', label: `Euro Oficial - ${veRates.bcvEur ? formatAmount(veRates.bcvEur, 'VES') : 'Sin tasa'}` },
                    { value: 'CUSTOM', label: 'Personalizada' }
                  ]}
                />
              </div>
              {payData.rateType === 'CUSTOM' && (
                <div className="input-group">
                  <label>Tasa Personalizada</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field"
                    value={payData.customRate}
                    onChange={e => {
                      const newCustomRate = e.target.value;
                      const prefill = calculateProposedAmount(selectedAsset, 'CUSTOM', newCustomRate);
                      setPayData({ ...payData, customRate: newCustomRate, actualAmount: prefill });
                    }}
                    placeholder="Ej. 45,50"
                  />
                </div>
              )}
            </>
          )}

          {payData.assetId && (
            <div className="input-group">
              <label>Monto Real Deducido ({selectedAsset?.name})</label>
              <input
                type="text"
                inputMode="decimal"
                className="input-field"
                placeholder="0,00"
                value={payData.actualAmount}
                onChange={e => setPayData({ ...payData, actualAmount: e.target.value })}
                required
              />
              {equivalenceText && (
                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.35rem', fontWeight: 500 }}>
                  {equivalenceText}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#98989d', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                {selectedAsset?.name !== payingOb.currency
                  ? 'El monto se calculó automáticamente según las tasas, pero puedes ajustarlo si la tasa real varió.'
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
