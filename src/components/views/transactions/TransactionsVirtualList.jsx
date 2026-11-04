import React, { useState, useEffect, useRef, useMemo } from 'react';
import TransactionRow from './TransactionRow';
import { EmptyState } from '../../ui';
import { groupTransactionsByDay } from './transactionRowUtils';
import { formatDayHeader } from '../../../utils/dates';
import { formatAmount } from '../../../utils/formatters';

const ROW_HEIGHT = 64;
const HEADER_HEIGHT = 40; // 32 px de encabezado + 8 px de separación
const BUFFER_PX = 900;

function DayHeader({ date, net }) {
  const sign = net > 0 ? '+' : net < 0 ? '−' : '';
  return (
    <div className="tx-day-header" role="heading" aria-level={3}>
      <span>{formatDayHeader(date)}</span>
      {net !== 0 && <span className="net">{sign}${formatAmount(Math.abs(net), 'USD')}</span>}
    </div>
  );
}

export default function TransactionsVirtualList({
  transactions = [],
  rates = {},
  onOpenActions,
  deleteMode = false,
  selectedTxs = [],
  onToggleSelect,
  getCategoryName,
  getSubcategoryName,
  categoriesMap,
  categories = [],
  hasActiveFilters = false,
  onClearFilters
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const isVirtual = transactions.length > 200;

  // Lista plana: encabezado de día seguido de sus filas.
  const flatItems = useMemo(() => {
    const groups = groupTransactionsByDay(transactions, rates);
    const items = [];
    let offset = 0;
    groups.forEach(group => {
      items.push({ kind: 'header', key: `h-${group.date}`, date: group.date, net: group.net, top: offset, height: HEADER_HEIGHT });
      offset += HEADER_HEIGHT;
      group.items.forEach((tx, idx) => {
        const position = [idx === 0 ? 'first' : '', idx === group.items.length - 1 ? 'last' : ''].filter(Boolean).join(' ');
        items.push({ kind: 'tx', key: tx.id, tx, position, top: offset, height: ROW_HEIGHT });
        offset += ROW_HEIGHT;
      });
    });
    return { items, totalHeight: offset };
  }, [transactions, rates]);

  const selectedIds = useMemo(() => new Set(selectedTxs.map(t => t.id)), [selectedTxs]);

  useEffect(() => {
    if (!isVirtual) return undefined;
    const handleScroll = () => setScrollTop(window.scrollY || document.documentElement.scrollTop || 0);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isVirtual]);

  if (transactions.length === 0) {
    return (
      <div style={{ marginTop: 'var(--space-6)' }}>
        <EmptyState
          icon={hasActiveFilters ? '🔍' : '📊'}
          message={hasActiveFilters ? 'No hay movimientos con estos filtros' : 'Aún no hay movimientos. Toca + para anotar el primero.'}
        />
        {hasActiveFilters && onClearFilters && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button type="button" className="link-btn" onClick={onClearFilters}>Quitar filtros</button>
          </div>
        )}
      </div>
    );
  }

  const renderItem = (item) => {
    if (item.kind === 'header') return <DayHeader key={item.key} date={item.date} net={item.net} />;
    const tx = item.tx;
    const catObj = (tx.category_id && categoriesMap)
      ? categoriesMap.get(tx.category_id)
      : (categories.find(c => c.name === tx.category || c.id === tx.category_id) || null);
    return (
      <TransactionRow
        key={item.key}
        tx={tx}
        rates={rates}
        onOpenActions={onOpenActions}
        deleteMode={deleteMode}
        isSelected={selectedIds.has(tx.id)}
        onToggleSelect={onToggleSelect}
        getCategoryName={getCategoryName}
        getSubcategoryName={getSubcategoryName}
        catObj={catObj}
        position={item.position}
      />
    );
  };

  if (!isVirtual) {
    return (
      <div className="tx-list" style={{ marginBottom: 'var(--space-8)' }}>
        {flatItems.items.map(renderItem)}
      </div>
    );
  }

  // Virtualización para más de 200 movimientos (alturas fijas: filas 64 px, encabezados 40 px)
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const containerTop = containerRef.current ? containerRef.current.offsetTop : 300;
  const relativeScroll = Math.max(0, scrollTop - containerTop);
  const from = relativeScroll - BUFFER_PX;
  const to = relativeScroll + viewportHeight + BUFFER_PX;
  const visible = flatItems.items.filter(it => it.top + it.height >= from && it.top <= to);
  const topPadding = visible.length ? visible[0].top : 0;
  const last = visible[visible.length - 1];
  const bottomPadding = last ? flatItems.totalHeight - (last.top + last.height) : 0;

  return (
    <div ref={containerRef} className="tx-list" style={{ marginBottom: 'var(--space-8)' }}>
      {topPadding > 0 && <div style={{ height: `${topPadding}px` }} />}
      {visible.map(renderItem)}
      {bottomPadding > 0 && <div style={{ height: `${bottomPadding}px` }} />}
    </div>
  );
}
