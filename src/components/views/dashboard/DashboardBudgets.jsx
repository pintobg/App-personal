import React from 'react';
import { formatAmount, getBudgetColor, translateCategory } from '../../../utils/formatters';
import { tint } from '../../../utils/colors';

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

export default function DashboardBudgets({
  budgetStats,
  onOpenBudgetModal,
  onOpenCategories,
  allCategories = []
}) {
  return (
    <div style={{ marginTop: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="section-title" style={{ padding: 0, color: 'var(--text-primary)', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>
            Presupuestos Mensuales
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Control de gasto mensual por categoría
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {onOpenCategories && (
            <button
              type="button"
              className="btn"
              onClick={onOpenCategories}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              🏷️ Categorías
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={onOpenBudgetModal}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: 'var(--color-accent-soft)',
              border: '1px solid var(--color-accent-border)',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Ajustar
          </button>
        </div>
      </div>

      {budgetStats.activeBudgetCategories.length === 0 ? (
        <div className="glass-card" style={{ padding: '1.25rem 1rem', textAlign: 'center', borderRadius: '16px' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎯</span>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Sin presupuestos definidos
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Establece límites de gasto para mantener tus finanzas bajo control.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenBudgetModal}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
          >
            Definir presupuestos
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* INDICADOR GENERAL TOTAL */}
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
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Presupuesto Total Consumido
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  border: '1px solid var(--border-color)',
                  flexShrink: 0
                }}
              >
                {budgetStats.totalPercent.toFixed(1)}%
              </div>
            </div>

            {/* BARRA DE PROGRESO GENERAL */}
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
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                {budgetStats.totalPercent >= 100
                  ? `⚠️ Excedido por $${formatAmount(budgetStats.totalSpentInBudgets - budgetStats.totalBudgetUsd, 'USD')}`
                  : `Disponible: $${formatAmount(budgetStats.totalBudgetUsd - budgetStats.totalSpentInBudgets, 'USD')}`}
              </span>
              <span style={{ flexShrink: 0, marginLeft: '0.5rem' }}>
                {budgetStats.activeBudgetCategories.length} categorías activas
              </span>
            </div>
          </div>

          {/* LISTA DE CATEGORÍAS INDIVIDUALES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {budgetStats.activeBudgetCategories.map(item => {
              const color = getBudgetColor(item.percent);
              const isOverBudget = item.percent > 100;
              const catObj = allCategories.find(c => c.name === item.category || c.id === item.category || c.id === item.rawKey);
              const icon = catObj?.icon || CATEGORY_ICONS[item.category] || '🏷️';
              const catBrandColor = catObj?.color || 'var(--color-accent)';

              return (
                <div
                  key={item.category}
                  className="glass-card"
                  style={{
                    padding: '1rem 1.15rem',
                    borderRadius: '16px',
                    backgroundColor: 'var(--bg-surface)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          backgroundColor: tint(catBrandColor, 0.15),
                          border: `1.5px solid ${tint(catBrandColor, 0.31)}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.15rem',
                          flexShrink: 0
                        }}
                      >
                        {icon}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {translateCategory(item.category)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Límite: ${formatAmount(item.limit, 'USD')}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isOverBudget ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                        ${formatAmount(item.spent, 'USD')}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: color
                        }}
                      >
                        {item.percent.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE PROGRESO INDIVIDUAL */}
                  <div
                    style={{
                      width: '100%',
                      height: '7px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(item.percent, 100)}%`,
                        backgroundColor: color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease, background-color 0.3s ease'
                      }}
                    />
                  </div>

                  {isOverBudget && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', marginTop: '0.35rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>⚠️ Superado por ${formatAmount(item.spent - item.limit, 'USD')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
