import Dexie from 'dexie';

export const db = new Dexie('FinanzasDB');

db.version(1).stores({
  transactions: '&id, type, date, assetId, updated_at, deleted_at',
  assets: '&id, name, location, updated_at, deleted_at',
  obligations: '&id, type, dueDate, updated_at, deleted_at',
  budgets: '&category, updated_at, deleted_at'
});

db.version(2).stores({
  goals: '&id, currency, deadline, updated_at, deleted_at'
});

export const MIGRATION_DONE_KEY = 'finanzas_dexie_migrated_v1';

/**
 * Migra automáticamente los datos existentes de localStorage a IndexedDB la primera vez.
 * Es tolerante a fallos si IndexedDB o localStorage no están disponibles.
 */
export async function migrateLocalStorageToDexie() {
  if (typeof window === 'undefined') return;
  try {
    const alreadyMigrated = localStorage.getItem(MIGRATION_DONE_KEY);
    if (alreadyMigrated) return;

    const rawTxs = localStorage.getItem('personal_transactions');
    if (rawTxs) {
      try {
        const txs = JSON.parse(rawTxs);
        if (Array.isArray(txs) && txs.length > 0) {
          await db.transactions.bulkPut(txs);
        }
      } catch (err) {
        console.warn('[Dexie] Error parsing raw transactions:', err);
      }
    }

    const rawAssets = localStorage.getItem('personal_assets');
    if (rawAssets) {
      try {
        const assets = JSON.parse(rawAssets);
        if (Array.isArray(assets) && assets.length > 0) {
          await db.assets.bulkPut(assets);
        }
      } catch (err) {
        console.warn('[Dexie] Error parsing raw assets:', err);
      }
    }

    const rawObs = localStorage.getItem('obligations');
    if (rawObs) {
      try {
        const obs = JSON.parse(rawObs);
        if (Array.isArray(obs) && obs.length > 0) {
          await db.obligations.bulkPut(obs);
        }
      } catch (err) {
        console.warn('[Dexie] Error parsing raw obligations:', err);
      }
    }

    const rawBudgets = localStorage.getItem('personal_budgets');
    if (rawBudgets) {
      try {
        const budgets = JSON.parse(rawBudgets);
        if (Array.isArray(budgets) && budgets.length > 0) {
          await db.budgets.bulkPut(budgets);
        }
      } catch (err) {
        console.warn('[Dexie] Error parsing raw budgets:', err);
      }
    }

    const rawGoals = localStorage.getItem('personal_goals');
    if (rawGoals) {
      try {
        const goals = JSON.parse(rawGoals);
        if (Array.isArray(goals) && goals.length > 0) {
          await db.goals.bulkPut(goals);
        }
      } catch (err) {
        console.warn('[Dexie] Error parsing raw goals:', err);
      }
    }

    localStorage.setItem(MIGRATION_DONE_KEY, 'true');
  } catch (err) {
    console.warn('[Dexie] Falló la migración inicial desde localStorage:', err);
  }
}

/**
 * Carga las transacciones desde IndexedDB, con fallback transparente a localStorage
 */
export async function loadTransactionsFromDB() {
  try {
    await migrateLocalStorageToDexie();
    const count = await db.transactions.count();
    if (count > 0) {
      const items = await db.transactions.toArray();
      // Ordenar descendente por fecha como en memoria
      return items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }
  } catch (err) {
    console.warn('[Dexie] Fallo al leer de IndexedDB, usando fallback:', err);
  }

  // Fallback localStorage
  try {
    const saved = localStorage.getItem('personal_transactions');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda transacciones en IndexedDB (y replica en localStorage como respaldo/fallback síncrono)
 */
export async function persistTransactionsToDB(transactions) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('personal_transactions', JSON.stringify(transactions));
    }
    if (Array.isArray(transactions)) {
      await db.transaction('rw', db.transactions, async () => {
        await db.transactions.clear();
        if (transactions.length > 0) {
          await db.transactions.bulkPut(transactions);
        }
      });
    }
  } catch (err) {
    console.warn('[Dexie] Error persistiendo transacciones en IndexedDB:', err);
  }
}

/**
 * Limpia todas las tablas de IndexedDB
 */
export async function clearAllDB() {
  try {
    await Promise.all([
      db.transactions.clear(),
      db.assets.clear(),
      db.obligations.clear(),
      db.budgets.clear(),
      db.goals ? db.goals.clear() : Promise.resolve()
    ]);
  } catch (err) {
    console.warn('[Dexie] Error al limpiar tablas:', err);
  }
}
