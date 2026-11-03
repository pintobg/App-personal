import { add, sub, convert, round } from './money';

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
