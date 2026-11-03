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
