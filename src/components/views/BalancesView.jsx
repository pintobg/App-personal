import { useState, useMemo } from 'react';
import { Card, SectionHeader, Button, IconButton, Chip, Amount, EmptyState } from '../ui';
import CurrencyIcon from '../common/CurrencyIcon';
import VerifyBalancesModal from '../modals/VerifyBalancesModal';
import ReferenceRateSelector from '../common/ReferenceRateSelector';
import { formatAmount, getRateString } from '../../utils/formatters';
import { convert, add } from '../../domain/money';
import { getRateStatus } from '../../services/ratesService';
import { calculateGoalProgress } from '../../domain/goals';

export default function BalancesView({
  grandTotalUsd,
  alternateGrandTotalUsd,
  referenceRate,
  setReferenceRate,
  rates,
  ratesDetails,
  assets,
  transactions = [],
  goals = [],
  onOpenGoalModal,
  onDeleteGoal,
  activeFilter,
  setActiveFilter,
  setSelectedFilters,
  assetsByLocation,
  accountTotalsUsd,
  deleteMode,
  onAdjustAsset,
  onDeleteAsset,
  onAdjustBalance,
  auth,
  onOpenAuthModal,
  onExportBackup,
  onNavigateToCalculator
}) {
  const [expandedCurrencies, setExpandedCurrencies] = useState({});
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const toggleCurrencyExpand = (sym) => {
    setExpandedCurrencies(prev => ({ ...prev, [sym]: !prev[sym] }));
  };

  const toggleAccountExpand = (loc) => {
    setExpandedAccounts(prev => ({ ...prev, [loc]: !prev[loc] }));
  };

  const getRateForSymbol = (sym) => {
    const clean = (sym || '').trim().toUpperCase();
    return rates[clean] ?? (clean === 'USD' || clean === 'USDT' || clean === 'USDC' ? 1 : 0);
  };

  // Agrupación y sumatoria por Moneda (para pestaña "Por Moneda")
  const currencyGroups = useMemo(() => {
    const map = {};
    (assets || []).forEach(asset => {
      const sym = (asset.name || '').trim().toUpperCase();
      if (!sym) return;
      const rateVal = getRateForSymbol(sym);
      const amount = Number(asset.amount) || 0;
      const usdVal = convert(amount, sym, 'USD', rates);

      if (!map[sym]) {
        map[sym] = {
          symbol: sym,
          displayName: sym === 'VES' ? 'Bs.' : sym,
          type: asset.type || 'fiat',
          totalAmount: 0,
          totalUsd: 0,
          rateVal,
          isUnrecognized: !rateVal || rateVal <= 0,
          items: []
        };
      }
      map[sym].totalAmount = add(map[sym].totalAmount, amount);
      map[sym].totalUsd = add(map[sym].totalUsd, usdVal);
      map[sym].items.push({
        ...asset,
        symbol: sym,
        amountNum: amount,
        usdVal
      });
    });

    return Object.values(map)
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => b.usdVal - a.usdVal)
      }))
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [assets, rates]);

  // Agrupación y sumatoria por Cuenta (para pestaña "Por Cuenta")
  const accountGroups = useMemo(() => {
    const map = {};
    (assets || []).forEach(asset => {
      const loc = asset.location || 'Sin ubicación';
      const sym = (asset.name || '').trim().toUpperCase();
      const rateVal = getRateForSymbol(sym);
      const amount = Number(asset.amount) || 0;
      const usdVal = convert(amount, sym, 'USD', rates);

      if (!map[loc]) {
        map[loc] = {
          location: loc,
          totalUsd: 0,
          items: []
        };
      }
      map[loc].totalUsd = add(map[loc].totalUsd, usdVal);
      map[loc].items.push({
        ...asset,
        symbol: sym,
        displayName: sym === 'VES' ? 'Bs.' : sym,
        amountNum: amount,
        rateVal,
        isUnrecognized: !rateVal || rateVal <= 0,
        usdVal
      });
    });

    return Object.values(map)
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => b.usdVal - a.usdVal)
      }))
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [assets, rates]);

  return (
    <>
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

        {/* Banner visible y fijo si Supabase no está configurado */}
        {auth && !auth.isSupabaseConfigured && (
          <div
            style={{
              marginTop: '1rem',
              background: 'var(--color-warning-soft)',
              border: '1px solid var(--color-warning-border)',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: '1.2' }}>📱</span>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-warning)', lineHeight: '1.35', fontWeight: 500 }}>
                Tus datos están guardados solo en este teléfono. Haz respaldos frecuentes.
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={onExportBackup || onNavigateToCalculator}
                style={{
                  background: 'var(--color-warning)',
                  color: 'var(--text-inverse)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Exportar respaldo
              </button>
            </div>
          </div>
        )}

        {/* SECCIÓN METAS DE AHORRO */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.15rem' }}>🎯</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Metas de Ahorro
              </span>
              {goals.length > 0 && (
                <span style={{ fontSize: '0.72rem', background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', padding: '1px 6px', borderRadius: '10px' }}>
                  {goals.length}
                </span>
              )}
            </div>
            {onOpenGoalModal && (
              <button
                type="button"
                onClick={() => onOpenGoalModal(null)}
                style={{
                  background: 'var(--color-info)',
                  color: 'var(--text-on-accent)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>+</span> Nueva Meta
              </button>
            )}
          </div>

          {goals.length === 0 ? (
            <div
              className="glass-card"
              style={{
                padding: '1.25rem 1rem',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1px dashed var(--border-color)'
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>🎯</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Sin metas de ahorro aún
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto 0.85rem' }}>
                Crea una meta en $ o cualquier moneda, selecciona las cuentas que sumarán a tu meta y monitorea tu avance mes a mes.
              </div>
              {onOpenGoalModal && (
                <button
                  type="button"
                  onClick={() => onOpenGoalModal(null)}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--color-info)',
                    color: 'var(--color-info)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Crear mi primera meta
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {goals.map(goal => {
                const progress = calculateGoalProgress(goal, assets, rates, new Date());
                const targetCurrency = (goal.currency || 'USD').toUpperCase();
                const isAchieved = progress.progressPercent >= 100;
                const isExpired = progress.monthsRemaining === 0 && !isAchieved;

                // Nombres de las cuentas vinculadas
                const linkedAccounts = (assets || []).filter(a =>
                  Array.isArray(goal.accountIds) && goal.accountIds.includes(a.id)
                );

                return (
                  <div
                    key={goal.id}
                    className="glass-card"
                    style={{
                      padding: '1rem 1.15rem',
                      borderRadius: '16px',
                      border: isAchieved ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                      background: isAchieved
                        ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)'
                        : undefined
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {goal.name}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: isAchieved ? 'var(--color-accent-soft)' : 'var(--bg-surface-elevated)',
                            color: isAchieved ? 'var(--color-accent)' : 'var(--text-secondary)',
                            border: `1px solid ${isAchieved ? 'var(--color-accent-hover)' : 'var(--border-color)'}`
                          }}>
                            {targetCurrency}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        {onOpenGoalModal && (
                          <button
                            type="button"
                            onClick={() => onOpenGoalModal(goal)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-info)', cursor: 'pointer', padding: '0.2rem' }}
                            title="Editar meta" aria-label="Editar meta"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                        )}
                        {onDeleteGoal && (
                          <button
                            type="button"
                            onClick={() => onDeleteGoal(goal.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.2rem' }}
                            title="Eliminar meta" aria-label="Eliminar meta"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div style={{ margin: '0.65rem 0 0.45rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {formatAmount(progress.currentSaved, targetCurrency)} / {formatAmount(goal.targetAmount, targetCurrency)} {targetCurrency}
                        </span>
                        <span style={{
                          fontWeight: 700,
                          color: isAchieved ? 'var(--color-accent)' : 'var(--color-info)'
                        }}>
                          {progress.progressPercent}%
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: '9999px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${progress.progressPercent}%`,
                          height: '100%',
                          background: isAchieved
                            ? 'var(--color-accent)'
                            : 'linear-gradient(90deg, var(--color-info) 0%, var(--color-accent) 100%)',
                          borderRadius: '9999px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>

                    {/* Métricas de tiempo y cuota mensual */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.74rem',
                      marginTop: '0.5rem',
                      flexWrap: 'wrap',
                      gap: '0.4rem'
                    }}>
                      <div>
                        {isAchieved ? (
                          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>🎉 ¡Meta alcanzada!</span>
                        ) : isExpired ? (
                          <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>⚠️ Fecha vencida ({goal.deadline})</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {progress.monthsRemaining != null ? (
                              <>
                                Faltan {progress.monthsRemaining} {progress.monthsRemaining === 1 ? 'mes' : 'meses'} • Ahorrar <strong style={{ color: 'var(--text-primary)' }}>{formatAmount(progress.monthlySavingsNeeded, targetCurrency)} {targetCurrency}/mes</strong>
                              </>
                            ) : (
                              <>Fecha límite: {goal.deadline}</>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Chips de cuentas vinculadas */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {linkedAccounts.length > 0 ? (
                          linkedAccounts.map(acc => (
                            <span
                              key={acc.id}
                              style={{
                                fontSize: '0.66rem',
                                background: 'var(--bg-surface-elevated)',
                                color: 'var(--text-secondary)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              {acc.location} ({acc.name})
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-warning)', fontStyle: 'italic' }}>
                            Sin cuentas vinculadas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN DE CUENTAS */}
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            gap: '1.25rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <button
            onClick={() => { setActiveFilter('all'); if (setSelectedFilters) setSelectedFilters([]); }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.5rem 0',
              color: activeFilter === 'all' ? 'var(--color-accent)' : 'var(--text-secondary)',
              borderBottom: activeFilter === 'all' ? '2px solid var(--color-accent)' : '2px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Todos
          </button>
          <button
            onClick={() => { setActiveFilter('asset'); if (setSelectedFilters) setSelectedFilters([]); }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.5rem 0',
              color: activeFilter === 'asset' ? 'var(--color-accent)' : 'var(--text-secondary)',
              borderBottom: activeFilter === 'asset' ? '2px solid var(--color-accent)' : '2px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Por Moneda
          </button>
          <button
            onClick={() => { setActiveFilter('account'); if (setSelectedFilters) setSelectedFilters([]); }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.5rem 0',
              color: activeFilter === 'account' ? 'var(--color-accent)' : 'var(--text-secondary)',
              borderBottom: activeFilter === 'account' ? '2px solid var(--color-accent)' : '2px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Por Cuenta
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setIsVerifyModalOpen(true)}
            title="Verificar saldos con el historial de movimientos"
            aria-label="Verificar saldos"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Verificar saldos</span>
          </button>
        </div>
      </div>

      <div style={{ padding: '0 1rem', marginBottom: '2rem', width: '100%', boxSizing: 'border-box' }}>
        {assets.length === 0 && (
          <EmptyState icon="🏦" message="No se encontraron cuentas" />
        )}

        {/* VISTA 1: TODOS */}
        {activeFilter === 'all' && Object.entries(assetsByLocation).map(([location, locAssets]) => (
          <div key={location} className="portfolio-section">
            <div className="portfolio-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', marginBottom: '0.5rem', gap: '0.75rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{location}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>${formatAmount(accountTotalsUsd[location], 'USD') || 0}</span>
            </div>

            <div className="capsule-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {locAssets.map(asset => {
                const assetSymbol = (asset.name || '').trim().toUpperCase();
                const rateVal = getRateForSymbol(assetSymbol);
                const isUnrecognized = !rateVal || rateVal <= 0;
                const valueUsd = convert(asset.amount, assetSymbol, 'USD', rates);
                const assetDisplayName = assetSymbol === 'VES' ? 'Bs.' : assetSymbol;
                const displayTitle = asset.location.toLowerCase() === 'cash' ? `${assetDisplayName} Efectivo` : assetDisplayName;

                return (
                  <div
                    key={asset.id}
                    className="glass-card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem 1.15rem',
                      borderRadius: '16px',
                      gap: '0.75rem',
                      border: isUnrecognized ? '1px solid rgba(245, 158, 11, 0.45)' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</span>
                        <span style={{ fontSize: '0.65rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '4px', marginLeft: '0.5rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{assetSymbol}</span>
                      </div>
                      <Amount
                        amount={asset.amount}
                        currency={assetSymbol}
                        secondary={assetSymbol === 'USD' ? null : valueUsd}
                        secondaryCurrency="USD"
                        secondaryPrefix=""
                        size="xl"
                      />
                      {getRateString(assetSymbol, rateVal) && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-accent)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ~ {getRateString(assetSymbol, rateVal)}
                        </div>
                      )}
                      {isUnrecognized && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-warning)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                          <span>⚠️ Moneda no reconocida en Binance o mal escrita</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', height: '100%', justifyContent: 'space-between', flexShrink: 0 }}>
                      <CurrencyIcon symbol={assetSymbol} type={asset.type} size={38} />
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexShrink: 0 }}>
                        <button
                          onClick={() => onAdjustAsset(asset)}
                          aria-label="Ajustar saldo"
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-info)', cursor: 'pointer', padding: '0.25rem', opacity: deleteMode ? 1 : 0.85 }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button
                          onClick={() => onDeleteAsset(asset.id, asset.name, asset.location)}
                          aria-label="Eliminar activo"
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.25rem', opacity: deleteMode ? 1 : 0.6 }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ width: '50%', margin: '2rem auto', borderBottom: '1px solid var(--border-color)' }}></div>
          </div>
        ))}

        {/* VISTA 2: POR MONEDA — Misma estructura de tarjeta que "Todos", limpia y proporcionada */}
        {activeFilter === 'asset' && currencyGroups.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {currencyGroups.map(group => {
              const isExpanded = Boolean(expandedCurrencies[group.symbol]);
              const pctOfTotal = grandTotalUsd > 0 ? (group.totalUsd / grandTotalUsd) * 100 : 0;
              const rateText = getRateString(group.symbol, group.rateVal);

              return (
                <div
                  key={group.symbol}
                  className="glass-card"
                  style={{
                    borderRadius: '16px',
                    padding: '1rem 1.15rem',
                    border: isExpanded
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : group.isUnrecognized
                        ? '1px solid rgba(245, 158, 11, 0.45)'
                        : undefined,
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  {/* Cabecera con la misma proporción y líneas que las tarjetas de "Todos" */}
                  <div
                    onClick={() => toggleCurrencyExpand(group.symbol)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'stretch',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.displayName}</span>
                        <span style={{ fontSize: '0.65rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '4px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                          {group.symbol}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500, flexShrink: 0 }}>
                          • {group.items.length} {group.items.length === 1 ? 'cuenta' : 'cuentas'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <Amount
                          amount={group.totalAmount}
                          currency={group.symbol}
                          secondary={group.symbol === 'USD' ? null : group.totalUsd}
                          secondaryCurrency="USD"
                          secondaryPrefix=""
                          size="xl"
                        />
                        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {pctOfTotal.toFixed(1)}% del total
                        </span>
                      </div>

                      {rateText && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ~ {rateText}
                        </div>
                      )}
                      {group.isUnrecognized && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-warning)' }}>
                          ⚠️ Moneda sin tasa reconocida
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
                      <CurrencyIcon symbol={group.symbol} type={group.type} size={38} />
                      <div
                        style={{
                          display: ' inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          color: isExpanded ? 'var(--color-accent)' : 'var(--text-secondary)',
                          marginTop: '0.85rem'
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Desglose sutil y moderno integrado en la misma tarjeta */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.2rem'
                      }}
                    >
                      {group.items.map((item, idx) => {
                        const shareInCurrency = group.totalAmount > 0 ? (item.amountNum / group.totalAmount) * 100 : 0;
                        const isLast = idx === group.items.length - 1;
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.55rem 0.25rem',
                              borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
                              gap: '0.75rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  width: '3px',
                                  height: '28px',
                                  borderRadius: '999px',
                                  background: 'var(--color-accent)',
                                  opacity: 0.75,
                                  flexShrink: 0
                                }}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.location}
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                    {shareInCurrency.toFixed(0)}%
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span>{formatAmount(item.amountNum, group.symbol)} {group.displayName}</span>
                                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${formatAmount(item.usdVal, 'USD')}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => onAdjustAsset(item)}
                                aria-label="Ajustar saldo"
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-info)', cursor: 'pointer', padding: '0.25rem', opacity: 0.85 }}
                                title="Ajustar saldo"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteAsset(item.id, item.name, item.location)}
                                aria-label="Eliminar activo"
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.25rem', opacity: 0.65 }}
                                title="Eliminar"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* VISTA 3: POR CUENTA — Misma estructura de tarjeta limpia y desglose sutil */}
        {activeFilter === 'account' && accountGroups.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {accountGroups.map(group => {
              const isExpanded = Boolean(expandedAccounts[group.location]);
              const pctOfTotal = grandTotalUsd > 0 ? (group.totalUsd / grandTotalUsd) * 100 : 0;
              const primaryItem = group.items[0];

              return (
                <div
                  key={group.location}
                  className="glass-card"
                  style={{
                    borderRadius: '16px',
                    padding: '1rem 1.15rem',
                    border: isExpanded ? '1px solid rgba(16, 185, 129, 0.35)' : undefined,
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  {/* Cabecera con la misma proporción que las tarjetas de "Todos" */}
                  <div
                    onClick={() => toggleAccountExpand(group.location)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'stretch',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {group.location}
                        </span>
                        <span style={{ fontSize: '0.65rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', padding: '0.1rem 0.38rem', borderRadius: '4px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                          {group.items.length} {group.items.length === 1 ? 'activo' : 'activos'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {group.items.map(i => `${formatAmount(i.amountNum, i.symbol)} ${i.displayName}`).join('  •  ')}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          ${formatAmount(group.totalUsd, 'USD')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {pctOfTotal.toFixed(1)}% del total
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
                      {primaryItem && (
                        <CurrencyIcon symbol={primaryItem.symbol} type={primaryItem.type} size={38} />
                      )}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          color: isExpanded ? 'var(--color-accent)' : 'var(--text-secondary)',
                          marginTop: '0.85rem'
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Desglose sutil y moderno integrado en la misma tarjeta */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.2rem'
                      }}
                    >
                      {group.items.map((item, idx) => {
                        const rateText = getRateString(item.symbol, item.rateVal);
                        const isLast = idx === group.items.length - 1;
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.55rem 0.25rem',
                              borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
                              gap: '0.75rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                              <CurrencyIcon symbol={item.symbol} type={item.type} size={30} />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {item.displayName}
                                  </span>
                                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                    {formatAmount(item.amountNum, item.symbol)} {item.displayName}
                                  </span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>•</span>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    ${formatAmount(item.usdVal, 'USD')}
                                  </span>
                                </div>
                                {rateText && (
                                  <div style={{ fontSize: '0.68rem', color: 'var(--color-accent)', marginTop: '1px' }}>
                                    ~ {rateText}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => onAdjustAsset(item)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-info)', cursor: 'pointer', padding: '0.25rem', opacity: 0.85 }}
                                title="Ajustar saldo"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteAsset(item.id, item.name, item.location)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.25rem', opacity: 0.65 }}
                                title="Eliminar"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <VerifyBalancesModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        assets={assets}
        transactions={transactions}
        onAdjustBalance={onAdjustBalance}
      />
    </>
  );
}
