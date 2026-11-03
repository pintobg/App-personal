import React from 'react';
import { calculateGoalProgress } from '../../../domain/goals';
import { formatAmount } from '../../../utils/formatters';

export default function PlanningGoalsTab({
  goals = [],
  assets = [],
  rates = {},
  onOpenGoalModal,
  onDeleteGoal
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'gap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>Metas de Ahorro</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Objetivos y fondos reservados</p>
        </div>
        {onOpenGoalModal && (
          <button
            type="button"
            onClick={() => onOpenGoalModal(null)}
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
            + Nueva Meta
          </button>
        )}
      </div>

      {goals.length === 0 ? (
        <div className="glass-card" style={{ padding: '2rem 1rem', textAlign: 'center', borderRadius: '16px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🎯</span>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Sin metas de ahorro
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Define metas con fecha límite y vincula tus cuentas para ver tu avance en tiempo real.
          </div>
          {onOpenGoalModal && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onOpenGoalModal(null)}
              style={{ fontSize: '0.88rem', padding: '0.6rem 1.25rem', borderRadius: '12px' }}
            >
              Crear mi primera meta
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {goals.map(goal => {
            const progress = calculateGoalProgress(goal, assets, rates, new Date());
            const targetCurrency = (goal.currency || 'USD').toUpperCase();
            const isAchieved = progress.progressPercent >= 100;
            const isExpired = progress.monthsRemaining === 0 && !isAchieved;

            const linkedAccounts = (assets || []).filter(a =>
              Array.isArray(goal.accountIds) && goal.accountIds.includes(a.id)
            );

            return (
              <div
                key={goal.id}
                className="glass-card"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {goal.name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Ahorrado: <strong style={{ color: 'var(--text-primary)' }}>{formatAmount(progress.currentSaved, targetCurrency)} {targetCurrency}</strong> de {formatAmount(goal.targetAmount, targetCurrency)} {targetCurrency}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: isAchieved ? 'var(--color-accent-soft)' : isExpired ? 'var(--color-danger-soft)' : 'var(--bg-surface-elevated)',
                        color: isAchieved ? 'var(--color-accent)' : isExpired ? 'var(--color-danger)' : 'var(--text-primary)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      {progress.progressPercent}%
                    </span>

                    {onOpenGoalModal && (
                      <button
                        type="button"
                        onClick={() => onOpenGoalModal(goal)}
                        aria-label={`Editar meta ${goal.name}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                      </button>
                    )}

                    {onDeleteGoal && (
                      <button
                        type="button"
                        onClick={() => onDeleteGoal(goal.id)}
                        aria-label={`Eliminar meta ${goal.name}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* BARRA DE PROGRESO */}
                <div
                  style={{
                    width: '100%',
                    height: '7px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginTop: '0.4rem',
                    marginBottom: '0.4rem'
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(progress.progressPercent, 100)}%`,
                      height: '100%',
                      background: isAchieved ? 'var(--color-accent)' : isExpired ? 'var(--color-danger)' : 'var(--color-info)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', flexWrap: 'wrap', gap: '0.4rem' }}>
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
  );
}
