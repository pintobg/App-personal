import { useState, useMemo, useRef, useCallback } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import PriceHistoryModal from './PriceHistoryModal';
import ShoppingListItemRow from './ShoppingListItemRow';
import ShoppingItemEditModal from './ShoppingItemEditModal';
import {
  SHOPPING_SECTIONS,
  SHOPPING_UNITS,
  calculateListTotals,
  groupItemsBySection,
  normalizeSection
} from '../../domain/shopping';
import { formatAmount, getCurrencySymbol } from '../../utils/formatters';

export default function ShoppingListDetailView({
  list,
  items = [],
  products = [],
  rates = {},
  onBack,
  onAddItem,
  onUpdateItem,
  onToggleItemCheck,
  onDeleteItem,
  onRegisterPurchase,
  searchProducts,
  onEditList,
  onDeleteList
}) {
  // Formulario rápido para nuevo artículo
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('und');
  const [section, setSection] = useState('viveres');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [suggestedPriceBadge, setSuggestedPriceBadge] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Modal de historial de precios
  const [historyProduct, setHistoryProduct] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Edición inline de precio real al marcar
  const [editingActualPriceId, setEditingActualPriceId] = useState(null);
  const [inlinePriceVal, setInlinePriceVal] = useState('');

  const nameInputRef = useRef(null);

  // Lista de ítems pertenecientes a esta lista
  const listItems = useMemo(() => {
    return (items || []).filter(i => i.list_id === list?.id && !i.deleted_at);
  }, [items, list?.id]);

  // Totales de la lista
  const totals = useMemo(() => {
    return calculateListTotals(listItems, list?.currency || 'USD', rates, list?.budget);
  }, [listItems, list?.currency, rates, list?.budget]);

  // Agrupación por sección
  const sections = useMemo(() => {
    return groupItemsBySection(listItems);
  }, [listItems]);

  // Sugerencias de autocompletado
  const suggestions = useMemo(() => {
    if (!name.trim() || !showSuggestions) return [];
    if (searchProducts) {
      return searchProducts(name);
    }
    const q = name.toLowerCase().trim();
    return (products || []).filter(p => p.name && p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [name, showSuggestions, searchProducts, products]);

  // Seleccionar producto del autocompletado
  const handleSelectSuggestion = (prod) => {
    setName(prod.name);
    setUnit(prod.default_unit || 'und');
    setSection(normalizeSection(prod.section));
    setSelectedProductId(prod.id);
    setShowSuggestions(false);
    setShowDetails(true);

    if (prod.last_price > 0) {
      setEstimatedPrice(String(prod.last_price));
      setSuggestedPriceBadge({
        price: prod.last_price,
        currency: prod.last_price_currency || list.currency
      });
    }
  };

  // Agregar artículo
  const handleAddItemSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddItem(list.id, {
      name: name.trim(),
      product_id: selectedProductId,
      quantity: Number(quantity) > 0 ? Number(quantity) : 1,
      unit,
      section,
      estimated_price: estimatedPrice !== '' ? Number(estimatedPrice) : 0,
      price_currency: list.currency || 'USD'
    });

    // Resetear formulario manteniendo la última sección para agilizar la carga
    setName('');
    setQuantity('1');
    setEstimatedPrice('');
    setSelectedProductId(null);
    setSuggestedPriceBadge(null);
    setShowSuggestions(false);
    // Mantener el foco para seguir agregando (el teclado ya estaba abierto)
    nameInputRef.current?.focus();
  };

  // Abrir historial de precios al tocar el nombre
  const handleOpenProductHistory = useCallback((item) => {
    // Buscar el producto en products o construir uno con la info del ítem
    const prod = (products || []).find(p =>
      (item.product_id && p.id === item.product_id) ||
      (p.name && p.name.toLowerCase().trim() === item.name.toLowerCase().trim())
    ) || {
      id: item.product_id,
      name: item.name,
      section: item.section,
      default_unit: item.unit,
      last_price: item.actual_price != null ? item.actual_price : item.estimated_price,
      last_price_currency: item.price_currency || list.currency,
      price_history: []
    };

    setHistoryProduct(prod);
    setIsHistoryModalOpen(true);
  }, [products, list?.currency]);

  // Guardar precio real inline
  const handleSaveActualPrice = useCallback((itemId) => {
    if (inlinePriceVal !== '' && !isNaN(Number(inlinePriceVal))) {
      onUpdateItem(itemId, { actual_price: Number(inlinePriceVal) });
    }
    setEditingActualPriceId(null);
    setInlinePriceVal('');
  }, [inlinePriceVal, onUpdateItem]);

  const handleStartEditPrice = useCallback((item) => {
    setEditingActualPriceId(item.id);
    setInlinePriceVal(item.actual_price != null ? String(item.actual_price) : String(item.estimated_price || ''));
  }, []);

  const currSymbol = getCurrencySymbol(list?.currency || 'USD');
  const altSymbol = getCurrencySymbol(totals.altCurrency);
  const isDone = list?.status === 'done';
  const purchaseTotal = totals.checkedTotal > 0 ? totals.checkedTotal : totals.estimatedTotal;

  return (
    <div className="shop-detail">
      {/* 1. ENCABEZADO: volver a todas las listas + nombre + acciones de la lista */}
      <div className="shop-detail-top">
        <button type="button" className="modal-back-btn" onClick={onBack} aria-label="Volver a mis listas">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span>Mis listas</span>
        </button>
        <div className="shop-detail-top-actions">
          {onEditList && (
            <button type="button" className="shop-detail-action" onClick={() => onEditList(list)} aria-label="Editar nombre, tienda o presupuesto de la lista">
              <Icon name="edit" size={16} /> <span>Editar</span>
            </button>
          )}
          {onDeleteList && (
            <button type="button" className="shop-detail-action danger" onClick={() => onDeleteList(list.id)} aria-label="Eliminar esta lista">
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="shop-detail-title">
        <h2>{list?.name}</h2>
        <div className="shop-detail-chips">
          {list?.store && <span className="shop-chip">{list.store}</span>}
          <span className="shop-chip accent">{list?.currency || 'USD'}</span>
          <span className="shop-chip">{totals.totalCount} {totals.totalCount === 1 ? 'artículo' : 'artículos'}</span>
          {isDone && <span className="shop-chip success">✓ Completada</span>}
        </div>
      </div>

      {/* 2. RESUMEN (en el flujo de la página, ya no tapa los artículos) */}
      <div className="shop-summary">
        {totals.hasBudget && (
          <div className="shop-summary-budget">
            <div className="shop-summary-budget-row">
              <span>Presupuesto: <strong>{currSymbol}{formatAmount(totals.budgetAmount, list?.currency)}</strong></span>
              <span className={totals.isOverBudget ? 'danger' : 'success'}>
                {totals.isOverBudget
                  ? `Excedido por ${currSymbol}${formatAmount(Math.abs(totals.budgetRemaining), list?.currency)}`
                  : `Quedan: ${currSymbol}${formatAmount(totals.budgetRemaining, list?.currency)}`}
              </span>
            </div>
            <div className="shop-bar">
              <div className={`shop-bar-fill${totals.isOverBudget ? ' danger' : ''}`} style={{ width: `${Math.min(totals.budgetUsagePercent, 100)}%` }} />
            </div>
          </div>
        )}
        <div className="shop-summary-grid">
          <div className="shop-summary-cell">
            <div className="shop-summary-label">Estimado</div>
            <div className="shop-summary-value">{currSymbol}{formatAmount(totals.estimatedTotal, list?.currency)}</div>
            <div className="shop-summary-alt">≈ {altSymbol}{formatAmount(totals.estimatedTotalAlt, totals.altCurrency)}</div>
          </div>
          <div className="shop-summary-cell accent">
            <div className="shop-summary-label">Marcado ({totals.checkedCount})</div>
            <div className="shop-summary-value">{currSymbol}{formatAmount(totals.checkedTotal, list?.currency)}</div>
            <div className="shop-summary-alt">≈ {altSymbol}{formatAmount(totals.checkedTotalAlt, totals.altCurrency)}</div>
          </div>
          <div className={`shop-summary-cell${totals.pendingCount > 0 ? ' warning' : ''}`}>
            <div className="shop-summary-label">Falta ({totals.pendingCount})</div>
            <div className="shop-summary-value">{currSymbol}{formatAmount(totals.pendingTotal, list?.currency)}</div>
            <div className="shop-summary-alt">≈ {altSymbol}{formatAmount(totals.pendingTotalAlt, totals.altCurrency)}</div>
          </div>
        </div>
      </div>

      {/* 3. AGREGAR ARTÍCULO: nombre + botón; cantidad, precio y sección van plegados */}
      {!isDone && (
        <form className="shop-add" onSubmit={handleAddItemSubmit}>
          <div className="shop-add-row">
            <div className="shop-add-name">
              <input
                ref={nameInputRef}
                type="text"
                className="input-field"
                placeholder="Nombre del producto"
                aria-label="Nombre del producto a agregar"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setShowSuggestions(true);
                  setSelectedProductId(null);
                  setSuggestedPriceBadge(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />

              {suggestions.length > 0 && (
                <div className="shop-suggestions" role="listbox">
                  {suggestions.map(sug => (
                    <div
                      key={sug.id}
                      role="option"
                      aria-selected="false"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSelectSuggestion(sug)}
                      className="shop-suggestion"
                    >
                      <span>
                        <span>{sug.name}</span>
                        <span className="muted"> ({sug.default_unit || 'und'})</span>
                      </span>
                      {sug.last_price > 0 && (
                        <span className="accent">
                          Último: ${formatAmount(sug.last_price, sug.last_price_currency || list.currency)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" variant="primary" disabled={!name.trim()} ariaLabel="Agregar a la lista" style={{ flexShrink: 0 }}>
              Agregar
            </Button>
          </div>

          {suggestedPriceBadge && (
            <div className="shop-add-hint">
              Último precio registrado: ${formatAmount(suggestedPriceBadge.price, suggestedPriceBadge.currency)} {suggestedPriceBadge.currency}
            </div>
          )}

          <button type="button" className="link-btn shop-add-toggle" onClick={() => setShowDetails(v => !v)} aria-expanded={showDetails}>
            {showDetails ? 'Ocultar cantidad, precio y sección ▴' : 'Cantidad, precio y sección ▾'}
          </button>

          {showDetails && (
            <div className="shop-add-details">
              <label className="shop-edit-field">
                <span>Cantidad</span>
                <input type="number" step="any" min="0.01" inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)} className="input-field" />
              </label>
              <label className="shop-edit-field">
                <span>Unidad</span>
                <select value={unit} onChange={e => setUnit(e.target.value)} className="input-field">
                  {SHOPPING_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <label className="shop-edit-field">
                <span>Precio est. ({list?.currency || 'USD'})</span>
                <input type="number" step="any" min="0" inputMode="decimal" placeholder="0,00" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} className="input-field" />
              </label>
              <label className="shop-edit-field">
                <span>Sección</span>
                <select value={section} onChange={e => setSection(e.target.value)} className="input-field">
                  {SHOPPING_SECTIONS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
              </label>
            </div>
          )}
        </form>
      )}

      {/* 4. ARTÍCULOS AGRUPADOS POR SECCIÓN */}
      {sections.length === 0 ? (
        <div className="shop-empty">
          <div className="shop-empty-icon">🛒</div>
          <div className="shop-empty-title">La lista está vacía</div>
          <div className="shop-empty-text">Escribe un producto arriba y toca Agregar.</div>
        </div>
      ) : (
        <div className="shop-sections">
          {!isDone && <div className="shop-help">Marca la casilla cuando lo tengas en el carrito. Toca un artículo o el lápiz para editarlo.</div>}
          {sections.map(sec => (
            <div key={sec.sectionKey} className="shop-section">
              <div className="shop-section-head">
                <span className="shop-section-name">
                  <span aria-hidden="true">{sec.icon}</span> {sec.label} <span className="muted">({sec.items.length})</span>
                </span>
                <span className="shop-section-total">{currSymbol}{formatAmount(sec.subtotal, list?.currency || 'USD')}</span>
              </div>
              <div className="shop-section-items">
                {sec.items.map(item => (
                  <ShoppingListItemRow
                    key={item.id}
                    item={item}
                    listCurrency={list?.currency}
                    currSymbol={currSymbol}
                    onToggleItemCheck={onToggleItemCheck}
                    onEditItem={setEditingItem}
                    onDeleteItem={onDeleteItem}
                    isEditingPrice={editingActualPriceId === item.id}
                    inlinePriceVal={inlinePriceVal}
                    setInlinePriceVal={setInlinePriceVal}
                    onStartEditPrice={handleStartEditPrice}
                    onSaveActualPrice={handleSaveActualPrice}
                    readOnly={isDone}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. REGISTRAR COMPRA: al final de la lista, sin tapar contenido */}
      {!isDone && totals.totalCount > 0 && (
        <div className="shop-register">
          <Button
            variant="primary"
            onClick={() => onRegisterPurchase({
              list,
              totalAmount: purchaseTotal,
              checkedItems: listItems.filter(i => i.is_checked)
            })}
            style={{ width: '100%', height: '48px', fontWeight: 700 }}
          >
            🛒 Registrar compra ({currSymbol}{formatAmount(purchaseTotal, list?.currency)})
          </Button>
          <div className="shop-register-hint">
            {totals.checkedCount > 0
              ? 'Se registra como gasto el total de lo marcado y la lista pasa a Terminadas.'
              : 'Aún no marcas nada: se usará el total estimado.'}
          </div>
        </div>
      )}

      <ShoppingItemEditModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(id, updates) => onUpdateItem(id, updates)}
        onDelete={onDeleteItem}
        onOpenHistory={handleOpenProductHistory}
      />

      <PriceHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        product={historyProduct}
      />
    </div>
  );
}
