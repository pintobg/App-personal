import React from 'react';

export default function BalancesNavigationTabs({
  activeFilter,
  setActiveFilter,
  setSelectedFilters,
  onOpenVerifyModal
}) {
  return (
    <div style={{ padding: '0 1rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          gap: '1.25rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <button
          onClick={() => { setActiveFilter('all'); if (setSelectedFilters) setSelectedFilters([]); }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0.5rem 0',
            color: activeFilter === 'all' ? 'var(--color-accent)' : 'var(--text-secondary)',
            borderBottom: activeFilter === 'all' ? '2px solid var(--color-accent)' : '2px solid transparent',
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
            color: activeFilter === 'asset' ? 'var(--color-accent)' : 'var(--text-secondary)',
            borderBottom: activeFilter === 'asset' ? '2px solid var(--color-accent)' : '2px solid transparent',
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
            color: activeFilter === 'account' ? 'var(--color-accent)' : 'var(--text-secondary)',
            borderBottom: activeFilter === 'account' ? '2px solid var(--color-accent)' : '2px solid transparent',
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={onOpenVerifyModal}
          title="Verificar saldos con el historial de movimientos"
          aria-label="Verificar saldos"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Verificar saldos</span>
        </button>
      </div>
    </div>
  );
}
