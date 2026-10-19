import { useState, useEffect, useCallback } from 'react';

const CACHED_RATES_KEY = 'finanzas_cached_rates';

export const FALLBACK_RATES = {
  USD: 1,
  USDT: 1,
  USDC: 1,
  FDUSD: 1,
  DAI: 1,
  VES: 1 / 742,
  EUR: 1.08,
  GBP: 1.27,
  BTC: 64000,
  ETH: 2600,
  BNB: 580,
  SOL: 150,
  XRP: 0.55,
  ADA: 0.40,
  DOGE: 0.12,
  TRX: 0.15,
  TON: 5.0,
  AVAX: 25,
  DOT: 4.5,
  LINK: 12,
  MATIC: 0.40,
  POL: 0.40,
  ZEC: 35.5,
  LTC: 80,
  DASH: 25
};

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

const DEFAULT_BINANCE_CRYPTOS = [
  'USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE',
  'ADA', 'TRX', 'TON', 'AVAX', 'DOT', 'LINK', 'POL', 'LTC',
  'ZEC', 'DASH', 'DAI', 'FDUSD', 'UNI', 'ATOM', 'NEAR', 'SUI', 'PEPE', 'SHIB'
];

export function useRates(assets = []) {
  const [rates, setRates] = useState(() => {
    try {
      const saved = localStorage.getItem(CACHED_RATES_KEY);
      if (saved) {
        return { ...FALLBACK_RATES, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore storage error
    }
    return FALLBACK_RATES;
  });

  const [binanceSymbols, setBinanceSymbols] = useState(DEFAULT_BINANCE_CRYPTOS);
  const [loading, setLoading] = useState(true);

  const fetchRates = useCallback(async () => {
    try {
      const newRates = { USD: 1, USDT: 1, USDC: 1 };

      // 1. Fetch BCV (VES)
      try {
        const bcvRes = await fetch('https://rates.dolarvzla.com/bcv/current.json');
        if (bcvRes.ok) {
          const bcvData = await bcvRes.json();
          const bcvPrice = bcvData?.current?.usd;
          if (bcvPrice && Number(bcvPrice) > 0) {
            newRates.VES = 1 / Number(bcvPrice);
          }
        }
        if (!newRates.VES) {
          const backupBcv = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
          if (backupBcv.ok) {
            const backupData = await backupBcv.json();
            if (backupData?.promedio > 0) {
              newRates.VES = 1 / Number(backupData.promedio);
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch BCV rate, using fallback', e);
      }

      // 2. Fetch Fiat Exchange Rates (for EUR, COP, BRL, ARS, MXN, GBP, etc.)
      try {
        const fiatRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (fiatRes.ok) {
          const fiatData = await fiatRes.json();
          if (fiatData?.rates) {
            Object.entries(fiatData.rates).forEach(([code, perUsd]) => {
              if (code !== 'VES' && code !== 'USD' && Number(perUsd) > 0) {
                newRates[code] = 1 / Number(perUsd);
              }
            });
          }
        }
      } catch {
        // Ignore fiat fallback error
      }

      // 3. Fetch Full Binance Public Ticker List (all *USDT and USDT* pairs)
      try {
        const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price');
        if (binanceRes.ok) {
          const binanceData = await binanceRes.json();
          const validCryptoSet = new Set(['USDT', 'USDC']);

          // First pass: inverse pairs like USDTBRL, USDTARS, USDTCOP
          binanceData.forEach(ticker => {
            const sym = ticker.symbol;
            const price = Number(ticker.price);
            if (!price || price <= 0) return;

            if (sym.startsWith('USDT') && sym.length > 4) {
              const target = sym.slice(4);
              if (target !== 'VES') {
                newRates[target] = 1 / price;
                validCryptoSet.add(target);
              }
            }
          });

          // Second pass: direct *USDT pairs (BTCUSDT, USDCUSDT, ETHUSDT, EURUSDT, etc.)
          binanceData.forEach(ticker => {
            const sym = ticker.symbol;
            const price = Number(ticker.price);
            if (!price || price <= 0) return;

            if (sym.endsWith('USDT') && sym.length > 4) {
              const base = sym.slice(0, -4);
              // Exclude leveraged tokens like BTCUP/BTCDOWN
              if (!base.endsWith('UP') && !base.endsWith('DOWN') && !base.endsWith('BULL') && !base.endsWith('BEAR')) {
                newRates[base] = price;
                validCryptoSet.add(base);
              }
            }
          });

          // Sort popular cryptos first, then alphabetical
          const popularOrder = DEFAULT_BINANCE_CRYPTOS;
          const sortedSymbols = Array.from(validCryptoSet).sort((a, b) => {
            const idxA = popularOrder.indexOf(a);
            const idxB = popularOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
          });
          setBinanceSymbols(sortedSymbols);
        }
      } catch (e) {
        console.error('Failed to fetch Binance full ticker list, trying individual symbols', e);
      }

      // 4. Ensure any user-registered asset currency not yet in newRates is queried individually on Binance
      const assetCurrencies = Array.from(
        new Set((assets || []).map(a => (a?.name || '').trim().toUpperCase()).filter(Boolean))
      );
      for (const sym of assetCurrencies) {
        if (!newRates[sym] && sym !== 'USD' && sym !== 'USDT' && sym !== 'VES') {
          try {
            const singleRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(sym)}USDT`);
            if (singleRes.ok) {
              const singleData = await singleRes.json();
              if (Number(singleData?.price) > 0) {
                newRates[sym] = Number(singleData.price);
              }
            }
          } catch {
            // Ignore single symbol error
          }
        }
      }

      setRates(prev => {
        const merged = { ...FALLBACK_RATES, ...prev, ...newRates };
        try {
          localStorage.setItem(CACHED_RATES_KEY, JSON.stringify(merged));
        } catch {
          // Ignore storage error
        }
        return merged;
      });
      setLoading(false);
    } catch (err) {
      console.error('Master rate fetch error', err);
      setLoading(false);
    }
  }, [assets]);

  useEffect(() => {
    fetchRates();
    const intervalId = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchRates]);

  return {
    rates,
    setRates,
    loading,
    binanceSymbols,
    knownFiatCurrencies: KNOWN_FIAT_CURRENCIES,
    refreshRates: fetchRates
  };
}
