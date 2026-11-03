import { convertForPayment } from './money';
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
