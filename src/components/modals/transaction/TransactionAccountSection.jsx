import React from 'react';
import CustomSelect from '../../common/CustomSelect';
import { formatAmount, getCurrencySymbol } from '../../../utils/formatters';
import { parseAmount, add, sub, round } from '../../../domain/money';

export default function TransactionAccountSection({
  newTx,
  setNewTx,
  assets = [],
  availableAssetsForTx = [],
  selectedAsset,
  handleAssetSelect,
  oldTx
}) {
  return (
    <>
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
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-surface-elevated, #232c3d)', border: '1px solid var(--border-color, #2a3447)', borderRadius: '8px', fontSize: '0.875rem' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: newBalance < 0 ? 'var(--color-danger)' : 'var(--color-accent)' }}>
                    <span>Balance Final:</span>
                    <span>{getCurrencySymbol(newTx.currency)}{formatAmount(newBalance, newTx.currency)} {newTx.currency}</span>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Opciones bancarias e IGTF para gastos */}
      {newTx.type === 'spent' && (
        <div style={{ marginBottom: '1rem', padding: '0.85rem', background: 'var(--bg-surface-elevated, #151b26)', borderRadius: '12px', border: '1px solid var(--border-color, #2a3447)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary, #f1f5f9)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🧾</span>
            <span>Comisión bancaria e impuestos (Opcional)</span>
          </div>

          <div style={{ marginBottom: (selectedAsset && selectedAsset.name !== 'VES' && selectedAsset.appliesIgtf) ? '0.75rem' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                <input
                  type="checkbox"
                  checked={Boolean(newTx.includeCommission)}
                  onChange={e => {
                    const checked = e.target.checked;
                    let autoComm = newTx.commissionAmount;
                    if (checked && !autoComm && selectedAsset) {
                      const pct = Number(selectedAsset.commissionPercent) || 0;
                      const fix = Number(selectedAsset.commissionFixed) || 0;
                      const parsedAmt = parseAmount(newTx.amount) || 0;
                      if (pct > 0 || fix > 0) {
                        autoComm = round((parsedAmt * (pct / 100)) + fix, selectedAsset.name).toString();
                      }
                    }
                    setNewTx(prev => ({ ...prev, includeCommission: checked, commissionAmount: autoComm }));
                  }}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent, #10b981)' }}
                />
                <span>Agregar comisión bancaria {newTx.currency ? `(${newTx.currency})` : ''}</span>
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
            {newTx.includeCommission && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: '0.3rem', marginLeft: '1.6rem' }}>
                Se deducirá del saldo de la cuenta y se registrará como gasto de comisión.
              </div>
            )}
          </div>

          {selectedAsset && selectedAsset.name !== 'VES' && selectedAsset.appliesIgtf && (
            <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border-color, #232c3d)', marginTop: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(newTx.includeIgtf)}
                    onChange={e => setNewTx(prev => ({ ...prev, includeIgtf: e.target.checked }))}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent, #10b981)' }}
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
        </div>
      )}
    </>
  );
}
