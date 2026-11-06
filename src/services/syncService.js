import { supabase, isSupabaseConfigured } from './supabaseClient';
import { toNullableInt, toNullableNumber } from '../domain/money';
import { mergeById, mergeBudgets } from './merge';

const QUEUE_STORAGE_KEY = 'finanzas_sync_queue';
const DEMO_CLOUD_PREFIX = 'demo_cloud_db_';

let listeners = [];
let currentSyncStatus = navigator.onLine ? 'synced' : 'offline';
let retryTimer = null;
const BACKOFF_STEPS = [5000, 30000, 120000, 600000]; // 5 s, 30 s, 2 min, 10 min

export function getPendingCount() {
  return getQueue().length;
}

export function getSyncStatus() {
  return currentSyncStatus;
}

export function subscribeSyncStatus(listener) {
  listeners.push(listener);
  listener(currentSyncStatus, getPendingCount());
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function setSyncStatus(status) {
  currentSyncStatus = status;
  const count = getPendingCount();
  listeners.forEach(l => l(status, count));
}

function notifyStatusUpdate() {
  const count = getPendingCount();
  listeners.forEach(l => l(currentSyncStatus, count));
}

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleRetry(delayMs) {
  clearRetryTimer();
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (navigator.onLine && getQueue().length > 0) {
      syncService.flushQueue();
    }
  }, delayMs);
}

// Queue Persistence
export function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.map((item, idx) => ({
      ...item,
      id: item.id || item.payload?.id || `${item.table}_${item.timestamp || idx}`
    }));
  } catch {
    return [];
  }
}

export function discardQueueItem(itemIdOrTimestamp) {
  const queue = getQueue();
  const updated = queue.filter(item => {
    if (item.id && item.id === itemIdOrTimestamp) return false;
    if (item.timestamp && item.timestamp === itemIdOrTimestamp) return false;
    return true;
  });
  saveQueue(updated);
  if (updated.length === 0) {
    setSyncStatus(navigator.onLine ? 'synced' : 'offline');
  } else {
    notifyStatusUpdate();
  }
  return updated;
}

function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving sync queue', e);
  }
}

// Helper para upsert resiliente a esquemas con clave (user_id, id) o (id) y tolerante a columnas no migradas
async function resilientUpsert(table, records, onConflict = 'user_id,id') {
  if (!supabase) return { error: new Error('Supabase no inicializado') };
  let currentRecords = records;
  let currentConflict = onConflict;

  for (let attempt = 0; attempt < 5; attempt++) {
    let { error } = await supabase.from(table).upsert(currentRecords, { onConflict: currentConflict });
    if (error && (error.code === '42P10' || error.message?.includes('ON CONFLICT') || error.message?.includes('constraint'))) {
      // Si la base de datos no tiene aún la clave compuesta (user_id, id), intentar con 'id'
      currentConflict = 'id';
      const fallback = await supabase.from(table).upsert(currentRecords, { onConflict: currentConflict });
      if (!fallback.error) return { error: null };
      error = fallback.error;
    }

    if (!error) return { error: null };

    // Si la columna aún no existe en Supabase (ej: falta migración SQL de category_id en obligations)
    // PostgREST responde: "Could not find the 'category_id' column of 'obligations' in the schema cache"
    const missingColMatch = error.message && error.message.match(/Could not find the '([^']+)' column of/i);
    if (missingColMatch) {
      const missingCol = missingColMatch[1];
      console.warn(`[syncService] Columna '${missingCol}' no existe en esquema remoto '${table}'. Reintentando sin ella...`);
      const stripCol = (rec) => {
        if (!rec || typeof rec !== 'object') return rec;
        const copy = { ...rec };
        delete copy[missingCol];
        return copy;
      };
      currentRecords = Array.isArray(currentRecords)
        ? currentRecords.map(stripCol)
        : stripCol(currentRecords);
      continue;
    }

    return { error };
  }
  return { error: new Error('Excedido el número máximo de reintentos para resilientUpsert') };
}
export function mapTxToDb(tx, userId) {
  const cleanId = (tx.id && String(tx.id).trim() !== '') ? tx.id : crypto.randomUUID();
  return {
    id: cleanId,
    user_id: userId,
    asset_id: tx.assetId || tx.asset_id || null,
    dest_asset_id: tx.destAssetId || tx.dest_asset_id || null,
    type: tx.type,
    currency: tx.currency || null,
    amount: toNullableNumber(tx.amount) ?? 0,
    origin: tx.origin || null,
    destination: tx.destOrigin || tx.destination || null,
    dest_currency: tx.destCurrency || null,
    dest_amount: toNullableNumber(tx.destAmount ?? tx.dest_amount),
    category: tx.category || null,
    subcategory: tx.subcategory || null,
    category_id: tx.category_id || tx.categoryId || null,
    subcategory_id: tx.subcategory_id || tx.subcategoryId || null,
    date: tx.date || new Date().toISOString(),
    notes: tx.notes || null,
    commission: toNullableNumber(tx.commission) ?? 0,
    parent_transfer_id: tx.parentTransferId || null,
    rate_snapshot: toNullableNumber(tx.rateSnapshot ?? tx.rate_snapshot),
    usd_equivalent: toNullableNumber(tx.usdEquivalent ?? tx.usd_equivalent),
    deleted_at: tx.deleted_at || tx.deletedAt || null,
    updated_at: tx.updated_at || tx.updatedAt || new Date().toISOString()
  };
}

