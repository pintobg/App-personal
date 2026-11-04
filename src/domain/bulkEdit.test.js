import { describe, it, expect } from 'vitest';
import { executeBulkMove, executeBulkRecategorize } from './operations';

const assets = [
  { id: 'a1', name: 'USD', location: 'Zelle', amount: 100 },
  { id: 'a2', name: 'USD', location: 'Efectivo', amount: 50 },
  { id: 'a3', name: 'VES', location: 'Banesco', amount: 1000 }
];
const txs = [
  { id: 't1', type: 'spent', amount: 10, currency: 'USD', assetId: 'a1', origin: 'Zelle', category: 'Comida' },
  { id: 't1c', type: 'spent', amount: 1, currency: 'USD', assetId: 'a1', origin: 'Zelle', parentTransactionId: 't1' },
  { id: 't2', type: 'income', amount: 20, currency: 'USD', assetId: 'a1', origin: 'Zelle', category: 'Sueldo' },
  { id: 't3', type: 'spent', amount: 100, currency: 'VES', assetId: 'a3', origin: 'Banesco' },
  { id: 't4', type: 'transfer', amount: 5, currency: 'USD', assetId: 'a1', destAssetId: 'a2' }
];

describe('executeBulkMove', () => {
  it('mueve gastos e ingresos a otra cuenta y corrige ambos saldos (con su comisión)', () => {
    const res = executeBulkMove({ assets, transactions: txs }, [txs[0], txs[2], txs[3], txs[4]], 'a2');
    const byId = Object.fromEntries(res.nextAssets.map(a => [a.id, a.amount]));
    // a1: +10 +1 (gasto y comisión salen) -20 (ingreso sale) = 91
    expect(byId.a1).toBe(91);
    // a2: -10 -1 +20 = 59
    expect(byId.a2).toBe(59);
    expect(byId.a3).toBe(1000);
    expect(res.changedCount).toBe(2);
    expect(res.skippedCount).toBe(2);
    expect(res.nextTransactions.find(t => t.id === 't1c').assetId).toBe('a2');
    expect(res.nextTransactions.find(t => t.id === 't1').origin).toBe('Efectivo');
  });
});

describe('executeBulkRecategorize', () => {
  it('cambia solo los movimientos del mismo tipo', () => {
    const res = executeBulkRecategorize({ assets, transactions: txs }, [txs[0], txs[2]], { kind: 'spent', category: 'Transporte', category_id: 'exp.transport' });
    expect(res.changedCount).toBe(1);
    expect(res.skippedCount).toBe(1);
    expect(res.nextTransactions.find(t => t.id === 't1').category).toBe('Transporte');
    expect(res.nextTransactions.find(t => t.id === 't2').category).toBe('Sueldo');
  });
});
