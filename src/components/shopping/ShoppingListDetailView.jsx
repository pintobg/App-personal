import { useState, useMemo, useRef, useCallback } from 'react';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import PriceHistoryModal from './PriceHistoryModal';
import ShoppingListItemRow from './ShoppingListItemRow';
import {
  SHOPPING_SECTIONS,
  SHOPPING_UNITS,
  calculateListTotals,
  groupItemsBySection,
  normalizeSection,
  calculateItemSubtotal
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
  searchProducts
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '9rem' }}>
      {/* 1. ENCABEZADO SUPERIOR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
          <IconButton
            ariaLabel="Volver a listas"
            variant="ghost"
            onClick={onBack}
            style={{ width: '36px', height: '36px' }}
          >
            ←
          </IconButton>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.1rem, 4.5vw, 1.35rem)', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {list?.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
              {list?.store && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-surface-elevated)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  🏪 {list.store}
                </span>
              )}
              <span style={{ fontSize: '0.72rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                {list?.currency || 'USD'}
              </span>
              {list?.status === 'done' && (
                <span style={{ fontSize: '0.68rem', background: 'var(--color-success-soft)', color: 'var(--color-success)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  ✓ Completada
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. FORMULARIO AGREGAR ARTÍCULO */}
      {list?.status !== 'done' && (
        <div className="glass-card" style={{ padding: '0.85rem', borderRadius: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
            + Agregar artículo
          </div>
          <form onSubmit={handleAddItemSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {/* Campo de búsqueda / nombre con autocomplete */}
            <div style={{ position: 'relative' }}>
              <input
                ref={nameInputRef}
                type="text"
                className="input-field"
                placeholder="Nombre del producto (ej. Harina PAN, Leche, Jabón...)"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setShowSuggestions(true);
                  setSelectedProductId(null);
                  setSuggestedPriceBadge(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                style={{ width: '100%', height: '44px', borderRadius: '10px' }}
              />

              {/* Menú de sugerencias autocompletadas */}
              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 40,
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}>
                  {suggestions.map(sug => (
                    <div
                      key={sug.id}
                      onClick={() => handleSelectSuggestion(sug)}
                      style={{
                        padding: '0.6rem 0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{sug.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({sug.default_unit || 'und'})</span>
                      </div>
                      {sug.last_price > 0 && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                          Último: ${formatAmount(sug.last_price, sug.last_price_currency || list.currency)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pill de sugerencia de precio si existe */}
            {suggestedPriceBadge && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                <span>💡</span>
                <span>Último precio registrado: ${formatAmount(suggestedPriceBadge.price, suggestedPriceBadge.currency)} {suggestedPriceBadge.currency}</span>
              </div>
            )}

            {/* Fila: Sección, Cantidad, Unidad y Precio estimado */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Sección</label>
                <select
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.76rem', padding: '0 4px' }}
                >
                  {SHOPPING_SECTIONS.map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Cantidad</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  inputMode="decimal"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'center' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Unidad</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.76rem', padding: '0 4px' }}
                >
                  {SHOPPING_UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Precio est.</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={estimatedPrice}
                  onChange={e => setEstimatedPrice(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '6px' }}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              style={{ width: '100%', height: '38px', marginTop: '0.2rem', fontSize: '0.84rem' }}
            >
              Agregar a la lista
            </Button>
          </form>
        </div>
      )}

      {/* 3. ARTÍCULOS AGRUPADOS POR SECCIÓN */}
      {sections.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2.5rem 1rem',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px dashed var(--border-color)',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛒</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>La lista está vacía</div>
          <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Escribe un producto arriba para comenzar a planificar tu compra.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sections.map(sec => (
            <div key={sec.sectionKey} className="glass-card" style={{ padding: '0.75rem', borderRadius: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              {/* Encabezado de la sección */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{sec.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{sec.label}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({sec.items.length})</span>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {currSymbol}{formatAmount(sec.subtotal, list?.currency || 'USD')}
                </div>
              </div>

              {/* Lista de ítems en esta sección */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {sec.items.map(item => (
                  <ShoppingListItemRow
                    key={item.id}
                    item={item}
                    listCurrency={list?.currency}
                    currSymbol={currSymbol}
                    onToggleItemCheck={onToggleItemCheck}
                    onOpenProductHistory={handleOpenProductHistory}
                    onDeleteItem={onDeleteItem}
                    isEditingPrice={editingActualPriceId === item.id}
                    inlinePriceVal={inlinePriceVal}
                    setInlinePriceVal={setInlinePriceVal}
                    onStartEditPrice={handleStartEditPrice}
                    onSaveActualPrice={handleSaveActualPrice}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. BARRA FIJA INFERIOR CON TOTALES Y ACCIÓN DE COMPRA */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(62px + env(safe-area-inset-bottom))',
          left: 0,
          right: 0,
          background: 'var(--bg-surface-elevated)',
          borderTop: '1px solid var(--border-color)',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.25)',
          padding: '0.75rem 1rem',
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}
      >
        {/* Indicador de presupuesto si existe */}
        {totals.hasBudget && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', marginBottom: '3px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                Presupuesto: <strong>{currSymbol}{formatAmount(totals.budgetAmount, list?.currency)}</strong>
              </span>
              <span style={{
                color: totals.isOverBudget ? 'var(--color-danger)' : 'var(--color-success)',
                fontWeight: 700
              }}>
                {totals.isOverBudget
                  ? `Excedido por ${currSymbol}${formatAmount(Math.abs(totals.budgetRemaining), list?.currency)}`
                  : `Quedan: ${currSymbol}${formatAmount(totals.budgetRemaining, list?.currency)}`}
              </span>
            </div>
            <div style={{ height: '5px', width: '100%', background: 'var(--bg-surface)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(totals.budgetUsagePercent, 100)}%`,
                  background: totals.isOverBudget ? 'var(--color-danger)' : 'var(--color-accent)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        )}

        {/* Totales consolidados: Estimado, Marcado, Falta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', textAlign: 'center' }}>
          <div style={{ padding: '0.35rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>Estimado</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {currSymbol}{formatAmount(totals.estimatedTotal, list?.currency)}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              ≈ {altSymbol}{formatAmount(totals.estimatedTotalAlt, totals.altCurrency)}
            </div>
          </div>

          <div style={{ padding: '0.35rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--color-accent-border)' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--color-accent)', fontWeight: 600 }}>Marcado ({totals.checkedCount})</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)' }}>
              {currSymbol}{formatAmount(totals.checkedTotal, list?.currency)}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              ≈ {altSymbol}{formatAmount(totals.checkedTotalAlt, totals.altCurrency)}
            </div>
          </div>

          <div style={{ padding: '0.35rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>Falta ({totals.pendingCount})</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: totals.pendingCount > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
              {currSymbol}{formatAmount(totals.pendingTotal, list?.currency)}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              ≈ {altSymbol}{formatAmount(totals.pendingTotalAlt, totals.altCurrency)}
            </div>
          </div>
        </div>

        {/* Botón "Registrar compra" */}
        {list?.status !== 'done' && (
          <Button
            variant="primary"
            onClick={() => onRegisterPurchase({
              list,
              totalAmount: totals.checkedTotal > 0 ? totals.checkedTotal : totals.estimatedTotal,
              checkedItems: listItems.filter(i => i.is_checked)
            })}
            style={{ width: '100%', height: '44px', fontWeight: 700 }}
          >
            🛒 Registrar compra ({currSymbol}{formatAmount(totals.checkedTotal > 0 ? totals.checkedTotal : totals.estimatedTotal, list?.currency)})
          </Button>
        )}
      </div>

      {/* Modal de Historial de Precios */}
      <PriceHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        product={historyProduct}
      />
    </div>
  );
}
