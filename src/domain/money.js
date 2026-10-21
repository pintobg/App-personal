import Big from 'big.js';

// Configure Big.js to prevent scientific notation across standard financial ranges
Big.NE = -12;
Big.PE = 21;

/**
 * Obtiene la cantidad de decimales correspondiente a cada moneda.
 * Decimales por moneda:
 * - VES: 2
 * - USD: 2
 * - EUR: 2
 * - USDT, USDC: 2
 * - BTC: 8
 * - ETH: 8
 * - Otras cripto: 6
 */
export function getDecimals(currency) {
  const curr = (currency || '').toUpperCase().trim();
  if (['VES', 'USD', 'EUR', 'USDT', 'USDC', 'GBP', 'BRL', 'PEN', 'ARS', 'COP', 'MXN', 'CLP'].includes(curr)) {
    return 2;
  }
  if (['BTC', 'ETH'].includes(curr)) {
    return 8;
  }
  // Otras criptomonedas
  return 6;
}

/**
 * Convierte de manera segura cualquier entrada a una instancia de Big.
 */
function toBig(val) {
  if (val instanceof Big) return val;
  if (val == null || val === '') return new Big(0);
  try {
    return new Big(val);
  } catch {
    return new Big(0);
  }
}

/**
 * Suma dos cantidades monetarias con precisión arbitraria.
 */
export function add(a, b) {
  return Number(toBig(a).plus(toBig(b)).toString());
}

/**
 * Resta dos cantidades monetarias con precisión arbitraria.
 */
export function sub(a, b) {
  return Number(toBig(a).minus(toBig(b)).toString());
}

/**
 * Multiplica dos cantidades monetarias con precisión arbitraria.
 */
export function mul(a, b) {
  return Number(toBig(a).times(toBig(b)).toString());
}

/**
 * Divide dos cantidades monetarias con precisión arbitraria.
 * Si el divisor es 0, retorna 0.
 */
export function div(a, b) {
  const divisor = toBig(b);
  if (divisor.eq(0)) return 0;
  return Number(toBig(a).div(divisor).toString());
}

/**
 * Redondea un monto según los decimales de la moneda especificada.
 * Utiliza round-half-up (comportamiento estándar de toFixed en Big.js).
 */
export function round(amount, currency) {
  const decimals = getDecimals(currency);
  const b = toBig(amount);
  return Number(b.toFixed(decimals));
}

/**
 * Convierte un monto entre dos monedas usando el objeto de tasas.
 * Las tasas venezolanas (VES) se guardan como se publican (Bs. por 1 USD).
 * Otras monedas (ej. BTC a 64000, EUR a 1.08) se cotizan en USD por unidad.
 */
