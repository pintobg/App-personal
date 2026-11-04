import React from 'react';
import { ActionSheet, InfoHint, Icon } from '../../ui';
import { formatAmount, formatNumber, translateSubcategory } from '../../../utils/formatters';
import { formatFriendlyDate } from '../../../utils/dates';
import { resolveTransactionPresentation, resolveRowLines } from './transactionRowUtils';

function Row({ label, children }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <span>{children}</span>
    </div>
  );
}

/**
 * Hoja de acciones de un movimiento: detalles + Editar, Repetir y Eliminar.
 */
export default function TransactionActionSheet({
  tx,
  rates = {},
  onClose,
  onEdit,
  onRepeat,
  onDelete,
  getCategoryName,
  getSubcategoryName
}) {
  if (!tx) return null;
  const { usdVal, rateStr } = resolveTransactionPresentation(tx, { rates, getCategoryName, getSubcategoryName });
  const { title } = resolveRowLines(tx, { getCategoryName, getSubcategoryName });
  const cur = (tx.currency || '').toUpperCase();
  const isTransfer = tx.type === 'transfer';
  const sign = tx.type === 'income' ? '+' : (tx.type === 'adjustment' ? '' : '−');

  const subtitleParts = [formatFriendlyDate(tx.date, { withTime: true })];
  if (isTransfer) subtitleParts.push(`${tx.origin} → ${tx.destOrigin}`);
  else if (tx.origin) subtitleParts.push(tx.origin);

  const actions = [];
  if (tx.type !== 'adjustment') {
    actions.push({
      label: 'Editar',
      ariaLabel: isTransfer ? 'Editar transferencia' : 'Editar transacción',
      icon: <Icon name="edit" />,
      onClick: () => { onClose?.(); onEdit?.(tx); }
    });
    if (onRepeat) {
      actions.push({
        label: 'Repetir',
        ariaLabel: 'Repetir con fecha de hoy',
        icon: <Icon name="repeat" />,
        onClick: () => { onClose?.(); onRepeat(tx); }
      });
    }
  }
  actions.push({
    label: 'Eliminar',
    ariaLabel: 'Eliminar transacción',
    icon: <Icon name="trash" />,
    variant: 'danger',
    onClick: () => { onClose?.(); onDelete?.(tx); }
  });

  const hasCrossRate = isTransfer && tx.currency !== tx.destCurrency && Number(tx.amount) > 0 && Number(tx.destAmount) > 0;
  const effectiveRate = hasCrossRate ? (tx.effectiveRateData?.rate ?? (Number(tx.destAmount) / Number(tx.amount))) : null;

  return (
    <ActionSheet
      isOpen
      onClose={onClose}
      title={`${title} · ${sign}${formatAmount(tx.amount, tx.currency)} ${cur}`}
      subtitle={subtitleParts.filter(Boolean).join(' · ')}
      actions={actions}
    >
      {tx.notes && tx.type !== 'adjustment' && <Row label="Nota">{tx.notes}</Row>}
      {isTransfer && tx.destCurrency && (
        <Row label="Recibido">+{formatAmount(tx.destAmount, tx.destCurrency)} {tx.destCurrency.toUpperCase()}</Row>
      )}
      {hasCrossRate && (
        <Row label="Tasa del cambio">
          {formatNumber(effectiveRate, 2)} {tx.effectiveRateData?.unitText || `${tx.destCurrency?.toUpperCase()}/${cur}`}
          {tx.effectiveRateData?.bcvDiffPct != null && ` (${tx.effectiveRateData.bcvDiffPct >= 0 ? '+' : ''}${formatNumber(tx.effectiveRateData.bcvDiffPct, 1)}% vs BCV)`}
        </Row>
      )}
      {Number(tx.commission) > 0 && <Row label="Comisión">{formatAmount(tx.commission, tx.currency)} {cur}</Row>}
      {tx.type === 'adjustment' && <Row label="Motivo">{tx.notes || tx.category || 'Ajuste manual de saldo'}{tx.subcategory ? ` · ${translateSubcategory(tx.subcategory)}` : ''}</Row>}
      {Boolean(tx.paymentMethod || tx.referenceNumber) && (
        <Row label="Pago">{tx.paymentMethod || 'Pago Móvil'}{tx.referenceNumber ? ` · Ref. ${tx.referenceNumber}` : ''}</Row>
      )}
      {!isTransfer && rateStr && cur !== 'USD' && <Row label={<>Tasa del día del movimiento<InfoHint label="Qué es la tasa del día del movimiento">La tasa guardada el día que registraste este movimiento. Sirve para saber cuánto valía en dólares ese día.</InfoHint></>}>{rateStr}</Row>}
      {cur !== 'USD' && <Row label="Equivale a">~${formatAmount(usdVal, 'USD')}</Row>}
      {Boolean(tx.parentTransactionId) && <Row label="Vinculado">Comisión de otro gasto</Row>}
    </ActionSheet>
  );
}
