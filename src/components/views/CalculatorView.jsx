import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import CalculatorHeader from './calculator/CalculatorHeader';
import CalculatorCards from './calculator/CalculatorCards';
import { useRateHistory } from './calculator/useRateHistory';
import ExchangeGapBar from './calculator/ExchangeGapBar';
import MyExchangesView from './calculator/MyExchangesView';
import ReferenceRateSelector from '../common/ReferenceRateSelector';
import { InfoHint, SegmentedControl } from '../ui';
import { calculateExchangeGapData } from '../../domain/dashboard';

const RateHistoryChart = lazy(() => import('./calculator/RateHistoryChart'));
import {
  getIsoDateOffset,
  formatShortDate,
  formatFullDate
} from './calculator/calculatorUtils';
import { todayLocal } from '../../utils/dates';

export default function CalculatorView({
  calcBaseCurrency,
  setCalcBaseCurrency,
  calcBaseAmount,
  setCalcBaseAmount,
  veRates,
  ratesDetails,
  setVeRates,
  fetchVeRates,
  isFetchingRates,
  showToast,
  onOpenSettings,
  referenceRate,
  setReferenceRate,
  transactions
}) {
  const [section, setSection] = useState('calculadora');
  const hasAutoFetchedRef = useRef(false);
  const calculatorTopRef = useRef(null);

  // Modo de tasa en la calculadora: 'current' (Hoy) | 'historical' (Fecha anterior)
  const [rateMode, setRateMode] = useState('current');
  const [selectedDate, setSelectedDate] = useState(() => getIsoDateOffset(-1));

  const {
    rateHistory,
    isLoadingHistory,
    historyCurrency,
    setHistoryCurrency,
    historyRange,
    setHistoryRange,
    fetchRateHistory
  } = useRateHistory(veRates);

  useEffect(() => {
    if (hasAutoFetchedRef.current) return;
    const tenMinutesMs = 10 * 60 * 1000;
    const lastCheck = veRates?.fechaConsulta || veRates?.lastUpdated;
    const shouldFetch =
      !lastCheck ||
      (Date.now() - new Date(lastCheck).getTime() > tenMinutesMs);

    hasAutoFetchedRef.current = true;
    if (shouldFetch && typeof fetchVeRates === 'function') {
      fetchVeRates(true);
    }
    fetchRateHistory();
  }, [veRates?.fechaConsulta, veRates?.lastUpdated, fetchVeRates, fetchRateHistory]);

  const resolvedHistoricalEntry = useMemo(() => {
    if (!rateHistory || rateHistory.length === 0) return null;
    let candidate = rateHistory[0];
    for (let i = 0; i < rateHistory.length; i++) {
      if (rateHistory[i].date <= selectedDate) {
        candidate = rateHistory[i];
      } else {
        break;
      }
    }
    return candidate;
  }, [rateHistory, selectedDate]);

  const activeRates = useMemo(() => {
    const bcvUsd = (rateMode === 'historical' && resolvedHistoricalEntry)
      ? (resolvedHistoricalEntry.bcvUsd || veRates.bcvUsd || 0)
      : (veRates.bcvUsd || 0);
    const bcvEur = (rateMode === 'historical' && resolvedHistoricalEntry)
      ? (resolvedHistoricalEntry.bcvEur || veRates.bcvEur || 0)
      : (veRates.bcvEur || 0);
    const paralelo = (rateMode === 'historical' && resolvedHistoricalEntry)
      ? (resolvedHistoricalEntry.paralelo || veRates.paralelo || 0)
      : (veRates.paralelo || 0);
    const custom = veRates.custom || 0;
    const avgBcv = (bcvUsd > 0 && bcvEur > 0)
      ? (bcvUsd + bcvEur) / 2
      : (bcvUsd || bcvEur || 0);

    return {
      bcvUsd,
      bcvEur,
      eur: bcvEur,
      avgBcv,
      paralelo,
      custom
    };
  }, [rateMode, resolvedHistoricalEntry, veRates]);

  const activeAmountBs = useMemo(() => {
    if (!calcBaseAmount) return '';
    const num = Number(calcBaseAmount);
    if (isNaN(num)) return '';
    switch (calcBaseCurrency) {
      case 'BS': return num;
      case 'BCV_USD': return num * activeRates.bcvUsd;
      case 'PARALELO': return num * activeRates.paralelo;
      case 'EUR': return num * (activeRates.bcvEur || activeRates.eur || 0);
      case 'AVG_BCV': return num * (activeRates.avgBcv || 0);
      case 'CUSTOM': return num * (activeRates.custom || 0);
      default: return '';
    }
  }, [calcBaseAmount, calcBaseCurrency, activeRates]);

  const historySeries = useMemo(() => {
    if (!rateHistory || rateHistory.length === 0) return [];
    const sliced = rateHistory.slice(-historyRange);
    return sliced.map((item, idx) => {
      const val = Number(item[historyCurrency]) || 0;
      const prevItem = idx > 0 ? sliced[idx - 1] : null;
      const prevVal = prevItem ? (Number(prevItem[historyCurrency]) || 0) : val;
      const diff = val - prevVal;
      const diffPct = prevVal > 0 ? (diff / prevVal) * 100 : 0;
      return {
        ...item,
        label: formatShortDate(item.date),
        value: Number(val.toFixed(2)),
        rawValue: val,
        diff,
        diffPct
      };
    });
  }, [rateHistory, historyRange, historyCurrency]);

  const historyStats = useMemo(() => {
    const valid = historySeries.filter(p => p.rawValue > 0);
    if (valid.length === 0) return { min: 0, max: 0, changePct: 0, changeBs: 0, latest: 0 };
    const values = valid.map(p => p.rawValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const first = valid[0].rawValue;
    const latest = valid[valid.length - 1].rawValue;
    const changeBs = latest - first;
    const changePct = first > 0 ? (changeBs / first) * 100 : 0;
    return { min, max, changeBs, changePct, latest };
  }, [historySeries]);

  const minHistoryDate = rateHistory.length > 0 ? rateHistory[0].date : '2024-01-01';
  const maxHistoryDate = rateHistory.length > 0
    ? rateHistory[rateHistory.length - 1].date
    : todayLocal();

  const handleSelectDateFromHistory = useCallback((dateStr) => {
    setSelectedDate(dateStr);
    setRateMode('historical');
    if (!calcBaseAmount) {
      setCalcBaseCurrency('BCV_USD');
      setCalcBaseAmount('100');
    }
    if (showToast) {
      showToast(`Tasa del ${formatFullDate(dateStr)} cargada en la calculadora`);
    }
    calculatorTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [calcBaseAmount, setCalcBaseAmount, setCalcBaseCurrency, showToast]);

  const exchangeGapData = useMemo(
    () => calculateExchangeGapData(veRates, ratesDetails, rateHistory),
    [veRates, ratesDetails, rateHistory]
  );

  const historyCurrencyMeta = {
    bcvUsd: { label: 'USD BCV', subtitle: 'Tasa Oficial BCV', color: 'var(--color-success)', fill: 'var(--color-success-soft)' },
    bcvEur: { label: 'EUR BCV', subtitle: 'Euro Oficial BCV', color: 'var(--color-info)', fill: 'var(--color-info-soft)' },
    avgBcv: { label: 'Promedio BCV', subtitle: 'Promedio Dólar y Euro BCV', color: 'var(--color-accent)', fill: 'var(--color-accent-soft)' },
    paralelo: { label: 'Paralelo', subtitle: 'Monitor / Paralelo', color: 'var(--color-warning)', fill: 'var(--color-warning-soft)' }
  }[historyCurrency] || { label: 'Tasa', subtitle: '', color: 'var(--color-accent)', fill: 'var(--color-accent-soft)' };

  return (
    <div
      ref={calculatorTopRef}
      className="view-container"
      style={{ padding: '0 1rem var(--space-4)', marginTop: '1.25rem' }}
    >
      {/* 1. Encabezado y selector de modo */}
      <CalculatorHeader
        rateMode={rateMode}
        setRateMode={setRateMode}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isFetchingRates={isFetchingRates}
        isLoadingHistory={isLoadingHistory}
        veRates={veRates}
        fetchVeRates={fetchVeRates}
        fetchRateHistory={fetchRateHistory}
        activeRates={activeRates}
        resolvedHistoricalEntry={resolvedHistoricalEntry}
        minHistoryDate={minHistoryDate}
        maxHistoryDate={maxHistoryDate}
        onOpenSettings={onOpenSettings}
        sectionSwitcher={Array.isArray(transactions) ? (
          <SegmentedControl
            className="tasas-sections"
            ariaLabel="Secciones de Tasas"
            options={[{ value: 'calculadora', label: 'Calculadora' }, { value: 'cambios', label: 'Mis cambios' }]}
            value={section}
            onChange={setSection}
          />
        ) : null}
        hideModes={section === 'cambios'}
      />

      {section === 'cambios' && <MyExchangesView transactions={transactions} />}

      {section === 'calculadora' && (
        <>
      {/* 3. Tarjetas interactivas de conversión */}
      <CalculatorCards
        calcBaseCurrency={calcBaseCurrency}
        setCalcBaseCurrency={setCalcBaseCurrency}
        calcBaseAmount={calcBaseAmount}
        setCalcBaseAmount={setCalcBaseAmount}
        activeAmountBs={activeAmountBs}
        activeRates={activeRates}
        rateMode={rateMode}
        selectedDate={selectedDate}
        resolvedHistoricalEntry={resolvedHistoricalEntry}
        ratesDetails={ratesDetails}
        veRates={veRates}
        setVeRates={setVeRates}
      />

      {/* 2. Tasa con la que se calculan tus totales (único lugar donde se cambia) */}
      {setReferenceRate && (
        <section className="reference-rate-card" aria-label="Tasa para tus totales">
          <div className="reference-rate-head">
            <span className="reference-rate-title">
              Tasa para tus totales
              <InfoHint label="Qué es la tasa para tus totales">
                Tus bolívares se pasan a dólares con esta tasa para mostrar cuánto tienes en Inicio y en Cuentas. No cambia tus movimientos guardados.
              </InfoHint>
            </span>
          </div>
          <ReferenceRateSelector
            referenceRate={referenceRate}
            setReferenceRate={setReferenceRate}
            onChanged={(opt) => showToast?.(`Tus totales ahora usan la tasa ${opt.label}`)}
          />
          <ExchangeGapBar exchangeGapData={exchangeGapData} />
        </section>
      )}

      {/* 3. Gráfico y tabla de historial */}
      <Suspense fallback={
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Cargando historial...
        </div>
      }>
        <RateHistoryChart
          rateHistory={rateHistory}
          historyCurrency={historyCurrency}
          setHistoryCurrency={setHistoryCurrency}
          historyRange={historyRange}
          setHistoryRange={setHistoryRange}
          historySeries={historySeries}
          historyStats={historyStats}
          historyCurrencyMeta={historyCurrencyMeta}
          onSelectDateFromHistory={handleSelectDateFromHistory}
        />
      </Suspense>
        </>
      )}
    </div>
  );
}
