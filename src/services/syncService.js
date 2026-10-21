import { supabase, isSupabaseConfigured } from './supabaseClient';

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
function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving sync queue', e);
  }
}

// Formatters for DB
function mapTxToDb(tx, userId) {
  return {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    currency: tx.currency || null,
    amount: Number(tx.amount) || 0,
    origin: tx.origin || null,
    destination: tx.destOrigin || tx.destination || null,
    dest_currency: tx.destCurrency || null,
    dest_amount: tx.destAmount != null ? Number(tx.destAmount) : null,
    category: tx.category || null,
    subcategory: tx.subcategory || null,
    date: tx.date || new Date().toISOString(),
    notes: tx.notes || null,
    commission: Number(tx.commission) || 0,
    parent_transfer_id: tx.parentTransferId || null,
    rate_snapshot: tx.rateSnapshot != null ? Number(tx.rateSnapshot) : null,
    usd_equivalent: tx.usdEquivalent != null ? Number(tx.usdEquivalent) : null,
    deleted_at: tx.deleted_at || tx.deletedAt || null,
    updated_at: tx.updated_at || tx.updatedAt || new Date().toISOString()
  };
}

function mapDbToTx(row) {
  return {
    id: row.id,
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

function mapObToDb(ob, userId) {
  return {
    id: ob.id,
    user_id: userId,
    type: ob.type,
    title: ob.title || ob.person || '',
    person: ob.title || ob.person || '',
    category: ob.category || 'Otros',
    description: ob.description || '',
    amount: Number(ob.amount) || 0,
    currency: ob.currency,
    due_date: ob.dueDate || null,
    frequency: ob.frequency || null,
    total_installments: ob.totalInstallments ?? null,
    paid_installments: Number(ob.paidInstallments) || 0,
    status: ob.status || 'pending',
    date_created: ob.dateCreated || new Date().toISOString(),
    payments: ob.payments || [],
    deleted_at: ob.deleted_at || ob.deletedAt || null,
    updated_at: ob.updated_at || ob.updatedAt || new Date().toISOString()
  };
}

function mapDbToOb(row) {
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
    totalInstallments: row.total_installments ?? row.totalInstallments ?? '',
    paidInstallments: Number(row.paid_installments ?? row.paidInstallments) || 0,
    status: row.status,
    dateCreated: row.date_created || row.dateCreated,
    payments: row.payments || [],
    deleted_at: row.deleted_at || null,
    updated_at: row.updated_at || row.created_at || new Date().toISOString()
  };
}

function mapAssetToDb(asset, userId) {
  return {
    id: asset.id,
    user_id: userId,
    name: asset.name,
    type: asset.type,
    amount: Number(asset.amount) || 0,
    location: asset.location,
    deleted_at: asset.deleted_at || asset.deletedAt || null,
    updated_at: asset.updated_at || asset.updatedAt || new Date().toISOString()
  };
}

function mapDbToAsset(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: Number(row.amount),
    location: row.location,
    deleted_at: row.deleted_at || null,
    updated_at: row.updated_at || row.created_at || new Date().toISOString()
  };
}

// Demo / Mock Cloud Helpers
function getDemoCloudData(userId) {
  try {
    const raw = localStorage.getItem(`${DEMO_CLOUD_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : { assets: [], transactions: [], obligations: [], budgets: {} };
  } catch {
    return { assets: [], transactions: [], obligations: [], budgets: {} };
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
      return;
    }

    const queue = getQueue();
    if (queue.length === 0) {
      setSyncStatus('synced');
      return;
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
                const { error } = await supabase.from('assets').upsert(mapAssetToDb(payload, userId));
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
                const { error } = await supabase.from('transactions').upsert(mapTxToDb(payload, userId));
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
                const { error } = await supabase.from('obligations').upsert(mapObToDb(payload, userId));
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
                const { error } = await supabase.from('budgets').upsert({
                  id: `${userId}_${payload.category}`,
                  user_id: userId,
                  category: payload.category,
                  amount: Number(payload.amount) || 0,
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
        } else {
          setSyncStatus('error');
          // Programar reintento con backoff exponencial basado en el máximo número de intentos
          const maxAttempts = Math.max(...remainingQueue.map(i => i.attempts || 1));
          const backoffIndex = Math.min(maxAttempts - 1, BACKOFF_STEPS.length - 1);
          const nextDelay = BACKOFF_STEPS[Math.max(0, backoffIndex)];
          scheduleRetry(nextDelay);
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
          }

          saveDemoCloudData(userId, cloud);
        }

        saveQueue([]);
        setSyncStatus('synced');
      } else {
        // En producción sin Supabase configurado, limpiamos cola y marcamos estado local
        saveQueue([]);
        setSyncStatus('guest');
      }
    } catch (err) {
      console.error('Error flushing sync queue:', err);
      setSyncStatus('error');
    }
  },

  // Pull all remote data for user
  async fetchRemoteAll(userId) {
    if (!userId) return null;

    setSyncStatus('syncing');
    try {
      if (isSupabaseConfigured && supabase) {
        const [assetsRes, txRes, obRes, bgRes] = await Promise.all([
          supabase.from('assets').select('*').eq('user_id', userId),
          supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
          supabase.from('obligations').select('*').eq('user_id', userId),
          supabase.from('budgets').select('*').eq('user_id', userId)
        ]);

        if (assetsRes.error) throw assetsRes.error;
        if (txRes.error) throw txRes.error;
        if (obRes.error) throw obRes.error;
        if (bgRes.error) throw bgRes.error;

        const remoteAssets = (assetsRes.data || []).map(mapDbToAsset);
        const remoteTxs = (txRes.data || []).map(mapDbToTx);
        const remoteObs = (obRes.data || []).map(mapDbToOb);
        const remoteBudgets = {};
        (bgRes.data || []).forEach(b => {
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
          budgets: remoteBudgets
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
  async uploadLocalData(userId, { assets = [], transactions = [], obligations = [], budgets = {} }) {
    if (!userId) return false;

    setSyncStatus('syncing');
    try {
      if (isSupabaseConfigured && supabase) {
        // 1. Assets
        if (assets.length > 0) {
          const dbAssets = assets.map(a => mapAssetToDb(a, userId));
          const { error } = await supabase.from('assets').upsert(dbAssets);
          if (error) throw error;
        }
        // 2. Transactions
        if (transactions.length > 0) {
          const dbTxs = transactions.map(t => mapTxToDb(t, userId));
          const { error } = await supabase.from('transactions').upsert(dbTxs);
          if (error) throw error;
        }
        // 3. Obligations
        if (obligations.length > 0) {
          const dbObs = obligations.map(o => mapObToDb(o, userId));
          const { error } = await supabase.from('obligations').upsert(dbObs);
          if (error) throw error;
        }
        // 4. Budgets
        const budgetEntries = Object.entries(budgets);
        if (budgetEntries.length > 0) {
          const dbBudgets = budgetEntries.map(([category, amount]) => ({
            id: `${userId}_${category}`,
            user_id: userId,
            category,
            amount: Number(amount) || 0,
            updated_at: new Date().toISOString()
          }));
          const { error } = await supabase.from('budgets').upsert(dbBudgets);
          if (error) throw error;
        }
      } else if (!import.meta.env.PROD) {
        // Demo Cloud (solo en desarrollo)
        saveDemoCloudData(userId, { assets, transactions, obligations, budgets });
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
