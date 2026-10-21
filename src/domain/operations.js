import { add, sub, convert, round, parseAmount } from './money';
import { calculateEffectiveExchangeRate } from './rates';
import {
  calculateTransactionEditDelta,
  calculateTransferDeltas,
  calculateTransferReversalDeltas
} from './balances';
import { getNextDueDate } from '../utils/dates';

/**
 * Busca una cuenta en la lista de activos primero por assetId, luego por moneda + ubicación.
 */
export function findAsset(assets, assetId, currency, location) {
  if (!assets || !Array.isArray(assets)) return null;
  if (assetId) {
    const foundById = assets.find((a) => a.id === assetId);
    if (foundById) return foundById;
  }
  const currUpper = (currency || '').trim().toUpperCase();
  return assets.find(
    (a) => (a.name || '').trim().toUpperCase() === currUpper && a.location === location
  ) || null;
}

/**
 * Aplica un cambio de saldo (delta) a un activo específico dentro de una lista de activos.
 * Retorna { nextAssets, updatedAsset } o null si no se encuentra el activo.
 */
export function applyBalanceDelta(assets, assetId, delta) {
  const index = assets.findIndex((a) => a.id === assetId);
  if (index === -1) return null;

  const target = assets[index];
  const newAmount = round(add(target.amount, delta), target.name);
  const nowIso = new Date().toISOString();
  const updatedAsset = {
    ...target,
    amount: newAmount,
    updated_at: nowIso
  };

  const nextAssets = [...assets];
  nextAssets[index] = updatedAsset;
  return { nextAssets, updatedAsset };
}

/**
 * Función pura para agregar o editar un movimiento.
 *
 * @param {Object} state - { assets, transactions, rates }
 * @param {Object} txPayload - Datos del formulario de transacción
 * @returns {Object} { success, error, nextAssets, nextTransactions, syncChanges, toastMessage }
 */