export function convert(amount, from, to, rates = {}) {
  const fromCurr = (from || 'USD').toUpperCase().trim();
  const toCurr = (to || 'USD').toUpperCase().trim();
  const bAmount = toBig(amount);

  if (fromCurr === toCurr) {
    return round(bAmount.toString(), toCurr);
  }

  // 1. Convertir desde 'fromCurr' a base USD
  let amountInUsd;
  if (['USD', 'USDT', 'USDC'].includes(fromCurr)) {
    amountInUsd = bAmount;
  } else if (fromCurr === 'VES') {
    // Si se especificó una tasa de referencia elegida ('bcv', 'paralelo', 'custom') o un valor numérico
    let rawVes = null;
    if (rates.referenceType) {
      if (rates.referenceType === 'paralelo') {
        rawVes = rates.paralelo || rates.VES_PARALELO;
      } else if (rates.referenceType === 'custom') {
        rawVes = rates.custom || rates.VES_CUSTOM;
      } else {
        rawVes = rates.bcvUsd || rates.VES;
      }
    }
    if (rawVes == null) {
      rawVes = rates.VES != null ? rates.VES : (rates.bcvUsd != null ? rates.bcvUsd : null);
    }

    if (!rawVes || Number(rawVes) <= 0) {
      return 0;
    }
    let vesRate = toBig(rawVes);
    // Migración preventiva si una tasa vieja en caché vino invertida (< 1)
    if (vesRate.gt(0) && vesRate.lt(1)) {
      vesRate = new Big(1).div(vesRate);
    }
    amountInUsd = vesRate.eq(0) ? new Big(0) : bAmount.div(vesRate);
  } else {
    // Cripto u otras divisas cuyo valor está en USD por unidad
    const rawRate = rates[fromCurr];
    if (rawRate == null || Number(rawRate) <= 0) {
      return 0;
    }
    const rateVal = toBig(rawRate);
    amountInUsd = bAmount.times(rateVal);
  }

  // 2. Convertir desde base USD hacia 'toCurr'
  let targetAmount;
  if (['USD', 'USDT', 'USDC'].includes(toCurr)) {
    targetAmount = amountInUsd;
  } else if (toCurr === 'VES') {
    let rawVes = null;
    if (rates.referenceType) {
      if (rates.referenceType === 'paralelo') {
        rawVes = rates.paralelo || rates.VES_PARALELO;
      } else if (rates.referenceType === 'custom') {
        rawVes = rates.custom || rates.VES_CUSTOM;
      } else {
        rawVes = rates.bcvUsd || rates.VES;
      }
    }
    if (rawVes == null) {
      rawVes = rates.VES != null ? rates.VES : (rates.bcvUsd != null ? rates.bcvUsd : null);
    }

    if (!rawVes || Number(rawVes) <= 0) {
      return 0;
    }
    let vesRate = toBig(rawVes);
    if (vesRate.gt(0) && vesRate.lt(1)) {
      vesRate = new Big(1).div(vesRate);
    }
    targetAmount = amountInUsd.times(vesRate);
  } else {
    const rawRate = rates[toCurr];
    if (rawRate == null || Number(rawRate) <= 0) {
      return 0;
    }
    const rateVal = toBig(rawRate);
    targetAmount = rateVal.eq(0) ? new Big(0) : amountInUsd.div(rateVal);
  }

  return round(targetAmount.toString(), toCurr);
}

/**
 * Parsea cadenas de texto con montos en distintos formatos numéricos:
 * - Formato venezolano/europeo: "1.234,56"
 * - Formato compacto con coma: "1234,56"
 * - Formato estándar con punto: "1234.56"
 * Retorna un número válido o null si no es un número válido.
 */
export function parseAmount(input) {
  if (input == null) return null;
  if (typeof input === 'number') return isNaN(input) ? null : input;

  let str = String(input).trim();
  if (!str) return null;

  // Si contiene caracteres que no sean dígitos, puntos, comas, espacios o signos
  if (/[^\d.,\s+-]/.test(str)) return null;

  str = str.replace(/\s+/g, '');
  if (!str || str === '-' || str === '+' || str === '.' || str === ',') return null;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Formato venezolano: 1.234.567,89 -> remover puntos y cambiar coma a punto
      const intPart = str.slice(0, lastComma);
      const decPart = str.slice(lastComma + 1);
      const dotParts = intPart.split('.');
      for (let i = 1; i < dotParts.length; i++) {
        if (dotParts[i].length !== 3) return null;
      }
      str = dotParts.join('') + '.' + decPart;
    } else {
      // Formato US: 1,234,567.89 -> remover comas
      const intPart = str.slice(0, lastDot);
      const decPart = str.slice(lastDot + 1);
      const commaParts = intPart.split(',');
      for (let i = 1; i < commaParts.length; i++) {
        if (commaParts[i].length !== 3) return null;
      }
      str = commaParts.join('') + '.' + decPart;
    }
  } else if (hasComma) {
    // Solo coma: "1234,56" o "0,1"
    const parts = str.split(',');
    if (parts.length === 2) {
      str = parts[0] + '.' + parts[1];
    } else {
      // Múltiples comas (ej. 1,000,000)
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].length !== 3) return null;
      }
      str = parts.join('');
    }
  } else if (hasDot) {
    // Solo punto: "1234.56" o "1.234.567"
    const parts = str.split('.');
    if (parts.length === 2) {
      str = parts[0] + '.' + parts[1];
    } else {
      // Múltiples puntos -> deben ser separadores de miles con 3 dígitos cada bloque
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].length !== 3) return null;
      }
      str = parts.join('');
    }
  }

  const num = Number(str);
  return isNaN(num) ? null : num;
}

