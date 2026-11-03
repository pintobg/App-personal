import React from 'react';
import { formatAmount } from '../../../utils/formatters';

export default function TransactionsViewHeader({
  txFilter,
  setTxFilter,
  deleteMode,
  setDeleteMode,
  selectedCount,
  onOpenReportsModal,
  exchangeMonthStats,
  hasActiveFilters: _hasActiveFilters,
  filteredCount: _filteredCount,
  onClearFilters: _onClearFilters
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h2 className="section-title" style={{ padding: 0, color: 'var(--text-primary)', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>
          Movimientos
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {onOpenReportsModal && (
            <button
              type="button"
              className="btn"
              onClick={onOpenReportsModal}
              title="Exportar reportes (CSV y PDF)"
              aria-label="Reportes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--color-info)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Reportes</span>
            </button>
          )}

          <button
            type="button"
            className="btn"
            onClick={() => setDeleteMode(!deleteMode)}
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: deleteMode ? 'var(--color-danger-soft)' : 'var(--bg-surface-elevated)',
              border: `1px solid ${deleteMode ? 'var(--color-danger-border)' : 'var(--border-color)'}`,
              color: deleteMode ? 'var(--color-danger)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            {deleteMode ? `Cancelar (${selectedCount})` : 'Seleccionar'}
          </button>
        </div>
      </div>

      {/* TYPE FILTER TABS */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1rem',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'all', label: 'Todas' },
          { id: 'income', label: 'Ingresos' },
          { id: 'spent', label: 'Gastos' },
          { id: 'transfer', label: 'Transferencias' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTxFilter(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.5rem 0',
              color: txFilter === tab.id ? 'var(--color-accent)' : 'var(--text-secondary)',
              borderBottom: txFilter === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* BANNER SECCIÓN MIS CAMBIOS CON TASA PROMEDIO DEL MES */}
      {txFilter === 'exchanges' && (
        <div
          className="glass-card"
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '14px',
            background: 'var(--color-accent-soft)',
            border: '1px solid var(--color-accent-border)',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Mis cambios • Mes en curso
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {exchangeMonthStats.hasData ? (
                <>
                  Tasa promedio: <span style={{ color: 'var(--color-accent)' }}>{formatAmount(exchangeMonthStats.averageRate, 'VES')} Bs./$</span>
                </>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin operaciones de cambio este mes</span>
              )}
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {exchangeMonthStats.count} {exchangeMonthStats.count === 1 ? 'operación' : 'operaciones'}
          </div>
        </div>
      )}

    </>
  );
}
