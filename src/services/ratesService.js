/**
 * ratesService.js
 * Servicio unificado de tasas de cambio para toda la aplicación.
 * Fuentes:
 * - BCV USD y BCV EUR: rates.dolarvzla.com (fallback: ve.dolarapi.com oficial)
 * - Paralelo: ve.dolarapi.com paralelo
 * - Fiat internacionales: open.er-api.com
 * - Criptomonedas: Binance Public Ticker API
 */

export const CACHED_RATES_KEY = 'finanzas_cached_rates';
export const CACHED_RATES_DETAILS_KEY = 'finanzas_cached_rates_details';
export const CUSTOM_RATE_KEY = 'finanzas_custom_rate';

export const KNOWN_FIAT_CURRENCIES = [
  { code: 'VES', name: 'Bolívar Venezolano (Bs.)' },
  { code: 'USD', name: 'Dólar Estadounidense ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'COP', name: 'Peso Colombiano' },
  { code: 'ARS', name: 'Peso Argentino' },
  { code: 'BRL', name: 'Real Brasileño (R$)' },
  { code: 'MXN', name: 'Peso Mexicano' },
  { code: 'CLP', name: 'Peso Chileno' },
  { code: 'PEN', name: 'Sol Peruano (S/)' },
  { code: 'GBP', name: 'Libra Esterlina (£)' },
  { code: 'CAD', name: 'Dólar Canadiense (C$)' },
  { code: 'CHF', name: 'Franco Suizo (CHF)' },
  { code: 'UYU', name: 'Peso Uruguayo' },
  { code: 'DOP', name: 'Peso Dominicano' },
  { code: 'CRC', name: 'Colón Costarricense' },
  { code: 'PAB', name: 'Balboa Panameño' },
  { code: 'BOB', name: 'Boliviano' },
  { code: 'PYG', name: 'Guaraní Paraguayo' },
  { code: 'JPY', name: 'Yen Japonés (¥)' },
  { code: 'CNY', name: 'Yuan Chino (¥)' }
];

export const DEFAULT_BINANCE_CRYPTOS = [
  'USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE',
  'ADA', 'TRX', 'TON', 'AVAX', 'DOT', 'LINK', 'POL', 'LTC',
  'ZEC', 'DASH', 'DAI', 'FDUSD', 'UNI', 'ATOM', 'NEAR', 'SUI', 'PEPE', 'SHIB'
];

// Tasas que por definición valen 1 USD siempre
export const BASE_STABLE_RATES = {
  USD: 1,
  USDT: 1,
  USDC: 1,
  FDUSD: 1,
  DAI: 1
};

/**
 * Consulta la tasa oficial de BCV (USD y EUR).
 * Intenta primero dolarvzla y luego dolarapi como respaldo.
 */
export async function fetchBcvRates() {
  const now = new Date().toISOString();
  let bcvUsd = null;
  let bcvEur = null;
  let fuente = null;
  let fechaValor = null;

  // 1. Intentar rates.dolarvzla.com
  try {
    const res = await fetch('https://rates.dolarvzla.com/bcv/current.json');
    if (res.ok) {
      const data = await res.json();
      const usdVal = data?.current?.usd;
      const eurVal = data?.current?.eur;
      if (usdVal && Number(usdVal) > 0) {
        bcvUsd = Number(usdVal);
        fuente = 'dolarvzla';
        fechaValor = data?.current?.date || data?.date || now;
      }
      if (eurVal && Number(eurVal) > 0) {
        bcvEur = Number(eurVal);
      }
    }
  } catch (err) {
    console.warn('[ratesService] Falló dolarvzla, intentando dolarapi...', err);
  }

  // 2. Fallbacks con ve.dolarapi.com si hace falta USD o EUR
  if (!bcvUsd) {
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (res.ok) {
        const data = await res.json();
        if (data?.promedio && Number(data.promedio) > 0) {
          bcvUsd = Number(data.promedio);
          fuente = 'dolarapi';
          fechaValor = data.fechaActualizacion || now;
        }
      }
    } catch (err) {
      console.warn('[ratesService] Falló dolarapi oficial USD', err);
    }
  }

  if (!bcvEur) {
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/euros/oficial');
      if (res.ok) {
        const data = await res.json();
        if (data?.promedio && Number(data.promedio) > 0) {
          bcvEur = Number(data.promedio);
          if (!fechaValor) fechaValor = data.fechaActualizacion || now;
        }
      }
    } catch (err) {
      console.warn('[ratesService] Falló dolarapi oficial EUR', err);
    }
  }

  return {
    bcvUsd: {
      valor: bcvUsd,
      fuente: bcvUsd ? fuente || 'dolarapi' : null,
      fechaConsulta: now,
      fechaValor: bcvUsd ? fechaValor : null
    },
    bcvEur: {
      valor: bcvEur,
      fuente: bcvEur ? (fuente || 'dolarapi') : null,
      fechaConsulta: now,
      fechaValor: bcvEur ? fechaValor : null
    }
  };
}

