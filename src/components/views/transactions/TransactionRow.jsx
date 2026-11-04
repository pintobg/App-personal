import React, { memo } from 'react';
import { formatAmount } from '../../../utils/formatters';
import { resolveTransactionPresentation, resolveRowLines } from './transactionRowUtils';
import { tint } from '../../../utils/colors';

/**
 * Fila compacta de 64 px: icono, categoría, nota o cuenta, y monto a la derecha.
 * Al tocarla se abre la hoja de acciones (o se selecciona en modo selección).
 */
const TransactionRow = memo(function TransactionRow({
  tx,
  rates = {},
  onOpenActions,
  deleteMode = false,
  isSelected = false,
  onToggleSelect,
  getCategoryName,
  getSubcategoryName,
  catObj,
  position = ''
}) {
  const { catIcon, catColor } = resolveTransactionPresentation(tx, { rates, getCategoryName, getSubcategoryName, catObj });
  const { title, sub } = resolveRowLines(tx, { getCategoryName, getSubcategoryName });
  const cur = (tx.currency || '').toUpperCase();

  let amountMain;
  let amountSecond = null;
  if (tx.type === 'transfer') {
    amountMain = <span className="main transfer">−{formatAmount(tx.amount, tx.currency)} {cur}</span>;
    if (tx.destCurrency && tx.destCurrency !== tx.currency) {
      amountSecond = <span className="second">+{formatAmount(tx.destAmount, tx.destCurrency)} {tx.destCurrency.toUpperCase()}</span>;
    }
  } else if (tx.type === 'adjustment') {
    const positive = tx.delta != null ? tx.delta >= 0 : true;
    amountMain = <span className="main neutral">{positive ? '+' : '−'}{formatAmount(tx.amount, tx.currency)} {cur}</span>;
  } else {
    const isIncome = tx.type === 'income';
    amountMain = <span className={`main ${isIncome ? 'income' : 'expense'}`}>{isIncome ? '+' : '−'}{formatAmount(tx.amount, tx.currency)} {cur}</span>;
  }

  const handleClick = () => {
    if (deleteMode) onToggleSelect?.(tx);
    else onOpenActions?.(tx);
  };

  return (
    <button
      type="button"
      className={`tx-row ${position}${isSelected ? ' selected' : ''}`}
      onClick={handleClick}
      aria-label={`${title}, ${sub}`}
      aria-pressed={deleteMode ? isSelected : undefined}
      style={deleteMode && !isSelected ? { opacity: 0.7 } : undefined}
    >
      {deleteMode && (
        <input type="checkbox" className="tx-row-check" checked={isSelected} readOnly tabIndex={-1} aria-hidden="true" />
      )}
      <span className="tx-row-icon" style={{ backgroundColor: tint(catColor, 0.16) }} aria-hidden="true">
        {catIcon}
      </span>
      <span className="tx-row-main">
        <span className="tx-row-title">{title}</span>
        <span className="tx-row-sub">{sub}</span>
      </span>
      <span className="tx-row-amount">
        {amountMain}
        {amountSecond}
      </span>
    </button>
  );
});

export default TransactionRow;