export function executeAddOrEditTransaction({ assets, transactions, rates = {} }, txPayload) {
  if (!txPayload.currency || !txPayload.amount || !txPayload.origin) {
    return { success: false, error: 'Faltan campos obligatorios' };
  }

  const amountNum = parseAmount(txPayload.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return { success: false, error: 'Ingresa un monto válido mayor a 0 (ej. 1.234,56 o 1234,56)' };
  }

  const nowIso = new Date().toISOString();
  const txDate = txPayload.date
    ? (txPayload.date.includes('T') ? txPayload.date : new Date(txPayload.date + 'T12:00:00').toISOString())
    : nowIso;

  // CASO: EDITAR MOVIMIENTO EXISTENTE
  if (txPayload.id) {
    const oldTx = transactions.find((t) => t.id === txPayload.id);
    if (!oldTx) {
      return { success: false, error: 'La transacción original no fue encontrada' };
    }

    const oldAsset = findAsset(assets, oldTx.assetId, oldTx.currency, oldTx.origin);
    const targetAsset = findAsset(assets, txPayload.assetId, txPayload.currency, txPayload.origin);

    if (!targetAsset) {
      return { success: false, error: 'La cuenta seleccionada no existe' };
    }
    if (!oldAsset) {
      return { success: false, error: 'La cuenta original de la transacción ya no existe' };
    }

    const isSameAccount = oldAsset.id === targetAsset.id;
    const oldAmount = Number(oldTx.amount) || 0;
    const roundedAmount = round(amountNum, targetAsset.name);

    if (txPayload.type === 'spent') {
      const currentBalance = Number(targetAsset.amount) || 0;
      const maxAvailable = isSameAccount
        ? (oldTx.type === 'spent' ? add(currentBalance, oldAmount) : sub(currentBalance, oldAmount))
        : currentBalance;
      if (roundedAmount > maxAvailable) {
        return {
          success: false,
          error: `Saldo insuficiente. Tienes ${currentBalance} ${targetAsset.name} en ${targetAsset.location}.`
        };
      }
    }

    const editDeltaResult = calculateTransactionEditDelta(
      { ...oldTx, assetId: oldAsset.id },
      { ...txPayload, assetId: targetAsset.id, amount: roundedAmount }
    );

    let nextAssets = [...assets];
    const syncChanges = [];

    if (editDeltaResult.isSameAccount) {
      const res = applyBalanceDelta(nextAssets, targetAsset.id, editDeltaResult.delta);
      if (!res) return { success: false, error: 'Error al actualizar el saldo de la cuenta' };
      nextAssets = res.nextAssets;
      syncChanges.push({ table: 'assets', type: 'upsert', record: res.updatedAsset });
    } else {
      const resRevert = applyBalanceDelta(nextAssets, oldAsset.id, editDeltaResult.revertAccount.delta);
      if (!resRevert) return { success: false, error: 'Error al revertir saldo de cuenta previa' };
      nextAssets = resRevert.nextAssets;
      syncChanges.push({ table: 'assets', type: 'upsert', record: resRevert.updatedAsset });

      const resNew = applyBalanceDelta(nextAssets, targetAsset.id, editDeltaResult.newAccount.delta);
      if (!resNew) return { success: false, error: 'Error al aplicar saldo en nueva cuenta' };
      nextAssets = resNew.nextAssets;
      syncChanges.push({ table: 'assets', type: 'upsert', record: resNew.updatedAsset });
    }

    const txCurr = targetAsset.name.toUpperCase();
    const rateSnapshot = (oldTx.currency.toUpperCase() === txCurr && oldTx.rateSnapshot != null && Number(oldTx.rateSnapshot) > 0)
      ? Number(oldTx.rateSnapshot)
      : (rates[txCurr] ?? (['USD', 'USDT', 'USDC'].includes(txCurr) ? 1 : 0));
    const usdEquivalent = convert(roundedAmount, txCurr, 'USD', rates);

    const updatedTx = {
      ...oldTx,
      type: txPayload.type,
      assetId: targetAsset.id,
      currency: targetAsset.name,
      amount: roundedAmount,
      origin: targetAsset.location,
      category: txPayload.category,
      subcategory: txPayload.subcategory,
      paymentMethod: txPayload.paymentMethod !== undefined ? txPayload.paymentMethod : (oldTx.paymentMethod || null),
      referenceNumber: txPayload.referenceNumber !== undefined ? txPayload.referenceNumber : (oldTx.referenceNumber || null),
      bank: txPayload.bank !== undefined ? txPayload.bank : (oldTx.bank || null),
      recipientId: txPayload.recipientId !== undefined ? txPayload.recipientId : (oldTx.recipientId || null),
      date: txDate,
      rateSnapshot,
      usdEquivalent,
      updated_at: nowIso
    };

    const nextTransactions = transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t));
    syncChanges.push({ table: 'transactions', type: 'upsert', record: updatedTx });

    return {
      success: true,
      nextAssets,
      nextTransactions,
      syncChanges,
      toastMessage: 'Transacción actualizada'
    };
  }

  // CASO: AGREGAR NUEVO MOVIMIENTO
  const targetAsset = findAsset(assets, txPayload.assetId, txPayload.currency, txPayload.origin);
  if (!targetAsset) {
    return { success: false, error: 'La cuenta seleccionada no existe' };
  }

  const roundedAmount = round(amountNum, targetAsset.name);

  // Comisiones e IGTF vinculados opcionales para gastos
  const igtfNum = (txPayload.type === 'spent' && txPayload.includeIgtf && txPayload.igtfAmount)
    ? (parseAmount(txPayload.igtfAmount) || 0)
    : 0;
  const commNum = (txPayload.type === 'spent' && txPayload.includeCommission && txPayload.commissionAmount)
    ? (parseAmount(txPayload.commissionAmount) || 0)
    : 0;

  const roundedIgtf = round(igtfNum, targetAsset.name);
  const roundedCommission = round(commNum, targetAsset.name);
  const totalSpent = add(add(roundedAmount, roundedIgtf), roundedCommission);

  if (txPayload.type === 'spent') {
    const currentBalance = Number(targetAsset.amount) || 0;
    if (totalSpent > currentBalance) {
      return {
        success: false,
        error: `Saldo insuficiente. Tienes ${currentBalance} ${targetAsset.name} en ${targetAsset.location}, pero requieres ${totalSpent} (incluyendo comisiones/IGTF).`
      };
    }
  }

  const delta = txPayload.type === 'income' ? roundedAmount : sub(0, totalSpent);
  const res = applyBalanceDelta(assets, targetAsset.id, delta);
  if (!res) {
    return { success: false, error: 'Error al actualizar el saldo de la cuenta' };
  }

  const txCurr = targetAsset.name.toUpperCase();
  const txRateSnapshot = rates[txCurr] ?? (['USD', 'USDT', 'USDC'].includes(txCurr) ? 1 : 0);
  const txUsdEquivalent = convert(roundedAmount, txCurr, 'USD', rates);
  const mainTxId = txPayload.id || crypto.randomUUID();

  const newTxItem = {
    id: mainTxId,
    type: txPayload.type,
    assetId: targetAsset.id,
    currency: targetAsset.name,
    origin: targetAsset.location,
    amount: roundedAmount,
    category: txPayload.category,
    subcategory: txPayload.subcategory,
    paymentMethod: txPayload.paymentMethod || null,
    referenceNumber: txPayload.referenceNumber || null,
    bank: txPayload.bank || null,
    recipientId: txPayload.recipientId || null,
    date: txDate,
    rateSnapshot: txRateSnapshot,
    usdEquivalent: txUsdEquivalent,
    updated_at: nowIso
  };

  const newTxs = [newTxItem];
  const syncChanges = [
    { table: 'assets', type: 'upsert', record: res.updatedAsset },
    { table: 'transactions', type: 'upsert', record: newTxItem }
  ];

  if (roundedIgtf > 0) {
    const igtfTx = {
      id: crypto.randomUUID(),
      parentTransactionId: mainTxId,
      assetId: targetAsset.id,
      type: 'spent',
      currency: targetAsset.name,
      origin: targetAsset.location,
      amount: roundedIgtf,
      category: 'Impuestos',
      subcategory: `IGTF (${targetAsset.igtfPercent || 3}%)`,
      date: txDate,
      rateSnapshot: txRateSnapshot,
      usdEquivalent: convert(roundedIgtf, txCurr, 'USD', rates),
      updated_at: nowIso
    };
    newTxs.push(igtfTx);
    syncChanges.push({ table: 'transactions', type: 'upsert', record: igtfTx });
  }

  if (roundedCommission > 0) {
    const commTx = {
      id: crypto.randomUUID(),
      parentTransactionId: mainTxId,
      assetId: targetAsset.id,
      type: 'spent',
      currency: targetAsset.name,
      origin: targetAsset.location,
      amount: roundedCommission,
      category: 'Comisiones',
      subcategory: 'Comisión bancaria',
      date: txDate,
      rateSnapshot: txRateSnapshot,
      usdEquivalent: convert(roundedCommission, txCurr, 'USD', rates),
      updated_at: nowIso
    };
    newTxs.push(commTx);
    syncChanges.push({ table: 'transactions', type: 'upsert', record: commTx });
  }

  const nextAssets = res.nextAssets;
  const nextTransactions = [...newTxs, ...transactions];

  return {
    success: true,
    nextAssets,
    nextTransactions,
    syncChanges,
    toastMessage: 'Movimiento registrado'
  };
}

