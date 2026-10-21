/**
 * Lógica pura de cálculo de balances y transacciones.
 */

/**
 * Calcula el ajuste de balance (delta) al editar un movimiento.
 * Casos:
 * 1. Misma cuenta (isSameAccount === true):
 *    - income -> income: amountNum - oldAmount
 *    - spent -> spent: oldAmount - amountNum
 *    - income -> spent: -oldAmount - amountNum
 *    - spent -> income: oldAmount + amountNum
 * 
 * 2. Cuentas distintas (isSameAccount === false):
 *    - revertDelta (cuenta anterior): oldTx.type === 'income' ? -oldAmount : oldAmount
 *    - newDelta (cuenta nueva): newTx.type === 'income' ? amountNum : -amountNum
 */
export function calculateTransactionEditDelta(oldTx, newTx) {
  const oldAmount = Number(oldTx?.amount) || 0;
  const amountNum = Number(newTx?.amount) || 0;

  const isSameAccount =
    (oldTx?.currency || '').toUpperCase() === (newTx?.currency || '').toUpperCase() &&
    oldTx?.origin === newTx?.origin;

  if (isSameAccount) {
    let delta = 0;
    if (oldTx.type === 'income' && newTx.type === 'income') {
      delta = amountNum - oldAmount;
    } else if (oldTx.type === 'spent' && newTx.type === 'spent') {
      delta = oldAmount - amountNum;
    } else if (oldTx.type === 'income' && newTx.type === 'spent') {
      delta = -oldAmount - amountNum;
    } else {
      delta = oldAmount + amountNum;
    }
    return {
      isSameAccount: true,
      delta,
      targetAccount: {
        currency: (newTx.currency || '').toUpperCase(),
        origin: newTx.origin
      }
    };
  }

  const revertDelta = oldTx.type === 'income' ? -oldAmount : oldAmount;
  const newDelta = newTx.type === 'income' ? amountNum : -amountNum;

  return {
    isSameAccount: false,
    revertAccount: {
      currency: (oldTx.currency || '').toUpperCase(),
      origin: oldTx.origin,
      delta: revertDelta
    },
    newAccount: {
      currency: (newTx.currency || '').toUpperCase(),
      origin: newTx.origin,
      delta: newDelta
    }
  };
}

/**
 * Calcula los deltas necesarios para ejecutar una transferencia entre cuentas.
 * Origen baja: monto deducido + comisión.
 * Destino sube: monto recibido.
 */
export function calculateTransferDeltas({ amountDeducted, amountReceived, commission = 0 }) {
  const deducted = Number(amountDeducted) || 0;
  const received = Number(amountReceived) || 0;
  const comm = Number(commission) || 0;
  const totalDeduction = deducted + comm;

  return {
    sourceDelta: -totalDeduction,
    destDelta: received,
    totalDeduction
  };
}

/**
 * Calcula los deltas de reversión al eliminar una transferencia y su comisión asociada.
 * Origen revierte: +monto deducido.
 * Destino revierte: -monto recibido.
 * Comisión revierte: +monto comisión.
 */
export function calculateTransferReversalDeltas(transferTx, commissionTx = null) {
  const amount = Number(transferTx?.amount) || 0;
  const destAmount = Number(transferTx?.destAmount) || 0;
  const commAmount = Number(commissionTx?.amount) || 0;

  return {
    sourceRevertDelta: amount,
    destRevertDelta: -destAmount,
    commissionRevertDelta: commAmount
  };
}
