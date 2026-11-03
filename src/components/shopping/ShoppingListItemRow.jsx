import React, { memo } from 'react';
import IconButton from '../ui/IconButton';
import { formatAmount } from '../../utils/formatters';
import { calculateItemSubtotal } from '../../domain/shopping';

const ShoppingListItemRow = memo(function ShoppingListItemRow({
  item,
  listCurrency,
  currSymbol,
  onToggleItemCheck,
  onOpenProductHistory,
  onDeleteItem,
  isEditingPrice,
  inlinePriceVal,
  setInlinePriceVal,
  onStartEditPrice,
  onSaveActualPrice
}) {
  const subtotal = calculateItemSubtotal(item, true);
  const isChecked = Boolean(item.is_checked);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.55rem 0.65rem',
        borderRadius: '10px',
        background: isChecked ? 'var(--bg-surface-elevated)' : 'transparent',
        border: isChecked ? '1px solid var(--border-color)' : '1px solid transparent',
        opacity: isChecked ? 0.75 : 1,
        transition: 'all 0.15s ease',
        gap: '0.5rem'
      }}
    >
      {/* Checkbox de marcado táctil */}
      <div
        onClick={() => onToggleItemCheck(item.id)}
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '6px',
          border: isChecked ? '2px solid var(--color-accent)' : '2px solid var(--text-muted)',
          background: isChecked ? 'var(--color-accent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: 700
        }}
      >
        {isChecked && '✓'}
      </div>

      {/* Nombre del artículo (tocar para abrir historial) */}
      <div
        onClick={() => onOpenProductHistory(item)}
        style={{
          flex: 1,
          minWidth: 0,
          cursor: 'pointer'
        }}
      >
        <div style={{
          fontSize: '0.88rem',
          fontWeight: 600,
          color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: isChecked ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {item.name}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{item.quantity} {item.unit}</span>
          <span>•</span>
          <span>
            {item.actual_price != null ? `Real: $${formatAmount(item.actual_price, item.price_currency || listCurrency)}` : `Est: $${formatAmount(item.estimated_price, item.price_currency || listCurrency)}`}
          </span>
        </div>
      </div>

      {/* Subtotal y edición de precio real */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        {isEditingPrice ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              autoFocus
              placeholder="Precio"
              value={inlinePriceVal}
              onChange={e => setInlinePriceVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSaveActualPrice(item.id); }}
              style={{ width: '65px', height: '28px', fontSize: '0.78rem', borderRadius: '6px', padding: '0 4px', textAlign: 'right' }}
            />
            <button
              type="button"
              onClick={() => onSaveActualPrice(item.id)}
              style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}
            >
              ✓
            </button>
          </div>
        ) : (
          <div
            onClick={() => onStartEditPrice(item)}
            title="Toca para editar precio real"
            style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: isChecked ? 'var(--color-accent)' : 'var(--text-primary)',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '4px'
            }}
          >
            {currSymbol}{formatAmount(subtotal, listCurrency || 'USD')}
          </div>
        )}

        <IconButton
          ariaLabel={`Eliminar ${item.name}`}
          variant="ghost"
          size="sm"
          onClick={() => onDeleteItem(item.id)}
          style={{ color: 'var(--color-danger)', padding: '2px' }}
        >
          ✕
        </IconButton>
      </div>
    </div>
  );
});

export default ShoppingListItemRow;
