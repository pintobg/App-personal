import React from 'react';
import CustomSelect from '../../common/CustomSelect';
import { formatAmount, getCurrencySymbol } from '../../../utils/formatters';
import { parseAmount } from '../../../domain/money';
import { DEFAULT_INSTALLMENTS } from '../../../domain/installmentPurchase';

export default function InstallmentPurchaseFields({
  newOb,
  setNewOb,
  assets = [],
  installmentPlan,
  planError
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className="input-group" style={{ flex: 2 }}>
          <label>Monto Total de la Compra</label>
          <input
            type="text"
            inputMode="decimal"
            className="input-field"
            placeholder="120,00"
            value={newOb.totalPurchaseAmount || ''}
            onChange={e => setNewOb({ ...newOb, totalPurchaseAmount: e.target.value })}
            required
          />
        </div>
        <div className="input-group" style={{ flex: 1.2 }}>
          <label>Moneda</label>
          <CustomSelect
            placeholder="Moneda"
            title="Moneda"
            value={newOb.currency}
            onChange={e => setNewOb({ ...newOb, currency: e.target.value })}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'VES', label: 'VES' },
              { value: 'EUR', label: 'EUR' },
              { value: 'USDT', label: 'USDT' }
            ]}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className="input-group" style={{ flex: 1 }}>
          <label>Inicial Pagada</label>
          <input
            type="text"
            inputMode="decimal"
            className="input-field"
            placeholder="40,00"
            value={newOb.downPayment || ''}
            onChange={e => setNewOb({ ...newOb, downPayment: e.target.value })}
          />
        </div>
        <div className="input-group" style={{ flex: 1 }}>
          <label>Número de Cuotas</label>
          <input
            type="text"
            inputMode="numeric"
            className="input-field"
            placeholder={String(DEFAULT_INSTALLMENTS)}
            value={newOb.installmentsCount ?? ''}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '');
              if (digits === '') {
                setNewOb({ ...newOb, installmentsCount: '' });
                return;
              }
              const num = parseInt(digits, 10);
              if (num > 24) return;
              setNewOb({ ...newOb, installmentsCount: String(num) });
            }}
            required
          />
        </div>
      </div>

      {(parseAmount(newOb.downPayment) || 0) > 0 && (
        <div className="input-group">
          <label>Cuenta de donde se pagó la inicial</label>
          <CustomSelect
            placeholder="Seleccionar cuenta para registrar gasto"
            title="Cuenta de pago inicial"
            value={newOb.downPaymentAssetId || ''}
            onChange={e => setNewOb({ ...newOb, downPaymentAssetId: e.target.value })}
            options={assets.map(a => ({
              value: a.id,
              label: `${a.location} (${a.name} - Saldo: ${a.amount})`
            }))}
          />
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
            Se descontará de esta cuenta y se guardará automáticamente como gasto.
          </div>
        </div>
      )}

      <div style={{
        background: planError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(2, 132, 199, 0.1)',
        border: planError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(2, 132, 199, 0.3)',
        borderRadius: '10px',
        padding: '0.75rem 0.9rem',
        marginBottom: '1rem',
        fontSize: '0.82rem',
        color: planError ? '#f87171' : '#38bdf8',
        lineHeight: '1.45'
      }}>
        {planError ? (
          <div>⚠️ {planError}</div>
        ) : (
          installmentPlan && (
            <>
              <div>Total: <strong>{getCurrencySymbol(newOb.currency)}{formatAmount(installmentPlan.total, newOb.currency)}</strong> — Inicial: <strong>{getCurrencySymbol(newOb.currency)}{formatAmount(installmentPlan.initial, newOb.currency)}</strong></div>
              <div>
                Restan: <strong>{getCurrencySymbol(newOb.currency)}{formatAmount(installmentPlan.remaining, newOb.currency)}</strong> en{' '}
                {installmentPlan.hasDifferentLast ? (
                  <>
                    <strong>{installmentPlan.installmentsCount - 1} cuotas de {getCurrencySymbol(newOb.currency)}{formatAmount(installmentPlan.installmentAmount, newOb.currency)}</strong> y <strong>1 cuota final de {getCurrencySymbol(newOb.currency)}{formatAmount(installmentPlan.lastInstallmentAmount, newOb.currency)}</strong>
                  </>
                ) : (
                  <>
                    <strong>{installmentPlan.installmentsCount} cuotas de {getCurrencySymbol(newOb.currency)}{formatAmount(installmentPlan.installmentAmount, newOb.currency)}</strong> c/u
                  </>
                )}
              </div>
            </>
          )
        )}
      </div>
    </>
  );
}
