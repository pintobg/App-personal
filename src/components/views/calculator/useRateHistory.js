import { useState, useCallback } from 'react';

const HISTORY_CACHE_KEY = 'veRates_history_v1';

export function useRateHistory(veRates) {
  const [rateHistory, setRateHistory] = useState(() => {
    try {
      const cached = localStorage.getItem(HISTORY_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
          return parsed.items;
        }
      }
    } catch {
      // Ignore cache read errors
    }
    return [];
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyCurrency, setHistoryCurrency] = useState('bcvUsd');
  const [historyRange, setHistoryRange] = useState(30);

  const fetchRateHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const [resUsd, resEur, resPar] = await Promise.allSettled([
        fetch('https://ve.dolarapi.com/v1/historicos/dolares/oficial'),
        fetch('https://ve.dolarapi.com/v1/historicos/euros/oficial'),
        fetch('https://ve.dolarapi.com/v1/historicos/dolares/paralelo')
      ]);

      const byDate = new Map();
      const ensureDate = (fecha) => {
        if (!byDate.has(fecha)) {
          byDate.set(fecha, { date: fecha, bcvUsd: null, bcvEur: null, paralelo: null });
        }
        return byDate.get(fecha);
      };

      if (resUsd.status === 'fulfilled' && resUsd.value.ok) {
        const list = await resUsd.value.json();
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item?.fecha && Number(item?.promedio) > 0) {
              ensureDate(item.fecha).bcvUsd = Number(Number(item.promedio).toFixed(4));
            }
          });
        }
      }

      if (resEur.status === 'fulfilled' && resEur.value.ok) {
        const list = await resEur.value.json();
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item?.fecha && Number(item?.promedio) > 0) {
              ensureDate(item.fecha).bcvEur = Number(Number(item.promedio).toFixed(4));
            }
          });
        }
      }

      if (resPar.status === 'fulfilled' && resPar.value.ok) {
        const list = await resPar.value.json();
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item?.fecha && Number(item?.promedio) > 0) {
              ensureDate(item.fecha).paralelo = Number(Number(item.promedio).toFixed(4));
            }
          });
        }
      }

      const sortedDates = Array.from(byDate.keys()).sort();
      if (sortedDates.length > 0) {
        let lastUsd = veRates?.bcvUsd || 0;
        let lastEur = veRates?.bcvEur || 0;
        let lastPar = veRates?.paralelo || 0;

        const merged = sortedDates.map(d => {
          const row = byDate.get(d);
          if (row.bcvUsd) lastUsd = row.bcvUsd;
          if (row.bcvEur) lastEur = row.bcvEur;
          if (row.paralelo) lastPar = row.paralelo;
          const u = row.bcvUsd || lastUsd;
          const e = row.bcvEur || lastEur;
          const avg = (u > 0 && e > 0) ? Number(((u + e) / 2).toFixed(4)) : (u || e || null);
          return {
            date: d,
            bcvUsd: u,
            bcvEur: e,
            avgBcv: avg,
            paralelo: row.paralelo || lastPar
          };
        });

        setRateHistory(merged);
        try {
          localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify({
            items: merged,
            savedAt: Date.now()
          }));
        } catch {
          // Ignore cache write errors
        }
      }
    } catch (err) {
      console.warn('Error fetching historical rates:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [veRates]);

  return {
    rateHistory,
    isLoadingHistory,
    historyCurrency,
    setHistoryCurrency,
    historyRange,
    setHistoryRange,
    fetchRateHistory
  };
}