export function mapDbToTx(row) {
  return {
    id: row.id,
    assetId: row.assetId || row.asset_id || undefined,
    destAssetId: row.destAssetId || row.dest_asset_id || undefined,
    type: row.type,
    currency: row.currency,
    amount: Number(row.amount),
    origin: row.origin,
    destination: row.destination,
    destOrigin: row.destOrigin || row.destination || undefined,
    destCurrency: row.destCurrency || row.dest_currency || undefined,
    destAmount: (row.destAmount ?? row.dest_amount) != null ? Number(row.destAmount ?? row.dest_amount) : undefined,
    category: row.category,
    subcategory: row.subcategory,
    category_id: row.category_id || row.categoryId || undefined,
    subcategory_id: row.subcategory_id || row.subcategoryId || undefined,
    date: row.date,
    notes: row.notes,
    commission: Number(row.commission) || 0,
    parentTransferId: row.parentTransferId || row.parent_transfer_id || undefined,
    rateSnapshot: row.rate_snapshot != null ? Number(row.rate_snapshot) : undefined,
    usdEquivalent: row.usd_equivalent != null ? Number(row.usd_equivalent) : undefined,
    deleted_at: row.deleted_at || null,
    updated_at: row.updated_at || row.created_at || new Date().toISOString()
  };
}

export function mapObToDb(ob, userId) {
  const cleanId = (ob.id && String(ob.id).trim() !== '') ? ob.id : crypto.randomUUID();

  // Serializar metadata adicional de forma transparente en description (compatible con schema SQL)
  let meta = {};
  if (ob.description) {
    try {
      const parsed = JSON.parse(ob.description);
      if (parsed && typeof parsed === 'object') {
        meta = { ...parsed };
      } else {
        meta = { notes: ob.description };
      }
    } catch {
      meta = { notes: ob.description };
    }
  }
  if (ob.payInBs !== undefined) meta.payInBs = Boolean(ob.payInBs);
  if (ob.indexRateType !== undefined) meta.indexRateType = ob.indexRateType || '';
  if (ob.isInstallmentPurchase !== undefined) meta.isInstallmentPurchase = Boolean(ob.isInstallmentPurchase);
  if (ob.reminderEnabled !== undefined) meta.reminderEnabled = ob.reminderEnabled !== false;
  if (ob.installmentsCount !== undefined) meta.installmentsCount = ob.installmentsCount;
  if (ob.totalPurchaseAmount !== undefined) meta.totalPurchaseAmount = ob.totalPurchaseAmount;
  if (ob.downPayment !== undefined) meta.downPayment = ob.downPayment;

  const descString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : (ob.description || '');

  return {
    id: cleanId,
    user_id: userId,
    type: ob.type,
    title: ob.title || ob.person || '',
    person: ob.title || ob.person || '',
    category: ob.category || 'Otros',
    category_id: ob.category_id || ob.categoryId || null,
    subcategory_id: ob.subcategory_id || ob.subcategoryId || null,
    description: descString,
    amount: toNullableNumber(ob.amount) ?? 0,
    currency: ob.currency,
    due_date: ob.dueDate || null,
    frequency: ob.frequency || null,
    total_installments: toNullableInt(ob.totalInstallments ?? ob.total_installments),
    paid_installments: toNullableInt(ob.paidInstallments ?? ob.paid_installments) ?? 0,
    status: ob.status || 'pending',
    date_created: ob.dateCreated || new Date().toISOString(),
    payments: ob.payments || [],
    deleted_at: ob.deleted_at || ob.deletedAt || null,
    updated_at: ob.updated_at || ob.updatedAt || new Date().toISOString()
  };
}

