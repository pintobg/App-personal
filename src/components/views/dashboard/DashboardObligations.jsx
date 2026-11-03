import React, { useState } from 'react';
import { EmptyState } from '../../ui';
import { formatAmount, getCurrencySymbol, translateFrequency } from '../../../utils/formatters';

const PREVIEW_COUNT = 3;

function MoreToggle({ total, expanded, onToggle }) {
  if (total <= PREVIEW_COUNT) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ background: 'transparent', border: 'none', color: 'var(--color-accent)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '0.25rem 0', alignSelf: 'flex-start' }}
    >
      {expanded ? 'Ver menos' : `Ver ${total - PREVIEW_COUNT} más`}
    </button>
  );
}

export default function DashboardObligations({ nextPayments = [], nextCollections = [] }) {
  // Solo se muestran los 3 más próximos; el resto queda a un toque.
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const visiblePayments = showAllPayments ? nextPayments : nextPayments.slice(0, PREVIEW_COUNT);
  const visibleCollections = showAllCollections ? nextCollections : nextCollections.slice(0, PREVIEW_COUNT);
  return (
    <>
      {/* PROXIMOS PAGOS */}
      <div style={{ marginTop: '2.5rem' }}>
        <h2 className="section-title" style={{ padding: 0, color: 'var(--text-primary)', fontSize: 'clamp(1rem, 4vw, 1.2rem)', marginBottom: '1rem' }}>Próximos Pagos</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {nextPayments.length === 0 && <EmptyState icon="💸" message="No hay pagos próximos" />}
          {visiblePayments.map(ob => (
            <div
              key={ob.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                padding: '0.9rem 1.05rem',
                borderRadius: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                  {ob.title}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--danger-color)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  -{getCurrencySymbol(ob.currency)}{formatAmount(ob.amount, ob.currency)} {ob.currency}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  Vence: {ob.dueDate || 'Sin fecha'}
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {translateFrequency(ob.frequency)}
                </span>
              </div>
            </div>
          ))}
          <MoreToggle total={nextPayments.length} expanded={showAllPayments} onToggle={() => setShowAllPayments(v => !v)} />
        </div>
      </div>

      {/* PROXIMOS COBROS */}
      <div style={{ marginTop: '2rem' }}>
        <h2 className="section-title" style={{ padding: 0, color: 'var(--text-primary)', fontSize: 'clamp(1rem, 4vw, 1.2rem)', marginBottom: '1rem' }}>Próximos Cobros</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {nextCollections.length === 0 && <EmptyState icon="🤝" message="No hay cobros próximos" />}
          {visibleCollections.map(ob => (
            <div
              key={ob.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                padding: '0.9rem 1.05rem',
                borderRadius: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                  {ob.title}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--success-color)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  +{getCurrencySymbol(ob.currency)}{formatAmount(ob.amount, ob.currency)} {ob.currency}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  Vence: {ob.dueDate || 'Sin fecha'}
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {translateFrequency(ob.frequency)}
                </span>
              </div>
            </div>
          ))}
          <MoreToggle total={nextCollections.length} expanded={showAllCollections} onToggle={() => setShowAllCollections(v => !v)} />
        </div>
      </div>
    </>
  );
}
