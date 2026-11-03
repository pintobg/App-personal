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

db.version(3).stores({
  user_categories: '&id, kind, parent_id, is_active, updated_at, deleted_at',
  transactions: '&id, type, date, assetId, category_id, subcategory_id, updated_at, deleted_at',
  budgets: '&category, category_id, updated_at, deleted_at',
  obligations: '&id, type, dueDate, category_id, subcategory_id, updated_at, deleted_at'
});

db.version(4).stores({
  shopping_lists: '&id, status, created_at, updated_at, deleted_at',
  shopping_items: '&id, list_id, is_checked, sort_order, updated_at, deleted_at',
  shopping_products: '&id, name, updated_at, deleted_at'
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
 * Carga las categorías personalizadas desde IndexedDB con fallback a localStorage
 */
export async function loadCategoriesFromDB() {
  try {
    if (db.user_categories) {
      const count = await db.user_categories.count();
      if (count > 0) {
        const items = await db.user_categories.toArray();
        return items.filter(c => !c.deleted_at);
      }
    }
  } catch (err) {
    console.warn('[Dexie] Fallo al leer categorías de IndexedDB, usando fallback:', err);
  }

  try {
    const saved = localStorage.getItem('personal_user_categories');
    return saved ? JSON.parse(saved).filter(c => !c.deleted_at) : [];
  } catch {
    return [];
  }
}

/**
 * Persiste las categorías de usuario en IndexedDB y localStorage
 */
export async function persistCategoriesToDB(categories) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('personal_user_categories', JSON.stringify(categories));
    }
    if (Array.isArray(categories) && db.user_categories) {
      await db.transaction('rw', db.user_categories, async () => {
        await db.user_categories.clear();
        if (categories.length > 0) {
          await db.user_categories.bulkPut(categories);
        }
      });
    }
  } catch (err) {
    console.warn('[Dexie] Error persistiendo categorías en IndexedDB:', err);
  }
}

/**
 * Carga listas, artículos y catálogo de compras desde IndexedDB con fallback a localStorage
 */
export async function loadShoppingDataFromDB() {
  const result = { lists: [], items: [], products: [] };
  try {
    if (db.shopping_lists) {
      result.lists = (await db.shopping_lists.toArray()).filter(l => !l.deleted_at);
    }
    if (db.shopping_items) {
      result.items = (await db.shopping_items.toArray()).filter(i => !i.deleted_at);
    }
    if (db.shopping_products) {
      result.products = (await db.shopping_products.toArray()).filter(p => !p.deleted_at);
    }
    if (result.lists.length > 0 || result.items.length > 0 || result.products.length > 0) {
      return result;
    }
  } catch (err) {
    console.warn('[Dexie] Fallo al leer compras de IndexedDB, usando fallback:', err);
  }

  try {
    const rawLists = localStorage.getItem('personal_shopping_lists');
    const rawItems = localStorage.getItem('personal_shopping_items');
    const rawProducts = localStorage.getItem('personal_shopping_products');
    result.lists = rawLists ? JSON.parse(rawLists).filter(l => !l.deleted_at) : [];
    result.items = rawItems ? JSON.parse(rawItems).filter(i => !i.deleted_at) : [];
    result.products = rawProducts ? JSON.parse(rawProducts).filter(p => !p.deleted_at) : [];
  } catch {
    // fallback vacío
  }
  return result;
}

/**
 * Persiste datos de compras en IndexedDB y localStorage
 */
export async function persistShoppingDataToDB({ lists, items, products }) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (lists !== undefined) localStorage.setItem('personal_shopping_lists', JSON.stringify(lists));
      if (items !== undefined) localStorage.setItem('personal_shopping_items', JSON.stringify(items));
      if (products !== undefined) localStorage.setItem('personal_shopping_products', JSON.stringify(products));
    }
    if (db.shopping_lists && Array.isArray(lists)) {
      await db.shopping_lists.clear();
      if (lists.length > 0) await db.shopping_lists.bulkPut(lists);
    }
    if (db.shopping_items && Array.isArray(items)) {
      await db.shopping_items.clear();
      if (items.length > 0) await db.shopping_items.bulkPut(items);
    }
    if (db.shopping_products && Array.isArray(products)) {
      await db.shopping_products.clear();
      if (products.length > 0) await db.shopping_products.bulkPut(products);
    }
  } catch (err) {
    console.warn('[Dexie] Error persistiendo compras en IndexedDB:', err);
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
      db.goals ? db.goals.clear() : Promise.resolve(),
      db.user_categories ? db.user_categories.clear() : Promise.resolve(),
      db.shopping_lists ? db.shopping_lists.clear() : Promise.resolve(),
      db.shopping_items ? db.shopping_items.clear() : Promise.resolve(),
      db.shopping_products ? db.shopping_products.clear() : Promise.resolve()
    ]);
  } catch (err) {
    console.warn('[Dexie] Error al limpiar tablas:', err);
  }
}