/**
 * Función pura para ejecutar una transferencia entre dos cuentas.
 *
 * @param {Object} state - { assets, transactions, rates }
 * @param {Object} transferPayload - Datos de la transferencia
 * @returns {Object} { success, error, nextAssets, nextTransactions, syncChanges, toastMessage }
 */
export function executeTransfer({ assets, transactions, rates = {} }, transferPayload) {
  const {
    sourceAssetId,
    destAssetId,
    amountDeducted,
    amountReceived,
    hasCommission,
    commissionAmount,
    hasIgtf,
    igtfAmount
  } = transferPayload;

  if (!sourceAssetId || !destAssetId || !amountDeducted || !amountReceived) {
    return { success: false, error: 'Completa todos los campos obligatorios de la transferencia' };
  }

  const sourceAsset = assets.find((a) => a.id === sourceAssetId);
  const destAsset = assets.find((a) => a.id === destAssetId);

  if (!sourceAsset || !destAsset) {
    return { success: false, error: 'Una de las cuentas seleccionadas no existe' };
  }

  if (sourceAsset.id === destAsset.id) {
    return { success: false, error: 'Las cuentas de origen y destino deben ser distintas.' };
  }

  const amountDeductedNum = parseAmount(amountDeducted);
  const amountReceivedNum = parseAmount(amountReceived);
  const commNum = hasCommission ? (parseAmount(commissionAmount) || 0) : 0;
  const igtfNum = hasIgtf ? (parseAmount(igtfAmount) || 0) : 0;

  if (isNaN(amountDeductedNum) || amountDeductedNum <= 0) {
    return { success: false, error: 'Ingresa un monto a debitar válido mayor a 0' };
  }
  if (isNaN(amountReceivedNum) || amountReceivedNum <= 0) {
    return { success: false, error: 'El monto a recibir debe ser mayor a 0' };
  }

  const roundedDeducted = round(amountDeductedNum, sourceAsset.name);
  const roundedReceived = round(amountReceivedNum, destAsset.name);
  const roundedCommission = round(commNum, sourceAsset.name);
  const roundedIgtf = round(igtfNum, sourceAsset.name);
  const totalExtraFees = add(roundedCommission, roundedIgtf);
  const totalDeduction = add(roundedDeducted, totalExtraFees);

  if (totalDeduction > Number(sourceAsset.amount)) {
    return {
      success: false,
      error: `Saldo insuficiente. Tienes ${sourceAsset.amount} ${sourceAsset.name} en ${sourceAsset.location}, pero requieres ${totalDeduction} (incluyendo comisión/IGTF).`
    };
  }

  const transferDeltas = calculateTransferDeltas({
    amountDeducted: roundedDeducted,
    amountReceived: roundedReceived,
    commission: totalExtraFees
  });

  let nextAssets = [...assets];
  const syncChanges = [];

  const resSource = applyBalanceDelta(nextAssets, sourceAsset.id, transferDeltas.sourceDelta);
  if (!resSource) return { success: false, error: 'Error al actualizar cuenta de origen' };
  nextAssets = resSource.nextAssets;
  syncChanges.push({ table: 'assets', type: 'upsert', record: resSource.updatedAsset });

  const resDest = applyBalanceDelta(nextAssets, destAsset.id, transferDeltas.destDelta);
  if (!resDest) return { success: false, error: 'Error al actualizar cuenta de destino' };
  nextAssets = resDest.nextAssets;
  syncChanges.push({ table: 'assets', type: 'upsert', record: resDest.updatedAsset });

  const nowIso = new Date().toISOString();
  const srcCurr = sourceAsset.name.toUpperCase();
  const destCurr = destAsset.name.toUpperCase();
  const srcRateSnapshot = rates[srcCurr] ?? (['USD', 'USDT', 'USDC'].includes(srcCurr) ? 1 : 0);
  const transferUsdEquivalent = convert(roundedDeducted, srcCurr, 'USD', rates);
  const transferId = crypto.randomUUID();

  let effectiveRateData = null;
  if (srcCurr !== destCurr) {
    effectiveRateData = calculateEffectiveExchangeRate({
      fromCurrency: sourceAsset.name,
      fromAmount: roundedDeducted,
      toCurrency: destAsset.name,
      toAmount: roundedReceived,
      commission: totalExtraFees,
      ratesSnapshot: {
        bcvUsd: rates.bcvUsd || rates.VES,
        paralelo: rates.paralelo || rates.VES_PARALELO
      }
    });
  }

  const transferTx = {
    id: transferId,
    assetId: sourceAsset.id,
    destAssetId: destAsset.id,
    type: 'transfer',
    currency: sourceAsset.name,
    amount: roundedDeducted,
    origin: sourceAsset.location,
    destCurrency: destAsset.name,
    destAmount: roundedReceived,
    destOrigin: destAsset.location,
    commission: roundedCommission,
    category: 'Transfer',
    subcategory: `Hacia ${destAsset.location}`,
    rateSnapshot: srcRateSnapshot,
    usdEquivalent: transferUsdEquivalent,
    effectiveRate: effectiveRateData?.rate ?? null,
    effectiveRateData: effectiveRateData ?? null,
    date: nowIso,
    updated_at: nowIso
  };

  const newTxs = [transferTx];
  syncChanges.push({ table: 'transactions', type: 'upsert', record: transferTx });

  if (roundedCommission > 0) {
    const commissionTx = {
      id: crypto.randomUUID(),
      parentTransferId: transferId,
      assetId: sourceAsset.id,
      type: 'spent',
      currency: sourceAsset.name,
      amount: roundedCommission,
      origin: sourceAsset.location,
      category: 'Comisiones',
      subcategory: 'Comisión por transferencia',
      rateSnapshot: srcRateSnapshot,
      usdEquivalent: convert(roundedCommission, srcCurr, 'USD', rates),
      date: nowIso,
      updated_at: nowIso
    };
    newTxs.push(commissionTx);
    syncChanges.push({ table: 'transactions', type: 'upsert', record: commissionTx });
  }

  if (roundedIgtf > 0) {
    const igtfTx = {
      id: crypto.randomUUID(),
      parentTransferId: transferId,
      assetId: sourceAsset.id,
      type: 'spent',
      currency: sourceAsset.name,
      amount: roundedIgtf,
      origin: sourceAsset.location,
      category: 'Impuestos',
      subcategory: `IGTF (${sourceAsset.igtfPercent || 3}%)`,
      rateSnapshot: srcRateSnapshot,
      usdEquivalent: convert(roundedIgtf, srcCurr, 'USD', rates),
      date: nowIso,
      updated_at: nowIso
    };
    newTxs.push(igtfTx);
    syncChanges.push({ table: 'transactions', type: 'upsert', record: igtfTx });
  }

  const nextTransactions = [...newTxs, ...transactions];

  return {
    success: true,
    nextAssets,
    nextTransactions,
    syncChanges,
    toastMessage: 'Transferencia completada'
  };
}

