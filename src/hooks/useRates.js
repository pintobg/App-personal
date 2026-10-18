import { useState, useEffect } from 'react';

const FALLBACK_RATES = {
  USD: 1,
  USDT: 1,
  VES: 1 / 742,
  ZEC: 35.5,
  BTC: 64000,
  LTC: 80,
  DASH: 25,
  EUR: 1.08
};

export function useRates() {
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchRates() {
      try {
        const newRates = { USD: 1, USDT: 1 };
        
        // 1. Fetch BCV (VES)
        try {
          const bcvRes = await fetch('https://rates.dolarvzla.com/bcv/current.json');
          if (bcvRes.ok) {
            const bcvData = await bcvRes.json();
            const bcvPrice = bcvData?.current?.usd;
            if (bcvPrice) {
              newRates.VES = 1 / Number(bcvPrice);
            } else {
              newRates.VES = FALLBACK_RATES.VES;
            }
          } else {
            newRates.VES = FALLBACK_RATES.VES;
          }
        } catch (e) {
          console.error('Failed to fetch BCV rate, using fallback', e);
          newRates.VES = FALLBACK_RATES.VES;
        }

        // 2. Fetch Binance Cryptos & EUR
        try {
          const symbols = '["BTCUSDT","ZECUSDT","LTCUSDT","DASHUSDT","EURUSDT"]';
          const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(symbols)}`);
          if (binanceRes.ok) {
            const binanceData = await binanceRes.json();
            binanceData.forEach(ticker => {
              const symbol = ticker.symbol.replace('USDT', '');
              newRates[symbol] = Number(ticker.price);
            });
          } else {
            ['BTC', 'ZEC', 'LTC', 'DASH', 'EUR'].forEach(sym => { newRates[sym] = FALLBACK_RATES[sym]; });
          }
        } catch (e) {
          console.error('Failed to fetch Binance rates, using fallback', e);
          ['BTC', 'ZEC', 'LTC', 'DASH', 'EUR'].forEach(sym => { newRates[sym] = FALLBACK_RATES[sym]; });
        }

        if (isMounted) {
          setRates(newRates);
          setLoading(false);
        }
      } catch (err) {
        console.error('Master rate fetch error', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRates();
    // Poll every 5 minutes
    const intervalId = setInterval(fetchRates, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return { rates, setRates, loading };
}
