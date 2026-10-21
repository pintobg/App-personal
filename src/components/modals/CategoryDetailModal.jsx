import { useState, useMemo, useEffect } from 'react';
import EmptyState from '../common/EmptyState';
import {
  formatAmount,
  getCurrencySymbol,
  getTxUsdEquivalent,
  getBudgetColor,
  translateCategory
} from '../../utils/formatters';
import { toLocalDateString } from '../../utils/dates';

const CATEGORY_ICONS = {
  'Vivienda': '🏠',
  'Alimentación': '🍔',
  'Transporte': '🚗',
  'Salud': '💊',
  'Entretenimiento': '🎉',
  'Compras': '🛍️',
  'Cuidado Personal': '💈',
  'Educación': '📚',
  'Deudas/Préstamos': '💳',
  'Sin categoría': '❓',
  'Transferencia': '🔄',
  'Otros': '📦'
};

const TIMEFRAME_LABELS = {
  daily: 'Diario (Hoy)',
  weekly: 'Últimos 7 días',
  monthly: 'Último mes',
  all: 'Todo el historial'
};

function formatReadableDate(dateStr) {
  if (!dateStr) return 'Sin fecha';
  const clean = toLocalDateString(dateStr);
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const m = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} ${months[m] || parts[1]} ${parts[0]}`;
}

export default function CategoryDetailModal({
  onClose,
  categoryName,
  categoryColor = '#10b981',
  timeFrame = 'monthly',
  transactions = [],
  assets = [],
  rates = {},
  budgets = {},
  totalPeriodSpentUsd = 0
}) {
  const [scope, setScope] = useState('period'); // 'period' | 'all'
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');

  // Asegurar que al abrir esta página el scroll inicie arriba
  useEffect(() => {
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
      contentArea.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [categoryName]);

  const assetMap = useMemo(() => {
    const map = {};
    (assets || []).forEach(a => {
      map[a.id] = a;
    });
    return map;
  }, [assets]);

  const categoryTransactions = useMemo(() => {
    if (!categoryName) return [];
    const now = new Date();
    const filterDate = new Date();
    if (timeFrame === 'daily') {
      filterDate.setHours(0, 0, 0, 0);
    } else if (timeFrame === 'weekly') {
      filterDate.setDate(now.getDate() - 7);
    } else if (timeFrame === 'monthly') {
      filterDate.setMonth(now.getMonth() - 1);
    }

    return (transactions || [])
      .filter(tx => {
        if (tx.type !== 'spent') return false;
        const translated = translateCategory(tx.category) || 'Sin categoría';
        if (translated !== categoryName && tx.category !== categoryName) return false;
        if (scope === 'period' && timeFrame !== 'all') {
          return new Date(tx.date) >= filterDate;
        }
        return true;
      })
      .map(tx => ({
        ...tx,
        usdEquivalent: getTxUsdEquivalent(tx, rates)
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [categoryName, transactions, timeFrame, scope, rates]);

  const subcategoryBreakdown = useMemo(() => {
    const map = {};
    let total = 0;
    categoryTransactions.forEach(tx => {
      const sub = tx.subcategory && tx.subcategory.trim() ? tx.subcategory.trim() : 'General';
      if (!map[sub]) {
        map[sub] = { name: sub, usd: 0, count: 0 };
      }
      map[sub].usd += tx.usdEquivalent;
      map[sub].count += 1;
      total += tx.usdEquivalent;
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        percent: total > 0 ? (item.usd / total) * 100 : 0
      }))
      .sort((a, b) => b.usd - a.usd);
  }, [categoryTransactions]);

  const visibleTransactions = useMemo(() => {
    if (selectedSubcategory === 'all') return categoryTransactions;
    return categoryTransactions.filter(tx => {
      const sub = tx.subcategory && tx.subcategory.trim() ? tx.subcategory.trim() : 'General';
      return sub === selectedSubcategory;
    });
  }, [categoryTransactions, selectedSubcategory]);

  if (!categoryName) return null;

  const icon = CATEGORY_ICONS[categoryName] || '🏷️';
  const totalCategoryUsd = categoryTransactions.reduce((sum, tx) => sum + tx.usdEquivalent, 0);
  const bcvRate = rates?.VES && rates.VES > 0 ? 1 / rates.VES : 0;
  const totalCategoryBs = totalCategoryUsd * bcvRate;

  const txCount = categoryTransactions.length;
  const avgTxUsd = txCount > 0 ? totalCategoryUsd / txCount : 0;
  const maxTxUsd = txCount > 0 ? Math.max(...categoryTransactions.map(t => t.usdEquivalent)) : 0;

  const shareOfTotal = scope === 'period' && totalPeriodSpentUsd > 0
    ? (totalCategoryUsd / totalPeriodSpentUsd) * 100
    : null;

  const monthlyBudgetLimit = Number(budgets?.[categoryName]) || 0;
  const budgetPercent = monthlyBudgetLimit > 0 ? (totalCategoryUsd / monthlyBudgetLimit) * 100 : 0;

  return (
    <div className="view-container page-enter" style={{ padding: '0 1rem 2rem', color: 'var(--text-primary)' }}>
      {/* ENCABEZADO DE PÁGINA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 0',
          marginBottom: '1rem',
          borderBottom: '1px solid #2a3447',
          gap: '0.5rem'
        }}
      >
        <button
          type="button"
          className="modal-back-btn"
          onClick={onClose}
          aria-label="Volver a Inicio"
          style={{ padding: '6px 12px 6px 8px', fontSize: '0.82rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Inicio</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{icon}</span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {translateCategory(categoryName)}
          </h2>
        </div>

        <div style={{ width: '68px', flexShrink: 0 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* SELECTOR DE ALCANCE: PERÍODO ACTUAL VS TODO EL HISTORIAL */}
        {timeFrame !== 'all' && (
          <div className="segmented-control">
            <button
              type="button"
              className={`segmented-btn ${scope === 'period' ? 'active-success' : ''}`}
              onClick={() => { setScope('period'); setSelectedSubcategory('all'); }}
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.65rem' }}
            >
              Período: {TIMEFRAME_LABELS[timeFrame] || 'Actual'}
            </button>
            <button
              type="button"
              className={`segmented-btn ${scope === 'all' ? 'active-success' : ''}`}
              onClick={() => { setScope('all'); setSelectedSubcategory('all'); }}
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.65rem' }}
            >
              Todo el Historial
            </button>
          </div>
        )}

        {/* TARJETA PRINCIPAL DE RESUMEN */}
        <div
          className="glass-card"
          style={{
            padding: '1.1rem 1.15rem',
            borderRadius: '16px',
            background: '#1b2230',
            border: `1px solid ${categoryColor}55`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Gastado en {translateCategory(categoryName)}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9', marginTop: '0.25rem', lineHeight: 1.15 }}>
                ${formatAmount(totalCategoryUsd, 'USD')} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>USD</span>
              </div>
              {bcvRate > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  ≈ Bs. {formatAmount(totalCategoryBs, 'VES')} (Tasa BCV)
                </div>
              )}
            </div>

            {shareOfTotal !== null && (
              <div
                style={{
                  padding: '0.4rem 0.7rem',
                  borderRadius: '12px',
                  background: '#232c3d',
                  border: `1px solid ${categoryColor}`,
                  color: categoryColor,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  flexShrink: 0
                }}
              >
                <div>{shareOfTotal.toFixed(1)}%</div>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 500 }}>del total</div>
              </div>
            )}
          </div>

          {/* Métricas rápidas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              marginTop: '0.95rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid #2a3447',
              textAlign: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Movimientos</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>
                {txCount}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #2a3447', borderRight: '1px solid #2a3447' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Promedio</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>
                ${formatAmount(avgTxUsd, 'USD')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Mayor Gasto</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444', marginTop: '2px' }}>
                ${formatAmount(maxTxUsd, 'USD')}
              </div>
            </div>
          </div>

          {/* Estado del presupuesto mensual si existe */}
          {monthlyBudgetLimit > 0 && (
            <div style={{ marginTop: '0.9rem', paddingTop: '0.8rem', borderTop: '1px solid #2a3447' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>
                  Presupuesto mensual asignado: <strong style={{ color: '#f1f5f9' }}>${formatAmount(monthlyBudgetLimit, 'USD')}</strong>
                </span>
                <span style={{ fontWeight: 700, color: getBudgetColor(budgetPercent) }}>
                  {budgetPercent.toFixed(0)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '7px', borderRadius: '4px', background: '#232c3d', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(budgetPercent, 100)}%`,
                    height: '100%',
                    background: getBudgetColor(budgetPercent),
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* DESGLOSE POR SUBCATEGORÍAS / CONCEPTOS */}
        {subcategoryBreakdown.length > 0 && (
          <div className="glass-card" style={{ padding: '0.95rem 1.1rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                Subcategorías ({subcategoryBreakdown.length})
              </span>
              {selectedSubcategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory('all')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#10b981',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Ver todas
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {subcategoryBreakdown.map(sub => {
                const isActive = selectedSubcategory === sub.name;
                return (
                  <button
                    key={sub.name}
                    type="button"
                    onClick={() => setSelectedSubcategory(prev => (prev === sub.name ? 'all' : sub.name))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.7rem',
                      borderRadius: '10px',
                      border: isActive ? `1px solid ${categoryColor}` : '1px solid #2a3447',
                      background: isActive ? '#232c3d' : '#171d29',
                      color: '#f1f5f9',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{sub.name}</span>
                    <span style={{ color: categoryColor, fontWeight: 700 }}>
                      ${formatAmount(sub.usd, 'USD')}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                      ({sub.percent.toFixed(0)}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LISTA DE TRANSACCIONES DE LA CATEGORÍA */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
              Transacciones realizadas ({visibleTransactions.length})
            </h3>
          </div>

          {visibleTransactions.length === 0 ? (
            <EmptyState icon="🧾" message="No hay transacciones registradas en esta categoría para este período" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {visibleTransactions.map(tx => {
                const asset = assetMap[tx.origin];
                const accountLabel = asset
                  ? `${asset.location} (${asset.name})`
                  : (tx.origin || 'Cuenta eliminada');
                const txPct = totalCategoryUsd > 0 ? (tx.usdEquivalent / totalCategoryUsd) * 100 : 0;

                return (
                  <div
                    key={tx.id}
                    className="glass-card"
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: '#1b2230'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: '#232c3d',
                          border: `1px solid ${categoryColor}55`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.1rem',
                          flexShrink: 0
                        }}
                      >
                        {icon}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: '#f1f5f9',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {tx.subcategory && tx.subcategory.trim() ? tx.subcategory : translateCategory(categoryName)}
                        </div>
                        <div
                          style={{
                            fontSize: '0.74rem',
                            color: '#94a3b8',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {formatReadableDate(tx.date)} • {accountLabel}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ef4444' }}>
                        -{getCurrencySymbol(tx.currency)}{formatAmount(tx.amount, tx.currency)} {tx.currency}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        {tx.currency !== 'USD' && tx.currency !== 'USDT'
                          ? `≈ $${formatAmount(tx.usdEquivalent, 'USD')} USD • `
                          : ''}
                        <span style={{ color: categoryColor, fontWeight: 600 }}>
                          {txPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
