import PlanningTabHeader from './PlanningTabHeader';
import { Icon } from '../../ui';
import React, { useMemo, useContext } from 'react';
import { formatAmount, getBudgetColor, formatPercent } from '../../../utils/formatters';
import { calculateBudgetStats, calculateMonthlySpendingCap } from '../../../domain/dashboard';
import { FinanceContext } from '../../../context/FinanceContext';

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Tarjeta del tope total del mes: cuenta TODOS los gastos, incluso los de
 * categorías sin presupuesto, y dice cuánto queda o cuánto te pasaste.
 */
function MonthlyCapCard({ cap, onEdit }) {
  const monthName = MONTH_NAMES[new Date().getMonth()];
  if (!cap.hasLimit) {
    return (
      <div className="cap-card">
        <div className="cap-card-head">
          <div>
            <div className="cap-card-label">Gastado en {monthName}</div>
            <div className="cap-card-amount">${formatAmount(cap.spent, 'USD')}</div>
          </div>
        </div>
        <p className="cap-card-text">
          Pon un tope total para el mes y la app sumará todos tus gastos, también los de categorías sin presupuesto.
        </p>
        {onEdit && (
          <button type="button" className="btn btn-secondary cap-card-btn" onClick={onEdit}>
            Definir tope del mes
          </button>
        )}
      </div>
    );
  }

  const color = getBudgetColor(cap.percent);
  return (
    <div className={`cap-card${cap.exceeded ? ' exceeded' : ''}`}>
      <div className="cap-card-head">
        <div style={{ minWidth: 0 }}>
          <div className="cap-card-label">Tope total de {monthName}</div>
          <div className="cap-card-amount">
            ${formatAmount(cap.spent, 'USD')} <span className="cap-card-of">/ ${formatAmount(cap.limit, 'USD')}</span>
          </div>
        </div>
        <span className="cap-card-pct" style={{ color }}>{formatPercent(cap.percent, 0)}</span>
      </div>
      <div className="cap-bar"><div className="cap-bar-fill" style={{ width: `${Math.min(cap.percent, 100)}%`, backgroundColor: color }} /></div>
      <div className={`cap-card-status${cap.exceeded ? ' danger' : ''}`}>
        {cap.exceeded
          ? `Te pasaste por $${formatAmount(cap.spent - cap.limit, 'USD')}`
          : `Te quedan $${formatAmount(cap.remaining, 'USD')} · unos $${formatAmount(cap.dailyAllowance, 'USD')} por día (${cap.daysLeft} ${cap.daysLeft === 1 ? 'día' : 'días'})`}
      </div>
      {cap.outsideBudgets > 0 && (
        <div className="cap-card-detail">
          <span>Gastos sin presupuesto de categoría</span>
          <span>${formatAmount(cap.outsideBudgets, 'USD')}</span>
        </div>
      )}
      {cap.categoryBudgetsTotal > cap.limit && (
        <div className="cap-card-detail warning">
          <span>Tus presupuestos por categoría suman ${formatAmount(cap.categoryBudgetsTotal, 'USD')}, más que el tope</span>
        </div>
      )}
      {onEdit && (
        <button type="button" className="link-btn cap-card-edit" onClick={onEdit}>Cambiar tope</button>
      )}
    </div>
  );
}

export default function PlanningBudgetsTab({
  budgets = {},
  transactions = [],
  rates = {},
  getCategoryName,
  onOpenCategories,
  onOpenBudgetModal,
  monthlyLimit: monthlyLimitProp
}) {
  const finance = useContext(FinanceContext);
  const monthlyLimit = monthlyLimitProp ?? finance?.monthlyLimit ?? 0;

  const budgetStats = useMemo(
    () => calculateBudgetStats(transactions, budgets, rates, getCategoryName),
    [transactions, budgets, rates, getCategoryName]
  );

  const capStats = useMemo(
    () => calculateMonthlySpendingCap(transactions, rates, monthlyLimit, budgetStats),
    [transactions, rates, monthlyLimit, budgetStats]
  );

  return (
    <div>
      <PlanningTabHeader
        hint="Cuánto quieres gastar como máximo cada mes."
        actions={[
          onOpenCategories && { label: 'Categorías', onClick: onOpenCategories },
          onOpenBudgetModal && budgetStats.activeBudgetCategories.length > 0 && { label: 'Editar límites', onClick: onOpenBudgetModal, primary: true }
        ]}
      />

      <MonthlyCapCard cap={capStats} onEdit={onOpenBudgetModal} />

      {budgetStats.activeBudgetCategories.length === 0 ? (
        <div className="glass-card" style={{ padding: '2rem 1rem', textAlign: 'center', borderRadius: '16px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🎯</span>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Sin presupuestos por categoría
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
              Definir por categoría
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
                  Suma de presupuestos por categoría
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
                {formatPercent(budgetStats.totalPercent, 1)}
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
                  ? `Te pasaste por $${formatAmount(budgetStats.totalSpentInBudgets - budgetStats.totalBudgetUsd, 'USD')}`
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
                        {formatPercent(percent, 0)}
                      </span>
                      {isExceeded && <span style={{ color: 'var(--color-danger)', display: 'inline-flex' }}><Icon name="alert" size={14} title="Te pasaste del límite" /></span>}
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
