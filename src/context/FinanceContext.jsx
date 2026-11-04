import { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAssets } from '../hooks/useAssets';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useTransactions } from '../hooks/useTransactions';
import { useObligations } from '../hooks/useObligations';
import { useBudgets } from '../hooks/useBudgets';
import { useGoals } from '../hooks/useGoals';
import { useCategories } from '../hooks/useCategories';
import { useShopping } from '../hooks/useShopping';
import {
  migrateLegacyTransactions,
  migrateLegacyBudgets,
  migrateLegacyObligations
} from '../domain/categories/migrateLegacy';
import { syncService } from '../services/syncService';
import { clearAllDB } from '../services/db';
import { exportBackup } from '../utils/backup';
import { mergeById, mergeBudgets } from '../services/merge';
import { migrateTransactionsAssetIds } from '../domain/balances';
import {
  executeAddOrEditTransaction,
  executeTransfer as runTransfer,
  executePayObligation as runPayObligation,
  executeBulkDelete as runBulkDelete,
  executeBulkMove,
  executeBulkRecategorize
} from '../domain/operations';
import { convert, round } from '../domain/money';
import { scheduleObligationReminders } from '../services/notificationService';

export const FinanceContext = createContext(null);
export const FinanceStateContext = createContext(null);
export const FinanceActionsContext = createContext(null);

export function simplifyErrorMessage(rawError) {
  if (!rawError) return 'error desconocido';
  const str = typeof rawError === 'string' ? rawError : (rawError?.message || String(rawError));

  if (/invalid input syntax for (type )?integer/i.test(str)) {
    return 'formato de número o cuotas inválido';
  }
  if (/invalid input syntax for (type )?numeric/i.test(str)) {
    return 'formato de monto inválido';
  }
  if (/failed to fetch|network|sin internet|offline|timeout/i.test(str)) {
    return 'sin conexión con el servidor';
  }
  if (/jwt|expired|token|auth/i.test(str)) {
    return 'sesión expirada';
  }
  if (/duplicate key|unique constraint/i.test(str)) {
    return 'registro duplicado';
  }
  if (/row-level security|permission denied/i.test(str)) {
    return 'permiso denegado por seguridad';
  }
  if (/column .* does not exist/i.test(str)) {
    return 'estructura de base de datos desactualizada';
  }
  return str.length > 50 ? `${str.slice(0, 47)}...` : str;
}