/**
 * Consulta la tasa del dólar paralelo en ve.dolarapi.com
 */
export async function fetchParaleloRate() {
  const now = new Date().toISOString();
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo');
    if (res.ok) {
      const data = await res.json();
      if (data?.promedio && Number(data.promedio) > 0) {
        return {
          valor: Number(data.promedio),
          fuente: 'dolarapi',
          fechaConsulta: now,
          fechaValor: data.fechaActualizacion || now
        };
      }
    }
  } catch (err) {
    console.warn('[ratesService] Falló dolarapi paralelo', err);
  }

  return {
    valor: null,
    fuente: null,
    fechaConsulta: now,
    fechaValor: null
  };
}

/**
 * Consulta tasas de cambio fiat internacionales desde open.er-api.com
 */
export async function fetchFiatRates() {
  const now = new Date().toISOString();
  const result = {};

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      const dateVal = data?.time_last_update_utc || now;
      if (data?.rates) {
        Object.entries(data.rates).forEach(([code, perUsd]) => {
          const numPerUsd = Number(perUsd);
          if (code !== 'USD' && code !== 'VES' && numPerUsd > 0) {
            // Guardamos valor en USD por unidad de esa moneda (1 / perUsd)
            result[code] = {
              valor: 1 / numPerUsd,
              fuente: 'open.er-api.com',
              fechaConsulta: now,
              fechaValor: dateVal
            };
          }
        });
      }
    }
  } catch (err) {
    console.warn('[ratesService] Falló open.er-api.com', err);
  }

  return result;
}

/**
 * Consulta tasas y símbolos cripto de Binance.
 * Reglas:
 * 1. Los pares USDT* (USDTARS, USDTCOP, USDTBRL) NO deben sobrescribir las tasas oficiales de open.er-api.
 * 2. Excluir tokens apalancados solo si existen como pareja UP/DOWN o BULL/BEAR (ej. BTCUP/BTCDOWN),
 *    sin descartar monedas reales que terminan en UP como JUP.
 */
