import React from 'react';
import { formatAmount } from '../../../utils/formatters';
import { getRateStatus } from '../../../services/ratesService';
import ReferenceRateSelector from '../../common/ReferenceRateSelector';

export default function NetWorthCard({
  isBalanceHidden,
  setIsBalanceHidden,
  grandTotalUsd,
  alternateGrandTotalUsd,
  referenceRate,
  setReferenceRate,
  rates,
  ratesDetails,
  auth,
  onOpenAuthModal,
  onOpenSettings
}) {
  return (
    <div style={{ marginTop: '1rem', marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Mi balance
            <button
              onClick={() => setIsBalanceHidden(!isBalanceHidden)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              aria-label={isBalanceHidden ? 'Mostrar saldo' : 'Ocultar saldo'}
            >
              {isBalanceHidden ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
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
              aria-label="Estado de autenticación"
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
      <div style={{ fontSize: 'clamp(1.8rem, 7vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'clamp(1.2rem, 5vw, 1.6rem)' }}>$</span>
        {isBalanceHidden ? '***' : formatAmount(grandTotalUsd, 'USD')}
      </div>
      {alternateGrandTotalUsd != null && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 500 }}>
          {referenceRate === 'paralelo'
            ? `A tasa BCV: $${isBalanceHidden ? '***' : formatAmount(alternateGrandTotalUsd, 'USD')}`
            : `A tasa Paralelo: $${isBalanceHidden ? '***' : formatAmount(alternateGrandTotalUsd, 'USD')}`}
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
    </div>
  );
}
