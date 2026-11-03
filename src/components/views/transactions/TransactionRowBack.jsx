import React from 'react';
import {
  formatAmount,
  translateCategory,
  translateSubcategory
} from '../../../utils/formatters';
import { formatTxDateTime } from '../../../utils/dates';

export default function TransactionRowBack({
  tx,
  usdVal,
  rateStr,
  getCategoryName,
  getSubcategoryName
}) {
  return (
    <div className="tx-flip-back glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px', gap: '0.25rem' }}>
      {tx.type === 'transfer' ? (
        <>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Detalles de Cambio</div>
          {tx.currency !== tx.destCurrency && Number(tx.amount) > 0 && Number(tx.destAmount) > 0 ? (() => {
            const effectiveInfo = tx.effectiveRateData;
            const effRate = effectiveInfo?.rate ?? Number((Number(tx.destAmount) / Number(tx.amount)).toFixed(2));
            const unitText = effectiveInfo?.unitText || `Bs./${tx.currency.toUpperCase()}`;

            let bcvDiffText = '';
            if (effectiveInfo?.bcvDiffPct != null) {
              const diff = effectiveInfo.bcvDiffPct;
              const sign = diff >= 0 ? '+' : '';
              bcvDiffText = `${sign}${diff}% sobre BCV`;
            }

            let parDiffText = '';
            if (effectiveInfo?.paraleloDiffPct != null) {
              const diff = effectiveInfo.paraleloDiffPct;
              const sign = diff >= 0 ? '+' : '';
              parDiffText = `${sign}${diff}% vs Paralelo`;
            }

            return (
              <>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-accent)', textAlign: 'center' }}>
                  Cambiaste a {formatAmount(effRate, 'VES')} {unitText}{bcvDiffText ? `: ${bcvDiffText}` : ''}
                </div>
                {parDiffText && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    ({parDiffText})
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  1 {tx.currency.toUpperCase()} = {(Number(tx.destAmount) / Number(tx.amount)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {tx.destCurrency?.toUpperCase()}
                </div>
              </>
            );
          })() : (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Transferencia del mismo activo ({tx.currency.toUpperCase()}).</div>
          )}
          {Number(tx.commission) > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: '0.15rem' }}>
              Comisión bancaria: {formatAmount(tx.commission, tx.currency)} {tx.currency.toUpperCase()}
            </div>
          )}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Fecha y hora: {formatTxDateTime(tx.date)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', marginTop: '0.25rem', fontWeight: 500 }}>
            Valor estimado: ~${formatAmount(usdVal, 'USD')} USD
          </div>
        </>
      ) : tx.type === 'adjustment' ? (
        <>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Detalles de Ajuste</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Motivo: {tx.notes || tx.category || 'Ajuste manual de saldo'}</div>
          {tx.subcategory && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tipo: {translateSubcategory(tx.subcategory)}</div>}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', fontWeight: 500 }}>
            Tasa de registro: {rateStr}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Impacto estimado: ~${formatAmount(usdVal, 'USD')} USD
          </div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Detalles de Transacción</div>
          {tx.notes && <div style={{ fontSize: '0.875rem', color: 'var(--color-info)', fontWeight: 600, marginBottom: '0.25rem' }}>Concepto: {tx.notes}</div>}
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Categoría: {(tx.category_id && getCategoryName ? getCategoryName(tx.category_id) : '') || translateCategory(tx.category) || 'Sin categoría'}</div>
          {Boolean(tx.subcategory_id || tx.subcategory) && (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Subcategoría: {(tx.subcategory_id && getSubcategoryName ? getSubcategoryName(tx.subcategory_id) : '') || translateSubcategory(tx.subcategory)}</div>
          )}
          <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', marginTop: '0.35rem', fontWeight: 500 }}>
            Tasa de registro: {rateStr}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Valor original: ~${formatAmount(usdVal, 'USD')} USD
          </div>
        </>
      )}
    </div>
  );
}
