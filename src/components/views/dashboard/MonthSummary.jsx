import React from 'react';
import { formatAmount, formatPercent } from '../../../utils/formatters';

export default function MonthSummary({
  monthlyMetrics,
  isBalanceHidden,
  onNavigateTransactions
}) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
        <span className="form-section-label" style={{ margin: 0 }}>Este mes</span>
        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>vs. mes anterior</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <div
          className="glass-card"
          style={{ padding: '0.85rem 0.75rem', borderRadius: '14px', backgroundColor: 'var(--bg-surface)', cursor: 'pointer', textAlign: 'center' }}
          onClick={() => onNavigateTransactions && onNavigateTransactions('income')}
          role="button"
          tabIndex={0}
          aria-label="Ver movimientos de ingreso"
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
            <span style={{ color: 'var(--color-income)' }}>↑</span> Ingresos
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            ${isBalanceHidden ? '***' : formatAmount(monthlyMetrics.curIncome, 'USD')}
          </div>
          <div style={{ fontSize: '0.68rem', color: monthlyMetrics.incomeDeltaPct >= 0 ? 'var(--color-income)' : 'var(--color-expense)', marginTop: '0.2rem', fontWeight: 600 }}>
            {monthlyMetrics.incomeDeltaPct != null ? `${formatPercent(monthlyMetrics.incomeDeltaPct, 0, { signed: true })} ant.` : 'Actual'}
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '0.85rem 0.75rem', borderRadius: '14px', backgroundColor: 'var(--bg-surface)', cursor: 'pointer', textAlign: 'center' }}
          onClick={() => onNavigateTransactions && onNavigateTransactions('spent')}
          role="button"
          tabIndex={0}
          aria-label="Ver movimientos de gasto"
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
            <span style={{ color: 'var(--color-expense)' }}>↓</span> Gastos
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            ${isBalanceHidden ? '***' : formatAmount(monthlyMetrics.curSpent, 'USD')}
          </div>
          <div style={{ fontSize: '0.68rem', color: monthlyMetrics.spentDeltaPct > 0 ? 'var(--color-expense)' : 'var(--color-income)', marginTop: '0.2rem', fontWeight: 600 }}>
            {monthlyMetrics.spentDeltaPct != null ? `${formatPercent(monthlyMetrics.spentDeltaPct, 0, { signed: true })} ant.` : 'Actual'}
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '0.85rem 0.75rem', borderRadius: '14px', backgroundColor: 'var(--bg-surface)', textAlign: 'center' }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
            Diferencia
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: monthlyMetrics.curNet >= 0 ? 'var(--color-income)' : 'var(--color-expense)', marginTop: '0.25rem' }}>
            {monthlyMetrics.curNet >= 0 ? '+' : ''}${isBalanceHidden ? '***' : formatAmount(monthlyMetrics.curNet, 'USD')}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {monthlyMetrics.prevNet !== 0 ? (
              <span>Ant: {monthlyMetrics.prevNet >= 0 ? '+' : ''}${formatAmount(monthlyMetrics.prevNet, 'USD')}</span>
            ) : (
              <span>Balance neto</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
