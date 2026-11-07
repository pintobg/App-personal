import { convertForPayment, convert, round, add } from './money';
import { getCurrencySymbol, formatAmount } from '../utils/formatters';

export function isObligationCompleted(ob) {
  if (!ob) return false;
  return ob.status === 'paid' || (Boolean(ob.totalInstallments) && Number(ob.paidInstallments) >= Number(ob.totalInstallments));
}

export function getIndexedBsInfo(ob, rates = {}, veRates = {}) {
  if (!ob || !ob.payInBs || (ob.currency || '').toUpperCase() === 'VES') return null;

  const chosenRate = ob.indexRateType || ((ob.currency || '').toUpperCase() === 'EUR' ? 'BCV_EUR' : 'BCV_USD');
  let activeRate = null;
  let label = 'BCV hoy';

  if (chosenRate === 'PARALELO') {
    activeRate = veRates?.paralelo;
    label = 'Paralelo hoy';
  } else if (chosenRate === 'BCV_EUR' || chosenRate === 'EUR') {
    activeRate = veRates?.bcvEur || veRates?.bcvUsd;
    label = 'BCV EUR hoy';
  } else {
    activeRate = veRates?.bcvUsd || rates?.bcvUsd || rates?.VES;
    label = 'BCV hoy';
  }

  if (!activeRate || activeRate <= 0) return null;

  const bsAmount = convertForPayment(
    ob.amount,
    ob.currency,
    'VES',
    { ...rates, ...veRates },
    activeRate
  );

  if (bsAmount == null) return null;

  return {
    bsAmount,
    label,
    text: `${getCurrencySymbol(ob.currency)}${formatAmount(ob.amount, ob.currency)} = Bs. ${formatAmount(bsAmount, 'VES')} (${label})`
  };
}

/**
 * Desglose de una deuda o cobro.
 * El modelo guarda `amount` como el monto de cada pago/cuota, `totalInstallments`
 * (opcional, vacío = recurrente indefinido) y `paidInstallments`.
 *
 * @returns {{
 *   perPayment: number, totalInstallments: number|null, paidInstallments: number,
 *   remainingInstallments: number|null, paidAmount: number, remainingAmount: number,
 *   totalAmount: number|null, isOpenEnded: boolean, progress: number|null,
 *   purchaseTotal: number|null, downPayment: number
 * }}
 */
export function getObligationBreakdown(ob) {
  const perPayment = Math.max(0, Number(ob?.amount) || 0);
  const totalRaw = parseInt(ob?.totalInstallments, 10);
  const totalInstallments = Number.isFinite(totalRaw) && totalRaw > 0
    ? totalRaw
    : (ob?.frequency === 'one-time' ? 1 : null);
  const paidRaw = Math.max(0, parseInt(ob?.paidInstallments, 10) || 0);
  const completed = isObligationCompleted(ob);
  const paidInstallments = totalInstallments ? Math.min(paidRaw, totalInstallments) : paidRaw;
  const currency = ob?.currency || 'USD';

  const purchaseTotalNum = Number(ob?.totalPurchaseAmount);
  const purchaseTotal = ob?.isInstallmentPurchase && purchaseTotalNum > 0 ? round(purchaseTotalNum, currency) : null;
  const downPayment = ob?.isInstallmentPurchase ? Math.max(0, Number(ob?.downPayment) || 0) : 0;

  if (totalInstallments) {
    const remainingInstallments = completed ? 0 : Math.max(0, totalInstallments - paidInstallments);
    return {
      perPayment,
      totalInstallments,
      paidInstallments: completed ? totalInstallments : paidInstallments,
      remainingInstallments,
      paidAmount: round(perPayment * (completed ? totalInstallments : paidInstallments), currency),
      remainingAmount: round(perPayment * remainingInstallments, currency),
      totalAmount: round(perPayment * totalInstallments, currency),
      isOpenEnded: false,
      progress: totalInstallments > 0 ? (totalInstallments - remainingInstallments) / totalInstallments : null,
      purchaseTotal,
      downPayment
    };
  }

  // Recurrente sin número de cuotas: lo que se debe ahora es el próximo pago.
  return {
    perPayment,
    totalInstallments: null,
    paidInstallments,
    remainingInstallments: null,
    paidAmount: round(perPayment * paidInstallments, currency),
    remainingAmount: completed ? 0 : perPayment,
    totalAmount: null,
    isOpenEnded: true,
    progress: null,
    purchaseTotal,
    downPayment
  };
}

/**
 * Totales de todas las deudas (por pagar) y cobros (por cobrar) pendientes.
 * Agrupa por moneda y da un equivalente en USD con las tasas actuales.
 */
export function summarizeObligations(obligations = [], rates = {}) {
  const empty = () => ({ count: 0, usd: 0, byCurrency: {}, openEnded: 0, nextPaymentsUsd: 0 });
  const result = { pay: empty(), receive: empty() };

  (obligations || []).forEach(ob => {
    if (!ob || isObligationCompleted(ob)) return;
    const bucket = ob.type === 'receive' ? result.receive : (ob.type === 'pay' ? result.pay : null);
    if (!bucket) return;
    const b = getObligationBreakdown(ob);
    const curr = (ob.currency || 'USD').toUpperCase();
    bucket.count += 1;
    if (b.isOpenEnded) bucket.openEnded += 1;
    bucket.byCurrency[curr] = add(bucket.byCurrency[curr] || 0, b.remainingAmount);
    bucket.usd = add(bucket.usd, convert(b.remainingAmount, curr, 'USD', rates));
    bucket.nextPaymentsUsd = add(bucket.nextPaymentsUsd, convert(b.perPayment, curr, 'USD', rates));
  });

  return result;
}
