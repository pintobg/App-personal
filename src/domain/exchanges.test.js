import { describe, it, expect } from 'vitest';
import { summarizeExchanges } from './exchanges';

const now = new Date(2026, 10, 3);
const sell = (over) => ({ id: Math.random().toString(), type: 'transfer', currency: 'USD', destCurrency: 'VES', amount: 100, destAmount: 40000, date: '2026-11-01', ...over });

describe('summarizeExchanges', () => {
  it('calcula la tasa promedio ponderada de lo vendido en los últimos 30 días', () => {
    const res = summarizeExchanges([
      sell({ amount: 100, destAmount: 40000 }),
      sell({ amount: 50, destAmount: 21000, date: '2026-10-20' }),
      sell({ amount: 10, destAmount: 1, date: '2026-08-01' })
    ], { now });
    expect(res.items).toHaveLength(3);
    expect(res.sold.count).toBe(2);
    expect(res.sold.foreignTotal).toBe(150);
    expect(res.sold.avgRate).toBeCloseTo(61000 / 150, 5);
  });

  it('las compras de divisas usan Bs. por divisa y se ignoran transferencias sin bolívares', () => {
    const res = summarizeExchanges([
      { id: 'b', type: 'transfer', currency: 'VES', destCurrency: 'USD', amount: 4100, destAmount: 10, date: '2026-11-02' },
      { id: 'x', type: 'transfer', currency: 'USD', destCurrency: 'USDT', amount: 10, destAmount: 9.9, date: '2026-11-02' },
      { id: 'y', type: 'transfer', currency: 'USD', destCurrency: 'USD', amount: 10, destAmount: 10, date: '2026-11-02' }
    ], { now });
    expect(res.items.map(i => i.id)).toEqual(['b']);
    expect(res.bought.avgRate).toBe(410);
  });

  it('suma la comisión a lo entregado', () => {
    const res = summarizeExchanges([sell({ amount: 99, commission: 1, destAmount: 40000 })], { now });
    expect(res.items[0].rate).toBe(400);
  });
});
