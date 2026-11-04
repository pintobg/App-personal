import React from 'react';
import { parseAmount, round } from '../../../domain/money';

/** Comisión bancaria e IGTF (va dentro de "Más detalles"). */
export default function TransactionFeesSection({ newTx, setNewTx, selectedAsset }) {
  return (
    <>
      {/* Opciones bancarias e IGTF para gastos */}
      {newTx.type === 'spent' && (
        <div className="input-group">
          <span className="form-section-label">Comisión e impuestos</span>

          <div style={{ marginBottom: (selectedAsset && selectedAsset.name !== 'VES' && selectedAsset.appliesIgtf) ? '0.75rem' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
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
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
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
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', marginLeft: '1.6rem' }}>
                Se deducirá del saldo de la cuenta y se registrará como gasto de comisión.
              </div>
            )}
          </div>

          {selectedAsset && selectedAsset.name !== 'VES' && selectedAsset.appliesIgtf && (
            <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', marginTop: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(newTx.includeIgtf)}
                    onChange={e => setNewTx(prev => ({ ...prev, includeIgtf: e.target.checked }))}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
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
