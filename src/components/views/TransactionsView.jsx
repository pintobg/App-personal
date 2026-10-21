import { useState, useMemo } from 'react';
import EmptyState from '../common/EmptyState';
import CustomSelect from '../common/CustomSelect';
import {
  formatAmount,
  translateCategory,
  translateSubcategory,
  getTxRateSnapshot,
  getTxUsdEquivalent,
  formatTxRate
} from '../../utils/formatters';
import { toLocalDateString, parseLocalDate } from '../../utils/dates';

export default function TransactionsView({
  transactions,
  assets = [],
  txFilter,
  setTxFilter,
  deleteMode,
  setDeleteMode,
  selectedTxs,
  toggleSelectTx,
  flippedTxId,
  setFlippedTxId,
  rates = {},
  onEdit
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // 'all' | 'this_month' | 'last_month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');

  const uniqueAccounts = useMemo(() => {
    const accs = new Set();
    if (Array.isArray(assets)) {
      assets.forEach(a => {
        if (a && a.location) accs.add(a.location);
      });
    }
    if (Array.isArray(transactions)) {
      transactions.forEach(t => {
        if (t && t.origin) accs.add(t.origin);
        if (t && t.destOrigin) accs.add(t.destOrigin);
      });
    }
    return Array.from(accs).filter(Boolean).sort();
  }, [assets, transactions]);

  const dateOptions = [
    { value: 'all', label: 'Todo' },
    { value: 'this_month', label: 'Este mes' },
    { value: 'last_month', label: 'Mes anterior' },
    { value: 'custom', label: 'Rango personalizado' }
  ];

  const accountOptions = [
    { value: 'all', label: 'Todas las cuentas' },
    ...uniqueAccounts.map(acc => ({ value: acc, label: acc }))
  ];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // 1. Type filter (Todas, Ingresos, Gastos, Transferencias)
      if (txFilter !== 'all' && tx.type !== txFilter) {
        return false;
      }

      // 2. Account filter
      if (accountFilter !== 'all') {
        const matchesAccount = tx.origin === accountFilter || tx.destOrigin === accountFilter;
        if (!matchesAccount) return false;
      }

      // 3. Date range filter
      if (dateRangeFilter !== 'all') {
        const txDateLocalStr = toLocalDateString(tx.date);
        const txDate = parseLocalDate(txDateLocalStr);
        const now = new Date();

        if (dateRangeFilter === 'this_month') {
          const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          if (txDate < start || txDate > end) return false;
        } else if (dateRangeFilter === 'last_month') {
          const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
          const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          if (txDate < start || txDate > end) return false;
        } else if (dateRangeFilter === 'custom') {
          if (customStartDate && txDateLocalStr < customStartDate) return false;
          if (customEndDate && txDateLocalStr > customEndDate) return false;
        }
      }

      // 4. Quick text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cat = (tx.category || '').toLowerCase();
        const translatedCat = (translateCategory(tx.category) || '').toLowerCase();
        const subcat = (tx.subcategory || '').toLowerCase();
        const translatedSubcat = (translateSubcategory(tx.subcategory) || '').toLowerCase();
        const origin = (tx.origin || '').toLowerCase();
        const destOrigin = (tx.destOrigin || '').toLowerCase();
        const notes = (tx.notes || tx.description || tx.title || '').toLowerCase();
        const currency = (tx.currency || '').toLowerCase();

        const matches =
          cat.includes(q) ||
          translatedCat.includes(q) ||
          subcat.includes(q) ||
          translatedSubcat.includes(q) ||
          origin.includes(q) ||
          destOrigin.includes(q) ||
          notes.includes(q) ||
          currency.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [transactions, txFilter, accountFilter, dateRangeFilter, customStartDate, customEndDate, searchQuery]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    dateRangeFilter !== 'all' ||
    accountFilter !== 'all' ||
    customStartDate ||
    customEndDate ||
    txFilter !== 'all'
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setDateRangeFilter('all');
    setAccountFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setTxFilter('all');
  };

  return (
    <div className="view-container" style={{ padding: '0 1rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ padding: 0, color: '#fff', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>Historial de Transacciones</h2>
        {!deleteMode && (
          <button className="btn" style={{ padding: '0.25rem', display: 'flex', alignItems: 'center', background: 'transparent', color: '#ef4444', opacity: 0.9 }} onClick={() => setDeleteMode(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        )}
      </div>

      {/* SEARCH BAR */}
      <div style={{ position: 'relative', marginBottom: '0.875rem' }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#98989d', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          className="input-field"
          placeholder="Buscar por categoría, cuenta, nota..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            paddingLeft: '2.5rem',
            paddingRight: searchQuery ? '2.5rem' : '1rem',
            borderRadius: '12px',
            fontSize: '16px',
            height: '48px',
            width: '100%'
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#1b2230',
              border: '1px solid #2a3447',
              color: '#94a3b8',
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

      {/* FILTER CONTROLS: PERIODO & CUENTA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.875rem' }}>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 500 }}>
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
        <div>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 500 }}>
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

      {/* CUSTOM DATE RANGE PICKER */}
      {dateRangeFilter === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.875rem', background: '#1b2230', padding: '0.75rem', borderRadius: '12px', border: '1px solid #2a3447' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Fecha inicio</label>
            <input
              type="date"
              className="input-field"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', fontSize: '16px', height: '48px', borderRadius: '8px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Fecha fin</label>
            <input
              type="date"
              className="input-field"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', fontSize: '16px', height: '48px', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}

      {/* TYPE FILTER TABS */}
      <div style={{
        display: 'flex',
        gap: '1.25rem',
        borderBottom: '1px solid #2a3447',
        marginBottom: '1rem',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setTxFilter('all')}
          style={{ background: 'transparent', border: 'none', padding: '0.5rem 0', color: txFilter === 'all' ? '#10b981' : '#94a3b8', borderBottom: txFilter === 'all' ? '2px solid #10b981' : '2px solid transparent', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Todas
        </button>
        <button
          onClick={() => setTxFilter('income')}
          style={{ background: 'transparent', border: 'none', padding: '0.5rem 0', color: txFilter === 'income' ? '#10b981' : '#94a3b8', borderBottom: txFilter === 'income' ? '2px solid #10b981' : '2px solid transparent', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Ingresos
        </button>
        <button
          onClick={() => setTxFilter('spent')}
          style={{ background: 'transparent', border: 'none', padding: '0.5rem 0', color: txFilter === 'spent' ? '#10b981' : '#94a3b8', borderBottom: txFilter === 'spent' ? '2px solid #10b981' : '2px solid transparent', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Gastos
        </button>
        <button
          onClick={() => setTxFilter('transfer')}
          style={{ background: 'transparent', border: 'none', padding: '0.5rem 0', color: txFilter === 'transfer' ? '#10b981' : '#94a3b8', borderBottom: txFilter === 'transfer' ? '2px solid #10b981' : '2px solid transparent', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Transferencias
        </button>
      </div>

      {/* FILTER SUMMARY & RESET ACTION */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          <span>{filteredTransactions.length} movimiento{filteredTransactions.length === 1 ? '' : 's'} encontrado{filteredTransactions.length === 1 ? '' : 's'}</span>
          <button
            type="button"
            onClick={handleClearFilters}
            style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* TRANSACTIONS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {filteredTransactions.length === 0 && (
          <EmptyState
            icon={hasActiveFilters ? "🔍" : "📊"}
            message={hasActiveFilters ? "No se encontraron movimientos con los filtros seleccionados" : "No hay transacciones registradas"}
          />
        )}
        {filteredTransactions.map(tx => {
          const rateSnapshot = getTxRateSnapshot(tx, rates);
          const usdVal = getTxUsdEquivalent(tx, rates);
          const rateStr = formatTxRate(tx.currency, rateSnapshot);

          return (
            <div
              key={tx.id}
              className={`tx-flip-container ${flippedTxId === tx.id ? 'flipped' : ''}`}
              style={{ opacity: deleteMode && !selectedTxs.some(t => t.id === tx.id) ? 0.6 : 1 }}
            >
              <div className="tx-flip-inner" onClick={() => {
                if (deleteMode) {
                  toggleSelectTx(tx);
                } else {
                  setFlippedTxId(flippedTxId === tx.id ? null : tx.id);
                }
              }}>
                <div className="tx-flip-front glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                    {deleteMode && (
                      <input type="checkbox" checked={selectedTxs.some(t => t.id === tx.id)} readOnly style={{ transform: 'scale(1.2)', flexShrink: 0 }} />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tx.type === 'transfer' ? 'Transferencia' : (tx.type === 'income' ? 'Ingreso' : 'Gasto')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.type === 'transfer' ? `${tx.origin} ➔ ${tx.destOrigin}` : tx.origin}</div>
                        <div style={{ opacity: 0.7 }}>{toLocalDateString(tx.date)}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {tx.type === 'transfer' ? (
                      <>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6' }}>
                          -{formatAmount(tx.amount, tx.currency)} {tx.currency.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                          +{formatAmount(tx.destAmount, tx.destCurrency)} {tx.destCurrency?.toUpperCase()}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: tx.type === 'income' ? '#10b981' : '#ef4444' }}>
                          {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, tx.currency)} {tx.currency.toUpperCase()}
                        </div>
                        {!deleteMode && (
                          <button
                            type="button"
                            title="Editar transacción"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEdit) onEdit(tx);
                            }}
                            style={{
                              background: '#312615',
                              border: '1px solid #4d391b',
                              color: '#f59e0b',
                              borderRadius: '6px',
                              padding: '0.25rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="tx-flip-back glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px', gap: '0.25rem' }}>
                  {tx.type === 'transfer' ? (
                    <>
                      <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '0.25rem' }}>Detalles de Cambio</div>
                      {tx.currency !== tx.destCurrency && Number(tx.amount) > 0 && Number(tx.destAmount) > 0 ? (
                        <>
                          <div style={{ fontSize: '0.875rem', color: '#10b981' }}>
                            1 {tx.currency.toUpperCase()} = {(Number(tx.destAmount) / Number(tx.amount)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {tx.destCurrency?.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            1 {tx.destCurrency?.toUpperCase()} = {(Number(tx.amount) / Number(tx.destAmount)).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.currency.toUpperCase()}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Transferencia del mismo activo ({tx.currency.toUpperCase()}).</div>
                      )}
                      {Number(tx.commission) > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.15rem' }}>
                          Comisión bancaria: {formatAmount(tx.commission, tx.currency)} {tx.currency.toUpperCase()}
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', fontWeight: 500 }}>
                        Valor estimado: ~${formatAmount(usdVal, 'USD')} USD
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '0.25rem' }}>Detalles de Transacción</div>
                      <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Categoría: {translateCategory(tx.category) || 'N/A'}</div>
                      {tx.subcategory && <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Subcategoría: {translateSubcategory(tx.subcategory)}</div>}
                      <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.35rem', fontWeight: 500 }}>
                        Tasa de registro: {rateStr}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Valor original: ~${formatAmount(usdVal, 'USD')} USD
                      </div>
                      <button
                        type="button"
                        title="Editar transacción"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEdit) onEdit(tx);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#312615',
                          border: '1px solid #f59e0b',
                          color: '#f59e0b',
                          borderRadius: '8px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginTop: '0.5rem'
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
