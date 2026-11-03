import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransactionRow from './TransactionRow';
import { EmptyState } from '../../ui';

const ESTIMATED_ROW_HEIGHT = 88;
const BUFFER_SIZE = 15;

export default function TransactionsVirtualList({
  transactions = [],
  rates = {},
  flippedTxId,
  onFlip,
  deleteMode = false,
  selectedTxs = [],
  onToggleSelect,
  onEdit,
  onDelete,
  getCategoryName,
  getSubcategoryName,
  categoriesMap,
  categories = [],
  hasActiveFilters = false
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const isVirtual = transactions.length > 200;

  useEffect(() => {
    if (!isVirtual) return;

    const handleScroll = () => {
      setScrollTop(window.scrollY || document.documentElement.scrollTop || 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isVirtual]);

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={hasActiveFilters ? '🔍' : '📊'}
        message={hasActiveFilters ? 'No se encontraron movimientos con los filtros seleccionados' : 'No hay transacciones registradas'}
      />
    );
  }

  // Si son <= 200 items, renderizamos normal
  if (!isVirtual) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {transactions.map(tx => {
          const catObj = (tx.category_id && categoriesMap)
            ? categoriesMap.get(tx.category_id)
            : (categories.find(c => c.name === tx.category || c.id === tx.category_id) || null);

          return (
            <TransactionRow
              key={tx.id}
              tx={tx}
              rates={rates}
              isFlipped={flippedTxId === tx.id}
              onFlip={onFlip}
              deleteMode={deleteMode}
              isSelected={selectedTxs.some(t => t.id === tx.id)}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              getCategoryName={getCategoryName}
              getSubcategoryName={getSubcategoryName}
              catObj={catObj}
            />
          );
        })}
      </div>
    );
  }

  // Virtualización para > 200 filas
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const containerTop = containerRef.current ? containerRef.current.offsetTop : 300;
  const relativeScroll = Math.max(0, scrollTop - containerTop);

  const startIndex = Math.max(0, Math.floor(relativeScroll / ESTIMATED_ROW_HEIGHT) - BUFFER_SIZE);
  const endIndex = Math.min(transactions.length, Math.ceil((relativeScroll + viewportHeight) / ESTIMATED_ROW_HEIGHT) + BUFFER_SIZE);

  const visibleItems = transactions.slice(startIndex, endIndex);
  const topPadding = startIndex * ESTIMATED_ROW_HEIGHT;
  const bottomPadding = (transactions.length - endIndex) * ESTIMATED_ROW_HEIGHT;

  return (
    <div ref={containerRef} style={{ marginBottom: '2rem' }}>
      {topPadding > 0 && <div style={{ height: `${topPadding}px` }} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {visibleItems.map(tx => {
          const catObj = (tx.category_id && categoriesMap)
            ? categoriesMap.get(tx.category_id)
            : (categories.find(c => c.name === tx.category || c.id === tx.category_id) || null);

          return (
            <TransactionRow
              key={tx.id}
              tx={tx}
              rates={rates}
              isFlipped={flippedTxId === tx.id}
              onFlip={onFlip}
              deleteMode={deleteMode}
              isSelected={selectedTxs.some(t => t.id === tx.id)}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              getCategoryName={getCategoryName}
              getSubcategoryName={getSubcategoryName}
              catObj={catObj}
            />
          );
        })}
      </div>
      {bottomPadding > 0 && <div style={{ height: `${bottomPadding}px` }} />}
    </div>
  );
}
