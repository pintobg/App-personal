import React, { useMemo } from 'react';
import { formatAmount, getBudgetColor, translateCategory, getTxUsdEquivalent } from '../../../utils/formatters';

export default function PlanningBudgetsTab({
  budgets = {},
  transactions = [],
  rates = {},
  getCategoryName,
  onOpenCategories,
  onOpenBudgetModal
}) {
  const budgetStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthSpents = (transactions || []).filter(t => {
      if (t.type !== 'spent' || !t.date) return false;
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const categorySpentMap = {};
    monthSpents.forEach(t => {
      const cat = (t.category_id && getCategoryName ? getCategoryName(t.category_id) : '') || translateCategory(t.category) || 'Otros';
      const usdAmount = getTxUsdEquivalent(t, rates);
      categorySpentMap[cat] = (categorySpentMap[cat] || 0) + usdAmount;
      if (t.category_id) {
        categorySpentMap[t.category_id] = (categorySpentMap[t.category_id] || 0) + usdAmount;
      }
    });

    const activeBudgetCategories = Object.entries(budgets || {})
      .filter(([_, limit]) => Number(limit) > 0)
      .map(([catKey, limit]) => {
        const displayName = (getCategoryName ? getCategoryName(catKey) : '') || translateCategory(catKey) || catKey;
        const spent = categorySpentMap[displayName] || categorySpentMap[catKey] || 0;
        const numLimit = Number(limit);
        const percent = numLimit > 0 ? (spent / numLimit) * 100 : 0;
        return {
          category: displayName,
          rawKey: catKey,
          limit: numLimit,
          spent,
          percent
        };
      })
      .sort((a, b) => b.percent - a.percent);

    const totalBudgetUsd = activeBudgetCategories.reduce((sum, item) => sum + item.limit, 0);
    const totalSpentInBudgets = activeBudgetCategories.reduce((sum, item) => sum + item.spent, 0);
    const totalPercent = totalBudgetUsd > 0 ? (totalSpentInBudgets / totalBudgetUsd) * 100 : 0;

    return {
      activeBudgetCategories,
      totalBudgetUsd,
      totalSpentInBudgets,
      totalPercent
    };
  }, [transactions, budgets, rates, getCategoryName]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>Presupuestos del Mes</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Límites mensuales de gasto</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onOpenCategories && (
            <button
              type="button"
              onClick={onOpenCategories}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              🏷️ Categorías
            </button>
          )}
          {onOpenBudgetModal && (
            <button
              type="button"
              onClick={onOpenBudgetModal}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: 'var(--color-accent-soft)',
                border: '1px solid var(--color-accent-border)',
                color: 'var(--color-accent)',
                cursor: 'pointer'
              }}
            >
              ⚙️ Ajustar límites
            </button>
          )}
        </div>
      </div>

      {budgetStats.activeBudgetCategories.length === 0 ? (
        <div className="glass-card" style={{ padding: '2rem 1rem', textAlign: 'center', borderRadius: '16px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🎯</span>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Sin presupuestos definidos
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Establece límites de gasto mensuales para mantener tus finanzas bajo control.
          </div>
          {onOpenBudgetModal && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenBudgetModal}
              style={{ fontSize: '0.88rem', padding: '0.6rem 1.25rem', borderRadius: '12px' }}
            >
              Definir presupuestos
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* RESUMEN TOTAL CONSUMIDO */}
          <div
            className="glass-card"
            style={{
              padding: '1rem 1.15rem',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Presupuesto Total Consumido
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  ${formatAmount(budgetStats.totalSpentInBudgets, 'USD')}{' '}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    / ${formatAmount(budgetStats.totalBudgetUsd, 'USD')}
                  </span>
                </div>
              </div>
              <div
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: getBudgetColor(budgetStats.totalPercent),
                  border: '1px solid var(--border-color)'
                }}
              >
                {budgetStats.totalPercent.toFixed(1)}%
              </div>
            </div>

            <div
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: 'var(--bg-surface-elevated)',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(budgetStats.totalPercent, 100)}%`,
                  backgroundColor: getBudgetColor(budgetStats.totalPercent),
                  borderRadius: '5px',
                  transition: 'width 0.4s ease, background-color 0.3s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>
                {budgetStats.totalPercent >= 100
                  ? `⚠️ Excedido por $${formatAmount(budgetStats.totalSpentInBudgets - budgetStats.totalBudgetUsd, 'USD')}`
                  : `Disponible: $${formatAmount(budgetStats.totalBudgetUsd - budgetStats.totalSpentInBudgets, 'USD')}`}
              </span>
              <span>
                {budgetStats.activeBudgetCategories.length} categorías activas
              </span>
            </div>
          </div>

          {/* LISTA POR CATEGORÍA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {budgetStats.activeBudgetCategories.map(item => {
              const percent = item.percent;
              const isExceeded = percent >= 100;
              const barColor = getBudgetColor(percent);

              return (
                <div
                  key={item.rawKey}
                  className="glass-card"
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.category}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: barColor }}>
                        {percent.toFixed(0)}%
                      </span>
                      {isExceeded && <span style={{ fontSize: '0.72rem', color: 'var(--color-danger)' }}>⚠️</span>}
                    </div>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      overflow: 'hidden',
                      marginBottom: '0.4rem'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(percent, 100)}%`,
                        backgroundColor: barColor,
                        borderRadius: '3px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>${formatAmount(item.spent, 'USD')} gastados</span>
                    <span>Límite: ${formatAmount(item.limit, 'USD')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
