import { sub, round } from './money';

/**
 * Calcula las cuotas de una compra a plazos (estilo Cashea).
 *
 * @param {Object} params
 * @param {number|string} params.totalAmount - Monto total de la compra
 * @param {number|string} params.downPayment - Monto pagado como inicial
 * @param {number|string} params.installmentsCount - Número de cuotas en las que se divide el saldo
 * @param {string} [params.currency='USD'] - Moneda de la operación
 * @returns {Object} { total, initial, remaining, installmentsCount, installmentAmount }
 */
export function calculateInstallmentPlan({
  totalAmount,
  downPayment = 0,
  installmentsCount = 3,
  currency = 'USD'
}) {
  const total = Number(totalAmount) || 0;
  const initial = Number(downPayment) || 0;
  const count = parseInt(installmentsCount, 10) || 1;

  if (count <= 0) {
    throw new Error('El número de cuotas debe ser mayor a 0');
  }

  const remaining = Math.max(0, sub(total, initial));
  const installmentAmount = round(remaining / count, currency);

  return {
    total: round(total, currency),
    initial: round(initial, currency),
    remaining: round(remaining, currency),
    installmentsCount: count,
    installmentAmount
  };
}
