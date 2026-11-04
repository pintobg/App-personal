import React from 'react';
import { formatAmount } from '../../../utils/formatters';
import { getRateStatus } from '../../../services/ratesService';

const RATE_LABELS = { bcv: 'BCV', paralelo: 'Paralelo', custom: 'Propia' };

export default function NetWorthCard({
  isBalanceHidden,
  setIsBalanceHidden,
  grandTotalUsd,
  alternateGrandTotalUsd,
  referenceRate,
  rates,
  ratesDetails,
  auth,
  onOpenSettings,
  onOpenRates,
  notice = null
}) {
  const vesRate = rates?.['VES'] ? (rates['VES'] < 1 ? 1 / rates['VES'] : rates['VES']) : null;
  const rateLabel = RATE_LABELS[referenceRate] || 'BCV';
  const rateStatus = ratesDetails?.bcvUsd ? getRateStatus(ratesDetails.bcvUsd) : null;
  // Punto de aviso en Ajustes: sin sincronizar, con error o con cambios pendientes.
  const needsAttention = !auth?.user || ['error', 'offline'].includes(auth?.syncStatus) || auth?.pendingCount > 0;

  return (
    <section className="home-hero" aria-label="Saldo total">
      <div className="home-hero-top">
        <div className="home-hero-label">
          <span>Tienes en total</span>
          <button
            type="button"
            className="icon-hit"
            onClick={() => setIsBalanceHidden(!isBalanceHidden)}
            aria-label={isBalanceHidden ? 'Mostrar saldo' : 'Ocultar saldo'}
          >
            {isBalanceHidden ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            )}
          </button>
        </div>
        {onOpenSettings && (
          <button
            type="button"
            className="icon-hit settings-btn"
            onClick={onOpenSettings}
            aria-label={needsAttention ? 'Ajustes (sin sincronizar)' : 'Ajustes'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            {needsAttention && <span className="attention-dot" aria-hidden="true" />}
          </button>
        )}
      </div>

      <div className="home-hero-amount">
        <span className="currency">$</span>
        {isBalanceHidden ? '***' : formatAmount(grandTotalUsd, 'USD')}
      </div>

      {alternateGrandTotalUsd != null && !isBalanceHidden && (
        <div className="home-hero-alt">
          {referenceRate === 'paralelo' ? 'A tasa BCV' : 'A tasa paralelo'}: ${formatAmount(alternateGrandTotalUsd, 'USD')}
        </div>
      )}

      {vesRate && (
        <button
          type="button"
          className="rate-tag"
          onClick={onOpenRates}
          disabled={!onOpenRates}
          aria-label={`Tasa ${rateLabel} ${formatAmount(vesRate, 'VES')} bolívares por dólar. Cambiar en Tasas`}
        >
          Tasa {rateLabel} · {formatAmount(vesRate, 'VES')}
          {rateStatus?.isStale && <span className="rate-tag-stale"> · {rateStatus.label}</span>}
        </button>
      )}

      {notice}
    </section>
  );
}
