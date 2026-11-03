import React from 'react';
import {
  formatCalcNumber,
  formatCalcLiveInput,
  sanitizeCalcInput,
  formatShortDate
} from './calculatorUtils';
import CalculatorRateCard from './CalculatorRateCard';

export default function CalculatorCards({
  calcBaseCurrency,
  setCalcBaseCurrency,
  calcBaseAmount,
  setCalcBaseAmount,
  activeAmountBs,
  activeRates,
  rateMode,
  selectedDate,
  resolvedHistoricalEntry,
  ratesDetails,
  veRates,
  setVeRates
}) {
  const bsDisplayValue = calcBaseCurrency === 'BS'
    ? formatCalcLiveInput(calcBaseAmount)
    : (activeAmountBs !== '' ? formatCalcNumber(activeAmountBs, 2) : '');
  const bsFontSize = bsDisplayValue.length > 13
    ? '1.35rem'
    : bsDisplayValue.length > 10
      ? '1.55rem'
      : '1.85rem';

  const bcvInfo = rateMode === 'historical'
    ? { valor: activeRates.bcvUsd, fechaValor: resolvedHistoricalEntry?.date }
    : (ratesDetails?.bcvUsd || veRates?.details?.bcvUsd);

  const paraleloInfo = rateMode === 'historical'
    ? { valor: activeRates.paralelo, fechaValor: resolvedHistoricalEntry?.date }
    : (ratesDetails?.paralelo || veRates?.details?.paralelo);

  const eurInfo = rateMode === 'historical'
    ? { valor: activeRates.eur, fechaValor: resolvedHistoricalEntry?.date }
    : (ratesDetails?.bcvEur || veRates?.details?.bcvEur);

  return (
    <>
      {/* MONTO EN BOLÍVARES */}
      <div className="glass-card" style={{ padding: '0.95rem 1.15rem', borderRadius: '16px', marginBottom: '0.75rem', textAlign: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.35rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}>
          <span>Monto en Bolívares (Bs)</span>
          {rateMode === 'historical' && (
            <span style={{ fontSize: '0.68rem', padding: '1px 7px', borderRadius: '999px', background: '#14332b', color: '#10b981', fontWeight: 600 }}>
              {formatShortDate(selectedDate)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '1.35rem', fontWeight: 600, color: '#f1f5f9', flexShrink: 0 }}>Bs.</span>
          <input
            type="text"
            inputMode="decimal"
            value={bsDisplayValue}
            onChange={e => {
              setCalcBaseCurrency('BS');
              setCalcBaseAmount(sanitizeCalcInput(e.target.value));
            }}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid #10b981',
              color: '#f1f5f9',
              fontSize: bsFontSize,
              fontWeight: 700,
              width: 'min(100%, 230px)',
              textAlign: 'center',
              outline: 'none',
              transition: 'font-size 0.15s ease'
            }}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* BARRA DE BRECHA CAMBIARIA */}
      {activeRates.bcvUsd > 0 && activeRates.paralelo > 0 && (() => {
        const gapBs = activeRates.paralelo - activeRates.bcvUsd;
        const gapPct = (gapBs / activeRates.bcvUsd) * 100;
        const isPositiveGap = gapPct >= 0;
        const usdAtBcv = activeAmountBs ? activeAmountBs / activeRates.bcvUsd : 0;
        const usdAtParalelo = activeAmountBs ? activeAmountBs / activeRates.paralelo : 0;
        const usdDiff = Math.abs(usdAtBcv - usdAtParalelo);

        return (
          <div
            style={{
              padding: '0.6rem 0.95rem',
              borderRadius: '12px',
              marginBottom: '0.85rem',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 500 }}>
                <span>⚖️ Brecha BCV vs Paralelo</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  {isPositiveGap ? '+' : ''}Bs. {formatCalcNumber(gapBs, 2)}
                </span>
                <span
                  style={{
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'rgba(245, 158, 11, 0.18)',
                    color: '#fbbf24',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  {isPositiveGap ? '+' : ''}{gapPct.toFixed(2)}%
                </span>
              </div>
            </div>
            {usdDiff > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8', paddingTop: '0.15rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span>Diferencia en este monto:</span>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                  ${formatCalcNumber(usdDiff, 2)} USD
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* TARJETAS DE CONVERSIÓN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '2rem' }}>
        <CalculatorRateCard
          title="USD BCV"
          subtitle="Oficial"
          currencyCode="BCV_USD"
          currencySymbol="$"
          rateValue={activeRates.bcvUsd}
          rateInfo={bcvInfo}
          rateMode={rateMode}
          isHistorical={rateMode === 'historical'}
          historicalDate={resolvedHistoricalEntry?.date}
          calcBaseCurrency={calcBaseCurrency}
          setCalcBaseCurrency={setCalcBaseCurrency}
          calcBaseAmount={calcBaseAmount}
          setCalcBaseAmount={setCalcBaseAmount}
          activeAmountBs={activeAmountBs}
          accentColor="#10b981"
        />

        <CalculatorRateCard
          title="USD Paralelo"
          subtitle="Monitor / EnParalelo"
          currencyCode="PARALELO"
          currencySymbol="$"
          rateValue={activeRates.paralelo}
          rateInfo={paraleloInfo}
          rateMode={rateMode}
          isHistorical={rateMode === 'historical'}
          historicalDate={resolvedHistoricalEntry?.date}
          calcBaseCurrency={calcBaseCurrency}
          setCalcBaseCurrency={setCalcBaseCurrency}
          calcBaseAmount={calcBaseAmount}
          setCalcBaseAmount={setCalcBaseAmount}
          activeAmountBs={activeAmountBs}
          accentColor="#fbbf24"
          tag={activeRates.bcvUsd > 0 && activeRates.paralelo > 0 && (
            <span style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.16)', color: '#fbbf24', fontWeight: 700 }}>
              +{(((activeRates.paralelo - activeRates.bcvUsd) / activeRates.bcvUsd) * 100).toFixed(1)}%
            </span>
          )}
        />

        <CalculatorRateCard
          title="EUR BCV"
          subtitle="Oficial Banco Central"
          currencyCode="EUR"
          currencySymbol="€"
          rateValue={activeRates.eur}
          rateInfo={eurInfo}
          rateMode={rateMode}
          isHistorical={rateMode === 'historical'}
          historicalDate={resolvedHistoricalEntry?.date}
          calcBaseCurrency={calcBaseCurrency}
          setCalcBaseCurrency={setCalcBaseCurrency}
          calcBaseAmount={calcBaseAmount}
          setCalcBaseAmount={setCalcBaseAmount}
          activeAmountBs={activeAmountBs}
          accentColor="#60a5fa"
        />

        <CalculatorRateCard
          title="Personalizado"
          subtitle="Tasa propia"
          currencyCode="CUSTOM"
          currencySymbol="$"
          rateValue={activeRates.custom}
          rateMode={rateMode}
          isHistorical={false}
          calcBaseCurrency={calcBaseCurrency}
          setCalcBaseCurrency={setCalcBaseCurrency}
          calcBaseAmount={calcBaseAmount}
          setCalcBaseAmount={setCalcBaseAmount}
          activeAmountBs={activeAmountBs}
          accentColor="#a855f7"
          editableRate={{
            value: veRates?.custom ? String(veRates.custom) : ''
          }}
          onRateChange={e => {
            const val = sanitizeCalcInput(e.target.value);
            const num = parseFloat(val) || 0;
            if (setVeRates) {
              setVeRates(prev => ({ ...prev, custom: num }));
            }
          }}
        />
      </div>
    </>
  );
}
