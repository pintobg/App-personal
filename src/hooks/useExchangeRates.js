import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BASE_STABLE_RATES,
  KNOWN_FIAT_CURRENCIES,
  DEFAULT_BINANCE_CRYPTOS,
  fetchAllExchangeRates,
  loadCachedRatesData,
  saveCachedRatesData,
  CUSTOM_RATE_KEY,
  RATE_REFERENCE_KEY,
  loadRateHistoryFromCache,
  fetchRateHistory
} from '../services/ratesService';
import { checkAndNotifyBcvChange } from '../services/notificationService';

export function useExchangeRates(assets = []) {
  // Carga inicial desde caché si existe
  const initialCache = useMemo(() => loadCachedRatesData(), []);

  const [referenceRate, setReferenceRateState] = useState(() => {
    try {
      return localStorage.getItem(RATE_REFERENCE_KEY) || 'bcv';
    } catch {
      return 'bcv';
    }
  });

  const [rateHistory, setRateHistory] = useState(() => loadRateHistoryFromCache());

  const [rates, setRates] = useState(() => ({
    ...BASE_STABLE_RATES,
    ...initialCache.cachedRates
  }));

  const [ratesDetails, setRatesDetails] = useState(() => ({
    bcvUsd: initialCache.cachedDetails?.bcvUsd || {
      valor: initialCache.cachedRates?.VES || null,
      fuente: 'cache',
      fechaConsulta: null,
      fechaValor: null
    },
    bcvEur: initialCache.cachedDetails?.bcvEur || {
      valor: null,
      fuente: null,
      fechaConsulta: null,
      fechaValor: null
    },
    paralelo: initialCache.cachedDetails?.paralelo || {
      valor: null,
      fuente: null,
      fechaConsulta: null,
      fechaValor: null
    },
    custom: {
      valor: initialCache.customRate || null,
      fuente: 'custom',
      fechaConsulta: null,
      fechaValor: null
    },
    ...(initialCache.cachedDetails || {})
  }));

  const [customRate, setCustomRateState] = useState(initialCache.customRate || 0);
  const [binanceSymbols, setBinanceSymbols] = useState(DEFAULT_BINANCE_CRYPTOS);
  const [loading, setLoading] = useState(true);
  const [isFetchingRates, setIsFetchingRates] = useState(false);

  // Lista ordenada de símbolos únicos de activos para no disparar fetches con cambios de balance
  const assetSymbolsString = useMemo(() => {
    if (!assets || !Array.isArray(assets)) return '';
    return Array.from(
      new Set(assets.map(a => (a?.name || '').trim().toUpperCase()).filter(Boolean))
    ).sort().join(',');
  }, [assets]);

  const assetSymbolsList = useMemo(() => {
    return assetSymbolsString ? assetSymbolsString.split(',') : [];
  }, [assetSymbolsString]);

  // Ref con la tasa personalizada actual
  const customRateRef = useRef(customRate);
  useEffect(() => {
    customRateRef.current = customRate;
  }, [customRate]);

  // Función principal de actualización de tasas
  const fetchRates = useCallback(async (options = { silent: false }) => {
    if (!options.silent) {
      setIsFetchingRates(true);
    }
    try {
      const { rates: newRates, details: newDetails, binanceSymbols: newBinanceSymbols } =
        await fetchAllExchangeRates(assetSymbolsList, customRateRef.current);

      setRates(prev => {
        const merged = { ...prev, ...newRates };
        return merged;
      });

      setRatesDetails(prev => {
        const merged = { ...prev, ...newDetails };
        // Mantener la tasa personalizada
        if (customRateRef.current > 0) {
          merged.custom = {
            valor: customRateRef.current,
            fuente: 'custom',
            fechaConsulta: new Date().toISOString(),
            fechaValor: null
          };
        }
        return merged;
      });

      if (newBinanceSymbols && newBinanceSymbols.length > 0) {
        setBinanceSymbols(newBinanceSymbols);
      }

      // Guardar en caché persistente
      setRates(currentRates => {
        setRatesDetails(currentDetails => {
          saveCachedRatesData(currentRates, currentDetails, customRateRef.current);

          // Verificar si aplica alerta de variación BCV
          const bcvVal = currentDetails.bcvUsd?.valor;
          if (bcvVal && Number(bcvVal) > 0) {
            const history = loadRateHistoryFromCache();
            if (Array.isArray(history) && history.length >= 2) {
              const prevItem = history[history.length - 2];
              if (prevItem && prevItem.bcvUsd) {
                checkAndNotifyBcvChange({
                  currentBcv: Number(bcvVal),
                  previousBcv: Number(prevItem.bcvUsd)
                });
              }
            }
          }

          return currentDetails;
        });
        return currentRates;
      });
    } catch (err) {
      console.error('[useExchangeRates] Error al actualizar tasas:', err);
    } finally {
      setLoading(false);
      setIsFetchingRates(false);
    }
  }, [assetSymbolsList]);

  // Guardar ref de fetchRates para el timer de 5 minutos
  const fetchRatesRef = useRef(fetchRates);
  useEffect(() => {
    fetchRatesRef.current = fetchRates;
  }, [fetchRates]);

  // Montar timer periódico de 5 minutos sin reiniciarse por cambios de saldo
  useEffect(() => {
    fetchRatesRef.current({ silent: false });

    const intervalId = setInterval(() => {
      fetchRatesRef.current({ silent: true });
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []); // Solo se monta una vez

  // Si cambia la lista de monedas de los activos (se agrega una nueva moneda), consultar sus tasas
  const prevSymbolsRef = useRef(assetSymbolsString);
  useEffect(() => {
    if (prevSymbolsRef.current !== assetSymbolsString) {
      prevSymbolsRef.current = assetSymbolsString;
      fetchRatesRef.current({ silent: true });
    }
  }, [assetSymbolsString]);

  // Permitir al usuario cambiar su tasa personalizada
  const setCustomRate = useCallback((newVal) => {
    const num = Number(newVal) || 0;
    setCustomRateState(num);
    try {
      localStorage.setItem(CUSTOM_RATE_KEY, String(num));
    } catch {
      // Ignorar error
    }
    setRatesDetails(prev => ({
      ...prev,
      custom: {
        valor: num > 0 ? num : null,
        fuente: 'custom',
        fechaConsulta: new Date().toISOString(),
        fechaValor: null
      }
    }));
  }, []);

  // Cambiar la tasa de referencia global (bcv, paralelo, custom)
  const setReferenceRate = useCallback((newRef) => {
    const valid = ['bcv', 'paralelo', 'custom'].includes(newRef) ? newRef : 'bcv';
    setReferenceRateState(valid);
    try {
      localStorage.setItem(RATE_REFERENCE_KEY, valid);
    } catch {
      // Ignorar error de cuota
    }
  }, []);

  // Carga y sincronización del histórico de 30/180 días
  const refreshRateHistory = useCallback(async () => {
    try {
      const history = await fetchRateHistory({
        bcvUsd: ratesDetails.bcvUsd?.valor,
        bcvEur: ratesDetails.bcvEur?.valor,
        paralelo: ratesDetails.paralelo?.valor
      });
      if (Array.isArray(history) && history.length > 0) {
        setRateHistory(history);
      }
    } catch (e) {
      console.warn('[useExchangeRates] Fallo al refrescar historial:', e);
    }
  }, [ratesDetails.bcvUsd?.valor, ratesDetails.bcvEur?.valor, ratesDetails.paralelo?.valor]);

  // Consultar histórico al iniciar si la caché está vacía
  useEffect(() => {
    if (!rateHistory || rateHistory.length === 0) {
      refreshRateHistory();
    }
  }, []);

  // Objeto estructurado veRates para compatibilidad con calculadora y modales
  const veRates = useMemo(() => {
    const fechaConsulta =
      ratesDetails.bcvUsd?.fechaConsulta ||
      ratesDetails.paralelo?.fechaConsulta ||
      ratesDetails.bcvEur?.fechaConsulta ||
      null;
    const fechaValor =
      ratesDetails.bcvUsd?.fechaValor ||
      ratesDetails.paralelo?.fechaValor ||
      null;

    return {
      bcvUsd: ratesDetails.bcvUsd?.valor || null,
      bcvEur: ratesDetails.bcvEur?.valor || null,
      paralelo: ratesDetails.paralelo?.valor || null,
      custom: customRate > 0 ? customRate : (ratesDetails.custom?.valor || 0),
      fechaConsulta,
      fechaValor,
      lastUpdated: fechaConsulta || fechaValor,
      details: ratesDetails
    };
  }, [ratesDetails, customRate]);

  // Tasas enriquecidas con la tasa de referencia activa
  const computedRates = useMemo(() => {
    const bcvVal = ratesDetails.bcvUsd?.valor || rates.bcvUsd || rates.VES;
    const parVal = ratesDetails.paralelo?.valor || rates.paralelo;
    const custVal = customRate > 0 ? customRate : (ratesDetails.custom?.valor || rates.custom);

    let activeVes = bcvVal;
    if (referenceRate === 'paralelo' && parVal) {
      activeVes = parVal;
    } else if (referenceRate === 'custom' && custVal) {
      activeVes = custVal;
    }

    return {
      ...rates,
      referenceType: referenceRate,
      VES: activeVes,
      bcvUsd: bcvVal,
      paralelo: parVal,
      custom: custVal
    };
  }, [rates, ratesDetails, customRate, referenceRate]);

  return {
    rates: computedRates,
    rawRates: rates,
    setRates,
    ratesDetails,
    veRates,
    referenceRate,
    setReferenceRate,
    rateHistory,
    refreshRateHistory,
    loading,
    isFetchingRates,
    binanceSymbols,
    knownFiatCurrencies: KNOWN_FIAT_CURRENCIES,
    refreshRates: fetchRates,
    setCustomRate
  };
}