export function mapDbToOb(row) {
  const total = row.total_installments ?? row.totalInstallments;

  let meta = {};
  if (row.description) {
    try {
      const parsed = JSON.parse(row.description);
      if (parsed && typeof parsed === 'object') {
        meta = parsed;
      } else {
        meta = { notes: row.description };
      }
    } catch {
      meta = { notes: row.description };
    }
  }

  const payInBs = row.pay_in_bs !== undefined
    ? Boolean(row.pay_in_bs)
    : (meta.payInBs !== undefined ? Boolean(meta.payInBs) : false);

  const indexRateType = row.index_rate_type || meta.indexRateType || '';
  const isInstallmentPurchase = row.is_installment_purchase !== undefined
    ? Boolean(row.is_installment_purchase)
    : Boolean(meta.isInstallmentPurchase);
  const reminderEnabled = row.reminder_enabled !== undefined
    ? Boolean(row.reminder_enabled)
    : (meta.reminderEnabled !== undefined ? Boolean(meta.reminderEnabled) : true);

  return {
    id: row.id,
    type: row.type,
    title: row.title || row.person || '',
    category: row.category || 'Otros',
    category_id: row.category_id || row.categoryId || undefined,
    subcategory_id: row.subcategory_id || row.subcategoryId || undefined,
    description: meta.notes || (typeof row.description === 'string' && !row.description.startsWith('{') ? row.description : ''),
    payInBs,
    indexRateType,
    isInstallmentPurchase,
    reminderEnabled,
    installmentsCount: meta.installmentsCount || undefined,
    totalPurchaseAmount: meta.totalPurchaseAmount || undefined,
    downPayment: meta.downPayment || undefined,
    amount: Number(row.amount),
    currency: row.currency,
    dueDate: row.due_date || row.dueDate || '',
    frequency: row.frequency || 'monthly',
    totalInstallments: (total == null || total === '') ? '' : String(total),
    paidInstallments: Number(row.paid_installments ?? row.paidInstallments) || 0,
    status: row.status,
    dateCreated: row.date_created || row.dateCreated,
    payments: row.payments || [],
    deleted_at: row.deleted_at || null,
    updated_at: row.updated_at || row.created_at || new Date().toISOString()
  };
}

export function mapAssetToDb(asset, userId) {
  const cleanId = (asset.id && String(asset.id).trim() !== '') ? asset.id : crypto.randomUUID();
  const amount = toNullableNumber(asset.amount) ?? 0;
  const initialAmount = toNullableNumber(asset.initialAmount ?? asset.initial_amount);
  return {
    id: cleanId,
    user_id: userId,
    name: asset.name,
    type: asset.type,
    amount,
    initial_amount: initialAmount ?? amount,
    location: asset.location,
    deleted_at: asset.deleted_at || asset.deletedAt || null,
    updated_at: asset.updated_at || asset.updatedAt || new Date().toISOString()
  };
}

export function mapDbToAsset(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: Number(row.amount),
    initialAmount: row.initialAmount != null ? Number(row.initialAmount) : (row.initial_amount != null ? Number(row.initial_amount) : Number(row.amount)),
    location: row.location,
    deleted_at: row.deleted_at || null,
    updated_at: row.updated_at || row.created_at || new Date().toISOString()
  };
}

export function mapGoalToDb(goal, userId) {
  const cleanId = (goal.id && String(goal.id).trim() !== '') ? goal.id : crypto.randomUUID();
  return {
    id: cleanId,
    user_id: userId,
    name: goal.name || '',
    target_amount: toNullableNumber(goal.targetAmount ?? goal.target_amount) ?? 0,
    currency: goal.currency || 'USD',
    deadline: goal.deadline || null,
    account_ids: goal.accountIds || [],
    deleted_at: goal.deleted_at || goal.deletedAt || null,
    updated_at: goal.updated_at || goal.updatedAt || new Date().toISOString()
  };
}

export function mapDbToGoal(row) {
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount ?? row.targetAmount) || 0,
    currency: row.currency || 'USD',
    deadline: row.deadline || null,
    accountIds: row.account_ids || row.accountIds || [],
    deleted_at: row.deleted_at || null,
    updated_at: row.updated_at || row.created_at || new Date().toISOString()
  };
}

export function mapCategoryToDb(cat, userId) {
  const cleanId = (cat.id && String(cat.id).trim() !== '') ? cat.id : crypto.randomUUID();
  return {
    id: cleanId,
    user_id: userId,
    kind: cat.kind,
    parent_id: cat.parent_id || cat.parentId || null,
    name: cat.name,
    icon: cat.icon || null,
    color: cat.color || null,
    sort_order: Number(cat.sort_order ?? cat.sortOrder) || 0,
    is_active: (cat.is_active != null ? cat.is_active : cat.isActive) !== false,
    is_custom: Boolean(cat.is_custom != null ? cat.is_custom : cat.isCustom),
    base_id: cat.base_id || cat.baseId || null,
    deleted_at: cat.deleted_at || cat.deletedAt || null,
    updated_at: cat.updated_at || cat.updatedAt || new Date().toISOString()
  };
}

