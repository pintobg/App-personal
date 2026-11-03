import React, { useRef } from 'react';
import {
  formatCalcNumber,
  formatCalcLiveInput,
  sanitizeCalcInput
} from './calculatorUtils';
import { getRateStatus } from '../../../services/ratesService';

export default function CalculatorRateCard({
  title,
  subtitle,
  currencyCode,
  currencySymbol = '$',
  rateValue,
  rateInfo,
  rateMode,
  isHistorical,
  historicalDate,
  calcBaseCurrency,
  setCalcBaseCurrency,
  calcBaseAmount,
  setCalcBaseAmount,
  activeAmountBs,
  accentColor = '#10b981',
  tag,
  editableRate,
  onRateChange
}) {
  const inputRef = useRef(null);

  const displayVal = calcBaseCurrency === currencyCode
    ? formatCalcLiveInput(calcBaseAmount)
    : (activeAmountBs && rateValue ? formatCalcNumber(activeAmountBs / rateValue, 2) : '');
  const charLen = (displayVal || '0.00').length;
  const status = rateInfo ? getRateStatus(rateInfo) : { isStale: false, label: '' };

  return (
    <div className="glass-card" style={{ padding: '0.9rem 1.1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#f1f5f9', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span>{title}</span>
          {tag}
          {isHistorical && (
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '6px', background: '#14332b', color: accentColor }}>
              Histórico
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{subtitle}</div>
      </div>

      <div
        onClick={() => inputRef.current?.focus()}
        style={{ textAlign: 'right', flex: 1, minWidth: 0, cursor: 'text' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', color: accentColor }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, flexShrink: 0, userSelect: 'none' }}>{currencySymbol}</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={displayVal}
            onChange={e => {
              setCalcBaseCurrency(currencyCode);
              setCalcBaseAmount(sanitizeCalcInput(e.target.value));
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: accentColor,
              fontSize: '1.2rem',
              fontWeight: 700,
              width: `${charLen + 0.6}ch`,
              maxWidth: '170px',
              textAlign: 'right',
              outline: 'none',
              padding: 0
            }}
            placeholder="0.00"
          />
        </div>

        {editableRate ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Tasa: Bs.</span>
            <input
              type="text"
              inputMode="decimal"
              value={editableRate.value}
              onChange={onRateChange}
              style={{
                width: '75px',
                padding: '2px 6px',
                borderRadius: '6px',
                border: '1px solid #3b82f6',
                background: '#1e293b',
                color: '#f1f5f9',
                fontSize: '0.74rem',
                textAlign: 'right'
              }}
              placeholder="0.00"
            />
          </div>
        ) : !rateValue ? (
          <div style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 600 }}>
            Tasa: Sin tasa
          </div>
        ) : (
          <div style={{ fontSize: '0.74rem', color: status.isStale ? '#f59e0b' : '#94a3b8', fontWeight: status.isStale ? 600 : 400 }}>
            Tasa: Bs. {formatCalcNumber(rateValue, 2)} {status.label ? `• ${status.label}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
