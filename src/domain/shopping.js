import { add, sub, mul, round, convert } from './money';

export const SHOPPING_SECTIONS = [
  { id: 'viveres', label: 'Víveres', icon: '🥫', sortOrder: 1 },
  { id: 'frutas_verduras', label: 'Frutas y verduras', icon: '🥬', sortOrder: 2 },
  { id: 'carnes', label: 'Carnes', icon: '🥩', sortOrder: 3 },
  { id: 'lacteos', label: 'Lácteos', icon: '🧀', sortOrder: 4 },
  { id: 'limpieza', label: 'Limpieza', icon: '🧹', sortOrder: 5 },
  { id: 'higiene', label: 'Higiene', icon: '🧼', sortOrder: 6 },
  { id: 'otros', label: 'Otros', icon: '📦', sortOrder: 7 }
];

export const SHOPPING_UNITS = ['und', 'kg', 'g', 'l', 'ml', 'paquete'];

/**
 * Normaliza el identificador de sección.
 */
export function normalizeSection(rawSection) {
  if (!rawSection) return 'otros';
  const str = String(rawSection).toLowerCase().trim();
  if (str.includes('víver') || str.includes('viver') || str.includes('abarrote')) return 'viveres';
  if (str.includes('fruta') || str.includes('verdura') || str.includes('vegetal')) return 'frutas_verduras';
  if (str.includes('carne') || str.includes('pollo') || str.includes('pescado')) return 'carnes';
  if (str.includes('láct') || str.includes('lact') || str.includes('queso') || str.includes('leche')) return 'lacteos';
  if (str.includes('limpieza') || str.includes('hogar')) return 'limpieza';
  if (str.includes('higien') || str.includes('personal') || str.includes('aseo')) return 'higiene';
  return 'otros';
}

/**
 * Obtiene metadata de la sección.
 */
export function getSectionMeta(sectionKey) {
  const normalized = normalizeSection(sectionKey);
  return SHOPPING_SECTIONS.find(s => s.id === normalized) || { id: 'otros', label: 'Otros', icon: '📦', sortOrder: 7 };
}

/**
 * Calcula el subtotal de un artículo.
 */
export function calculateItemSubtotal(item, useActualIfAvailable = true) {
  if (!item) return 0;
  const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
  const price = (useActualIfAvailable && item.actual_price != null && item.actual_price !== '')
    ? Number(item.actual_price)
    : (Number(item.estimated_price) || 0);

  return round(mul(qty, price), item.price_currency || 'USD');
}

/**
 * Calcula los totales consolidados de la lista de compras.
 */
export function calculateListTotals(items = [], listCurrency = 'USD', rates = {}, budget = null) {
  const activeItems = (items || []).filter(item => !item.deleted_at);
  const curr = (listCurrency || 'USD').toUpperCase();
  const altCurrency = curr === 'USD' ? 'VES' : 'USD';

  let estimatedTotal = 0;
  let checkedTotal = 0;
  let estimatedCheckedTotal = 0;
  let checkedCount = 0;

  activeItems.forEach(item => {
    const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
    const estPrice = Number(item.estimated_price) || 0;
    const estSubtotal = mul(qty, estPrice);
    estimatedTotal = add(estimatedTotal, estSubtotal);

    if (item.is_checked) {
      checkedCount++;
      estimatedCheckedTotal = add(estimatedCheckedTotal, estSubtotal);
      const actPrice = (item.actual_price != null && item.actual_price !== '')
        ? Number(item.actual_price)
        : estPrice;
      const actSubtotal = mul(qty, actPrice);
      checkedTotal = add(checkedTotal, actSubtotal);
    }
  });

  estimatedTotal = round(estimatedTotal, curr);
  checkedTotal = round(checkedTotal, curr);
  const pendingTotal = round(sub(estimatedTotal, estimatedCheckedTotal), curr);
  const totalCount = activeItems.length;
  const pendingCount = totalCount - checkedCount;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Conversiones alternativas según tasas
  const estimatedTotalAlt = convert(estimatedTotal, curr, altCurrency, rates);
  const checkedTotalAlt = convert(checkedTotal, curr, altCurrency, rates);
  const pendingTotalAlt = convert(pendingTotal, curr, altCurrency, rates);

  // Manejo de presupuesto
  const numBudget = Number(budget);
  const hasBudget = Boolean(budget != null && budget !== '' && !isNaN(numBudget) && numBudget > 0);
  let budgetRemaining = null;
  let budgetRemainingAlt = null;
  let isOverBudget = false;
  let budgetUsagePercent = 0;

  if (hasBudget) {
    budgetRemaining = round(sub(numBudget, checkedTotal), curr);
    isOverBudget = budgetRemaining < 0;
    budgetUsagePercent = numBudget > 0 ? Math.min(Math.round((checkedTotal / numBudget) * 100), 999) : 0;
    budgetRemainingAlt = convert(Math.abs(budgetRemaining), curr, altCurrency, rates);
  }

  return {
    currency: curr,
    altCurrency,
    totalCount,
    checkedCount,
    pendingCount,
    progressPercent,
    estimatedTotal,
    estimatedTotalAlt,
    checkedTotal,
    checkedTotalAlt,
    pendingTotal,
    pendingTotalAlt,
    hasBudget,
    budgetAmount: hasBudget ? numBudget : null,
    budgetRemaining,
    budgetRemainingAlt,
    isOverBudget,
    budgetUsagePercent
  };
}

