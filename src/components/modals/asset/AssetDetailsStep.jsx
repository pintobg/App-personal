import React from 'react';
import CustomSelect from '../../common/CustomSelect';
import CurrencyIcon from '../../common/CurrencyIcon';
import { VENEZUELAN_BANKS, INTERNATIONAL_WALLETS_BANKS, CRYPTO_WALLETS } from '../../../utils/constants';

export default function AssetDetailsStep({
  assetStep,
  newAsset,
  setNewAsset,
  isCustomLocation,
  setIsCustomLocation,
  formatPreviewRate
}) {
  const getLocationOptions = () => {
    if (newAsset.type === 'crypto') {
      return [
        ...CRYPTO_WALLETS.map(w => ({ label: w, value: w })),
        { label: 'Otro...', value: 'Otro' }
      ];
    }
    if (newAsset.name === 'VES') {
      return [
        ...VENEZUELAN_BANKS.map(bank => ({ label: bank, value: bank })),
        { label: 'Otro...', value: 'Otro' }
      ];
    }
    return [
      ...INTERNATIONAL_WALLETS_BANKS.map(b => ({ label: b, value: b })),
      { label: 'Otro...', value: 'Otro' }
    ];
  };

  const getLocationLabel = () => {
    if (newAsset.type === 'crypto') return 'Seleccionar Billetera o Exchange';
    if (newAsset.name === 'VES') return 'Seleccionar Banco';
    return 'Seleccionar Banco o Plataforma';
  };

  if (assetStep === 3) {
    return (
      <div className="input-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '10px', background: '#171f2e', border: '1px solid #2a3447' }}>
          <CurrencyIcon symbol={newAsset.name} type={newAsset.type} size={28} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
              Moneda seleccionada: {newAsset.name}
            </div>
            {formatPreviewRate(newAsset.name) && (
              <div style={{ fontSize: '0.72rem', color: '#10b981' }}>
                Cotización actual: {formatPreviewRate(newAsset.name)}
              </div>
            )}
          </div>
        </div>

        <label>{getLocationLabel()}</label>
        <CustomSelect
          value={isCustomLocation ? 'Otro' : newAsset.location}
          onChange={e => {
            const val = e.target.value;
            if (val === 'Otro') {
              setIsCustomLocation(true);
              setNewAsset({ ...newAsset, location: '' });
            } else {
              setIsCustomLocation(false);
              setNewAsset({ ...newAsset, location: val });
            }
          }}
          placeholder={getLocationLabel()}
          options={getLocationOptions()}
          title={getLocationLabel()}
          required
        />
        {isCustomLocation && (
          <div style={{ marginTop: '0.75rem' }}>
            <input
              type="text"
              className="input-field"
              placeholder={`Escribe el nombre ${newAsset.type === 'crypto' ? 'de la billetera' : 'del banco o plataforma'}`}
              value={newAsset.location}
              onChange={e => setNewAsset({ ...newAsset, location: e.target.value })}
              autoFocus
              required
            />
          </div>
        )}
      </div>
    );
  }

  if (assetStep === 4) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '10px', background: '#171f2e', border: '1px solid #2a3447' }}>
          <CurrencyIcon symbol={newAsset.name} type={newAsset.type} size={28} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
              {newAsset.location} ({newAsset.name})
            </div>
            {formatPreviewRate(newAsset.name) && (
              <div style={{ fontSize: '0.72rem', color: '#10b981' }}>
                Tasa: {formatPreviewRate(newAsset.name)}
              </div>
            )}
          </div>
        </div>

        <div className="input-group">
          <label>Balance Inicial ({newAsset.name})</label>
          <input
            type="text"
            inputMode="decimal"
            className="input-field"
            placeholder="0,00"
            value={newAsset.amount}
            onChange={e => setNewAsset({ ...newAsset, amount: e.target.value })}
            autoFocus
            required
          />
        </div>

        {/* Comisiones configurables e IGTF */}
        <div style={{ marginTop: '1rem', padding: '0.85rem', background: '#151b26', borderRadius: '12px', border: '1px solid #2a3447' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>⚙️</span>
            <span>Costos y Comisiones de la cuenta</span>
          </div>

          {/* Transferencia saliente */}
          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={newAsset.hasTransferCommission}
                onChange={e => setNewAsset({ ...newAsset, hasTransferCommission: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              <span>Comisión por transferencia saliente</span>
            </label>

            {newAsset.hasTransferCommission && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>% Comisión</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field"
                    placeholder="0,3 %"
                    style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                    value={newAsset.commissionPercent}
                    onChange={e => setNewAsset({ ...newAsset, commissionPercent: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Monto fijo ({newAsset.name})</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field"
                    placeholder="0,00"
                    style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                    value={newAsset.commissionFixed}
                    onChange={e => setNewAsset({ ...newAsset, commissionFixed: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* IGTF para divisas */}
          {newAsset.name !== 'VES' && (
            <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #232c3d' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={newAsset.appliesIgtf}
                  onChange={e => setNewAsset({ ...newAsset, appliesIgtf: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>Aplica IGTF en pagos en divisas</span>
              </label>

              {newAsset.appliesIgtf && (
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Porcentaje de IGTF (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field"
                    placeholder="3 %"
                    style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                    value={newAsset.igtfPercent}
                    onChange={e => setNewAsset({ ...newAsset, igtfPercent: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
