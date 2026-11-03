import React from 'react';
import { formatAmount, getCurrencySymbol, translateCategory } from '../../../utils/formatters';

export default function DashboardAlerts({ alerts = [] }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🔔</span>
          <span>Alertas y Vencimientos</span>
          {alerts.length > 0 && (
            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '9999px', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', fontWeight: 700 }}>
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span style={{ color: 'var(--color-income)', fontWeight: 'bold' }}>✓</span>
          <span>Todo al día: sin pagos urgentes en 7 días ni presupuestos en alerta.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {alerts.slice(0, 4).map(alert => {
            const isPayment = alert.type === 'payment';
            const isCashea = alert.type === 'cashea';
            const isBudget = alert.type === 'budget';

            const icon = isCashea ? '🛍️' : isPayment ? '💸' : '📊';
            const borderColor = isPayment
              ? 'var(--color-danger-border)'
              : isCashea
              ? 'rgba(168, 85, 247, 0.4)'
              : 'var(--color-warning-border)';
            const bg = isPayment
              ? 'var(--color-danger-soft)'
              : isCashea
              ? 'rgba(168, 85, 247, 0.1)'
              : 'var(--color-warning-soft)';

            return (
              <div
                key={alert.id}
                className="glass-card"
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '12px',
                  backgroundColor: bg,
                  border: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '1rem' }}>{icon}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isBudget ? `Presupuesto: ${translateCategory(alert.category)}` : alert.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {alert.subtitle}
                    </div>
                  </div>
                </div>
                {!isBudget && alert.amount && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-danger)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    -{getCurrencySymbol(alert.currency)}{formatAmount(alert.amount, alert.currency)}
                  </div>
                )}
                {isBudget && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: alert.percent >= 100 ? 'var(--color-danger)' : 'var(--color-warning)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {alert.percent.toFixed(0)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