/**
 * Función pura para procesar el pago de una obligación/deuda.
 *
 * @param {Object} state - { assets, transactions, obligations, rates, veRates }
 * @param {Object} payload - { payingOb, payData }
 * @returns {Object} { success, error, nextAssets, nextTransactions, nextObligations, syncChanges, toastMessage }
 */
export function executePayObligation({ assets, transactions, obligations, rates = {}, veRates = {} }, { payingOb, payData }) {
  if (!payingOb || !payData.assetId || !payData.actualAmount) {
    return { success: false, error: 'Faltan datos obligatorios para el pago' };
  }

  const asset = assets.find((a) => a.id === payData.assetId);
  if (!asset) {
    return { success: false, error: 'La cuenta seleccionada no existe' };
  }

  const actualAmountNum = parseAmount(payData.actualAmount);
  if (isNaN(actualAmountNum) || actualAmountNum <= 0) {
    return { success: false, error: 'Ingresa un monto válido mayor a 0' };
  }

  const roundedAmount = round(actualAmountNum, asset.name);
  if (payingOb.type === 'pay' && roundedAmount > Number(asset.amount)) {
    return { success: false, error: 'Saldo insuficiente en la cuenta seleccionada' };
  }

  const payCurr = asset.name.toUpperCase();
  const payRateSnapshot = rates[payCurr] ?? (['USD', 'USDT', 'USDC'].includes(payCurr) ? 1 : 0);
  const payUsdEquivalent = convert(roundedAmount, payCurr, 'USD', rates);

  const delta = payingOb.type === 'pay' ? sub(0, roundedAmount) : roundedAmount;
  const res = applyBalanceDelta(assets, asset.id, delta);
  if (!res) {
    return { success: false, error: 'Error al actualizar el saldo de la cuenta' };
  }

  // Tasa de cambio usada
  let usedRate = 1;
  const isVesInvolved = (asset.name || '').toUpperCase() === 'VES' || (payingOb?.currency || '').toUpperCase() === 'VES';
  if (isVesInvolved) {
    if (payData.rateType === 'BCV_USD') usedRate = veRates.bcvUsd || rates.VES || 1;
    else if (payData.rateType === 'PARALELO') usedRate = veRates.paralelo || rates.VES || 1;
    else if (payData.rateType === 'EUR') usedRate = veRates.bcvEur || rates.VES || 1;
    else if (payData.rateType === 'CUSTOM') usedRate = parseAmount(payData.customRate) || 1;
    else usedRate = payingOb.currency === 'EUR' ? (veRates.bcvEur || 1) : (veRates.bcvUsd || rates.VES || 1);
  } else if ((asset.name || '').toUpperCase() !== (payingOb?.currency || '').toUpperCase()) {
    const debtRate = rates[payingOb.currency] ?? (['USD', 'USDT', 'USDC'].includes(payingOb.currency) ? 1 : 0);
    const accRate = rates[asset.name] ?? (['USD', 'USDT', 'USDC'].includes(asset.name) ? 1 : 0);
    usedRate = accRate > 0 ? debtRate / accRate : 1;
  }

  const nowIso = new Date().toISOString();
  const tx = {
    id: crypto.randomUUID(),
    type: payingOb.type === 'pay' ? 'spent' : 'income',
    assetId: asset.id,
    currency: asset.name,
    amount: roundedAmount,
    origin: asset.location,
    category: payingOb.category,
    subcategory: payingOb.title,
    rateSnapshot: payRateSnapshot,
    usdEquivalent: payUsdEquivalent,
    rateUsed: usedRate,
    rateType: payData.rateType || null,
    date: nowIso,
    updated_at: nowIso
  };

  const nextPaidCount = (Number(payingOb.paidInstallments) || 0) + 1;
  const totalInst = Number(payingOb.totalInstallments) || 0;
  const isCompleted = totalInst > 0 && nextPaidCount >= totalInst;
  const isStillPending = !isCompleted;

  let nextDueDate = payingOb.dueDate;
  if (isStillPending && payingOb.dueDate && payingOb.frequency !== 'one-time') {
    nextDueDate = getNextDueDate(payingOb.dueDate, payingOb.frequency);
  }

  const updatedOb = {
    ...payingOb,
    paidInstallments: nextPaidCount,
    dueDate: nextDueDate,
    status: isCompleted ? 'paid' : (payingOb.status || 'pending'),
    updated_at: nowIso
  };

  const nextAssets = res.nextAssets;
  const nextTransactions = [tx, ...transactions];
  const nextObligations = obligations.map((o) => (o.id === payingOb.id ? updatedOb : o));

  const syncChanges = [
    { table: 'assets', type: 'upsert', record: res.updatedAsset },
    { table: 'transactions', type: 'upsert', record: tx },
    { table: 'obligations', type: 'upsert', record: updatedOb }
  ];

  return {
    success: true,
    nextAssets,
    nextTransactions,
    nextObligations,
    syncChanges,
    toastMessage: 'Pago registrado exitosamente'
  };
}

