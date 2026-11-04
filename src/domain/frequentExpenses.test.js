import { describe, it, expect } from 'vitest';
import { getFrequentExpenses } from './frequentExpenses';

const now = new Date(2026, 10, 3);
const tx = (over) => ({ type: 'spent', amount: 2, currency: 'USD', category: 'Comida', subcategory: 'Café', assetId: 'a1', origin: 'Zelle', date: '2026-11-01', ...over });

describe('getFrequentExpenses', () => {
  it('devuelve los gastos repetidos ordenados por cuántas veces se repiten', () => {
    const list = [
      tx({ date: '2026-11-01' }), tx({ date: '2026-10-28' }), tx({ date: '2026-10-20' }),
      tx({ amount: 10, subcategory: 'Gasolina', category: 'Transporte', date: '2026-10-30' }),
      tx({ amount: 10, subcategory: 'Gasolina', category: 'Transporte', date: '2026-10-15' }),
      tx({ amount: 50, subcategory: 'Ropa', date: '2026-10-10' })
    ];
    const res = getFrequentExpenses(list, { now });
    expect(res.map(r => r.label)).toEqual(['Café', 'Gasolina']);
    expect(res[0].count).toBe(3);
  });

  it('ignora gastos de hace más de 60 días, ingresos y comisiones vinculadas', () => {
    const list = [
      tx({ date: '2026-08-01' }), tx({ date: '2026-08-02' }),
      tx({ type: 'income' }), tx({ type: 'income' }),
      tx({ parentTransactionId: 'x' }), tx({ parentTransactionId: 'y' })
    ];
    expect(getFrequentExpenses(list, { now })).toEqual([]);
  });

  it('respeta el límite', () => {
    const list = [];
    for (let i = 1; i <= 6; i++) list.push(tx({ amount: i }), tx({ amount: i }));
    expect(getFrequentExpenses(list, { now, limit: 4 })).toHaveLength(4);
  });
});
