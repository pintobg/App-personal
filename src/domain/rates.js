import Big from 'big.js';
import { toLocalDateString, todayLocal } from '../utils/dates';
import { formatAmount } from '../utils/formatters';

/**
 * Calcula la brecha cambiaria porcentual entre la tasa paralela y la oficial (BCV):
 * Fórmula: ((paralelo - bcv) / bcv) * 100
 *
 * @param {number|string} paralelo - Valor del dólar paralelo
 * @param {number|string} bcv - Valor del dólar oficial BCV
 * @returns {number} Porcentaje de brecha (redondeado a 2 decimales) o 0 si datos no válidos.
 */
export function calculateExchangeGap(paralelo, bcv) {
  const p = Number(paralelo);
  const b = Number(bcv);
  if (!p || !b || isNaN(p) || isNaN(b) || b <= 0) return 0;

  try {
    const bigP = new Big(p);
    const bigB = new Big(b);
    const gap = bigP.minus(bigB).div(bigB).times(100);
    return Number(gap.toFixed(2));
  } catch {
    return 0;
  }
}

/**
 * Calcula la tasa efectiva de una transferencia entre dos monedas distintas.
 * Considera la comisión aplicada sobre la cuenta de origen:
 * - Monto neto enviado = monto debitado + comisión
 * - Tasa efectiva = monto recibido / monto neto enviado (o monto enviado / monto recibido según corresponda)
 * Convención en Venezuela / Divisas:
 * - Si una moneda es VES y la otra es extranjera (USD/USDT/USDC/EUR), la tasa siempre se expresa en Bs/Divisa
 * - En pares cruzados crypto/fiat, se calcula la relación de cambio directa.
 *
 * @param {Object} params
 * @param {string} params.fromCurrency - Moneda debitada (ej. 'USDT', 'USD')
 * @param {number|string} params.fromAmount - Monto debitado
 * @param {string} params.toCurrency - Moneda recibida (ej. 'VES')
 * @param {number|string} params.toAmount - Monto recibido
 * @param {number|string} [params.commission=0] - Comisión pagada en la moneda de origen
 * @param {Object} [ratesSnapshot={}] - { bcvUsd, paralelo }
 * @returns {Object|null} Información de la tasa efectiva o null si no aplica
 */
export function calculateEffectiveExchangeRate({
  fromCurrency,
  fromAmount,
  toCurrency,
  toAmount,
  commission = 0,
  ratesSnapshot = {}
}) {
  const fromCurr = (fromCurrency || '').trim().toUpperCase();
  const toCurr = (toCurrency || '').trim().toUpperCase();

  if (!fromCurr || !toCurr || fromCurr === toCurr) {
    return null;
  }

  const baseFrom = Number(fromAmount);
  const baseTo = Number(toAmount);
  const comm = Number(commission) || 0;

  if (isNaN(baseFrom) || baseFrom <= 0 || isNaN(baseTo) || baseTo <= 0) {
    return null;
  }

  const totalFrom = baseFrom + comm;

  // Caso 1: Venta de divisas por Bolívares (de USD/USDT a VES)
  // Tasa = Bs recibidos / Total divisa entregada
  if (toCurr === 'VES') {
    const rate = baseTo / totalFrom;
    const roundedRate = Number(rate.toFixed(2));
    const bcv = Number(ratesSnapshot.bcvUsd || ratesSnapshot.bcv || 0);
    const paralelo = Number(ratesSnapshot.paralelo || 0);

    const bcvDiffPct = bcv > 0 ? Number((((rate - bcv) / bcv) * 100).toFixed(2)) : null;
    const paraleloDiffPct = paralelo > 0 ? Number((((rate - paralelo) / paralelo) * 100).toFixed(2)) : null;

    return {
      rate: roundedRate,
      rawRate: rate,
      pair: `${toCurr}/${fromCurr}`, // Bs/USD
      unitText: `Bs./${fromCurr}`,
      bcvDiffPct,
      paraleloDiffPct,
      type: 'sell_foreign'
    };
  }

  // Caso 2: Compra de divisas con Bolívares (de VES a USD/USDT)
  // Tasa = Total Bs entregados / Divisa recibida
  if (fromCurr === 'VES') {
    const rate = totalFrom / baseTo;
    const roundedRate = Number(rate.toFixed(2));
    const bcv = Number(ratesSnapshot.bcvUsd || ratesSnapshot.bcv || 0);
    const paralelo = Number(ratesSnapshot.paralelo || 0);

    const bcvDiffPct = bcv > 0 ? Number((((rate - bcv) / bcv) * 100).toFixed(2)) : null;
    const paraleloDiffPct = paralelo > 0 ? Number((((rate - paralelo) / paralelo) * 100).toFixed(2)) : null;

    return {
      rate: roundedRate,
      rawRate: rate,
      pair: `VES/${toCurr}`, // Bs/USD
      unitText: `Bs./${toCurr}`,
      bcvDiffPct,
      paraleloDiffPct,
      type: 'buy_foreign'
    };
  }

  // Caso 3: Intercambio entre dos divisas extranjeras (ej. USDT a BTC o EUR a USD)
  const rate = baseTo / totalFrom;
  return {
    rate: Number(rate.toFixed(4)),
    rawRate: rate,
    pair: `${toCurr}/${fromCurr}`,
    unitText: `${toCurr}/${fromCurr}`,
    bcvDiffPct: null,
    paraleloDiffPct: null,
    type: 'cross_currency'
  };
}

