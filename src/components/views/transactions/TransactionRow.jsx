import React, { memo } from 'react';
import { formatAmount } from '../../../utils/formatters';
import { toLocalDateString, formatTxDateTime } from '../../../utils/dates';
import TransactionRowBack from './TransactionRowBack';
import { resolveTransactionPresentation } from './transactionRowUtils';

const TransactionRow = memo(function TransactionRow({
  tx,
  rates = {},
  isFlipped = false,
  onFlip,
  deleteMode = false,
  isSelected = false,
  onToggleSelect,
  onEdit,
  onDelete,
  getCategoryName,
  getSubcategoryName,
  catObj
}) {
  const {
    usdVal,
    rateStr,
    defaultTypeLabel,
    txTitle,
    categorySubtext,
    catIcon,
    catColor
  } = resolveTransactionPresentation(tx, { rates, getCategoryName, getSubcategoryName, catObj });

  return (
    <div
      className={`tx-flip-container ${isFlipped ? 'flipped' : ''}`}
      style={{ opacity: deleteMode && !isSelected ? 0.6 : 1 }}
    >
      <div
        className="tx-flip-inner"
        onClick={() => {
          if (deleteMode) {
            onToggleSelect && onToggleSelect(tx);
          } else {
            onFlip && onFlip(tx.id);
          }
        }}
      >
        <div className="tx-flip-front glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
            {deleteMode && (
              <input type="checkbox" checked={isSelected} readOnly style={{ transform: 'scale(1.2)', flexShrink: 0 }} />
            )}
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                backgroundColor: `${catColor}22`,
                border: `1.5px solid ${catColor}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                flexShrink: 0
              }}
            >
              {catIcon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {tx.type === 'adjustment' && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <line x1="4" y1="21" x2="4" y2="14"></line>
                    <line x1="4" y1="10" x2="4" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12" y2="3"></line>
                    <line x1="20" y1="21" x2="20" y2="16"></line>
                    <line x1="20" y1="12" x2="20" y2="3"></line>
                    <line x1="1" y1="14" x2="7" y2="14"></line>
                    <line x1="9" y1="8" x2="15" y2="8"></line>
                    <line x1="17" y1="16" x2="23" y2="16"></line>
                  </svg>
                )}
                <span title={txTitle}>{txTitle}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                {Boolean(categorySubtext) && (
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {categorySubtext}
                  </div>
                )}
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.type === 'transfer' ? `${tx.origin} ➔ ${tx.destOrigin}` : tx.origin}</div>
                <div style={{ opacity: 0.7 }}>{tx.type === 'transfer' ? formatTxDateTime(tx.date) : toLocalDateString(tx.date)}</div>
                {tx.type === 'transfer' && tx.currency !== tx.destCurrency && (tx.effectiveRate || tx.effectiveRateData) && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                    Tasa: {formatAmount(tx.effectiveRate || tx.effectiveRateData?.rate, 'VES')} Bs./$
                  </div>
                )}
                {Boolean(tx.paymentMethod || tx.referenceNumber) && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--color-info)', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '2px' }}>
                    <span>📱</span>
                    <span>{tx.paymentMethod || 'Pago Móvil'}{tx.referenceNumber ? ` • Ref: ${tx.referenceNumber}` : ''}</span>
                  </div>
                )}
                {Boolean(tx.parentTransactionId) && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--color-warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '2px' }}>
                    <span>🔗</span>
                    <span>Vinculado a gasto</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {tx.type === 'transfer' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-info)' }}>
                    -{formatAmount(tx.amount, tx.currency)} {tx.currency.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                    +{formatAmount(tx.destAmount, tx.destCurrency)} {tx.destCurrency?.toUpperCase()}
                  </div>
                </div>
                {!deleteMode && (
                  <>
                    <button
                      type="button"
                      title="Editar transferencia"
                      aria-label="Editar transferencia"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEdit) onEdit(tx);
                      }}
                      style={{
                        background: 'var(--color-warning-soft)',
                        border: '1px solid var(--color-warning-border)',
                        color: 'var(--color-warning)',
                        borderRadius: '6px',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button
                      type="button"
                      title="Eliminar transferencia"
                      aria-label="Eliminar transacción"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDelete) onDelete(tx);
                      }}
                      style={{
                        background: 'var(--color-danger-soft)',
                        border: '1px solid var(--color-danger-border)',
                        color: 'var(--color-danger)',
                        borderRadius: '6px',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </>
                )}
              </div>
            ) : tx.type === 'adjustment' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {(tx.delta != null ? tx.delta >= 0 : true) ? '+' : '-'}{formatAmount(tx.amount, tx.currency)} {tx.currency.toUpperCase()}
                </div>
                {!deleteMode && (
                  <button
                    type="button"
                    title="Eliminar ajuste"
                    aria-label="Eliminar transacción"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDelete) onDelete(tx);
                    }}
                    style={{
                      background: 'var(--color-danger-soft)',
                      border: '1px solid var(--color-danger-border)',
                      color: 'var(--color-danger)',
                      borderRadius: '6px',
                      padding: '0.25rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: tx.type === 'income' ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                  {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, tx.currency)} {tx.currency.toUpperCase()}
                </div>
                {!deleteMode && (
                  <>
                    <button
                      type="button"
                      title="Editar transacción"
                      aria-label="Editar transacción"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEdit) onEdit(tx);
                      }}
                      style={{
                        background: 'var(--color-warning-soft)',
                        border: '1px solid var(--color-warning-border)',
                        color: 'var(--color-warning)',
                        borderRadius: '6px',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button
                      type="button"
                      title="Eliminar transacción"
                      aria-label="Eliminar transacción"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDelete) onDelete(tx);
                      }}
                      style={{
                        background: 'var(--color-danger-soft)',
                        border: '1px solid var(--color-danger-border)',
                        color: 'var(--color-danger)',
                        borderRadius: '6px',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FLIP BACK */}
        <TransactionRowBack
          tx={tx}
          usdVal={usdVal}
          rateStr={rateStr}
          getCategoryName={getCategoryName}
          getSubcategoryName={getSubcategoryName}
        />
      </div>
    </div>
  );
});

export default TransactionRow;
