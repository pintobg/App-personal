import Big from 'big.js';

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