/**
 * Convierte montos específicamente para el pago de obligaciones (deudas/cobros).
 * Reglas:
 * 1. Si son la misma moneda, el monto no cambia.
 * 2. Si un lado es VES, usa la tasa venezolana elegida (BCV USD, BCV EUR, paralelo o personalizada).
 *    Si la deuda es en EUR y no se eligió tasa, usa BCV EUR por defecto.
 * 3. Si ninguno es VES, convierte con las tasas en USD: monto × tasa[deuda] / tasa[cuenta].
 */
export function convertForPayment(monto, monedaDeuda, monedaCuenta, tasas = {}, tasaVenezolanaElegida = null) {
  const parsedAmount = parseAmount(monto);
  if (parsedAmount === null || parsedAmount <= 0) return 0;

  const deudaCurr = (monedaDeuda || 'USD').trim().toUpperCase();
  const cuentaCurr = (monedaCuenta || 'USD').trim().toUpperCase();
  const bAmount = toBig(parsedAmount);

  // 1. Si son la misma moneda, no cambia
  if (deudaCurr === cuentaCurr) {
    return round(bAmount.toString(), cuentaCurr);
  }

  const isDeudaVes = deudaCurr === 'VES';
  const isCuentaVes = cuentaCurr === 'VES';

  // 2. Si un lado es VES
  if (isDeudaVes || isCuentaVes) {
    let veRateNum = Number(tasaVenezolanaElegida);
    if (!veRateNum || isNaN(veRateNum) || veRateNum <= 0) {
      if (deudaCurr === 'EUR' || cuentaCurr === 'EUR') {
        veRateNum = Number(tasas.bcvEur || tasas.EUR_BCV || tasas.EUR || tasas.VES || 1);
      } else {
        veRateNum = Number(tasas.bcvUsd || tasas.VES || 1);
      }
    }
    const bVeRate = toBig(veRateNum);

    if (isCuentaVes) {
      // Pagar en VES una deuda en moneda extranjera
      let result;
      if (['USD', 'USDT', 'USDC'].includes(deudaCurr)) {
        result = bAmount.times(bVeRate);
      } else if (deudaCurr === 'EUR') {
        result = bAmount.times(bVeRate);
      } else {
        // Otra divisa extranjera (ej. BTC, COP)
        const debtRateInUsd = toBig(tasas[deudaCurr] || 1);
        const amountInUsd = bAmount.times(debtRateInUsd);
        result = amountInUsd.times(bVeRate);
      }
      return round(result.toString(), 'VES');
    } else {
      // Deuda en VES pagada desde cuenta extranjera
      let result;
      if (['USD', 'USDT', 'USDC'].includes(cuentaCurr)) {
        result = bVeRate.gt(0) ? bAmount.div(bVeRate) : new Big(0);
      } else if (cuentaCurr === 'EUR') {
        result = bVeRate.gt(0) ? bAmount.div(bVeRate) : new Big(0);
      } else {
        const accRateInUsd = toBig(tasas[cuentaCurr] || 1);
        const inUsd = bVeRate.gt(0) ? bAmount.div(bVeRate) : new Big(0);
        result = accRateInUsd.gt(0) ? inUsd.div(accRateInUsd) : new Big(0);
      }
      return round(result.toString(), cuentaCurr);
    }
  }

  // 3. Ninguno es VES: monto × tasa[deuda] / tasa[cuenta]
  const getRateInUsd = (curr) => {
    if (['USD', 'USDT', 'USDC'].includes(curr)) return new Big(1);
    const val = Number(tasas[curr]);
    return val && val > 0 ? toBig(val) : new Big(1);
  };

  const debtRateUsd = getRateInUsd(deudaCurr);
  const accRateUsd = getRateInUsd(cuentaCurr);

  const amountInUsd = bAmount.times(debtRateUsd);
  const result = accRateUsd.gt(0) ? amountInUsd.div(accRateUsd) : new Big(0);

  return round(result.toString(), cuentaCurr);
}