export function mapDbToCategory(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    kind: row.kind,
    parent_id: row.parent_id || null,
    name: row.name,
    icon: row.icon || null,
    color: row.color || null,
    sort_order: Number(row.sort_order) || 0,
    is_active: Boolean(row.is_active),
    is_custom: Boolean(row.is_custom),
    base_id: row.base_id || null,
    deleted_at: row.deleted_at || null,
    updated_at: row.updated_at || row.created_at || new Date().toISOString()
  };
}

export function mapListToDb(list, userId) {
  const cleanId = (list.id && String(list.id).trim() !== '') ? list.id : crypto.randomUUID();
  return {
    id: cleanId,
    user_id: userId,
    name: list.name || '',
    store: list.store || null,
    status: list.status || 'active',
    currency: list.currency || 'USD',
    budget: toNullableNumber(list.budget),
    transaction_id: list.transaction_id || list.transactionId || null,
    completed_at: list.completed_at || list.completedAt || null,
    deleted_at: list.deleted_at || list.deletedAt || null,
    updated_at: list.updated_at || list.updatedAt || new Date().toISOString()
  };
}

export function mapDbToList(row) {
  return {
    id: row.id,
    name: row.name,
    store: row.store || null,
    status: row.status || 'active',
    currency: row.currency || 'USD',
    budget: row.budget != null ? Number(row.budget) : null,
    transaction_id: row.transaction_id || null,
    completed_at: row.completed_at || null,
    deleted_at: row.deleted_at || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString()
  };
}

export function mapItemToDb(item, userId) {
  const cleanId = (item.id && String(item.id).trim() !== '') ? item.id : crypto.randomUUID();
  return {
    id: cleanId,
    user_id: userId,
    list_id: item.list_id || item.listId,
    product_id: item.product_id || item.productId || null,
    name: item.name || '',
    quantity: toNullableNumber(item.quantity) ?? 1,
    unit: item.unit || 'und',
    estimated_price: toNullableNumber(item.estimated_price ?? item.estimatedPrice) ?? 0,
    price_currency: item.price_currency || item.priceCurrency || 'USD',
    actual_price: toNullableNumber(item.actual_price ?? item.actualPrice),
    is_checked: Boolean(item.is_checked ?? item.isChecked),
    sort_order: Number(item.sort_order ?? item.sortOrder) || 0,
    section: item.section || 'otros',
    deleted_at: item.deleted_at || item.deletedAt || null,
    updated_at: item.updated_at || item.updatedAt || new Date().toISOString()
  };
}

export function mapDbToItem(row) {
  return {
    id: row.id,
    list_id: row.list_id,
    product_id: row.product_id || null,
    name: row.name,
    quantity: Number(row.quantity) || 1,
    unit: row.unit || 'und',
    estimated_price: Number(row.estimated_price) || 0,
    price_currency: row.price_currency || 'USD',
    actual_price: row.actual_price != null ? Number(row.actual_price) : null,
    is_checked: Boolean(row.is_checked),
    sort_order: Number(row.sort_order) || 0,
    section: row.section || 'otros',
    deleted_at: row.deleted_at || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString()
  };
}

export function mapProductToDb(prod, userId) {
  const cleanId = (prod.id && String(prod.id).trim() !== '') ? prod.id : crypto.randomUUID();
  return {
    id: cleanId,
    user_id: userId,
    name: prod.name || '',
    default_unit: prod.default_unit || prod.defaultUnit || 'und',
    section: prod.section || 'otros',
    last_price: toNullableNumber(prod.last_price ?? prod.lastPrice) ?? 0,
    last_price_currency: prod.last_price_currency || prod.lastPriceCurrency || 'USD',
    last_bought_at: prod.last_bought_at || prod.lastBoughtAt || null,
    price_history: Array.isArray(prod.price_history ?? prod.priceHistory) ? (prod.price_history ?? prod.priceHistory) : [],
    deleted_at: prod.deleted_at || prod.deletedAt || null,
    updated_at: prod.updated_at || prod.updatedAt || new Date().toISOString()
  };
}

export function mapDbToProduct(row) {
  return {
    id: row.id,
    name: row.name,
    default_unit: row.default_unit || 'und',
    section: row.section || 'otros',
    last_price: Number(row.last_price) || 0,
    last_price_currency: row.last_price_currency || 'USD',
    last_bought_at: row.last_bought_at || null,
    price_history: Array.isArray(row.price_history) ? row.price_history : [],
    deleted_at: row.deleted_at || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString()
  };
}

