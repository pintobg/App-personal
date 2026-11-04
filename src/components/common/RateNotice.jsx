import React, { useContext, useMemo, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { getRateProblems } from '../../domain/rates';

const DISMISS_KEY = 'rate_notice_dismissed';

function readDismissed() {
  try { return sessionStorage.getItem(DISMISS_KEY) || ''; } catch { return ''; }
}

/**
 * Un solo aviso de tasa para toda la pantalla, con un botón que lo resuelve.
 * Reemplaza los avisos repetidos en cada tarjeta.
 */
export default function RateNotice({ onGoToRates, onReviewAsset, assets: assetsProp, rates: ratesProp, style }) {
  const finance = useContext(FinanceContext);
  const assets = assetsProp || finance?.assets || [];
  const rates = ratesProp || finance?.rates || {};
  const refreshRates = finance?.refreshRates;
  const isFetching = Boolean(finance?.isFetchingRates);

  const problems = useMemo(() => getRateProblems(assets, rates), [assets, rates]);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [refreshFailed, setRefreshFailed] = useState(false);

  if (!problems.hasProblems || dismissed === problems.signature) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, problems.signature); } catch { /* sin almacenamiento */ }
    setDismissed(problems.signature);
  };

  const handleRefresh = async () => {
    if (!refreshRates) { onGoToRates?.(); return; }
    try {
      await refreshRates();
    } catch {
      setRefreshFailed(true);
      return;
    }
    // Si tras actualizar sigue sin tasa, se ofrece ingresarla a mano.
    setRefreshFailed(true);
  };

  let message;
  let action;
  if (problems.missingDollarRate) {
    message = 'No hay tasa del dólar. Los totales en Bs pueden no ser exactos.';
    action = refreshFailed || !refreshRates
      ? <button type="button" className="notice-btn" onClick={onGoToRates}>Ingresar tasa</button>
      : <button type="button" className="notice-btn" onClick={handleRefresh} disabled={isFetching}>{isFetching ? 'Actualizando…' : 'Actualizar'}</button>;
  } else {
    const list = problems.unknownSymbols.join(', ');
    message = `No encontramos el precio de ${list}. Revisa que el nombre esté bien escrito.`;
    const first = problems.firstAssetBySymbol[problems.unknownSymbols[0]];
    action = onReviewAsset && first
      ? <button type="button" className="notice-btn" onClick={() => onReviewAsset(first)}>Revisar</button>
      : null;
  }

  return (
    <div className="rate-notice" role="status" style={style}>
      <svg className="rate-notice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <div className="rate-notice-text">{message}</div>
      {action}
      <button type="button" className="icon-hit rate-notice-close" onClick={dismiss} aria-label="Ocultar aviso">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  );
}
