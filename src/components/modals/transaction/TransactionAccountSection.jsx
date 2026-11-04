import React from 'react';
import CustomSelect from '../../common/CustomSelect';
import { formatAmount } from '../../../utils/formatters';
import { computeNewBalance } from './transactionCalculations';

export default function TransactionAccountSection({
  newTx,
  assets = [],
  availableAssetsForTx = [],
  handleAssetSelect,
  oldTx
}) {
  return (
    <>
      <div className="input-group">
        <label className="form-section-label">{newTx.type === 'income' ? `Recibir en${newTx.currency ? ` (cuentas en ${newTx.currency})` : ''}` : `Pagar desde${newTx.currency ? ` (cuentas en ${newTx.currency})` : ''}`}</label>
        <CustomSelect
          placeholder={newTx.type === 'income' ? 'Seleccionar Destino' : 'Seleccionar Origen'}
          title={newTx.type === 'income' ? 'Seleccionar Cuenta Destino' : 'Seleccionar Cuenta Origen'}
          value={newTx.assetId || ''}
          onChange={e => handleAssetSelect(e.target.value)}
          options={availableAssetsForTx.map(a => ({
            value: a.id,
            label: `${a.location} · Saldo ${formatAmount(a.amount, a.name)} ${a.name}`
          }))}
        />
        {newTx.currency && availableAssetsForTx.length === 0 && (
          <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            No tienes cuentas en {newTx.currency}. Crea una en Cuentas o elige otra moneda.
          </div>
        )}

        {(newTx.assetId || (newTx.currency && newTx.origin)) && (() => {
          const asset = assets.find(a => a.id === newTx.assetId) ||
                        assets.find(a => (a.name || '').toUpperCase() === (newTx.currency || '').toUpperCase() && a.location === newTx.origin);
          const currentBalance = asset ? Number(asset.amount) : 0;
          const newBalance = computeNewBalance({ newTx, oldTx, currentBalance });
          return (
            <div className={`tx-balance-line${newBalance < 0 ? ' negative' : ''}`} data-testid="tx-balance-line">
              Saldo: {formatAmount(currentBalance, newTx.currency)} {newTx.currency} → {formatAmount(newBalance, newTx.currency)} {newTx.currency}
            </div>
          );
        })()}
      </div>
    </>
  );
}
