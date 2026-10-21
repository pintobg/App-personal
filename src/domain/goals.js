import { add, sub, convert, round } from './money';
import { parseLocalDate, toLocalDateString } from '../utils/dates';

/**
 * Calcula el progreso de una meta de ahorro sumando los balances
 * de las cuentas asociadas y calculando cuánto ahorrar por mes.
 *
 * @param {Object} goal - { targetAmount, currency, deadline, accountIds }
 * @param {Array} assets - Lista de activos/cuentas del usuario
 * @param {Object} rates - Tasas de cambio
 * @param {Date} [currentDate] - Fecha actual para cálculo de tiempo restante
 * @returns {Object} { currentSaved, progressPercent, remainingAmount, monthsRemaining, monthlySavingsNeeded }
 */
export function calculateGoalProgress(goal, assets = [], rates = {}, currentDate = new Date()) {
  const targetCurrency = (goal.currency || 'USD').toUpperCase();
  const targetAmount = Number(goal.targetAmount) || 0;
  const selectedAccountIds = Array.isArray(goal.accountIds) ? goal.accountIds : [];

  // Filtrar cuentas asignadas a la meta
  const selectedAssets = assets.filter(a => selectedAccountIds.includes(a.id));

  // Sumar saldos de las cuentas seleccionadas convertidos a la moneda de la meta
  let currentSaved = 0;
  selectedAssets.forEach(asset => {
    const assetAmt = Number(asset.amount) || 0;
    if (assetAmt > 0) {
      const convertedAmt = convert(assetAmt, asset.name, targetCurrency, rates);
      currentSaved = add(currentSaved, convertedAmt);
    }
  });

  currentSaved = round(currentSaved, targetCurrency);
  const progressPercent = targetAmount > 0
    ? Math.min(100, Number(((currentSaved / targetAmount) * 100).toFixed(1)))
    : 0;

  const remainingAmount = targetAmount > currentSaved
    ? round(sub(targetAmount, currentSaved), targetCurrency)
    : 0;

  // Cálculo de meses restantes hasta la fecha límite
  let monthsRemaining = null;
  if (goal.deadline) {
    const [yearStr, monthStr, dayStr] = goal.deadline.split('-');
    const targetYear = parseInt(yearStr, 10);
    const targetMonth = parseInt(monthStr, 10) - 1;
    const targetDay = parseInt(dayStr || '1', 10);

    const curYear = currentDate.getFullYear();
    const curMonth = currentDate.getMonth();

    const diff = (targetYear - curYear) * 12 + (targetMonth - curMonth);
    const targetDateObj = new Date(targetYear, targetMonth, targetDay, 23, 59, 59);

    if (targetDateObj < currentDate && diff <= 0) {
      monthsRemaining = 0;
    } else {
      monthsRemaining = Math.max(1, diff);
    }
  }

  // Cuánto ahorrar por mes
  let monthlySavingsNeeded = 0;
  if (remainingAmount > 0) {
    if (monthsRemaining != null && monthsRemaining > 0) {
      monthlySavingsNeeded = round(remainingAmount / monthsRemaining, targetCurrency);
    } else {
      monthlySavingsNeeded = remainingAmount;
    }
  }

  return {
    currentSaved,
    progressPercent,
    remainingAmount,
    monthsRemaining,
    monthlySavingsNeeded
  };
}

/**
 * Calcula el impacto de la inflación y pérdida de poder adquisitivo
 * en los ingresos recibidos en Bolívares (VES) durante el mes en curso.
 * Compara lo que valían en USD cuando se recibieron (con su rateSnapshot)
 * frente a lo que valen hoy a la tasa actual.
 *
 * @param {Array} transactions - Historial de transacciones
 * @param {Object} rates - Tasas de cambio actuales
 * @param {Date} [currentDate] - Fecha de referencia (por defecto hoy)
 * @returns {Object}
 */
export function calculatePurchasingPower(transactions = [], rates = {}, currentDate = new Date()) {
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

  // Filtrar ingresos en VES del mes
  const vesIncomes = transactions.filter(tx => {
    if (tx.type !== 'income') return false;
    if ((tx.currency || '').toUpperCase() !== 'VES') return false;
    const d = parseLocalDate(toLocalDateString(tx.date));
    return d >= startOfMonth && d <= endOfMonth;
  });

  if (vesIncomes.length === 0) {
    return {
      hasData: false,
      count: 0,
      totalBs: 0,
      totalUsdWhenReceived: 0,
      usdToday: 0,
      diffUsd: 0,
      percentChange: 0,
      lossPercent: 0
    };
  }

  let totalBs = 0;
  let totalUsdWhenReceived = 0;

  vesIncomes.forEach(tx => {
    const amountBs = Number(tx.amount) || 0;
    totalBs = add(totalBs, amountBs);

    let usdVal = 0;
    if (tx.usdEquivalent != null && Number(tx.usdEquivalent) > 0) {
      usdVal = Number(tx.usdEquivalent);
    } else if (tx.rateSnapshot != null && Number(tx.rateSnapshot) > 0) {
      usdVal = convert(amountBs, 'VES', 'USD', { VES: Number(tx.rateSnapshot) });
    } else {
      usdVal = convert(amountBs, 'VES', 'USD', rates);
    }
    totalUsdWhenReceived = add(totalUsdWhenReceived, usdVal);
  });

  totalBs = round(totalBs, 'VES');
  totalUsdWhenReceived = round(totalUsdWhenReceived, 'USD');

  // Lo que valen hoy esos mismos Bs.
  const usdToday = round(convert(totalBs, 'VES', 'USD', rates), 'USD');

  // Diferencia
  const diffUsd = round(sub(usdToday, totalUsdWhenReceived), 'USD');
  const percentChange = totalUsdWhenReceived > 0
    ? Number((((usdToday - totalUsdWhenReceived) / totalUsdWhenReceived) * 100).toFixed(2))
    : 0;

  const lossPercent = percentChange < 0 ? Math.abs(percentChange) : 0;

  return {
    hasData: true,
    count: vesIncomes.length,
    totalBs,
    totalUsdWhenReceived,
    usdToday,
    diffUsd,
    percentChange,
    lossPercent
  };
}
