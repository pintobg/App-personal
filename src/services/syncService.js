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

// Helper para upsert resiliente a esquemas con clave (user_id, id) o (id)
async function resilientUpsert(table, records, onConflict = 'user_id,id') {
  if (!supabase) return { error: new Error('Supabase no inicializado') };
  let { error } = await supabase.from(table).upsert(records, { onConflict });
  if (error && (error.code === '42P10' || error.message?.includes('ON CONFLICT') || error.message?.includes('constraint'))) {
    // Si la base de datos no tiene aún la clave compuesta (user_id, id), intentar con 'id'
    const fallback = await supabase.from(table).upsert(records, { onConflict: 'id' });
    if (!fallback.error) return { error: null };
  }
  return { error };
}
export function mapTxToDb(tx, userId) {
  return {
    id: tx.id,
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
  return {
    id: ob.id,
    user_id: userId,
    type: ob.type,
    title: ob.title || ob.person || '',
    person: ob.title || ob.person || '',
    category: ob.category || 'Otros',
    description: ob.description || '',
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
  return {
    id: row.id,
    type: row.type,
    title: row.title || row.person || '',
    category: row.category || 'Otros',
    description: row.description,
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
  const amount = toNullableNumber(asset.amount) ?? 0;
  const initialAmount = toNullableNumber(asset.initialAmount ?? asset.initial_amount);
  return {
    id: asset.id,
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
  return {
    id: goal.id,
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

// Demo / Mock Cloud Helpers
function getDemoCloudData(userId) {
  try {
    const raw = localStorage.getItem(`${DEMO_CLOUD_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : { assets: [], transactions: [], obligations: [], budgets: {}, goals: [] };
  } catch {
    return { assets: [], transactions: [], obligations: [], budgets: {}, goals: [] };
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
        const [assetsRes, txRes, obRes, bgRes, goalsRes] = await Promise.allSettled([
          supabase.from('assets').select('*').eq('user_id', userId),
          supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
          supabase.from('obligations').select('*').eq('user_id', userId),
          supabase.from('budgets').select('*').eq('user_id', userId),
          supabase.from('goals').select('*').eq('user_id', userId)
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

        // Si fallan todas las tablas principales consideramos error total de conexión
        if (rawAssets === null && rawTxs === null && rawObs === null) {
          setSyncStatus('error');
          return null;
        }

        const remoteAssets = (rawAssets || []).map(mapDbToAsset);
        const remoteTxs = (rawTxs || []).map(mapDbToTx);
        const remoteObs = (rawObs || []).map(mapDbToOb);
        const remoteGoals = (rawGoals || []).map(mapDbToGoal);
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
          goals: remoteGoals
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
  async uploadLocalData(userId, { assets = [], transactions = [], obligations = [], budgets = {}, goals = [] }) {
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
      } else if (!import.meta.env.PROD) {
        // Demo Cloud (solo en desarrollo): combinar con datos remotos en vez de sobreescribir
        const currentCloud = getDemoCloudData(userId);
        const mergedAssets = mergeById(currentCloud.assets || [], assets || []);
        const mergedTxs = mergeById(currentCloud.transactions || [], transactions || []);
        const mergedObs = mergeById(currentCloud.obligations || [], obligations || []);
        const mergedBudgets = mergeBudgets(currentCloud.budgets || {}, budgets || {});
        const mergedGoals = mergeById(currentCloud.goals || [], goals || []);
        saveDemoCloudData(userId, {
          assets: mergedAssets,
          transactions: mergedTxs,
          obligations: mergedObs,
          budgets: mergedBudgets,
          goals: mergedGoals
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