/**
 * Resuelve la tasa de cambio histórica sugerida para una fecha dada.
 * Si existe tasa para ese día en el historial, la utiliza.
 * Si no, busca la tasa más cercana anterior.
 * Si no hay fecha anterior en el historial, recurre a la más antigua disponible o a rates actuales.
 *
 * @param {Object} params
 * @param {string|Date} params.date - Fecha elegida
 * @param {string} params.fromCurrency - Moneda origen (ej. 'USD', 'VES')
 * @param {string} params.toCurrency - Moneda destino (ej. 'VES', 'USD')
 * @param {Object} [params.rates={}] - Tasas actuales de fallback
 * @param {Array} [params.rateHistory=[]] - Historial de tasas [{ date, bcvUsd, bcvEur, paralelo }]
 * @returns {Object|null} { rate, dateUsed, isExact, message, fromCurrency, toCurrency }
 */
export function resolveHistoricalRate({
  date,
  fromCurrency,
  toCurrency,
  rates = {},
  rateHistory = []
}) {
  const from = (fromCurrency || '').trim().toUpperCase();
  const to = (toCurrency || '').trim().toUpperCase();

  if (!from || !to || from === to) return null;

  const targetDateStr = date
    ? (typeof date === 'string' ? date.split('T')[0] : toLocalDateString(date))
    : todayLocal();

  // Buscar en rateHistory (ordenado cronológicamente por date)
  let matchedEntry = null;
  let isExact = false;

  if (Array.isArray(rateHistory) && rateHistory.length > 0) {
    for (let i = 0; i < rateHistory.length; i++) {
      const entry = rateHistory[i];
      const entryDate = (entry.date || '').split('T')[0];
      if (entryDate === targetDateStr) {
        matchedEntry = entry;
        isExact = true;
        break;
      }
      if (entryDate < targetDateStr) {
        matchedEntry = entry;
      } else {
        break;
      }
    }

    if (!matchedEntry && rateHistory.length > 0) {
      matchedEntry = rateHistory[0];
      isExact = false;
    }
  }

  const foreignCurr = from === 'VES' ? to : from;
  let baseRate = null;
  let dateUsed = matchedEntry ? (matchedEntry.date || '').split('T')[0] : 'actual';

  if (matchedEntry) {
    if (foreignCurr === 'EUR') {
      baseRate = matchedEntry.bcvEur || (matchedEntry.bcvUsd ? matchedEntry.bcvUsd * 1.08 : null);
    } else {
      baseRate = matchedEntry.bcvUsd || matchedEntry.paralelo;
    }
  }

  if (!baseRate || isNaN(baseRate) || baseRate <= 0) {
    dateUsed = 'actual';
    isExact = false;
    if (foreignCurr === 'EUR') {
      baseRate = rates.EUR_VES || rates.bcvEur || (rates.VES ? (rates.EUR ? rates.VES / rates.EUR : rates.VES) : null);
    } else {
      baseRate = rates.bcvUsd || rates.VES || rates.USD;
    }
  }

  if (!baseRate || isNaN(baseRate) || baseRate <= 0) {
    return null;
  }

  baseRate = Number(baseRate);

  let message = '';
  if (dateUsed === 'actual') {
    message = `Tasa sugerida actual (no hay historial para ${targetDateStr}): ${formatAmount(baseRate, 'VES')} Bs./$`;
  } else if (isExact) {
    message = `Tasa del día (${dateUsed}): ${formatAmount(baseRate, 'VES')} Bs./$`;
  } else {
    message = `Tasa del ${dateUsed} (más cercana anterior a ${targetDateStr}): ${formatAmount(baseRate, 'VES')} Bs./$`;
  }

  return {
    rate: baseRate,
    dateUsed,
    isExact,
    message,
    fromCurrency: from,
    toCurrency: to
  };
}
