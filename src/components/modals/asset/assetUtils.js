export const PRESET_FIAT = ['VES', 'USD', 'EUR'];
export const PRESET_CRYPTO = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL', 'BNB', 'ZEC', 'LTC'];

export function formatPreviewRate(sym, rates = {}) {
  const r = rates[sym];
  if (!r || r <= 0) return null;
  if (sym === 'VES') return `Bs. ${(r < 1 ? 1 / r : r).toFixed(2)} / $`;
  if (sym === 'USD') return '$1.00';
  const maxDec = r < 0.01 ? 6 : r < 1 ? 4 : 2;
  return `$${r.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: maxDec })}`;
}

export function getSimilarSymbols(input, candidates = [], maxResults = 5) {
  const clean = (input || '').trim().toUpperCase();
  if (!clean) return [];

  const scored = [];
  for (const cand of candidates) {
    const c = cand.toUpperCase();
    if (c === clean) continue;

    let score = 0;
    if (c.startsWith(clean) || clean.startsWith(c)) score += 5;
    if (c.includes(clean) || clean.includes(c)) score += 3;

    // Character set overlap (catches transpositions like USCD -> USDC)
    const cleanChars = clean.split('');
    const candChars = c.split('');
    const common = cleanChars.filter(ch => candChars.includes(ch)).length;
    const lenDiff = Math.abs(clean.length - c.length);
    if (lenDiff <= 2 && common >= Math.max(2, clean.length - 1)) {
      score += 4 - lenDiff;
    }

    if (score > 0) {
      scored.push({ symbol: c, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.symbol);
}

export async function validateAndFetchCurrency({
  symbol,
  type,
  knownFiatCurrencies = [],
  binanceSymbols = [],
  rates = {},
  setRates
}) {
  const sym = (symbol || '').trim().toUpperCase();
  if (!sym) {
    return { ok: false, error: 'Por favor ingresa o selecciona el código de la moneda.', suggestions: [] };
  }

  if (type === 'fiat') {
    const isKnownFiat = knownFiatCurrencies.some(f => f.code === sym);
    if (isKnownFiat || sym === 'VES' || sym === 'USD' || sym === 'EUR') {
      return { ok: true, symbol: sym };
    }

    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        if (data?.rates?.[sym] && Number(data.rates[sym]) > 0) {
          const usdRate = 1 / Number(data.rates[sym]);
          if (setRates) {
            setRates(prev => ({ ...prev, [sym]: usdRate }));
          }
          return { ok: true, symbol: sym };
        }
      }
    } catch {
      // Fallback
    }

    const fiatCodes = knownFiatCurrencies.map(f => f.code);
    const suggestions = getSimilarSymbols(sym, fiatCodes);
    return {
      ok: false,
      symbol: sym,
      suggestions,
      error: `La moneda fiat "${sym}" no existe o está mal escrita. Verifica el código oficial (ej. VES, USD, EUR, COP, BRL) o selecciónala del listado.`
    };
  }

  if (sym === 'USDT') {
    if (setRates) setRates(prev => ({ ...prev, USDT: 1 }));
    return { ok: true, symbol: sym };
  }

  try {
    const directRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(sym)}USDT`);
    if (directRes.ok) {
      const data = await directRes.json();
      const price = Number(data?.price);
      if (price > 0) {
        if (setRates) {
          setRates(prev => ({ ...prev, [sym]: price }));
        }
        return { ok: true, symbol: sym };
      }
    }

    const inverseRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=USDT${encodeURIComponent(sym)}`);
    if (inverseRes.ok) {
      const invData = await inverseRes.json();
      const invPrice = Number(invData?.price);
      if (invPrice > 0) {
        const computedRate = 1 / invPrice;
        if (setRates) {
          setRates(prev => ({ ...prev, [sym]: computedRate }));
        }
        return { ok: true, symbol: sym };
      }
    }

    const suggestions = getSimilarSymbols(sym, binanceSymbols);
    return {
      ok: false,
      symbol: sym,
      suggestions,
      error: `La criptomoneda "${sym}" no fue encontrada en Binance o está mal escrita. Por favor verifica el símbolo o selecciónala del listado.`
    };
  } catch {
    if (rates[sym] && rates[sym] > 0) {
      return { ok: true, symbol: sym };
    }
    return {
      ok: false,
      symbol: sym,
      suggestions: [],
      error: 'No se pudo conectar con la API pública de Binance para verificar la moneda. Verifica tu conexión.'
    };
  }
}
