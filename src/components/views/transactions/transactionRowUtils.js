import { toLocalDateString, hasExplicitTime } from '../../../utils/dates';
import {
  translateCategory,
  translateSubcategory,
  getTxRateSnapshot,
  getTxUsdEquivalent,
  formatTxRate
} from '../../../utils/formatters';

export function resolveTransactionPresentation(tx, { rates = {}, getCategoryName, getSubcategoryName, catObj }) {
  const rateSnapshot = getTxRateSnapshot(tx, rates);
  const usdVal = getTxUsdEquivalent(tx, rates);
  const rateStr = formatTxRate(tx.currency, rateSnapshot);

  const defaultTypeLabel = tx.type === 'transfer'
    ? (tx.currency !== tx.destCurrency ? 'Cambio de divisa' : 'Transferencia')
    : (tx.type === 'income' ? 'Ingreso' : (tx.type === 'adjustment' ? 'Ajuste de saldo' : 'Gasto'));

  let txTitle = defaultTypeLabel;
  let categorySubtext = '';

  const cat = (tx.category_id && getCategoryName ? getCategoryName(tx.category_id) : '') || translateCategory(tx.category);
  const subcat = (tx.subcategory_id && getSubcategoryName ? getSubcategoryName(tx.subcategory_id) : '') || translateSubcategory(tx.subcategory);

  if (tx.notes && tx.notes.trim()) {
    txTitle = tx.notes.trim();
    if (cat && subcat && cat !== subcat) {
      categorySubtext = `${cat} • ${subcat}`;
    } else if (cat) {
      categorySubtext = cat;
    } else if (subcat) {
      categorySubtext = subcat;
    }
  } else if (subcat && subcat.trim()) {
    txTitle = subcat.trim();
    if (cat && cat !== txTitle) {
      categorySubtext = cat;
    }
  } else if (cat && cat.trim()) {
    txTitle = cat.trim();
    categorySubtext = defaultTypeLabel;
  }

  const fallbackIcon = tx.type === 'transfer'
    ? '🔁'
    : (tx.type === 'adjustment' ? '⚖️' : (tx.type === 'income' ? '💵' : '💳'));
  const catIcon = catObj?.icon || fallbackIcon;
  const catColor = catObj?.color || (tx.type === 'income' ? 'var(--color-income)' : (tx.type === 'spent' ? 'var(--color-spent)' : 'var(--color-accent)'));

  return {
    rateSnapshot,
    usdVal,
    rateStr,
    defaultTypeLabel,
    txTitle,
    categorySubtext,
    catIcon,
    catColor
  };
}

/**
 * Textos de la fila compacta (64 px): línea 1 = categoría o tipo, línea 2 = nota o cuenta (+ hora).
 */
export function resolveRowLines(tx, { getCategoryName, getSubcategoryName } = {}) {
  const cat = (tx.category_id && getCategoryName ? getCategoryName(tx.category_id) : '') || translateCategory(tx.category);
  const subcat = (tx.subcategory_id && getSubcategoryName ? getSubcategoryName(tx.subcategory_id) : '') || translateSubcategory(tx.subcategory);
  let title;
  if (tx.type === 'transfer') {
    title = tx.currency !== tx.destCurrency ? 'Cambio de divisa' : 'Transferencia';
  } else if (tx.type === 'adjustment') {
    title = 'Ajuste de saldo';
  } else {
    title = (subcat && cat && subcat !== cat) ? `${cat} · ${subcat}` : (cat || subcat || (tx.type === 'income' ? 'Ingreso' : 'Gasto'));
  }
  let sub;
  if (tx.type === 'transfer') {
    sub = `${tx.origin || ''} → ${tx.destOrigin || ''}`;
  } else {
    sub = (tx.notes && tx.notes.trim()) || tx.origin || '';
  }
  if (hasExplicitTime(tx.date)) {
    const d = new Date(tx.date);
    if (!isNaN(d.getTime())) {
      sub += `${sub ? ' · ' : ''}${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  return { title, sub };
}

/**
 * Agrupa movimientos (ya filtrados y ordenados) por día local, del más reciente al más antiguo.
 * El neto del día = ingresos - gastos en USD; transferencias y ajustes no cuentan.
 */
export function groupTransactionsByDay(transactions = [], rates = {}) {
  const groups = new Map();
  transactions.forEach(tx => {
    const key = toLocalDateString(tx.date) || 'sin-fecha';
    if (!groups.has(key)) groups.set(key, { date: key, net: 0, items: [] });
    const g = groups.get(key);
    g.items.push(tx);
    if (tx.type === 'income' || tx.type === 'spent') {
      const usd = Number(getTxUsdEquivalent(tx, rates)) || 0;
      g.net += tx.type === 'income' ? usd : -usd;
    }
  });
  return [...groups.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
