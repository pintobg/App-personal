import React, { useState } from 'react';
import CustomSelect from '../../common/CustomSelect';
import { Chip } from '../../ui';
import { formatAmount } from '../../../utils/formatters';

export default function TransactionFilters({
  searchQuery,
  setSearchQuery,
  dateRangeFilter,
  setDateRangeFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  accountFilter,
  setAccountFilter,
  categoryFilter,
  setCategoryFilter,
  currencyFilter,
  setCurrencyFilter,
  txFilter,
  setTxFilter,
  dateOptions = [],
  accountOptions = [],
  categoryOptions = [],
  currencyOptions = [],
  hasActiveFilters,
  onClearFilters,
  filteredTotals,
  getCategoryName
}) {
  // Los filtros avanzados quedan plegados por defecto para no saturar la pantalla.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const advancedCount =
    (dateRangeFilter !== 'all' ? 1 : 0) +
    (accountFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (currencyFilter !== 'all' ? 1 : 0) +
    (txFilter === 'exchanges' || txFilter === 'adjustment' ? 1 : 0);
  const labelStyle = { fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 500 };
  const gridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.6rem', marginBottom: '0.75rem' };

  return (
    <>
      {/* 1. BUSCADOR + BOTÓN "FILTROS" */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <input
          type="text"
          className="input-field"
          placeholder="Buscar nota, monto o cuenta"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            padding: '0.65rem 2.2rem 0.65rem 0.85rem',
            fontSize: '16px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            width: '100%',
            boxSizing: 'border-box'
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Limpiar búsqueda"
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.75rem',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        )}
      </div>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          aria-expanded={showAdvanced}
          aria-label="Más filtros"
          style={{
            flexShrink: 0,
            height: '44px',
            padding: '0 0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            borderRadius: '12px',
            border: `1px solid ${showAdvanced || advancedCount > 0 ? 'var(--color-accent-border)' : 'var(--border-color)'}`,
            background: showAdvanced || advancedCount > 0 ? 'var(--color-accent-soft)' : 'var(--bg-surface)',
            color: showAdvanced || advancedCount > 0 ? 'var(--color-accent)' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="10" y1="18" x2="14" y2="18"></line></svg>
          <span>Filtros{advancedCount > 0 ? ` (${advancedCount})` : ''}</span>
        </button>
      </div>

      {showAdvanced && (
      <div style={{ padding: '0.75rem', marginBottom: '0.75rem', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
      {/* FILTER CONTROLS: PERIODO & CUENTA */}
      <div style={gridStyle}>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>
            Periodo
          </label>
          <CustomSelect
            value={dateRangeFilter}
            onChange={e => setDateRangeFilter(e.target.value)}
            options={dateOptions}
            placeholder="Periodo"
            title="Filtrar por Periodo"
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>
            Cuenta
          </label>
          <CustomSelect
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            options={accountOptions}
            placeholder="Cuenta"
            title="Filtrar por Cuenta"
          />
        </div>
      </div>

      {/* FILTER CONTROLS: CATEGORIA & MONEDA */}
      <div style={gridStyle}>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>
            Categoría
          </label>
          <CustomSelect
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            options={categoryOptions}
            placeholder="Categoría"
            title="Filtrar por Categoría"
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={labelStyle}>
            Moneda
          </label>
          <CustomSelect
            value={currencyFilter}
            onChange={e => setCurrencyFilter(e.target.value)}
            options={currencyOptions}
            placeholder="Moneda"
            title="Filtrar por Moneda"
          />
        </div>
      </div>

      {/* CUSTOM DATE RANGE PICKER */}
      {dateRangeFilter === 'custom' && (
        <div style={gridStyle}>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Fecha inicio</label>
            <input
              type="date"
              className="input-field"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              style={{ padding: '0.5rem 0.6rem', fontSize: '16px', height: '48px', borderRadius: '8px', width: '100%', minWidth: 0 }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Fecha fin</label>
            <input
              type="date"
              className="input-field"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              style={{ padding: '0.5rem 0.6rem', fontSize: '16px', height: '48px', borderRadius: '8px', width: '100%', minWidth: 0 }}
            />
          </div>
        </div>
      )}

      {/* OTROS TIPOS DE MOVIMIENTO (menos frecuentes) */}
      <div>
        <span style={labelStyle}>Otros tipos</span>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[{ id: 'exchanges', label: 'Mis cambios' }, { id: 'adjustment', label: 'Ajustes de saldo' }].map(opt => (
            <Chip
              key={opt.id}
              variant="default"
              active={txFilter === opt.id}
              onClick={() => setTxFilter(txFilter === opt.id ? 'all' : opt.id)}
              style={{ cursor: 'pointer' }}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>
      </div>
      )}

      {/* ACTIVE REMOVABLE FILTER CHIPS */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.875rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '2px' }}>Filtros:</span>
          {searchQuery.trim() && (
            <Chip
              variant="accent"
              onClick={() => setSearchQuery('')}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Buscar: "{searchQuery}"</span>
              <span aria-hidden="true" style={{ fontWeight: 700 }}>✕</span>
            </Chip>
          )}
          {txFilter !== 'all' && (
            <Chip
              variant="accent"
              onClick={() => setTxFilter('all')}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Tipo: {txFilter === 'income' ? 'Ingresos' : txFilter === 'spent' ? 'Gastos' : txFilter === 'transfer' ? 'Transferencias' : txFilter === 'exchanges' ? 'Mis cambios' : 'Ajustes'}</span>
              <span aria-hidden="true" style={{ fontWeight: 700 }}>✕</span>
            </Chip>
          )}
          {dateRangeFilter !== 'all' && (
            <Chip
              variant="accent"
              onClick={() => { setDateRangeFilter('all'); setCustomStartDate(''); setCustomEndDate(''); }}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Periodo: {dateRangeFilter === 'this_month' ? 'Este mes' : dateRangeFilter === 'last_month' ? 'Mes anterior' : 'Personalizado'}</span>
              <span aria-hidden="true" style={{ fontWeight: 700 }}>✕</span>
            </Chip>
          )}
          {accountFilter !== 'all' && (
            <Chip
              variant="accent"
              onClick={() => setAccountFilter('all')}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Cuenta: {accountFilter}</span>
              <span aria-hidden="true" style={{ fontWeight: 700 }}>✕</span>
            </Chip>
          )}
          {categoryFilter !== 'all' && (
            <Chip
              variant="accent"
              onClick={() => setCategoryFilter('all')}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Categoría: {(getCategoryName && getCategoryName(categoryFilter)) || categoryFilter}</span>
              <span aria-hidden="true" style={{ fontWeight: 700 }}>✕</span>
            </Chip>
          )}
          {currencyFilter !== 'all' && (
            <Chip
              variant="accent"
              onClick={() => setCurrencyFilter('all')}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Moneda: {currencyFilter}</span>
              <span aria-hidden="true" style={{ fontWeight: 700 }}>✕</span>
            </Chip>
          )}
          <button
            type="button"
            onClick={onClearFilters}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-danger)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 6px'
            }}
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* TOTALES DEL FILTRO ARRIBA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', padding: '0 0.2rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Totales del período
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {filteredTotals.count} {filteredTotals.count === 1 ? 'movimiento' : 'movimientos'}
        </span>
      </div>
      <div
        className="glass-card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '0.5rem',
          padding: '0.85rem 0.75rem',
          borderRadius: '14px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          marginBottom: '1rem',
          textAlign: 'center'
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Ingresos</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-income)' }}>
            +${formatAmount(filteredTotals.incomeUsd, 'USD')}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Gastos</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-expense)' }}>
            -${formatAmount(filteredTotals.spentUsd, 'USD')}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Saldo Neto</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: filteredTotals.netUsd >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
            {filteredTotals.netUsd >= 0 ? '+' : ''}${formatAmount(filteredTotals.netUsd, 'USD')}
          </div>
        </div>
      </div>
    </>
  );
}
