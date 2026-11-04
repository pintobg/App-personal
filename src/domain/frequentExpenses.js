/**
 * Gastos frecuentes: los gastos que repites (misma categoría, monto, moneda y cuenta)
 * en los últimos `days` días. Se calculan del historial, sin guardar nada nuevo.
 */
import { parseLocalDate } from '../utils/dates';

export function getFrequentExpenses(transactions = [], { days = 60, limit = 4, minCount = 2, now = new Date(), getCategoryName } = {}) {
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days);

  const groups = new Map();
  for (const tx of transactions || []) {
    if (!tx || tx.type !== 'spent' || tx.parentTransactionId) continue;
    const amount = Number(tx.amount);
    if (!(amount > 0)) continue;
    const date = tx.date ? parseLocalDate(String(tx.date).slice(0, 10)) : null;
    if (!date || Number.isNaN(date.getTime()) || date < since) continue;

    const catKey = tx.category_id || tx.category || '';
    const key = [catKey, tx.subcategory_id || tx.subcategory || '', amount, (tx.currency || '').toUpperCase(), tx.assetId || tx.origin || ''].join('|');
    const prev = groups.get(key);
    if (prev) {
      prev.count += 1;
      if (String(tx.date) > String(prev.lastDate)) {
        prev.lastDate = tx.date;
        prev.notes = tx.notes || prev.notes;
      }
    } else {
      groups.set(key, {
        key,
        count: 1,
        lastDate: tx.date,
        amount,
        currency: (tx.currency || '').toUpperCase(),
        category: tx.category || '',
        category_id: tx.category_id || null,
        subcategory: tx.subcategory || '',
        subcategory_id: tx.subcategory_id || null,
        assetId: tx.assetId || '',
        origin: tx.origin || '',
        notes: tx.notes || ''
      });
    }
  }

  return Array.from(groups.values())
    .filter(g => g.count >= minCount)
    .sort((a, b) => (b.count - a.count) || String(b.lastDate).localeCompare(String(a.lastDate)))
    .slice(0, limit)
    .map(g => ({
      ...g,
      label: (g.subcategory || (getCategoryName && g.category_id ? getCategoryName(g.category_id) : '') || g.category || 'Gasto')
    }));
}