export async function fetchBinanceRates(assetSymbols = [], officialFiatCodes = new Set()) {
  const now = new Date().toISOString();
  const cryptoRates = {};
  const validCryptoSet = new Set(['USDT', 'USDC']);

  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price');
    if (res.ok) {
      const data = await res.json();
      if (!Array.isArray(data)) return { cryptoRates, binanceSymbols: DEFAULT_BINANCE_CRYPTOS };

      // Recolectar todos los pares directos terminados en USDT
      const usdtDirectTickers = [];
      const allBases = new Set();

      data.forEach(ticker => {
        const sym = ticker.symbol;
        if (sym.endsWith('USDT') && sym.length > 4) {
          const base = sym.slice(0, -4);
          usdtDirectTickers.push({ base, price: Number(ticker.price) });
          allBases.add(base);
        }
      });

      // Primer paso: procesar pares directos terminados en USDT
      usdtDirectTickers.forEach(({ base, price }) => {
        if (!price || price <= 0) return;

        // Detección precisa de tokens apalancados verificando existencia de pareja contraria
        let isLeveraged = false;
        if (base.endsWith('UP')) {
          const root = base.slice(0, -2);
          if (allBases.has(root + 'DOWN')) isLeveraged = true;
        } else if (base.endsWith('DOWN')) {
          const root = base.slice(0, -4);
          if (allBases.has(root + 'UP')) isLeveraged = true;
        } else if (base.endsWith('BULL')) {
          const root = base.slice(0, -4);
          if (allBases.has(root + 'BEAR')) isLeveraged = true;
        } else if (base.endsWith('BEAR')) {
          const root = base.slice(0, -4);
          if (allBases.has(root + 'BULL')) isLeveraged = true;
        }

        if (!isLeveraged) {
          cryptoRates[base] = {
            valor: price,
            fuente: 'binance',
            fechaConsulta: now,
            fechaValor: now
          };
          validCryptoSet.add(base);
        }
      });

      // Segundo paso: pares inversos USDT* (ej. USDTBRL, USDTARS, USDTCOP)
      // Solo se agregan si NO existen en las tasas oficiales de open.er-api
      data.forEach(ticker => {
        const sym = ticker.symbol;
        const price = Number(ticker.price);
        if (!price || price <= 0) return;

        if (sym.startsWith('USDT') && sym.length > 4) {
          const target = sym.slice(4);
          if (target !== 'VES' && !officialFiatCodes.has(target) && !cryptoRates[target]) {
            cryptoRates[target] = {
              valor: 1 / price,
              fuente: 'binance',
              fechaConsulta: now,
              fechaValor: now
            };
            validCryptoSet.add(target);
          }
        }
      });

      // Ordenar símbolos para el selector de criptomonedas
      const popularOrder = DEFAULT_BINANCE_CRYPTOS;
      const sortedSymbols = Array.from(validCryptoSet).sort((a, b) => {
        const idxA = popularOrder.indexOf(a);
        const idxB = popularOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      // Buscar monedas de assets que aún no se hayan obtenido
      for (const sym of assetSymbols) {
        if (!cryptoRates[sym] && sym !== 'USD' && sym !== 'USDT' && sym !== 'VES') {
          try {
            const singleRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(sym)}USDT`);
            if (singleRes.ok) {
              const singleData = await singleRes.json();
              if (Number(singleData?.price) > 0) {
                cryptoRates[sym] = {
                  valor: Number(singleData.price),
                  fuente: 'binance',
                  fechaConsulta: now,
                  fechaValor: now
                };
              }
            }
          } catch {
            // Ignorar fallo de símbolo individual
          }
        }
      }

      return { cryptoRates, binanceSymbols: sortedSymbols };
    }
  } catch (err) {
    console.warn('[ratesService] Falló Binance tickers', err);
  }

  return { cryptoRates, binanceSymbols: DEFAULT_BINANCE_CRYPTOS };
}

/**
 * Carga tasas y detalles previamente cacheados de localStorage.
 */
export function loadCachedRatesData() {
  let cachedRates = {};
  let cachedDetails = {};

  try {
    const rawRates = localStorage.getItem(CACHED_RATES_KEY);
    if (rawRates) {
      cachedRates = JSON.parse(rawRates);
      // Migración si VES en caché era < 1
      if (cachedRates.VES && Number(cachedRates.VES) > 0 && Number(cachedRates.VES) < 1) {
        cachedRates.VES = Number((1 / Number(cachedRates.VES)).toFixed(2));
      }
    }
  } catch {
    // Ignorar error de storage
  }

  try {
    const rawDetails = localStorage.getItem(CACHED_RATES_DETAILS_KEY);
    if (rawDetails) {
      cachedDetails = JSON.parse(rawDetails);
    }
  } catch {
    // Ignorar error de storage
  }

  // Tasa personalizada guardada
  let customRate = 0;
  try {
    const rawCustom = localStorage.getItem(CUSTOM_RATE_KEY);
    if (rawCustom) {
      const num = Number(rawCustom);
      if (!isNaN(num) && num > 0) customRate = num;
    }
  } catch {
    // Ignorar error de storage
  }

  return { cachedRates, cachedDetails, customRate };
}

/**
 * Guarda en localStorage los datos consolidados de tasas.
 */
export function saveCachedRatesData(ratesMap, detailsMap, customRateVal) {
  try {
    localStorage.setItem(CACHED_RATES_KEY, JSON.stringify(ratesMap));
  } catch (e) {
    console.error('Error guardando cached rates', e);
  }

  try {
    localStorage.setItem(CACHED_RATES_DETAILS_KEY, JSON.stringify(detailsMap));
  } catch (e) {
    console.error('Error guardando cached details', e);
  }

  if (customRateVal !== undefined) {
    try {
      localStorage.setItem(CUSTOM_RATE_KEY, String(customRateVal));
    } catch (e) {
      console.error('Error guardando custom rate', e);
    }
  }
}

/**
 * Descarga y consolida todas las tasas de cambio de las diferentes fuentes.
 */
export async function fetchAllExchangeRates(assetSymbols = [], currentCustomRate = 0) {
  // Ejecutar llamadas en paralelo
  const [bcvResult, paraleloResult, fiatResult] = await Promise.all([
    fetchBcvRates(),
    fetchParaleloRate(),
    fetchFiatRates()
  ]);

  const officialFiatCodes = new Set([
    ...KNOWN_FIAT_CURRENCIES.map(f => f.code),
    ...Object.keys(fiatResult)
  ]);

  const { cryptoRates, binanceSymbols } = await fetchBinanceRates(assetSymbols, officialFiatCodes);

  // Consolidar detalles
  const details = {
    bcvUsd: bcvResult.bcvUsd,
    bcvEur: bcvResult.bcvEur,
    paralelo: paraleloResult,
    custom: {
      valor: currentCustomRate || null,
      fuente: 'custom',
      fechaConsulta: new Date().toISOString(),
      fechaValor: null
    },
    ...fiatResult,
    ...cryptoRates
  };

  // Consolidar mapa plano numérico de tasas para convert() y cálculos
  const rates = {
    ...BASE_STABLE_RATES
  };

  if (bcvResult.bcvUsd?.valor) {
    rates.VES = bcvResult.bcvUsd.valor;
  }

  // Agregar fiats
  Object.entries(fiatResult).forEach(([sym, info]) => {
    if (info?.valor) rates[sym] = info.valor;
  });

  // Agregar cryptos
  Object.entries(cryptoRates).forEach(([sym, info]) => {
    if (info?.valor) rates[sym] = info.valor;
  });

  return { rates, details, binanceSymbols };
}

/**
 * Determina el estado de frescura y texto para una referencia de tasa.
 * - Si valor no existe o es <= 0: { hasRate: false, isStale: false, label: 'Sin tasa' }
 * - Si tiene más de 24 horas: { hasRate: true, isStale: true, label: `Tasa del ${fecha}` }
 * - Si es reciente: { hasRate: true, isStale: false, label: `Actualizado: ${hora}` }
 */
export function getRateStatus(rateInfo) {
  if (!rateInfo || !rateInfo.valor || Number(rateInfo.valor) <= 0) {
    return {
      hasRate: false,
      isStale: false,
      label: 'Sin tasa',
      sublabel: 'Conéctate a internet o ingresa una tasa manual'
    };
  }

  const rawDate = rateInfo.fechaValor || rateInfo.fechaConsulta;
  if (!rawDate) {
    return {
      hasRate: true,
      isStale: false,
      label: 'Actualizado'
    };
  }

  const dateObj = new Date(rawDate);
  const isValidDate = !isNaN(dateObj.getTime());
  if (!isValidDate) {
    return {
      hasRate: true,
      isStale: false,
      label: 'Actualizado'
    };
  }

  const msDiff = Date.now() - dateObj.getTime();
  const isStale = msDiff > 24 * 60 * 60 * 1000;

  if (isStale) {
    const formattedDate = dateObj.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return {
      hasRate: true,
      isStale: true,
      label: `Tasa del ${formattedDate}`
    };
  }

  const formattedTime = dateObj.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    hasRate: true,
    isStale: false,
    label: `Actualizado: ${formattedTime}`
  };
}