export function FinanceProvider({ children, showToast, requestConfirm }) {
  const auth = useAuth();
  const { user } = auth;

  const { assets, setAssets, addAsset, deleteAsset, updateAssetBalance } = useAssets(user);
  const {
    rates,
    rawRates,
    setRates,
    ratesDetails,
    veRates,
    referenceRate,
    setReferenceRate,
    rateHistory,
    refreshRateHistory,
    binanceSymbols,
    knownFiatCurrencies,
    refreshRates,
    isFetchingRates,
    setCustomRate
  } = useExchangeRates(assets);

  const {
    transactions,
    setTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction
  } = useTransactions(rates, user);

  const {
    obligations,
    setObligations,
    addObligation,
    deleteObligation,
    updateObligation
  } = useObligations(user);

  const {
    budgets,
    setBudgets,
    updateAllBudgets
  } = useBudgets(user);

  const {
    goals,
    setGoals,
    addGoal,
    updateGoal,
    deleteGoal
  } = useGoals(user);

  const {
    categories,
    setCategories,
    activeExpenseCategories,
    activeIncomeCategories,
    allExpenseCategories,
    allIncomeCategories,
    getSubcategories,
    getCategoryById,
    getCategoryName,
    getSubcategoryName,
    createCategory,
    renameCategory,
    hideCategory,
    toggleActiveCategory,
    updateCategory,
    reorderCategories,
    deleteCategory,
    seedInitialCategories
  } = useCategories(user);

  const {
    shoppingLists,
    setShoppingLists,
    shoppingItems,
    setShoppingItems,
    shoppingProducts,
    setShoppingProducts,
    createList: createShoppingList,
    updateList: updateShoppingList,
    deleteListWithUndo: deleteShoppingListWithUndo,
    duplicateList: duplicateShoppingList,
    addItem: addShoppingItem,
    updateItem: updateShoppingItem,
    toggleItemCheck: toggleShoppingItemCheck,
    deleteItem: deleteShoppingItem,
    completeListPurchase: completeShoppingListPurchase,
    searchProducts: searchShoppingProducts
  } = useShopping(user, showToast);

  // Helper para aplicar resultados de operaciones de dominio y encolar cambios de sincronización
  const applyDomainResult = useCallback((result) => {
    if (!result) return false;
    if (!result.success) {
      if (result.error && showToast) showToast(result.error, 'error');
      return false;
    }

    if (result.nextAssets) setAssets(result.nextAssets);
    if (result.nextTransactions) setTransactions(result.nextTransactions);
    if (result.nextObligations) {
      setObligations(result.nextObligations);
      result.nextObligations.forEach(ob => {
        scheduleObligationReminders(ob);
      });
    }

    if (user?.id && result.syncChanges?.length) {
      result.syncChanges.forEach((change) => {
        syncService.queueChange(change.table, change.type, change.record, user.id);
      });
    }

    if (result.toastMessage && showToast) showToast(result.toastMessage);
    return true;
  }, [setAssets, setTransactions, setObligations, user?.id, showToast]);

  // Acciones de negocio de alto nivel
  const saveTransaction = useCallback((txPayload) => {
    const result = executeAddOrEditTransaction({ assets, transactions, rates }, txPayload);
    if (result.success) {
      applyDomainResult(result);
      return { success: true };
    }
    if (showToast) showToast(result.error, 'error');
    return { success: false, error: result.error };
  }, [assets, transactions, rates, applyDomainResult, showToast]);

  const transferFunds = useCallback((transferPayload) => {
    const result = runTransfer({ assets, transactions, rates }, transferPayload);
    if (result.success) {
      applyDomainResult(result);
      return { success: true };
    }
    if (showToast) showToast(result.error, 'error');
    return { success: false, error: result.error };
  }, [assets, transactions, rates, applyDomainResult, showToast]);

  const payObligation = useCallback((payingOb, payData) => {
    const result = runPayObligation(
      { assets, transactions, obligations, rates, veRates },
      { payingOb, payData }
    );
    if (result.success) {
      applyDomainResult(result);
      return { success: true };
    }
    if (showToast) showToast(result.error, 'error');
    return { success: false, error: result.error };
  }, [assets, transactions, obligations, rates, veRates, applyDomainResult, showToast]);

  const bulkDeleteTransactions = useCallback((selectedTxs) => {
    const result = runBulkDelete({ assets, transactions }, selectedTxs);
    applyDomainResult(result);
    return result;
  }, [assets, transactions, applyDomainResult]);

  const deleteTransactionWithUndo = useCallback((tx) => {
    if (!tx) return;
    const prevAssets = [...assets];
    const prevTransactions = [...transactions];
    const result = runBulkDelete({ assets, transactions }, [tx]);
    if (result.nextAssets) setAssets(result.nextAssets);
    if (result.nextTransactions) setTransactions(result.nextTransactions);
    if (user?.id && result.syncChanges?.length) {
      result.syncChanges.forEach((change) => {
        syncService.queueChange(change.table, change.type, change.record, user.id);
      });
    }

    if (showToast) {
      showToast({
        message: 'Movimiento eliminado',
        undoText: 'Deshacer',
        duration: 5000,
        onUndo: () => {
          setAssets(prevAssets);
          setTransactions(prevTransactions);
          if (user?.id) {
            syncService.queueChange('transactions', 'upsert', {
              ...tx,
              deleted_at: null,
              updated_at: new Date().toISOString()
            }, user.id);
            prevAssets.forEach((a) => {
              syncService.queueChange('assets', 'upsert', a, user.id);
            });
          }
          showToast('Movimiento restaurado');
        }
      });
    }
    return result;
  }, [assets, transactions, setAssets, setTransactions, user?.id, showToast]);

  // Edición en lote (categoría o cuenta) con opción de deshacer.
  const bulkEditTransactions = useCallback((selectedTxs, action) => {
    const state = { assets, transactions };
    const result = action.type === 'move'
      ? executeBulkMove(state, selectedTxs, action.assetId)
      : executeBulkRecategorize(state, selectedTxs, action);
    if (!result.success) {
      if (showToast) showToast(result.error || 'No pudimos cambiar los movimientos.', 'error');
      return result;
    }
    if (result.changedCount === 0) {
      if (showToast) showToast(action.type === 'move'
        ? 'Ningún movimiento cambió: ya estaban en esa cuenta o son de otra moneda.'
        : 'Ningún movimiento era del mismo tipo que esa categoría.', 'error');
      return result;
    }
    const prevAssets = [...assets];
    const prevTransactions = [...transactions];
    const changedIds = new Set(result.syncChanges.filter(c => c.table === 'transactions').map(c => c.record.id));
    const changedAssetIds = new Set(result.syncChanges.filter(c => c.table === 'assets').map(c => c.record.id));
    setAssets(result.nextAssets);
    setTransactions(result.nextTransactions);
    if (user?.id) {
      result.syncChanges.forEach((change) => {
        syncService.queueChange(change.table, change.type, change.record, user.id);
      });
    }
    if (showToast) {
      const n = result.changedCount;
      const base = action.type === 'move' ? `${n} ${n === 1 ? 'movimiento movido' : 'movimientos movidos'}` : `${n} ${n === 1 ? 'movimiento cambiado' : 'movimientos cambiados'}`;
      const skipped = result.skippedCount ? ` (${result.skippedCount} sin cambiar)` : '';
      showToast({
        message: base + skipped,
        undoText: 'Deshacer',
        duration: 6000,
        onUndo: () => {
          setAssets(prevAssets);
          setTransactions(prevTransactions);
          if (user?.id) {
            const nowIso = new Date().toISOString();
            prevTransactions.filter(t => changedIds.has(t.id)).forEach(t => {
              syncService.queueChange('transactions', 'upsert', { ...t, updated_at: nowIso }, user.id);
            });
            prevAssets.filter(a => changedAssetIds.has(a.id)).forEach(a => {
              syncService.queueChange('assets', 'upsert', { ...a, updated_at: nowIso }, user.id);
            });
          }
          showToast('Cambios deshechos');
        }
      });
    }
    return result;
  }, [assets, transactions, setAssets, setTransactions, user?.id, showToast]);

  const adjustAssetBalance = useCallback((asset, newAmount, difference, extraConfig = {}) => {
    const nowIso = new Date().toISOString();
    const roundedNew = round(newAmount, asset.name);
    const roundedDiff = round(difference, asset.name);

    const updatedAsset = {
      ...asset,
      ...extraConfig,
      amount: roundedNew,
      updated_at: nowIso
    };

    const nextAssets = assets.map((a) => (a.id === asset.id ? updatedAsset : a));
    setAssets(nextAssets);

    if (user?.id) {
      syncService.queueChange('assets', 'upsert', updatedAsset, user.id);
    }

    if (roundedDiff !== 0) {
      const assetCurr = (asset.name || 'USD').toUpperCase();
      const rateSnapshot = rates[assetCurr] ?? (['USD', 'USDT', 'USDC'].includes(assetCurr) ? 1 : 0);
      const usdEquivalent = convert(roundedDiff, assetCurr, 'USD', rates);

      const adjustmentTx = {
        id: crypto.randomUUID(),
        type: 'adjustment',
        delta: roundedDiff,
        assetId: asset.id,
        currency: asset.name,
        amount: roundedDiff,
        origin: asset.location,
        category: null,
        subcategory: null,
        category_id: null,
        subcategory_id: null,
        date: nowIso,
        rateSnapshot,
        usdEquivalent,
        updated_at: nowIso
      };

      const nextTxs = [adjustmentTx, ...transactions];
      setTransactions(nextTxs);

      if (user?.id) {
        syncService.queueChange('transactions', 'upsert', adjustmentTx, user.id);
      }
    }

    if (showToast) showToast('Cuenta y saldo actualizados');
  }, [assets, transactions, rates, setAssets, setTransactions, user?.id, showToast]);

  const syncNow = useCallback(async () => {
    if (!user?.id) return;
    try {
      const flushRes = await syncService.flushQueue(user.id);
      const remote = await syncService.fetchRemoteAll(user.id);
      if (remote) {
        setAssets((prev) => mergeById(prev, remote.assets || []));
        setTransactions((prev) => mergeById(prev, remote.transactions || []));
        setObligations((prev) => mergeById(prev, remote.obligations || []));
        setBudgets((prev) => mergeBudgets(prev, remote.budgets || {}));
        setGoals((prev) => mergeById(prev, remote.goals || []));
        if (remote.categories && Array.isArray(remote.categories) && remote.categories.length > 0) {
          setCategories((prev) => mergeById(prev, remote.categories));
        }
        if (remote.shoppingLists && Array.isArray(remote.shoppingLists)) {
          setShoppingLists((prev) => mergeById(prev, remote.shoppingLists));
        }
        if (remote.shoppingItems && Array.isArray(remote.shoppingItems)) {
          setShoppingItems((prev) => mergeById(prev, remote.shoppingItems));
        }
        if (remote.shoppingProducts && Array.isArray(remote.shoppingProducts)) {
          setShoppingProducts((prev) => mergeById(prev, remote.shoppingProducts));
        }
      }

      if (flushRes?.ok && remote !== null) {
        if (showToast) showToast('Datos sincronizados con éxito');
      } else {
        const count = flushRes?.pending ?? (flushRes?.errors?.length || 1);
        const rawFirst = flushRes?.errors?.[0] || (remote === null ? 'sin conexión con la nube' : 'error de sincronización');
        const friendly = simplifyErrorMessage(rawFirst);
        if (showToast) {
          showToast(`No se pudieron subir ${count === 1 ? '1 cambio' : `${count} cambios`}: ${friendly}`, 'error');
        }
      }
    } catch (e) {
      console.warn('Sync failed:', e);
      const friendly = simplifyErrorMessage(e);
      if (showToast) showToast(`No se pudieron subir los cambios: ${friendly}`, 'error');
    }
  }, [user?.id, setAssets, setTransactions, setObligations, setBudgets, setGoals, showToast]);

  useEffect(() => {
    if (user?.id) {
      const owner = localStorage.getItem('finanzas_data_owner');
      const hasLocalData = (assets.length > 0 || transactions.length > 0 || obligations.length > 0);

      if (owner && owner !== user.id && hasLocalData) {
        if (requestConfirm) {
          requestConfirm({
            title: 'Cuenta diferente detectada',
            message: 'Hay datos en este teléfono de otra sesión. ¿Deseas conservarlos y combinarlos con tu cuenta, o empezar con los datos de tu cuenta en la nube?',
            confirmText: 'Combinar y subir',
            cancelText: 'Usar solo mi nube',
            onConfirm: async () => {
              localStorage.setItem('finanzas_data_owner', user.id);
              await syncNow();
            },
            onCancel: async () => {
              localStorage.setItem('finanzas_data_owner', user.id);
              localStorage.removeItem('finanzas_sync_queue');
              const remote = await syncService.fetchRemoteAll(user.id);
              if (remote) {
                setAssets(mergeById([], remote.assets || []));
                setTransactions(mergeById([], remote.transactions || []));
                setObligations(mergeById([], remote.obligations || []));
                setBudgets(mergeBudgets({}, remote.budgets || {}));
                setGoals(mergeById([], remote.goals || []));
                if (remote.categories) {
                  setCategories(mergeById([], remote.categories));
                }
              } else {
                setAssets([]);
                setTransactions([]);
                setObligations([]);
                setBudgets({});
                setGoals([]);
                seedInitialCategories(true);
              }
            }
          });
        }
      } else {
        localStorage.setItem('finanzas_data_owner', user.id);
        syncNow();
      }
    }
  }, [user?.id]);

  const handleExportBackup = useCallback(async () => {
    try {
      await exportBackup({
        assets,
        transactions,
        obligations,
        budgets,
        goals,
        categories,
        shoppingLists,
        shoppingItems,
        shoppingProducts
      });
      if (showToast) showToast('Respaldo exportado exitosamente');
    } catch (err) {
      console.error('Error al exportar respaldo:', err);
      if (showToast) showToast('No se pudo generar el respaldo', 'error');
    }
  }, [assets, transactions, obligations, budgets, goals, categories, shoppingLists, shoppingItems, shoppingProducts, showToast]);

  const clearLocalData = useCallback(() => {
    localStorage.removeItem('personal_assets');
    localStorage.removeItem('personal_transactions');
    localStorage.removeItem('obligations');
    localStorage.removeItem('personal_budgets');
    localStorage.removeItem('personal_goals');
    localStorage.removeItem('personal_user_categories');
    localStorage.removeItem('personal_shopping_lists');
    localStorage.removeItem('personal_shopping_items');
    localStorage.removeItem('personal_shopping_products');
    localStorage.removeItem('finanzas_sync_queue');
    localStorage.removeItem('finanzas_data_owner');
    clearAllDB();
    setAssets([]);
    setTransactions([]);
    setObligations([]);
    setBudgets({});
    setGoals([]);
    setShoppingLists([]);
    setShoppingItems([]);
    setShoppingProducts([]);
    seedInitialCategories(true);
  }, [setAssets, setTransactions, setObligations, setBudgets, setGoals, setShoppingLists, setShoppingItems, setShoppingProducts, seedInitialCategories]);

  // Reasignar movimientos de una categoría a otra antes de eliminar
  const reassignCategoryTransactions = useCallback((fromCatId, toCatId) => {
    if (!fromCatId || !toCatId || fromCatId === toCatId) return 0;
    const targetCat = categories.find(c => c.id === toCatId);
    if (!targetCat) return 0;

    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    const nextTxs = transactions.map(tx => {
      if (tx.category_id === fromCatId || tx.category === fromCatId) {
        updatedCount++;
        const updated = {
          ...tx,
          category_id: targetCat.id,
          category: targetCat.name,
          subcategory_id: null,
          subcategory: null,
          updated_at: nowIso
        };
        if (user?.id) {
          syncService.queueChange('transactions', 'upsert', updated, user.id);
        }
        return updated;
      }
      return tx;
    });

    if (updatedCount > 0) {
      setTransactions(nextTxs);
    }
    return updatedCount;
  }, [transactions, categories, user?.id, setTransactions]);

  // Migración automática e idempotente de categorías legacy a category_id / subcategory_id
  useEffect(() => {
    const migrationKey = `finanzas_categories_migrated_v1_${user?.id || 'local'}`;
    const alreadyMigrated = localStorage.getItem(migrationKey);

    const needsTxMigration = !alreadyMigrated && transactions.some(t => !t.category_id && (t.type === 'spent' || t.type === 'income'));
    const needsObMigration = !alreadyMigrated && obligations.some(o => !o.category_id);
    const needsBgMigration = !alreadyMigrated && Object.values(budgets).some(b => typeof b === 'number' || (b && !b.category_id));

    if (needsTxMigration || needsObMigration || needsBgMigration) {
      if (needsTxMigration) {
        const migratedTxs = migrateLegacyTransactions(transactions);
        setTransactions(migratedTxs);
      }
      if (needsObMigration) {
        const migratedObs = migrateLegacyObligations(obligations);
        setObligations(migratedObs);
      }
      if (needsBgMigration) {
        const migratedBg = migrateLegacyBudgets(budgets);
        setBudgets(migratedBg);
      }
      localStorage.setItem(migrationKey, 'true');
    }
  }, [user?.id, transactions, obligations, budgets, setTransactions, setObligations, setBudgets]);

  useEffect(() => {
    if (assets.length > 0 && transactions.length > 0) {
      const hasUnmigrated = transactions.some(
        (t) => (!t.assetId && t.origin) || (t.type === 'transfer' && !t.destAssetId && t.destOrigin)
      );
      if (hasUnmigrated) {
        const { migratedTransactions, hasChanges } = migrateTransactionsAssetIds(transactions, assets);
        if (hasChanges) {
          setTransactions(migratedTransactions);
        }
      }
    }
  }, [assets, transactions, setTransactions]);

  const stateValue = useMemo(() => ({
    // Auth
    auth,
    user,
    // Data
    assets,
    transactions,
    obligations,
    budgets,
    goals,
    categories,
    activeExpenseCategories,
    activeIncomeCategories,
    allExpenseCategories,
    allIncomeCategories,
    rates,
    rawRates,
    ratesDetails,
    veRates,
    referenceRate,
    rateHistory,
    binanceSymbols,
    knownFiatCurrencies,
    isFetchingRates,
    // Lista de compras
    shoppingLists,
    shoppingItems,
    shoppingProducts
  }), [
    auth,
    user,
    assets,
    transactions,
    obligations,
    budgets,
    goals,
    categories,
    activeExpenseCategories,
    activeIncomeCategories,
    allExpenseCategories,
    allIncomeCategories,
    rates,
    rawRates,
    ratesDetails,
    veRates,
    referenceRate,
    rateHistory,
    binanceSymbols,
    knownFiatCurrencies,
    isFetchingRates,
    shoppingLists,
    shoppingItems,
    shoppingProducts
  ]);

  const actionsValue = useMemo(() => ({
    setReferenceRate,
    refreshRateHistory,
    // Setters
    setAssets,
    setTransactions,
    setObligations,
    setBudgets,
    setGoals,
    setRates,
    setCustomRate,
    refreshRates,
    // CRUD directos
    addAsset,
    deleteAsset,
    updateAssetBalance,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    addObligation,
    deleteObligation,
    updateObligation,
    updateAllBudgets,
    addGoal,
    updateGoal,
    deleteGoal,
    // Operaciones compuestas
    saveTransaction,
    transferFunds,
    payObligation,
    bulkDeleteTransactions,
    bulkEditTransactions,
    deleteTransactionWithUndo,
    adjustAssetBalance,
    syncNow,
    exportBackup: handleExportBackup,
    clearLocalData,
    // Categorías y catálogo
    getSubcategories,
    getCategoryById,
    getCategoryName,
    getSubcategoryName,
    createCategory,
    renameCategory,
    hideCategory,
    toggleActiveCategory,
    updateCategory,
    reorderCategories,
    deleteCategory,
    reassignCategoryTransactions,
    seedInitialCategories,
    setCategories,
    // Lista de compras
    setShoppingLists,
    setShoppingItems,
    setShoppingProducts,
    createShoppingList,
    updateShoppingList,
    deleteShoppingListWithUndo,
    duplicateShoppingList,
    addShoppingItem,
    updateShoppingItem,
    toggleShoppingItemCheck,
    deleteShoppingItem,
    completeShoppingListPurchase,
    searchShoppingProducts
  }), [
    setReferenceRate,
    refreshRateHistory,
    setAssets,
    setTransactions,
    setObligations,
    setBudgets,
    setGoals,
    setRates,
    setCustomRate,
    refreshRates,
    addAsset,
    deleteAsset,
    updateAssetBalance,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    addObligation,
    deleteObligation,
    updateObligation,
    updateAllBudgets,
    addGoal,
    updateGoal,
    deleteGoal,
    saveTransaction,
    transferFunds,
    payObligation,
    bulkDeleteTransactions,
    bulkEditTransactions,
    deleteTransactionWithUndo,
    adjustAssetBalance,
    syncNow,
    handleExportBackup,
    clearLocalData,
    getSubcategories,
    getCategoryById,
    getCategoryName,
    getSubcategoryName,
    createCategory,
    renameCategory,
    hideCategory,
    toggleActiveCategory,
    updateCategory,
    reorderCategories,
    deleteCategory,
    reassignCategoryTransactions,
    seedInitialCategories,
    setCategories,
    setShoppingLists,
    setShoppingItems,
    setShoppingProducts,
    createShoppingList,
    updateShoppingList,
    deleteShoppingListWithUndo,
    duplicateShoppingList,
    addShoppingItem,
    updateShoppingItem,
    toggleShoppingItemCheck,
    deleteShoppingItem,
    completeShoppingListPurchase,
    searchShoppingProducts
  ]);

  const value = useMemo(() => ({
    ...stateValue,
    ...actionsValue
  }), [stateValue, actionsValue]);

  return (
    <FinanceStateContext.Provider value={stateValue}>
      <FinanceActionsContext.Provider value={actionsValue}>
        <FinanceContext.Provider value={value}>
          {children}
        </FinanceContext.Provider>
      </FinanceActionsContext.Provider>
    </FinanceStateContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance debe usarse dentro de un FinanceProvider');
  }
  return ctx;
}

export function useFinanceState() {
  const ctx = useContext(FinanceStateContext);
  if (!ctx) {
    throw new Error('useFinanceState debe usarse dentro de un FinanceProvider');
  }
  return ctx;
}

export function useFinanceActions() {
  const ctx = useContext(FinanceActionsContext);
  if (!ctx) {
    throw new Error('useFinanceActions debe usarse dentro de un FinanceProvider');
  }
  return ctx;
}
