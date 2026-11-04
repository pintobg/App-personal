import React, { useState } from 'react';
import { formatAmount } from '../../../utils/formatters';
import { getRateStatus } from '../../../services/ratesService';

const RATE_LABELS = { bcv: 'BCV', paralelo: 'Paralelo', custom: 'Propia' };

/**
 * Cabecera compacta de Cuentas: total, total a la otra tasa y etiqueta de tasa.
 * La tasa de referencia se cambia en Tasas (toca la etiqueta).
 */
export default function BalancesSummary({
  grandTotalUsd,
  alternateGrandTotalUsd,
  referenceRate,
  rates,
  ratesDetails,
  auth,
  onExportBackup,
  onNavigateToCalculator
}) {
  const [isBackupBannerDismissed, setIsBackupBannerDismissed] = useState(false);
  const vesRate = rates?.['VES'] ? (rates['VES'] < 1 ? 1 / rates['VES'] : rates['VES']) : null;
  const rateLabel = RATE_LABELS[referenceRate] || 'BCV';
  const rateStatus = ratesDetails?.bcvUsd ? getRateStatus(ratesDetails.bcvUsd) : null;

  return (
    <section className="home-hero balances-hero" aria-label="Total en cuentas">
      <div className="home-hero-label"><span>Tienes en total</span></div>
      <div className="home-hero-amount">
        <span className="currency">$</span>
        {formatAmount(grandTotalUsd, 'USD')}
      </div>
      {alternateGrandTotalUsd != null && (
        <div className="home-hero-alt">
          {referenceRate === 'paralelo' ? 'A tasa BCV' : 'A tasa paralelo'}: ${formatAmount(alternateGrandTotalUsd, 'USD')}
        </div>
      )}
      {vesRate && (
        <button
          type="button"
          className="rate-tag"
          onClick={onNavigateToCalculator}
          disabled={!onNavigateToCalculator}
          aria-label={`Tasa ${rateLabel} ${formatAmount(vesRate, 'VES')} bolívares por dólar. Cambiar en Tasas`}
        >
          Tasa {rateLabel} · {formatAmount(vesRate, 'VES')}
          {rateStatus?.isStale && <span className="rate-tag-stale"> · {rateStatus.label}</span>}
        </button>
      )}

      {auth && !auth.isSupabaseConfigured && !isBackupBannerDismissed && (
        <div className="backup-banner">
          <span className="backup-banner-text">Tus datos están solo en este teléfono.</span>
          <button type="button" className="link-btn" onClick={onExportBackup || onNavigateToCalculator}>
            Respaldar
          </button>
          <button
            type="button"
            className="icon-hit"
            onClick={() => setIsBackupBannerDismissed(true)}
            aria-label="Cerrar aviso"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      )}
    </section>
  );
}