/**
 * Función pura para ejecutar el borrado masivo de transacciones seleccionadas y revertir sus saldos.
 *
 * @param {Object} state - { assets, transactions }
 * @param {Array} selectedTxs - Lista de transacciones seleccionadas para borrar
 * @returns {Object} { success, nextAssets, nextTransactions, syncChanges, toastMessage }
 */
export function executeBulkDelete({ assets, transactions }, selectedTxs) {
  if (!selectedTxs || selectedTxs.length === 0) {
    return {
      success: true,
      nextAssets: assets,
      nextTransactions: transactions,
      syncChanges: [],
      toastMessage: 'No hay elementos seleccionados'
    };
  }

  let nextAssets = [...assets];
  const selectedIds = new Set(selectedTxs.map((t) => t.id));
  const processedIds = new Set();
  const deletedTxIds = new Set();
  const syncChanges = [];
  const nowIso = new Date().toISOString();

  selectedTxs.forEach((tx) => {
    if (processedIds.has(tx.id)) return;
    processedIds.add(tx.id);

    if (tx.type === 'transfer') {
      const reversal = calculateTransferReversalDeltas(tx);

      const srcAsset = findAsset(nextAssets, tx.assetId, tx.currency, tx.origin);
      const dstAsset = findAsset(nextAssets, tx.destAssetId, tx.destCurrency, tx.destOrigin);

      if (srcAsset) {
        const resSrc = applyBalanceDelta(nextAssets, srcAsset.id, reversal.sourceRevertDelta);
        if (resSrc) {
          nextAssets = resSrc.nextAssets;
          syncChanges.push({ table: 'assets', type: 'upsert', record: resSrc.updatedAsset });
        }
      }

      if (dstAsset && tx.destAmount) {
        const resDst = applyBalanceDelta(nextAssets, dstAsset.id, reversal.destRevertDelta);
        if (resDst) {
          nextAssets = resDst.nextAssets;
          syncChanges.push({ table: 'assets', type: 'upsert', record: resDst.updatedAsset });
        }
      }

      const linkedTransferTxs = transactions.filter((t) => t.parentTransferId === tx.id);
      linkedTransferTxs.forEach((child) => {
        if (!processedIds.has(child.id)) {
          processedIds.add(child.id);
          deletedTxIds.add(child.id);
          const commAsset = findAsset(nextAssets, child.assetId, child.currency, child.origin);
          if (commAsset) {
            const resComm = applyBalanceDelta(nextAssets, commAsset.id, Number(child.amount) || 0);
            if (resComm) {
              nextAssets = resComm.nextAssets;
              syncChanges.push({ table: 'assets', type: 'upsert', record: resComm.updatedAsset });
            }
          }
          syncChanges.push({
            table: 'transactions',
            type: 'delete',
            record: { id: child.id, deleted_at: nowIso, updated_at: nowIso }
          });
        }
      });
    } else if (tx.type === 'adjustment') {
      const adjAsset = findAsset(nextAssets, tx.assetId, tx.currency, tx.origin);
      if (adjAsset) {
        const deltaApplied = tx.delta != null ? Number(tx.delta) : Number(tx.amount);
        const resAdj = applyBalanceDelta(nextAssets, adjAsset.id, -deltaApplied);
        if (resAdj) {
          nextAssets = resAdj.nextAssets;
          syncChanges.push({ table: 'assets', type: 'upsert', record: resAdj.updatedAsset });
        }
      }
    } else {
      if ((tx.parentTransferId && selectedIds.has(tx.parentTransferId)) || (tx.parentTransactionId && selectedIds.has(tx.parentTransactionId))) {
        deletedTxIds.add(tx.id);
        syncChanges.push({
          table: 'transactions',
          type: 'delete',
          record: { id: tx.id, deleted_at: nowIso, updated_at: nowIso }
        });
        return;
      }

      // Revertir y eliminar movimientos hijos vinculados (ej. IGTF o comisiones asociadas al gasto)
      const linkedChildren = transactions.filter((t) => t.parentTransactionId === tx.id);
      linkedChildren.forEach((child) => {
        if (!processedIds.has(child.id)) {
          processedIds.add(child.id);
          deletedTxIds.add(child.id);
          const childAsset = findAsset(nextAssets, child.assetId, child.currency, child.origin);
          if (childAsset) {
            const childRevertDelta = child.type === 'income' ? -Number(child.amount) : Number(child.amount);
            const resChild = applyBalanceDelta(nextAssets, childAsset.id, childRevertDelta);
            if (resChild) {
              nextAssets = resChild.nextAssets;
              syncChanges.push({ table: 'assets', type: 'upsert', record: resChild.updatedAsset });
            }
          }
          syncChanges.push({
            table: 'transactions',
            type: 'delete',
            record: { id: child.id, deleted_at: nowIso, updated_at: nowIso }
          });
        }
      });

      const reverseDelta = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount);
      const txAsset = findAsset(nextAssets, tx.assetId, tx.currency, tx.origin);
      if (txAsset) {
        const resTx = applyBalanceDelta(nextAssets, txAsset.id, reverseDelta);
        if (resTx) {
          nextAssets = resTx.nextAssets;
          syncChanges.push({ table: 'assets', type: 'upsert', record: resTx.updatedAsset });
        }
      }
    }

    deletedTxIds.add(tx.id);
    syncChanges.push({
      table: 'transactions',
      type: 'delete',
      record: { id: tx.id, deleted_at: nowIso, updated_at: nowIso }
    });
  });

  const nextTransactions = transactions.filter((t) => !deletedTxIds.has(t.id));

  return {
    success: true,
    nextAssets,
    nextTransactions,
    syncChanges,
    toastMessage: 'Eliminado con éxito'
  };
}