/**
 * Agrupa los artículos por sección ordenada, colocando los no marcados primero y los marcados al final.
 */
export function groupItemsBySection(items = []) {
  const activeItems = (items || []).filter(item => !item.deleted_at);
  const map = new Map();

  SHOPPING_SECTIONS.forEach(s => {
    map.set(s.id, {
      sectionKey: s.id,
      label: s.label,
      icon: s.icon,
      sortOrder: s.sortOrder,
      items: [],
      subtotal: 0
    });
  });

  activeItems.forEach(item => {
    const secId = normalizeSection(item.section);
    let group = map.get(secId);
    if (!group) {
      group = map.get('otros');
    }
    group.items.push(item);
    group.subtotal = add(group.subtotal, calculateItemSubtotal(item, true));
  });

  // Retornar solo secciones con artículos, ordenadas según sortOrder
  return Array.from(map.values())
    .filter(g => g.items.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(group => {
      // Ordenar artículos dentro de la sección: no marcados primero, marcados al final
      const sortedItems = [...group.items].sort((a, b) => {
        if (Boolean(a.is_checked) === Boolean(b.is_checked)) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        return a.is_checked ? 1 : -1;
      });
      return {
        ...group,
        subtotal: round(group.subtotal, 'USD'),
        items: sortedItems
      };
    });
}

/**
 * Duplica una lista de compras existente para repetir compra.
 */
export function duplicateShoppingList(originalList, items = []) {
  if (!originalList) return null;
  const nowIso = new Date().toISOString();
  const newListId = crypto.randomUUID();

  const newList = {
    ...originalList,
    id: newListId,
    name: `${originalList.name || 'Lista'} (copia)`,
    status: 'active',
    completed_at: null,
    transaction_id: null,
    created_at: nowIso,
    updated_at: nowIso
  };

  const listItems = (items || []).filter(it => it.list_id === originalList.id && !it.deleted_at);
  const newItems = listItems.map((it, idx) => ({
    ...it,
    id: crypto.randomUUID(),
    list_id: newListId,
    is_checked: false,
    actual_price: null,
    sort_order: idx,
    created_at: nowIso,
    updated_at: nowIso
  }));

  return { newList, newItems };
}

/**
 * Actualiza el catálogo `shopping_products` al completar una compra.
 */
export function updateProductCatalogWithPurchase(existingProducts = [], purchasedItems = [], listCurrency = 'USD', listId = null) {
  const nowIso = new Date().toISOString();
  const nextProducts = [...(existingProducts || [])];

  (purchasedItems || []).forEach(item => {
    if (!item.name || item.deleted_at) return;
    const cleanName = item.name.trim();
    const finalPrice = item.actual_price != null && item.actual_price !== ''
      ? Number(item.actual_price)
      : (Number(item.estimated_price) || 0);
    const finalCurrency = (item.price_currency || listCurrency || 'USD').toUpperCase();
    const cleanSection = normalizeSection(item.section);
    const cleanUnit = item.unit || 'und';

    const historyEntry = {
      date: nowIso,
      price: finalPrice,
      currency: finalCurrency,
      list_id: listId
    };

    const existingIndex = nextProducts.findIndex(p =>
      (item.product_id && p.id === item.product_id) ||
      (p.name && p.name.toLowerCase().trim() === cleanName.toLowerCase())
    );

    if (existingIndex >= 0) {
      const prod = nextProducts[existingIndex];
      const existingHistory = Array.isArray(prod.price_history) ? prod.price_history : [];
      nextProducts[existingIndex] = {
        ...prod,
        last_price: finalPrice,
        last_price_currency: finalCurrency,
        default_unit: cleanUnit,
        section: cleanSection,
        last_bought_at: nowIso,
        price_history: [historyEntry, ...existingHistory].slice(0, 50),
        updated_at: nowIso
      };
    } else {
      const newProd = {
        id: item.product_id || crypto.randomUUID(),
        name: cleanName,
        default_unit: cleanUnit,
        section: cleanSection,
        last_price: finalPrice,
        last_price_currency: finalCurrency,
        last_bought_at: nowIso,
        price_history: [historyEntry],
        created_at: nowIso,
        updated_at: nowIso
      };
      nextProducts.push(newProd);
    }
  });

  return nextProducts;
}
