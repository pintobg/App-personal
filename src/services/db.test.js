import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, migrateLocalStorageToDexie, loadTransactionsFromDB, persistTransactionsToDB, clearAllDB, MIGRATION_DONE_KEY } from './db';

describe('Service: db (Dexie IndexedDB y migración)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearAllDB();
  });

  it('migra transacciones existentes desde localStorage a Dexie la primera vez', async () => {
    const mockTxs = [
      { id: 'tx-1', type: 'income', amount: '100', currency: 'USD', date: '2026-10-21' },
      { id: 'tx-2', type: 'spent', amount: '50', currency: 'USD', date: '2026-10-20' }
    ];
    localStorage.setItem('personal_transactions', JSON.stringify(mockTxs));

    await migrateLocalStorageToDexie();

    const inDb = await db.transactions.toArray();
    expect(inDb).toHaveLength(2);
    expect(localStorage.getItem(MIGRATION_DONE_KEY)).toBe('true');
  });

  it('loadTransactionsFromDB devuelve transacciones guardadas en IndexedDB', async () => {
    const mockTxs = [
      { id: 'tx-a', type: 'income', amount: '200', date: '2026-10-10' },
      { id: 'tx-b', type: 'spent', amount: '30', date: '2026-10-15' }
    ];
    await db.transactions.bulkPut(mockTxs);

    const loaded = await loadTransactionsFromDB();
    expect(loaded).toHaveLength(2);
    // Debe venir ordenado descendente por fecha
    expect(loaded[0].id).toBe('tx-b');
  });

  it('persistTransactionsToDB guarda en IndexedDB y sincroniza en localStorage', async () => {
    const list = [{ id: 'tx-100', amount: '500', currency: 'USDT' }];
    await persistTransactionsToDB(list);

    const fromDb = await db.transactions.toArray();
    expect(fromDb).toHaveLength(1);
    expect(fromDb[0].id).toBe('tx-100');

    const fromStorage = JSON.parse(localStorage.getItem('personal_transactions'));
    expect(fromStorage).toHaveLength(1);
    expect(fromStorage[0].id).toBe('tx-100');
  });
});
