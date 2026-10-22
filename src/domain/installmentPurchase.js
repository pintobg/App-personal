import { sub, round, parseAmount } from './money';

export const DEFAULT_INSTALLMENTS = 4;

/**
 * Calcula las cuotas de una compra a plazos (estilo Cashea).
 *
 * @param {Object} params
 * @param {number|string} params.totalAmount - Monto total de la compra
 * @param {number|string} [params.downPayment=0] - Monto pagado como inicial
 * @param {number|string} [params.installmentsCount=DEFAULT_INSTALLMENTS] - Número de cuotas en las que se divide el saldo
 * @param {string} [params.currency='USD'] - Moneda de la operación
 * @returns {Object} { total, initial, remaining, installmentsCount, installmentAmount, lastInstallmentAmount, hasDifferentLast }
 */
export function calculateInstallmentPlan({
  totalAmount,
  downPayment = 0,
  installmentsCount = DEFAULT_INSTALLMENTS,
  currency = 'USD'
}) {
  const parsedTotal = typeof totalAmount === 'number' ? totalAmount : parseAmount(totalAmount);
  const parsedInitial = typeof downPayment === 'number' ? downPayment : parseAmount(downPayment);
  const count = parseInt(installmentsCount, 10);

  if (isNaN(count) || count <= 0) {
    throw new Error('El número de cuotas debe ser mayor a 0');
  }

  const validTotal = parsedTotal !== null && !isNaN(parsedTotal) ? Math.max(0, parsedTotal) : 0;
  const validInitial = parsedInitial !== null && !isNaN(parsedInitial) ? Math.max(0, parsedInitial) : 0;

  if (validInitial > validTotal) {
    throw new Error('La inicial no puede ser mayor que el total');
  }

  const remaining = Math.max(0, sub(validTotal, validInitial));
  const baseInstallment = round(remaining / count, currency);

  let lastInstallmentAmount = baseInstallment;
  if (count > 1) {
    const sumOthers = round(baseInstallment * (count - 1), currency);
    lastInstallmentAmount = round(sub(remaining, sumOthers), currency);
  } else {
    lastInstallmentAmount = remaining;
  }

  const hasDifferentLast = count > 1 && lastInstallmentAmount !== baseInstallment;

  return {
    total: round(validTotal, currency),
    initial: round(validInitial, currency),
    remaining: round(remaining, currency),
    installmentsCount: count,
    installmentAmount: baseInstallment,
    lastInstallmentAmount,
    hasDifferentLast
  };
}
