import { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAssets } from '../hooks/useAssets';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useTransactions } from '../hooks/useTransactions';
import { useObligations } from '../hooks/useObligations';
import { useBudgets } from '../hooks/useBudgets';
import { syncService } from '../services/syncService';
import { clearAllDB } from '../services/db';
import { exportBackup } from '../utils/backup';
import { mergeById, mergeBudgets } from '../services/merge';
import { migrateTransactionsAssetIds } from '../domain/balances';
import {
  executeAddOrEditTransaction,
  executeTransfer as runTransfer,
  executePayObligation as runPayObligation,
  executeBulkDelete as runBulkDelete
} from '../domain/operations';
import { convert, round } from '../domain/money';
import { scheduleObligationReminders } from '../services/notificationService';

const FinanceContext = createContext(null);

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
        category: 'Ajuste de saldo',
        subcategory: roundedDiff >= 0 ? 'Ajuste positivo' : 'Ajuste negativo',
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
      await syncService.flushQueue(user.id);
      const remote = await syncService.fetchRemoteAll(user.id);
      if (remote) {
        setAssets((prev) => mergeById(prev, remote.assets || []));
        setTransactions((prev) => mergeById(prev, remote.transactions || []));
        setObligations((prev) => mergeById(prev, remote.obligations || []));
        setBudgets((prev) => mergeBudgets(prev, remote.budgets || {}));
      }
      if (showToast) showToast('Datos sincronizados con éxito');
    } catch (e) {
      console.warn('Sync failed:', e);
      if (showToast) showToast('Error en la sincronización', 'error');
    }
  }, [user?.id, setAssets, setTransactions, setObligations, setBudgets, showToast]);

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
              } else {
                setAssets([]);
                setTransactions([]);
                setObligations([]);
                setBudgets({});
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
        budgets
      });
      if (showToast) showToast('Respaldo exportado exitosamente');
    } catch (err) {
      console.error('Error al exportar respaldo:', err);
      if (showToast) showToast('No se pudo generar el respaldo', 'error');
    }
  }, [assets, transactions, obligations, budgets, showToast]);

  const clearLocalData = useCallback(() => {
    localStorage.removeItem('personal_assets');
    localStorage.removeItem('personal_transactions');
    localStorage.removeItem('obligations');
    localStorage.removeItem('personal_budgets');
    localStorage.removeItem('finanzas_sync_queue');
    localStorage.removeItem('finanzas_data_owner');
    clearAllDB();
    setAssets([]);
    setTransactions([]);
    setObligations([]);
    setBudgets({});
  }, [setAssets, setTransactions, setObligations, setBudgets]);

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

  const value = useMemo(() => ({
    // Auth
    auth,
    user,
    // Data
    assets,
    transactions,
    obligations,
    budgets,
    rates,
    rawRates,
    ratesDetails,
    veRates,
    referenceRate,
    setReferenceRate,
    rateHistory,
    refreshRateHistory,
    binanceSymbols,
    knownFiatCurrencies,
    isFetchingRates,
    // Setters
    setAssets,
    setTransactions,
    setObligations,
    setBudgets,
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
    // Operaciones compuestas
    saveTransaction,
    transferFunds,
    payObligation,
    bulkDeleteTransactions,
    adjustAssetBalance,
    syncNow,
    exportBackup: handleExportBackup,
    clearLocalData
  }), [
    auth,
    user,
    assets,
    transactions,
    obligations,
    budgets,
    rates,
    rawRates,
    ratesDetails,
    veRates,
    referenceRate,
    setReferenceRate,
    rateHistory,
    refreshRateHistory,
    binanceSymbols,
    knownFiatCurrencies,
    isFetchingRates,
    setAssets,
    setTransactions,
    setObligations,
    setBudgets,
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
    saveTransaction,
    transferFunds,
    payObligation,
    bulkDeleteTransactions,
    adjustAssetBalance,
    syncNow,
    handleExportBackup,
    clearLocalData
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance debe usarse dentro de un FinanceProvider');
  }
  return ctx;
}
