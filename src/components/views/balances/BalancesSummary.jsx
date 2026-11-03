import React, { useState } from 'react';
import ReferenceRateSelector from '../../common/ReferenceRateSelector';
import { formatAmount } from '../../../utils/formatters';
import { getRateStatus } from '../../../services/ratesService';

export default function BalancesSummary({
  grandTotalUsd,
  alternateGrandTotalUsd,
  referenceRate,
  setReferenceRate,
  rates,
  ratesDetails,
  auth,
  onOpenAuthModal,
  onExportBackup,
  onNavigateToCalculator,
  onOpenSettings
}) {
  const [isSupabaseBannerDismissed, setIsSupabaseBannerDismissed] = useState(false);

  return (
    <div style={{ padding: '0 1rem', marginTop: '1.5rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Balance General
          </div>
          <ReferenceRateSelector
            referenceRate={referenceRate}
            setReferenceRate={setReferenceRate}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              style={{
                background: auth?.user ? 'var(--color-accent-soft)' : 'var(--bg-surface)',
                border: `1px solid ${auth?.user ? 'var(--color-accent-border)' : 'var(--border-color)'}`,
                borderRadius: '9999px',
                padding: '4px 10px',
                color: auth?.user ? 'var(--color-accent)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>{auth?.user ? '☁️' : '👤'}</span>
              <span>
                {auth?.user
                  ? (auth.syncStatus === 'syncing'
                      ? 'Sincronizando...'
                      : auth.syncStatus === 'offline'
                      ? 'Sin conexión'
                      : auth.syncStatus === 'error'
                      ? 'Error, reintentar'
                      : auth.pendingCount > 0
                      ? `Pendiente (${auth.pendingCount})`
                      : 'Sincronizado')
                  : 'Modo local'}
              </span>
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Ajustes"
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              ⚙️
            </button>
          )}
        </div>
      </div>
      <div style={{ fontSize: 'var(--font-hero)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--font-xl)' }}>$</span>
        {formatAmount(grandTotalUsd, 'USD')}
      </div>
      {alternateGrandTotalUsd != null && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 500 }}>
          {referenceRate === 'paralelo'
            ? `A tasa BCV: $${formatAmount(alternateGrandTotalUsd, 'USD')}`
            : `A tasa Paralelo: $${formatAmount(alternateGrandTotalUsd, 'USD')}`}
        </div>
      )}
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {rates?.['VES'] ? (
          <>
            <span>Bs {formatAmount(rates['VES'] < 1 ? 1 / rates['VES'] : rates['VES'], 'VES')} / $</span>
            {ratesDetails?.bcvUsd && (() => {
              const status = getRateStatus(ratesDetails.bcvUsd);
              if (status.isStale) {
                return (
                  <span style={{ color: 'var(--color-warning)', fontSize: '0.74rem', padding: '1px 6px', background: 'var(--color-warning-soft)', borderRadius: '4px', fontWeight: 600 }}>
                    {status.label}
                  </span>
                );
              }
              return (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                  ({status.label})
                </span>
              );
            })()}
          </>
        ) : (
          <span style={{ color: 'var(--color-warning)', fontSize: '0.82rem', fontWeight: 600 }}>
            ⚠️ Sin tasa (Conéctate o ingresa una tasa en la Calculadora)
          </span>
        )}
      </div>

      {auth && !auth.isSupabaseConfigured && !isSupabaseBannerDismissed && (
        <div
          style={{
            marginTop: '0.75rem',
            background: 'var(--color-warning-soft)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: '10px',
            padding: '0.45rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            fontSize: '0.76rem',
            color: 'var(--color-warning)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
            <span style={{ fontSize: '0.95rem' }}>📱</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Datos guardados solo en este teléfono. Haz respaldos frecuentes.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onExportBackup || onNavigateToCalculator}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-warning)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
            >
              Respaldar
            </button>
            <button
              type="button"
              onClick={() => setIsSupabaseBannerDismissed(true)}
              aria-label="Cerrar aviso"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-warning)',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '0.85rem',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
