/**
 * Lógica pura de cálculo de balances y transacciones.
 */
import { add, sub, round } from './money';

/**
 * Calcula el ajuste de balance (delta) al editar un movimiento.
 * Identifica si se trata de la misma cuenta o de cuentas distintas,
 * priorizando assetId si ambos objetos lo tienen.
 */
export function calculateTransactionEditDelta(oldTx, newTx) {
  const oldAmount = Number(oldTx?.amount) || 0;
  const amountNum = Number(newTx?.amount) || 0;
  const currency = newTx?.currency || oldTx?.currency;

  const isSameAccount = (oldTx?.assetId && newTx?.assetId)
    ? oldTx.assetId === newTx.assetId
    : ((oldTx?.currency || '').toUpperCase() === (newTx?.currency || '').toUpperCase() &&
       oldTx?.origin === newTx?.origin);

  if (isSameAccount) {
    let delta = 0;
    if (oldTx.type === 'income' && newTx.type === 'income') {
      delta = sub(amountNum, oldAmount);
    } else if (oldTx.type === 'spent' && newTx.type === 'spent') {
      delta = sub(oldAmount, amountNum);
    } else if (oldTx.type === 'income' && newTx.type === 'spent') {
      delta = sub(sub(0, oldAmount), amountNum);
    } else {
      delta = add(oldAmount, amountNum);
    }
    delta = round(delta, currency);
    return {
      isSameAccount: true,
      delta,
      targetAccount: {
        assetId: newTx.assetId || oldTx.assetId,
        currency: (newTx.currency || '').toUpperCase(),
        origin: newTx.origin
      }
    };
  }

  const revertDelta = round(oldTx.type === 'income' ? sub(0, oldAmount) : oldAmount, oldTx.currency);
  const newDelta = round(newTx.type === 'income' ? amountNum : sub(0, amountNum), newTx.currency);

  return {
    isSameAccount: false,
    revertAccount: {
      assetId: oldTx.assetId,
      currency: (oldTx.currency || '').toUpperCase(),
      origin: oldTx.origin,
      delta: revertDelta
    },
    newAccount: {
      assetId: newTx.assetId,
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
  const totalDeduction = add(deducted, comm);

  return {
    sourceDelta: sub(0, totalDeduction),
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
    destRevertDelta: sub(0, destAmount),
    commissionRevertDelta: commAmount
  };
}

/**
 * Migración local: Rellena assetId (y destAssetId en transferencias) en movimientos viejos
 * buscando la cuenta por moneda + ubicación.
 * @param {Array} transactions - Lista de transacciones
 * @param {Array} assets - Lista de cuentas activas
 * @returns {Object} { migratedTransactions, hasChanges }
 */
export function migrateTransactionsAssetIds(transactions = [], assets = []) {
  if (!Array.isArray(transactions) || transactions.length === 0 || !Array.isArray(assets) || assets.length === 0) {
    return { migratedTransactions: transactions || [], hasChanges: false };
  }

  let hasChanges = false;
  const migratedTransactions = transactions.map(tx => {
    let changed = false;
    let newAssetId = tx.assetId;
    let newDestAssetId = tx.destAssetId;

    if (!newAssetId && tx.currency && tx.origin) {
      const match = assets.find(
        a => (a.name || '').toUpperCase() === (tx.currency || '').toUpperCase() && a.location === tx.origin
      );
      if (match) {
        newAssetId = match.id;
        changed = true;
      }
    }

    if (!newDestAssetId && tx.type === 'transfer' && tx.destCurrency && tx.destOrigin) {
      const destMatch = assets.find(
        a => (a.name || '').toUpperCase() === (tx.destCurrency || '').toUpperCase() && a.location === tx.destOrigin
      );
      if (destMatch) {
        newDestAssetId = destMatch.id;
        changed = true;
      }
    }

    if (changed) {
      hasChanges = true;
      return {
        ...tx,
        assetId: newAssetId,
        ...(tx.type === 'transfer' ? { destAssetId: newDestAssetId } : {})
      };
    }
    return tx;
  });

  return { migratedTransactions, hasChanges };
}

/**
 * Recalcula el saldo teórico de una cuenta desde su saldo inicial más todos sus movimientos.
 * @param {Object} asset - Cuenta a verificar
 * @param {Array} transactions - Lista de movimientos
 * @returns {Object} { assetId, name, location, currentAmount, initialAmount, calculatedAmount, difference, isMatch, movementsCount }
 */
export function verifyAssetBalance(asset, transactions = []) {
  const currentAmount = round(Number(asset?.amount) || 0, asset?.name);
  const initialAmount = round(asset?.initialAmount != null ? Number(asset.initialAmount) : 0, asset?.name);

  let totalDelta = 0;
  let movementsCount = 0;

  for (const tx of transactions) {
    if (tx.deleted_at) continue;

    const isMatchOrigin = tx.assetId
      ? tx.assetId === asset.id
      : ((tx.currency || '').toUpperCase() === (asset.name || '').toUpperCase() && tx.origin === asset.location);

    const isMatchDest = tx.destAssetId
      ? tx.destAssetId === asset.id
      : ((tx.destCurrency || '').toUpperCase() === (asset.name || '').toUpperCase() && tx.destOrigin === asset.location);

    if (tx.type === 'income' && isMatchOrigin) {
      totalDelta = add(totalDelta, Number(tx.amount) || 0);
      movementsCount++;
    } else if (tx.type === 'spent' && isMatchOrigin) {
      totalDelta = sub(totalDelta, Number(tx.amount) || 0);
      movementsCount++;
    } else if (tx.type === 'adjustment' && isMatchOrigin) {
      const adjDelta = tx.delta != null ? Number(tx.delta) : Number(tx.amount) || 0;
      totalDelta = add(totalDelta, adjDelta);
      movementsCount++;
    } else if (tx.type === 'transfer') {
      if (isMatchOrigin) {
        totalDelta = sub(totalDelta, Number(tx.amount) || 0);
        movementsCount++;
      }
      if (isMatchDest) {
        totalDelta = add(totalDelta, Number(tx.destAmount) || 0);
        movementsCount++;
      }
    }
  }

  const calculatedAmount = round(add(initialAmount, totalDelta), asset?.name);
  const difference = round(sub(currentAmount, calculatedAmount), asset?.name);
  const isMatch = Math.abs(difference) === 0;

  return {
    assetId: asset.id,
    name: asset.name,
    location: asset.location,
    currentAmount,
    initialAmount,
    calculatedAmount,
    difference,
    isMatch,
    movementsCount
  };
}

/**
 * Verifica todas las cuentas contra la lista de transacciones.
 */
export function verifyAllAssetsBalances(assets = [], transactions = []) {
  return (assets || []).map(asset => verifyAssetBalance(asset, transactions));
}
