import { describe, it, expect } from 'vitest';
import { groupTransactionsByDay, resolveRowLines } from './transactionRowUtils';

describe('groupTransactionsByDay', () => {
  const txs = [
    { id: '1', type: 'spent', amount: 10, currency: 'USD', date: '2026-11-03' },
    { id: '2', type: 'income', amount: 50, currency: 'USD', date: '2026-11-03' },
    { id: '3', type: 'transfer', amount: 100, currency: 'USD', destCurrency: 'USD', destAmount: 100, date: '2026-11-02' },
    { id: '4', type: 'spent', amount: 5, currency: 'USD', date: '2026-11-01' },
    { id: '5', type: 'spent', amount: 7, currency: 'USD', date: '2026-11-02' }
  ];

  it('agrupa por día en orden descendente', () => {
    const groups = groupTransactionsByDay(txs, { USD: 1 });
    expect(groups.map(g => g.date)).toEqual(['2026-11-03', '2026-11-02', '2026-11-01']);
    expect(groups[0].items).toHaveLength(2);
  });

  it('el neto del día ignora transferencias', () => {
    const groups = groupTransactionsByDay(txs, { USD: 1 });
    expect(groups[0].net).toBe(40);
    expect(groups[1].net).toBe(-7);
  });
});

describe('resolveRowLines', () => {
  it('usa la categoría como título y la nota (o la cuenta) debajo', () => {
    expect(resolveRowLines({ type: 'spent', category: 'Comida', notes: 'Pizza', origin: 'Zelle', date: '2026-11-03' })).toEqual({ title: 'Comida', sub: 'Pizza' });
    expect(resolveRowLines({ type: 'spent', category: 'Comida', origin: 'Zelle', date: '2026-11-03' }).sub).toBe('Zelle');
  });

  it('las transferencias muestran origen y destino', () => {
    const lines = resolveRowLines({ type: 'transfer', currency: 'USD', destCurrency: 'VES', origin: 'Zelle', destOrigin: 'Banesco', date: '2026-11-03' });
    expect(lines.title).toBe('Cambio de divisa');
    expect(lines.sub).toBe('Zelle → Banesco');
  });
});
