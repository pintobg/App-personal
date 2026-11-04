import React, { memo } from 'react';
import CurrencyIcon from '../../common/CurrencyIcon';
import { formatAmount } from '../../../utils/formatters';

/**
 * Fila de 56 px de una cuenta: icono, nombre, banco o moneda debajo, monto y su valor en USD.
 * Tocarla abre la hoja de acciones (ver movimientos, ajustar, comparar, eliminar).
 */
const AccountRow = memo(function AccountRow({ row, showLocation, onOpen }) {
  const sym = row.symbol;
  const display = sym === 'VES' ? 'Bs.' : sym;
  const isCash = (row.location || '').toLowerCase() === 'cash' || (row.location || '').toLowerCase() === 'efectivo';
  const title = showLocation ? (row.location || 'Sin ubicación') : (isCash ? `${display} efectivo` : display);
  const sub = showLocation ? display : (row.type === 'crypto' ? 'Cripto' : (row.type === 'stock' ? 'Acción' : 'Moneda'));

  return (
    <button
      type="button"
      className="list-row account-row"
      onClick={onOpen}
      aria-label={`${title}, ${formatAmount(row.amount, sym)} ${display}. Ver acciones`}
    >
      <span className="list-row-icon"><CurrencyIcon symbol={sym} type={row.type} size={32} /></span>
      <span className="list-row-main">
        <span className="list-row-title">
          {title}
          {row.isUnrecognized && <span className="warn-dot" role="img" aria-label="Sin precio" />}
        </span>
        <span className="list-row-sub">{sub}</span>
      </span>
      <span className="list-row-value">
        <span className="amount">{formatAmount(row.amount, sym)} {display}</span>
        {sym !== 'USD' && !row.isUnrecognized && (
          <span className="amount-sub">≈ ${formatAmount(row.usdVal, 'USD')}</span>
        )}
      </span>
    </button>
  );
});

export default AccountRow;