// Demo / Mock Cloud Helpers
function getDemoCloudData(userId) {
  try {
    const raw = localStorage.getItem(`${DEMO_CLOUD_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : { assets: [], transactions: [], obligations: [], budgets: {}, goals: [], categories: [], shoppingLists: [], shoppingItems: [], shoppingProducts: [] };
  } catch {
    return { assets: [], transactions: [], obligations: [], budgets: {}, goals: [], categories: [], shoppingLists: [], shoppingItems: [], shoppingProducts: [] };
  }
}

function saveDemoCloudData(userId, data) {
  try {
    localStorage.setItem(`${DEMO_CLOUD_PREFIX}${userId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando en demo cloud', e);
  }
}

export const syncService = {
  // Push single change into local queue and trigger flush
  async queueChange(table, action, payload, userId) {
    if (!userId) return; // Guest mode, no cloud queue

    const queue = getQueue();
    // Remove older duplicate pending action for same entity ID if applicable
    const entityId = payload?.id || (table === 'budgets' ? payload?.category : null);
    const filteredQueue = queue.filter(
      item => !(item.table === table && (item.payload?.id === entityId || (table === 'budgets' && item.payload?.category === entityId)))
    );

    filteredQueue.push({
      id: payload?.id || (table === 'budgets' ? `${userId}_${payload?.category}` : null) || `${table}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      table,
      action, // 'upsert' | 'delete'
      payload,
      userId,
      timestamp: Date.now(),
      attempts: 0,
      lastError: null
    });

    saveQueue(filteredQueue);
    notifyStatusUpdate();

    if (navigator.onLine) {
      await this.flushQueue();
    } else {
      setSyncStatus('offline');
    }
  },

  // Process all queued changes
  async flushQueue() {
    clearRetryTimer();

    if (!navigator.onLine) {
      setSyncStatus('offline');
      const q = getQueue();
      const errors = q.map(i => i.lastError).filter(Boolean);
      return { ok: false, pending: q.length, errors: errors.length ? errors : ['Sin conexión a internet'] };
    }

    const queue = getQueue();
    if (queue.length === 0) {
      setSyncStatus('synced');
      return { ok: true, pending: 0, errors: [] };
    }

    setSyncStatus('syncing');

    try {
      if (isSupabaseConfigured && supabase) {
        // Real Supabase Execution
        const remainingQueue = [];

        for (const item of queue) {
          try {
            const { table, action, payload, userId } = item;

            if (table === 'assets') {
              if (action === 'upsert') {
                const { error } = await resilientUpsert('assets', mapAssetToDb(payload, userId));
                if (error) throw error;
              } else if (action === 'delete') {
                // Borrado lógico con deleted_at
                const { error } = await supabase.from('assets').update({
                  deleted_at: payload.deleted_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }).eq('id', payload.id).eq('user_id', userId);
                if (error) throw error;
              }
            } else if (table === 'transactions') {
              if (action === 'upsert') {
                const { error } = await resilientUpsert('transactions', mapTxToDb(payload, userId));
                if (error) throw error;
              } else if (action === 'delete') {
                // Borrado lógico con deleted_at
                const { error } = await supabase.from('transactions').update({
                  deleted_at: payload.deleted_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }).eq('id', payload.id).eq('user_id', userId);
                if (error) throw error;
              }
            } else if (table === 'obligations') {
              if (action === 'upsert') {
                const { error } = await resilientUpsert('obligations', mapObToDb(payload, userId));
                if (error) throw error;
              } else if (action === 'delete') {
                // Borrado lógico con deleted_at
                const { error } = await supabase.from('obligations').update({
                  deleted_at: payload.deleted_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }).eq('id', payload.id).eq('user_id', userId);
                if (error) throw error;
              }
            } else if (table === 'budgets') {
              if (action === 'upsert') {
                const { error } = await resilientUpsert('budgets', {
                  id: `${userId}_${payload.category}`,
                  user_id: userId,
                  category: payload.category,
                  amount: toNullableNumber(payload.amount) ?? 0,
                  deleted_at: null,
                  updated_at: payload.updated_at || new Date().toISOString()
                });
                if (error) throw error;
              } else if (action === 'delete') {
                // Borrado lógico con deleted_at
                const { error } = await supabase.from('budgets').update({
                  deleted_at: payload.deleted_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }).eq('category', payload.category).eq('user_id', userId);
                if (error) throw error;
              }
            } else if (table === 'goals') {
              if (action === 'upsert') {
                const dbGoal = mapGoalToDb(payload, userId);
                const { error } = await resilientUpsert('goals', dbGoal);
                if (error) throw error;
              } else if (action === 'delete') {
                const { error } = await supabase.from('goals').update({
                  deleted_at: payload.deleted_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }).eq('id', payload.id).eq('user_id', userId);
                if (error) throw error;
              }
            } else if (table === 'user_categories') {
              if (action === 'upsert') {
                const dbCat = mapCategoryToDb(payload, userId);
                const { error } = await resilientUpsert('user_categories', dbCat);
                if (error) throw error;
              } else if (action === 'delete') {
                const { error } = await supabase.from('user_categories').update({
                  deleted_at: payload.deleted_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }).eq('id', payload.id).eq('user_id', userId);
                if (error) throw error;
              }
            } else if (table === 'shopping_lists') {
              if (action === 'upsert') {
                const dbList = mapListToDb(payload, userId);
                const { error } = await resilientUpsert('shopping_lists', dbList);
                if (error) throw error;
              } else if (action === 'delete') {
                const { error } = await supabase.from('shopping_lists').update({
                  deleted_at: payload.deleted_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }).eq('id', payload.id).eq('user_id', userId);
                if (error) throw error;
              }
            } else if (table === 'shopping_items') {
              if (action === 'upsert') {
                const dbItem = mapItemToDb(payload, userId);
                const { error } = await resilientUpsert('shopping_items', dbItem);
                if (error) throw error;
              } else if (action === 'delete') {
                const { error } = await supabase.from('shopping_items').update({
                  deleted_at: payload.deleted_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }).eq('id', payload.id).eq('user_id', userId);
                if (error) throw error;
              }
            } else if (table === 'shopping_products') {
              if (action === 'upsert') {
                const dbProd = mapProductToDb(payload, userId);
                const { error } = await resilientUpsert('shopping_products', dbProd);
                if (error) throw error;
              } else if (action === 'delete') {
                const { error } = await supabase.from('shopping_products').update({
                  deleted_at: payload.deleted_at || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }).eq('id', payload.id).eq('user_id', userId);
                if (error) throw error;
              }
            }
          } catch (itemErr) {
            console.error('Error sync queue item:', itemErr);
            const currentAttempts = (item.attempts || 0) + 1;
            remainingQueue.push({
              ...item,
              attempts: currentAttempts,
              lastError: itemErr?.message || String(itemErr)
            });
          }
        }

        saveQueue(remainingQueue);

        if (remainingQueue.length === 0) {
          setSyncStatus('synced');
          return { ok: true, pending: 0, errors: [] };
        } else {
          setSyncStatus('error');
          // Programar reintento con backoff exponencial basado en el máximo número de intentos
          const maxAttempts = Math.max(...remainingQueue.map(i => i.attempts || 1));
          const backoffIndex = Math.min(maxAttempts - 1, BACKOFF_STEPS.length - 1);
          const nextDelay = BACKOFF_STEPS[Math.max(0, backoffIndex)];
          scheduleRetry(nextDelay);
          const errors = remainingQueue.map(i => i.lastError).filter(Boolean);
          return { ok: false, pending: remainingQueue.length, errors };
        }
      } else if (!import.meta.env.PROD) {
        // Demo Cloud Simulation (solo en desarrollo)
        for (const item of queue) {
          const { table, action, payload, userId } = item;
          const cloud = getDemoCloudData(userId);

          if (table === 'assets') {
            if (action === 'upsert') {
              const idx = cloud.assets.findIndex(a => a.id === payload.id);
              if (idx >= 0) cloud.assets[idx] = payload;
              else cloud.assets.push(payload);
            } else if (action === 'delete') {
              cloud.assets = cloud.assets.filter(a => a.id !== payload.id);
            }
          } else if (table === 'transactions') {
            if (action === 'upsert') {
              const idx = cloud.transactions.findIndex(t => t.id === payload.id);
              if (idx >= 0) cloud.transactions[idx] = payload;
              else cloud.transactions.unshift(payload);
            } else if (action === 'delete') {
              cloud.transactions = cloud.transactions.filter(t => t.id !== payload.id);
            }
          } else if (table === 'obligations') {
            if (action === 'upsert') {
              const idx = cloud.obligations.findIndex(o => o.id === payload.id);
              if (idx >= 0) cloud.obligations[idx] = payload;
              else cloud.obligations.unshift(payload);
            } else if (action === 'delete') {
              cloud.obligations = cloud.obligations.filter(o => o.id !== payload.id);
            }
          } else if (table === 'budgets') {
            if (action === 'upsert') {
              cloud.budgets[payload.category] = Number(payload.amount);
            } else if (action === 'delete') {
              delete cloud.budgets[payload.category];
            }
          } else if (table === 'goals') {
            if (!cloud.goals) cloud.goals = [];
            if (action === 'upsert') {
              const idx = cloud.goals.findIndex(g => g.id === payload.id);
              if (idx >= 0) cloud.goals[idx] = payload;
              else cloud.goals.push(payload);
            } else if (action === 'delete') {
              cloud.goals = cloud.goals.filter(g => g.id !== payload.id);
            }
          } else if (table === 'user_categories') {
            if (!cloud.categories) cloud.categories = [];
            if (action === 'upsert') {
              const idx = cloud.categories.findIndex(c => c.id === payload.id);
              if (idx >= 0) cloud.categories[idx] = payload;
              else cloud.categories.push(payload);
            } else if (action === 'delete') {
              cloud.categories = cloud.categories.filter(c => c.id !== payload.id);
            }
          }

          saveDemoCloudData(userId, cloud);
        }

        saveQueue([]);
        setSyncStatus('synced');
        return { ok: true, pending: 0, errors: [] };
      } else {
        // En producción sin Supabase configurado, limpiamos cola y marcamos estado local
        saveQueue([]);
        setSyncStatus('guest');
        return { ok: true, pending: 0, errors: [] };
      }
    } catch (err) {
      console.error('Error flushing sync queue:', err);
      setSyncStatus('error');
      const q = getQueue();
      const errors = q.map(i => i.lastError).filter(Boolean);
      return { ok: false, pending: q.length, errors: errors.length ? errors : [err?.message || String(err)] };
    }
  },

  // Pull all remote data for user
  async fetchRemoteAll(userId) {
    if (!userId) return null;

    setSyncStatus('syncing');
    try {
      if (isSupabaseConfigured && supabase) {
        const [assetsRes, txRes, obRes, bgRes, goalsRes, catRes, listsRes, itemsRes, prodsRes] = await Promise.allSettled([
          supabase.from('assets').select('*').eq('user_id', userId),
          supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
          supabase.from('obligations').select('*').eq('user_id', userId),
          supabase.from('budgets').select('*').eq('user_id', userId),
          supabase.from('goals').select('*').eq('user_id', userId),
          supabase.from('user_categories').select('*').eq('user_id', userId),
          supabase.from('shopping_lists').select('*').eq('user_id', userId),
          supabase.from('shopping_items').select('*').eq('user_id', userId),
          supabase.from('shopping_products').select('*').eq('user_id', userId)
        ]);

        const getResData = (res, name) => {
          if (res.status === 'fulfilled' && !res.value.error) {
            return res.value.data || [];
          }
          if (res.status === 'fulfilled' && res.value.error) {
            console.warn(`[syncService] Advertencia consultando ${name}:`, res.value.error.message);
          } else if (res.status === 'rejected') {
            console.warn(`[syncService] Fallo de red consultando ${name}:`, res.reason);
          }
          return null;
        };

        const rawAssets = getResData(assetsRes, 'assets');
        const rawTxs = getResData(txRes, 'transactions');
        const rawObs = getResData(obRes, 'obligations');
        const rawBg = getResData(bgRes, 'budgets');
        const rawGoals = getResData(goalsRes, 'goals');
        const rawCats = getResData(catRes, 'user_categories');
        const rawLists = getResData(listsRes, 'shopping_lists');
        const rawItems = getResData(itemsRes, 'shopping_items');
        const rawProds = getResData(prodsRes, 'shopping_products');

        // Si fallan todas las tablas principales consideramos error total de conexión
        if (rawAssets === null && rawTxs === null && rawObs === null) {
          setSyncStatus('error');
          return null;
        }

        const remoteAssets = (rawAssets || []).map(mapDbToAsset);
        const remoteTxs = (rawTxs || []).map(mapDbToTx);
        const remoteObs = (rawObs || []).map(mapDbToOb);
        const remoteGoals = (rawGoals || []).map(mapDbToGoal);
        const remoteCategories = (rawCats || []).map(mapDbToCategory);
        const remoteShoppingLists = (rawLists || []).map(mapDbToList);
        const remoteShoppingItems = (rawItems || []).map(mapDbToItem);
        const remoteShoppingProducts = (rawProds || []).map(mapDbToProduct);
        const remoteBudgets = {};
        (rawBg || []).forEach(b => {
          remoteBudgets[b.category] = {
            category: b.category,
            amount: Number(b.amount),
            deleted_at: b.deleted_at,
            updated_at: b.updated_at
          };
        });

        setSyncStatus('synced');
        return {
          assets: remoteAssets,
          transactions: remoteTxs,
          obligations: remoteObs,
          budgets: remoteBudgets,
          goals: remoteGoals,
          categories: remoteCategories,
          shoppingLists: remoteShoppingLists,
          shoppingItems: remoteShoppingItems,
          shoppingProducts: remoteShoppingProducts
        };
      } else if (!import.meta.env.PROD) {
        // Demo Cloud (solo en desarrollo)
        const data = getDemoCloudData(userId);
        setSyncStatus('synced');
        return data;
      } else {
        setSyncStatus('guest');
        return null;
      }
    } catch (err) {
      console.error('Error fetching remote data:', err);
      setSyncStatus('error');
      return null;
    }
  },

  // Upload complete local state to remote
  async uploadLocalData(userId, { assets = [], transactions = [], obligations = [], budgets = {}, goals = [], categories = [], shoppingLists = [], shoppingItems = [], shoppingProducts = [] }) {
    if (!userId) return false;

    setSyncStatus('syncing');
    try {
      if (isSupabaseConfigured && supabase) {
        // 1. Assets
        if (assets.length > 0) {
          const dbAssets = assets.map(a => mapAssetToDb(a, userId));
          const { error } = await resilientUpsert('assets', dbAssets);
          if (error) throw error;
        }
        // 2. Transactions
        if (transactions.length > 0) {
          const dbTxs = transactions.map(t => mapTxToDb(t, userId));
          const { error } = await resilientUpsert('transactions', dbTxs);
          if (error) throw error;
        }
        // 3. Obligations
        if (obligations.length > 0) {
          const dbObs = obligations.map(o => mapObToDb(o, userId));
          const { error } = await resilientUpsert('obligations', dbObs);
          if (error) throw error;
        }
        // 4. Budgets
        const budgetEntries = Object.entries(budgets);
        if (budgetEntries.length > 0) {
          const dbBudgets = budgetEntries.map(([category, amount]) => ({
            id: `${userId}_${category}`,
            user_id: userId,
            category,
            amount: toNullableNumber(amount) ?? 0,
            updated_at: new Date().toISOString()
          }));
          const { error } = await resilientUpsert('budgets', dbBudgets);
          if (error) throw error;
        }
        // 5. Goals
        if (goals.length > 0) {
          const dbGoals = goals.map(g => mapGoalToDb(g, userId));
          const { error } = await resilientUpsert('goals', dbGoals);
          if (error) throw error;
        }
        // 6. User Categories
        if (categories.length > 0) {
          const dbCats = categories.map(c => mapCategoryToDb(c, userId));
          const { error } = await resilientUpsert('user_categories', dbCats);
          if (error) throw error;
        }
        // 7. Shopping Lists
        if (shoppingLists.length > 0) {
          const dbLists = shoppingLists.map(l => mapListToDb(l, userId));
          const { error } = await resilientUpsert('shopping_lists', dbLists);
          if (error) throw error;
        }
        // 8. Shopping Items
        if (shoppingItems.length > 0) {
          const dbItems = shoppingItems.map(i => mapItemToDb(i, userId));
          const { error } = await resilientUpsert('shopping_items', dbItems);
          if (error) throw error;
        }
        // 9. Shopping Products
        if (shoppingProducts.length > 0) {
          const dbProds = shoppingProducts.map(p => mapProductToDb(p, userId));
          const { error } = await resilientUpsert('shopping_products', dbProds);
          if (error) throw error;
        }
      } else if (!import.meta.env.PROD) {
        // Demo Cloud (solo en desarrollo): combinar con datos remotos en vez de sobreescribir
        const currentCloud = getDemoCloudData(userId);
        const mergedAssets = mergeById(currentCloud.assets || [], assets || []);
        const mergedTxs = mergeById(currentCloud.transactions || [], transactions || []);
        const mergedObs = mergeById(currentCloud.obligations || [], obligations || []);
        const mergedBudgets = mergeBudgets(currentCloud.budgets || {}, budgets || {});
        const mergedGoals = mergeById(currentCloud.goals || [], goals || []);
        const mergedCategories = mergeById(currentCloud.categories || [], categories || []);
        const mergedLists = mergeById(currentCloud.shoppingLists || [], shoppingLists || []);
        const mergedItems = mergeById(currentCloud.shoppingItems || [], shoppingItems || []);
        const mergedProds = mergeById(currentCloud.shoppingProducts || [], shoppingProducts || []);
        saveDemoCloudData(userId, {
          assets: mergedAssets,
          transactions: mergedTxs,
          obligations: mergedObs,
          budgets: mergedBudgets,
          goals: mergedGoals,
          categories: mergedCategories,
          shoppingLists: mergedLists,
          shoppingItems: mergedItems,
          shoppingProducts: mergedProds
        });
      } else {
        setSyncStatus('guest');
        return false;
      }

      setSyncStatus('synced');
      return true;
    } catch (err) {
      console.error('Error uploading local data:', err);
      setSyncStatus('error');
      return false;
    }
  },

  getQueue() {
    return getQueue();
  },

  discardQueueItem(itemIdOrTimestamp) {
    return discardQueueItem(itemIdOrTimestamp);
  }
};

// Automatic online event listener to trigger sync
window.addEventListener('online', () => {
  setSyncStatus('syncing');
  syncService.flushQueue();
});

window.addEventListener('offline', () => {
  clearRetryTimer();
  setSyncStatus('offline');
});

// Reintento al volver a primer plano (document visibilitychange)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    if (getQueue().length > 0) {
      syncService.flushQueue();
    }
  }
});
