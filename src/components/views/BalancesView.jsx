import { useState, useMemo } from 'react';
import EmptyState from '../common/EmptyState';
import CurrencyIcon from '../common/CurrencyIcon';
import { formatAmount, getRateString } from '../../utils/formatters';

export default function BalancesView({
  grandTotalUsd,
  rates,
  assets,
  activeFilter,
  setActiveFilter,
  setSelectedFilters,
  assetsByLocation,
  accountTotalsUsd,
  deleteMode,
  onAdjustAsset,
  onDeleteAsset,
  auth,
  onOpenAuthModal,
  onExportBackup,
  onNavigateToCalculator
}) {
  const [expandedCurrencies, setExpandedCurrencies] = useState({});
  const [expandedAccounts, setExpandedAccounts] = useState({});

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
      const usdVal = amount * rateVal;

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
      map[sym].totalAmount += amount;
      map[sym].totalUsd += usdVal;
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
      const usdVal = amount * rateVal;

      if (!map[loc]) {
        map[loc] = {
          location: loc,
          totalUsd: 0,
          items: []
        };
      }
      map[loc].totalUsd += usdVal;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ color: '#98989d', fontSize: '0.9rem' }}>
            Balance General
          </div>
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              style={{
                background: auth?.user ? '#14332b' : '#1b2230',
                border: `1px solid ${auth?.user ? '#1f5143' : '#2a3447'}`,
                borderRadius: '9999px',
                padding: '4px 10px',
                color: auth?.user ? '#10b981' : '#94a3b8',
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
                      : auth.pendingCount > 0
                      ? `Pendiente (${auth.pendingCount})`
                      : auth.syncStatus === 'error'
                      ? 'Error, reintentar'
                      : 'Sincronizado')
                  : 'Modo local'}
              </span>
            </button>
          )}
        </div>
        <div style={{ fontSize: 'clamp(1.8rem, 7vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: '#f1f5f9', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'clamp(1.2rem, 5vw, 1.6rem)' }}>$</span>
          {formatAmount(grandTotalUsd, 'USD')}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Bs {rates['VES'] ? (1 / rates['VES']).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'} / $
        </div>

        {/* Banner visible y fijo si Supabase no está configurado */}
        {auth && !auth.isSupabaseConfigured && (
          <div
            style={{
              marginTop: '1rem',
              background: '#231c12',
              border: '1px solid #5a3e1b',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: '1.2' }}>📱</span>
              <div style={{ fontSize: '0.82rem', color: '#fde68a', lineHeight: '1.35', fontWeight: 500 }}>
                Tus datos están guardados solo en este teléfono. Haz respaldos frecuentes.
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={onExportBackup || onNavigateToCalculator}
                style={{
                  background: '#f59e0b',
                  color: '#1a1306',
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
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN DE CUENTAS */}
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'flex',
            gap: '1.25rem',
            borderBottom: '1px solid #2a3447',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '2px'
          }}
        >
          <button
            onClick={() => { setActiveFilter('all'); if (setSelectedFilters) setSelectedFilters([]); }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.5rem 0',
              color: activeFilter === 'all' ? '#10b981' : '#94a3b8',
              borderBottom: activeFilter === 'all' ? '2px solid #10b981' : '2px solid transparent',
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
              color: activeFilter === 'asset' ? '#10b981' : '#94a3b8',
              borderBottom: activeFilter === 'asset' ? '2px solid #10b981' : '2px solid transparent',
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
              color: activeFilter === 'account' ? '#10b981' : '#94a3b8',
              borderBottom: activeFilter === 'account' ? '2px solid #10b981' : '2px solid transparent',
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
      </div>

      <div style={{ padding: '0 1rem', marginBottom: '2rem', width: '100%', boxSizing: 'border-box' }}>
        {assets.length === 0 && (
          <EmptyState icon="🏦" message="No se encontraron cuentas" />
        )}

        {/* VISTA 1: TODOS */}
        {activeFilter === 'all' && Object.entries(assetsByLocation).map(([location, locAssets]) => (
          <div key={location} className="portfolio-section">
            <div className="portfolio-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', marginBottom: '0.5rem', gap: '0.75rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{location}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', flexShrink: 0 }}>${formatAmount(accountTotalsUsd[location], 'USD') || 0}</span>
            </div>

            <div className="capsule-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {locAssets.map(asset => {
                const assetSymbol = (asset.name || '').trim().toUpperCase();
                const rateVal = getRateForSymbol(assetSymbol);
                const isUnrecognized = !rateVal || rateVal <= 0;
                const valueUsd = Number(asset.amount) * rateVal;
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
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</span>
                        <span style={{ fontSize: '0.65rem', background: '#232c3d', border: '1px solid #2a3447', padding: '0.1rem 0.35rem', borderRadius: '4px', marginLeft: '0.5rem', color: '#94a3b8', flexShrink: 0 }}>{assetSymbol}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formatAmount(asset.amount, assetSymbol)} {assetDisplayName}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ${formatAmount(valueUsd, 'USD')}
                      </div>
                      {getRateString(assetSymbol, rateVal) && (
                        <div style={{ fontSize: '0.7rem', color: '#10b981', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ~ {getRateString(assetSymbol, rateVal)}
                        </div>
                      )}
                      {isUnrecognized && (
                        <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                          <span>⚠️ Moneda no reconocida en Binance o mal escrita</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', height: '100%', justifyContent: 'space-between', flexShrink: 0 }}>
                      <CurrencyIcon symbol={assetSymbol} type={asset.type} size={38} />
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexShrink: 0 }}>
                        <button
                          onClick={() => onAdjustAsset(asset)}
                          style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.25rem', opacity: deleteMode ? 1 : 0.85 }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button
                          onClick={() => onDeleteAsset(asset.id, asset.name, asset.location)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', opacity: deleteMode ? 1 : 0.6 }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ width: '50%', margin: '2rem auto', borderBottom: '1px solid #2a3447' }}></div>
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
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.displayName}</span>
                        <span style={{ fontSize: '0.65rem', background: '#232c3d', border: '1px solid #2a3447', padding: '0.1rem 0.35rem', borderRadius: '4px', color: '#94a3b8', flexShrink: 0 }}>
                          {group.symbol}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>
                          • {group.items.length} {group.items.length === 1 ? 'cuenta' : 'cuentas'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formatAmount(group.totalAmount, group.symbol)} {group.displayName}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9' }}>
                          ${formatAmount(group.totalUsd, 'USD')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                          {pctOfTotal.toFixed(1)}% del total
                        </span>
                      </div>

                      {rateText && (
                        <div style={{ fontSize: '0.7rem', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ~ {rateText}
                        </div>
                      )}
                      {group.isUnrecognized && (
                        <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>
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
                          color: isExpanded ? '#10b981' : '#94a3b8',
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
                                  background: '#10b981',
                                  opacity: 0.75,
                                  flexShrink: 0
                                }}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.location}
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>
                                    {shareInCurrency.toFixed(0)}%
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span>{formatAmount(item.amountNum, group.symbol)} {group.displayName}</span>
                                  <span style={{ color: '#475569' }}>•</span>
                                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>${formatAmount(item.usdVal, 'USD')}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => onAdjustAsset(item)}
                                style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.25rem', opacity: 0.85 }}
                                title="Ajustar saldo"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteAsset(item.id, item.name, item.location)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', opacity: 0.65 }}
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
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {group.location}
                        </span>
                        <span style={{ fontSize: '0.65rem', background: '#232c3d', border: '1px solid #2a3447', padding: '0.1rem 0.38rem', borderRadius: '4px', color: '#94a3b8', flexShrink: 0 }}>
                          {group.items.length} {group.items.length === 1 ? 'activo' : 'activos'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {group.items.map(i => `${formatAmount(i.amountNum, i.symbol)} ${i.displayName}`).join('  •  ')}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9' }}>
                          ${formatAmount(group.totalUsd, 'USD')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
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
                          color: isExpanded ? '#10b981' : '#94a3b8',
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
                                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
                                    {item.displayName}
                                  </span>
                                  <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                                    {formatAmount(item.amountNum, item.symbol)} {item.displayName}
                                  </span>
                                  <span style={{ color: '#475569', fontSize: '0.75rem' }}>•</span>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>
                                    ${formatAmount(item.usdVal, 'USD')}
                                  </span>
                                </div>
                                {rateText && (
                                  <div style={{ fontSize: '0.68rem', color: '#10b981', marginTop: '1px' }}>
                                    ~ {rateText}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => onAdjustAsset(item)}
                                style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.25rem', opacity: 0.85 }}
                                title="Ajustar saldo"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteAsset(item.id, item.name, item.location)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', opacity: 0.65 }}
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
    </>
  );
}
