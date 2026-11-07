import React, { memo, useEffect, useState } from 'react';
import IconButton from '../ui/IconButton';
import Icon from '../ui/Icon';
import { formatAmount } from '../../utils/formatters';
import { calculateItemSubtotal } from '../../domain/shopping';

/**
 * Fila de un artículo de la lista.
 * - Casilla para marcarlo como comprado.
 * - Tocar el nombre o el lápiz abre la edición (nombre, cantidad, precios, sección).
 * - Tocar el monto permite poner el precio real rápido mientras compras.
 * - La papelera pide un segundo toque para confirmar ("¿Borrar?").
 */
const ShoppingListItemRow = memo(function ShoppingListItemRow({
  item,
  listCurrency,
  currSymbol,
  onToggleItemCheck,
  onEditItem,
  onDeleteItem,
  isEditingPrice,
  inlinePriceVal,
  setInlinePriceVal,
  onStartEditPrice,
  onSaveActualPrice,
  readOnly = false
}) {
  const subtotal = calculateItemSubtotal(item, true);
  const isChecked = Boolean(item.is_checked);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!confirmDelete) return undefined;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const priceCurrency = item.price_currency || listCurrency;
  const unitPrice = item.actual_price != null ? item.actual_price : item.estimated_price;

  return (
    <div className={`shop-item${isChecked ? ' checked' : ''}`}>
      <button
        type="button"
        className="shop-item-check"
        role="checkbox"
        aria-checked={isChecked}
        aria-label={isChecked ? `Desmarcar ${item.name}` : `Marcar ${item.name} como comprado`}
        onClick={() => onToggleItemCheck(item.id)}
        disabled={readOnly}
      >
        <span className="shop-item-box">{isChecked && <Icon name="check" size={14} />}</span>
      </button>

      <button
        type="button"
        className="shop-item-main"
        onClick={() => !readOnly && onEditItem && onEditItem(item)}
        aria-label={`Editar ${item.name}`}
        disabled={readOnly}
      >
        <span className="shop-item-name">{item.name}</span>
        <span className="shop-item-sub">
          {item.quantity} {item.unit} × {currSymbol}{formatAmount(unitPrice || 0, priceCurrency)}
          {item.actual_price != null ? ' (real)' : ' (est.)'}
        </span>
      </button>

      <div className="shop-item-side">
        {isEditingPrice ? (
          <span className="shop-item-price-edit">
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="Precio"
              aria-label={`Precio real de ${item.name}`}
              value={inlinePriceVal}
              onChange={e => setInlinePriceVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSaveActualPrice(item.id); }}
              className="input-field"
            />
            <IconButton ariaLabel="Guardar precio" variant="primary" size="sm" onClick={() => onSaveActualPrice(item.id)} icon={<Icon name="check" size={16} />} />
          </span>
        ) : (
          <button
            type="button"
            className="shop-item-total"
            onClick={() => !readOnly && onStartEditPrice(item)}
            title="Toca para poner el precio real"
            aria-label={`Total ${item.name}: ${currSymbol}${formatAmount(subtotal, listCurrency || 'USD')}. Toca para poner el precio real`}
            disabled={readOnly}
          >
            {currSymbol}{formatAmount(subtotal, listCurrency || 'USD')}
          </button>
        )}

        {!readOnly && !isEditingPrice && (
          <>
            <IconButton
              ariaLabel={`Editar ${item.name}`}
              variant="ghost"
              size="sm"
              onClick={() => onEditItem && onEditItem(item)}
              icon={<Icon name="edit" size={16} />}
            />
            {confirmDelete ? (
              <button
                type="button"
                className="shop-item-confirm-delete"
                onClick={() => { setConfirmDelete(false); onDeleteItem(item.id); }}
                aria-label={`Confirmar borrar ${item.name}`}
              >
                ¿Borrar?
              </button>
            ) : (
              <IconButton
                ariaLabel={`Eliminar ${item.name}`}
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                style={{ color: 'var(--color-danger)' }}
                icon={<Icon name="trash" size={16} />}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default ShoppingListItemRow;
