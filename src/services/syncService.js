import { supabase, isSupabaseConfigured } from './supabaseClient';

const QUEUE_STORAGE_KEY = 'finanzas_sync_queue';
const DEMO_CLOUD_PREFIX = 'demo_cloud_db_';

let listeners = [];
let currentSyncStatus = navigator.onLine ? 'synced' : 'offline';

export function getSyncStatus() {
  return currentSyncStatus;
}

export function subscribeSyncStatus(listener) {
  listeners.push(listener);
  listener(currentSyncStatus);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function setSyncStatus(status) {
  currentSyncStatus = status;
  listeners.forEach(l => l(status));
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
    updated_at: new Date().toISOString()
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
    usdEquivalent: row.usd_equivalent != null ? Number(row.usd_equivalent) : undefined
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
    updated_at: new Date().toISOString()
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
    payments: row.payments || []
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
    updated_at: new Date().toISOString()
  };
}

function mapDbToAsset(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: Number(row.amount),
    location: row.location
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
      timestamp: Date.now()
    });

    saveQueue(filteredQueue);

    if (navigator.onLine) {
      await this.flushQueue();
    } else {
      setSyncStatus('offline');
    }
  },

  // Process all queued changes
  async flushQueue() {
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
                await supabase.from('assets').upsert(mapAssetToDb(payload, userId));
              } else if (action === 'delete') {
                await supabase.from('assets').delete().eq('id', payload.id).eq('user_id', userId);
              }
            } else if (table === 'transactions') {
              if (action === 'upsert') {
                await supabase.from('transactions').upsert(mapTxToDb(payload, userId));
              } else if (action === 'delete') {
                await supabase.from('transactions').delete().eq('id', payload.id).eq('user_id', userId);
              }
            } else if (table === 'obligations') {
              if (action === 'upsert') {
                await supabase.from('obligations').upsert(mapObToDb(payload, userId));
              } else if (action === 'delete') {
                await supabase.from('obligations').delete().eq('id', payload.id).eq('user_id', userId);
              }
            } else if (table === 'budgets') {
              if (action === 'upsert') {
                await supabase.from('budgets').upsert({
                  id: `${userId}_${payload.category}`,
                  user_id: userId,
                  category: payload.category,
                  amount: Number(payload.amount) || 0,
                  updated_at: new Date().toISOString()
                });
              } else if (action === 'delete') {
                await supabase.from('budgets').delete().eq('category', payload.category).eq('user_id', userId);
              }
            }
          } catch (itemErr) {
            console.error('Error sync queue item:', itemErr);
            remainingQueue.push(item);
          }
        }

        saveQueue(remainingQueue);
        setSyncStatus(remainingQueue.length === 0 ? 'synced' : 'error');
      } else {
        // Demo Cloud Simulation
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

        const remoteAssets = (assetsRes.data || []).map(mapDbToAsset);
        const remoteTxs = (txRes.data || []).map(mapDbToTx);
        const remoteObs = (obRes.data || []).map(mapDbToOb);
        const remoteBudgets = {};
        (bgRes.data || []).forEach(b => {
          remoteBudgets[b.category] = Number(b.amount);
        });

        setSyncStatus('synced');
        return {
          assets: remoteAssets,
          transactions: remoteTxs,
          obligations: remoteObs,
          budgets: remoteBudgets
        };
      } else {
        // Demo Cloud
        const data = getDemoCloudData(userId);
        setSyncStatus('synced');
        return data;
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
          await supabase.from('assets').upsert(dbAssets);
        }
        // 2. Transactions
        if (transactions.length > 0) {
          const dbTxs = transactions.map(t => mapTxToDb(t, userId));
          await supabase.from('transactions').upsert(dbTxs);
        }
        // 3. Obligations
        if (obligations.length > 0) {
          const dbObs = obligations.map(o => mapObToDb(o, userId));
          await supabase.from('obligations').upsert(dbObs);
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
          await supabase.from('budgets').upsert(dbBudgets);
        }
      } else {
        // Demo Cloud
        saveDemoCloudData(userId, { assets, transactions, obligations, budgets });
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
  setSyncStatus('offline');
});
