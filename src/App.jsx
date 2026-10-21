import { useState, useEffect, lazy, Suspense } from 'react';
import { useAssets } from './hooks/useAssets';
import { useTransactions } from './hooks/useTransactions';
import { useExchangeRates } from './hooks/useExchangeRates';
import { useObligations } from './hooks/useObligations';
import { useBudgets } from './hooks/useBudgets';
import { useAuth } from './hooks/useAuth';
import { syncService } from './services/syncService';

const DashboardView = lazy(() => import('./components/views/DashboardView'));
const BalancesView = lazy(() => import('./components/views/BalancesView'));
const TransactionsView = lazy(() => import('./components/views/TransactionsView'));
const ObligationsView = lazy(() => import('./components/views/ObligationsView'));
const CalculatorView = lazy(() => import('./components/views/CalculatorView'));

import AssetModal from './components/modals/AssetModal';
import BalanceAdjustModal from './components/modals/BalanceAdjustModal';
import TransactionModal from './components/modals/TransactionModal';
import TransferModal from './components/modals/TransferModal';
import ObligationModal from './components/modals/ObligationModal';
import PayObligationModal from './components/modals/PayObligationModal';
import BudgetModal from './components/modals/BudgetModal';
import AuthModal from './components/modals/AuthModal';
import ConfirmModal from './components/modals/ConfirmModal';
import PinLockModal from './components/modals/PinLockModal';
import SecuritySettingsModal from './components/modals/SecuritySettingsModal';
import { useAppLock } from './hooks/useAppLock';

import Toast from './components/common/Toast';
import PwaInstallPrompt from './components/common/PwaInstallPrompt';
import AutoUpdater from './components/common/AutoUpdater';
import { exportBackup } from './utils/backup';
import { todayLocal, toLocalDateString, parseLocalDate, getNextDueDate } from './utils/dates';
import { mergeById, mergeBudgets } from './services/merge';
import { calculateTransactionEditDelta, calculateTransferDeltas, calculateTransferReversalDeltas, migrateTransactionsAssetIds } from './domain/balances';
import { add, sub, convert, round, parseAmount } from './domain/money';
import {
  executeAddOrEditTransaction,
  executeTransfer,
  executePayObligation,
  executeBulkDelete
} from './domain/operations';
import { formatAmount, getTxUsdEquivalent, translateCategory } from './utils/formatters';
import { generateTestData, TEST_DATA_SEED_KEY } from './utils/testData';
import './App.css';

function App() {
  const auth = useAuth();
  const { user } = auth;

  const { assets, setAssets, addAsset, deleteAsset, updateAssetBalance } = useAssets(user);
  const {
    rates,
    setRates,
    ratesDetails,
    veRates,
    binanceSymbols,
    knownFiatCurrencies,
    refreshRates,
    isFetchingRates,
    setCustomRate
  } = useExchangeRates(assets);
  const { transactions, setTransactions, addTransaction, deleteTransaction, updateTransaction } = useTransactions(rates, user);
  const { obligations, setObligations, addObligation, deleteObligation, updateObligation } = useObligations(user);
  const { budgets, setBudgets, updateAllBudgets } = useBudgets(user);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState('balances'); // 'dashboard', 'balances', 'transactions', 'obligations', 'calculator'
  const [timeFrame, setTimeFrame] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'all'
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [txFilter, setTxFilter] = useState('all'); // 'all', 'income', 'spent', 'transfer'

  // Calculator State
  const [calcBaseAmount, setCalcBaseAmount] = useState('');
  const [calcBaseCurrency, setCalcBaseCurrency] = useState('BS');

  const getAmountInBs = () => {
    if (!calcBaseAmount) return '';
    const num = Number(calcBaseAmount);
    if (isNaN(num)) return '';
    switch (calcBaseCurrency) {
      case 'BS': return num;
      case 'BCV_USD': return veRates.bcvUsd ? num * veRates.bcvUsd : '';
      case 'PARALELO': return veRates.paralelo ? num * veRates.paralelo : '';
      case 'EUR': return veRates.bcvEur ? num * veRates.bcvEur : '';
      case 'CUSTOM': return num * (veRates.custom || 0);
      default: return '';
    }
  };
  const amountBs = getAmountInBs();

  useEffect(() => {
    setIsFabExpanded(false);
  }, [currentPage]);

  // Balances State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetInitialType, setAssetInitialType] = useState('fiat');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [adjustingAsset, setAdjustingAsset] = useState(null);

  // Transactions State
  const [txModalMode, setTxModalMode] = useState(null); // 'select', 'form', or null
  const [txValidationError, setTxValidationError] = useState('');
  const [newTx, setNewTx] = useState({
    id: '', assetId: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal()
  });
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedTxs, setSelectedTxs] = useState([]);
  const [flippedTxId, setFlippedTxId] = useState(null);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  const requestConfirm = (options) => {
    setConfirmConfig({ isOpen: true, ...options });
  };

  const showToast = (msg, type = 'success') => {
    setToast(typeof msg === 'string' && type !== 'success' ? { message: msg, type } : msg);
    setTimeout(() => setToast(null), 3000);
  };

  const appLock = useAppLock({ showToast });
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  useEffect(() => {
    try {
      const pendingToast = sessionStorage.getItem('pending_toast');
      if (pendingToast) {
        sessionStorage.removeItem('pending_toast');
        const parsed = JSON.parse(pendingToast);
        showToast(parsed.message, parsed.type);
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      const owner = localStorage.getItem('finanzas_data_owner');
      const hasLocalData = (assets.length > 0 || transactions.length > 0 || obligations.length > 0);

      // Si hay un dueño guardado previo y es distinto al usuario logueado
      if (owner && owner !== user.id && hasLocalData) {
        requestConfirm({
          title: 'Cuenta diferente detectada',
          message: 'Hay datos en este teléfono de otra sesión. ¿Deseas conservarlos y combinarlos con tu cuenta, o empezar con los datos de tu cuenta en la nube?',
          confirmText: 'Combinar y subir',
          cancelText: 'Usar solo mi nube',
          onConfirm: async () => {
            localStorage.setItem('finanzas_data_owner', user.id);
            await handleSyncNow();
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
      } else {
        localStorage.setItem('finanzas_data_owner', user.id);
        handleSyncNow();
      }
    }
  }, [user?.id]);

  // Migración local: asignar assetId (y destAssetId) a movimientos antiguos
  useEffect(() => {
    if (assets.length > 0 && transactions.length > 0) {
      const hasUnmigrated = transactions.some(
        t => (!t.assetId && t.origin) || (t.type === 'transfer' && !t.destAssetId && t.destOrigin)
      );
      if (hasUnmigrated) {
        const { migratedTransactions, hasChanges } = migrateTransactionsAssetIds(transactions, assets);
        if (hasChanges) {
          setTransactions(migratedTransactions);
        }
      }
    }
  }, [assets, transactions, setTransactions]);

  const handleSyncNow = async () => {
    if (!user?.id) {
      setIsAuthModalOpen(true);
      return;
    }
    showToast('Sincronizando con la nube...');
    // 1. Flush local pending queue first
    await syncService.flushQueue();

    // 2. Fetch remote
    const remote = await syncService.fetchRemoteAll(user.id);
    if (remote) {
      // 3. Merge by ID with local state
      setAssets(prev => {
        const merged = mergeById(prev, remote.assets || []);
        return merged;
      });
      setTransactions(prev => {
        const merged = mergeById(prev, remote.transactions || []);
        return merged;
      });
      setObligations(prev => {
        const merged = mergeById(prev, remote.obligations || []);
        return merged;
      });
      setBudgets(prev => {
        const merged = mergeBudgets(prev, remote.budgets || {});
        return merged;
      });
      showToast('Datos sincronizados con éxito');
    } else {
      showToast('Sincronización completada');
    }
  };

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    sourceAssetId: '', amountDeducted: '', destAssetId: '', amountReceived: '', hasCommission: false, commissionAmount: ''
  });

  // Obligations State
  const [isObModalOpen, setIsObModalOpen] = useState(false);
  const [newOb, setNewOb] = useState({
    id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0
  });
  const [payingOb, setPayingOb] = useState(null);
  const [payData, setPayData] = useState({ assetId: '', actualAmount: '', rateType: 'BCV_USD', customRate: '' });
  const [flippedObId, setFlippedObId] = useState(null);

  // Bloquear scroll de fondo cuando cualquier modal esté abierto
  const isAnyModalActive = Boolean(
    isAssetModalOpen ||
    adjustingAsset ||
    txModalMode ||
    isTransferModalOpen ||
    isObModalOpen ||
    payingOb ||
    isBudgetModalOpen ||
    isAuthModalOpen ||
    isSecurityModalOpen ||
    appLock.isLocked ||
    confirmConfig?.isOpen
  );

  useEffect(() => {
    if (isAnyModalActive) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isAnyModalActive]);

  // Asset Actions
  const handleAddAsset = (assetData) => {
    addAsset(assetData);
  };

  const handleAdjustBalance = (asset, delta, newAmount) => {
    if (!asset || delta === 0) return;
    const currentAsset = assets.find(a => a.id === asset.id);
    if (!currentAsset) {
      showToast('La cuenta a ajustar no existe', 'error');
      return;
    }

    const parsedDelta = parseAmount(delta);
    if (isNaN(parsedDelta) || parsedDelta === 0) return;
    const roundedDelta = round(parsedDelta, asset.name);

    const updated = updateAssetBalance(asset.id, roundedDelta);
    if (!updated) {
      showToast('Error al actualizar el saldo de la cuenta', 'error');
      return;
    }

    const curr = (asset.name || '').toUpperCase();
    const rateSnapshot = rates[curr] ?? (curr === 'USD' || curr === 'USDT' || curr === 'USDC' ? 1 : 0);
    const diffAbs = Math.abs(roundedDelta);
    const usdEquivalent = convert(diffAbs, curr, 'USD', rates);
    const parsedNew = parseAmount(newAmount);
    const targetAmountDisplay = !isNaN(parsedNew) ? round(parsedNew, asset.name) : round(add(asset.amount, roundedDelta), asset.name);

    addTransaction({
      id: crypto.randomUUID(),
      assetId: asset.id,
      type: 'adjustment',
      currency: asset.name,
      amount: diffAbs,
      delta: roundedDelta,
      origin: asset.location,
      category: 'Ajuste de saldo',
      subcategory: roundedDelta > 0 ? 'Ajuste positivo' : 'Ajuste negativo',
      notes: `Ajuste manual de ${asset.amount} a ${targetAmountDisplay} ${asset.name}`,
      date: new Date().toISOString(),
      rateSnapshot,
      usdEquivalent
    });

    showToast('Balance ajustado');
  };

  const handleDeleteAsset = (id, name, location) => {
    requestConfirm({
      title: 'Eliminar cuenta',
      message: `¿Estás seguro de que quieres eliminar ${name} de ${location}?`,
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: () => {
        deleteAsset(id);
        showToast('Cuenta eliminada');
      }
    });
  };

  // Obligation Actions
  const handleAddObligation = (e) => {
    e.preventDefault();
    const parsedAmount = parseAmount(newOb.amount);
    if (!newOb.title || parsedAmount === null || parsedAmount <= 0 || !newOb.currency || !newOb.category) {
      showToast('Completa todos los campos con un monto válido', 'error');
      return;
    }

    const finalInstallments = newOb.frequency === 'one-time' ? '1' : newOb.totalInstallments;
    const finalAmount = round(parsedAmount, newOb.currency);

    if (newOb.id) {
      updateObligation(newOb.id, { ...newOb, amount: finalAmount, totalInstallments: finalInstallments });
    } else {
      addObligation({ ...newOb, amount: finalAmount, totalInstallments: finalInstallments });
    }
    setIsObModalOpen(false);
    setNewOb({ id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0, dateCreated: '' });
    showToast('Deuda guardada');
  };

  const handleDeleteObligation = (id, message = '¿Eliminar esta obligación?') => {
    requestConfirm({
      title: 'Eliminar obligación',
      message,
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: () => {
        deleteObligation(id);
        showToast('Obligación eliminada');
      }
    });
  };

  const applyDomainResult = (result) => {
    if (!result) return false;
    if (!result.success) {
      if (result.error) showToast(result.error, 'error');
      return false;
    }
    if (result.nextAssets) setAssets(result.nextAssets);
    if (result.nextTransactions) setTransactions(result.nextTransactions);
    if (result.nextObligations) setObligations(result.nextObligations);

    if (user?.id && result.syncChanges?.length) {
      result.syncChanges.forEach(change => {
        syncService.queueChange(change.table, change.type, change.record, user.id);
      });
    }

    if (result.toastMessage) showToast(result.toastMessage);
    return true;
  };

  const handlePayObligationSubmit = (e) => {
    e.preventDefault();
    if (!payingOb || !payData.assetId || !payData.actualAmount) return;

    const result = executePayObligation(
      { assets, transactions, obligations, rates, veRates },
      { payingOb, payData }
    );

    if (applyDomainResult(result)) {
      setPayingOb(null);
      setPayData({ assetId: '', actualAmount: '', rateType: 'BCV_USD', customRate: '' });
    }
  };

  // Transaction Actions
  const handleEditTransaction = (tx) => {
    const targetAsset = (tx.assetId && assets.find(a => a.id === tx.assetId)) ||
                        assets.find(a => (a.name || '').toUpperCase() === (tx.currency || '').toUpperCase() && a.location === tx.origin);
    setNewTx({
      id: tx.id,
      assetId: targetAsset ? targetAsset.id : (tx.assetId || ''),
      type: tx.type,
      currency: tx.currency,
      amount: tx.amount.toString(),
      origin: tx.origin,
      category: tx.category || '',
      subcategory: tx.subcategory || '',
      date: tx.date ? toLocalDateString(tx.date) : todayLocal()
    });
    setTxValidationError('');
    setTxModalMode('form');
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    setTxValidationError('');

    const result = executeAddOrEditTransaction(
      { assets, transactions, rates },
      newTx
    );

    if (result.success) {
      applyDomainResult(result);
      setTxModalMode(null);
      setTxValidationError('');
      setNewTx({ id: '', assetId: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal() });
    } else {
      setTxValidationError(result.error);
      showToast(result.error, 'error');
    }
  };
  const handleTransferSubmit = (e) => {
    e.preventDefault();
    setTxValidationError('');

    const result = executeTransfer(
      { assets, transactions, rates },
      newTransfer
    );

    if (result.success) {
      applyDomainResult(result);
      setIsTransferModalOpen(false);
      setTxValidationError('');
      setNewTransfer({ sourceAssetId: '', amountDeducted: '', destAssetId: '', amountReceived: '', hasCommission: false, commissionAmount: '' });
    } else {
      setTxValidationError(result.error);
      showToast(result.error, 'error');
    }
  };

  const handleBulkDelete = () => {
    if (selectedTxs.length === 0) {
      setDeleteMode(false);
      return;
    }

    requestConfirm({
      title: 'Eliminar transacciones',
      message: `¿Estás seguro de que deseas eliminar ${selectedTxs.length} transacción(es)? Se revertirán los saldos correspondientes.`,
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: () => {
        const result = executeBulkDelete({ assets, transactions }, selectedTxs);
        applyDomainResult(result);
        setSelectedTxs([]);
        setDeleteMode(false);
      }
    });
  };

  const toggleSelectTx = (tx) => {
    if (selectedTxs.some(t => t.id === tx.id)) {
      setSelectedTxs(selectedTxs.filter(t => t.id !== tx.id));
    } else {
      setSelectedTxs([...selectedTxs, tx]);
    }
  };

  // Computations for Summary
  const grandTotalUsd = assets.reduce((total, asset) => {
    const sym = (asset.name || '').trim().toUpperCase();
    const usdVal = convert(asset.amount, sym, 'USD', rates);
    return add(total, usdVal);
  }, 0);

  const accountTotalsUsd = assets.reduce((acc, asset) => {
    if (!acc[asset.location]) acc[asset.location] = 0;
    const sym = (asset.name || '').trim().toUpperCase();
    const usdVal = convert(asset.amount, sym, 'USD', rates);
    acc[asset.location] = add(acc[asset.location], usdVal);
    return acc;
  }, {});

  const assetsByLocation = assets.reduce((acc, asset) => {
    if (activeFilter === 'asset' && selectedFilters.length > 0 && !selectedFilters.includes(asset.name)) {
      return acc;
    }
    if (activeFilter === 'account' && selectedFilters.length > 0 && !selectedFilters.includes(asset.location)) {
      return acc;
    }
    if (!acc[asset.location]) acc[asset.location] = [];
    acc[asset.location].push(asset);
    return acc;
  }, {});

  const uniqueAssetNames = Array.from(new Set(assets.map(a => a.name)));

  const nextPayments = obligations.filter(ob => ob.type === 'pay' && (!ob.totalInstallments || Number(ob.paidInstallments) < Number(ob.totalInstallments))).slice(0, 3);
  const nextCollections = obligations.filter(ob => ob.type === 'receive' && (!ob.totalInstallments || Number(ob.paidInstallments) < Number(ob.totalInstallments))).slice(0, 3);

  // Dashboard Analytics Computations
  const now = new Date();
  const filterDate = new Date();
  if (timeFrame === 'daily') {
    filterDate.setHours(0, 0, 0, 0);
  } else if (timeFrame === 'weekly') {
    filterDate.setDate(now.getDate() - 7);
  } else if (timeFrame === 'monthly') {
    filterDate.setMonth(now.getMonth() - 1);
  }

  const allSpents = transactions.filter(t => t.type === 'spent');
  const filteredSpents = timeFrame === 'all'
    ? allSpents
    : allSpents.filter(t => parseLocalDate(toLocalDateString(t.date)) >= filterDate);

  const allIncomes = transactions.filter(t => t.type === 'income');
  const filteredIncomes = timeFrame === 'all'
    ? allIncomes
    : allIncomes.filter(t => parseLocalDate(toLocalDateString(t.date)) >= filterDate);

  const totalSpentUsd = filteredSpents.reduce((acc, t) => add(acc, getTxUsdEquivalent(t, rates)), 0);
  const totalIncomeUsd = filteredIncomes.reduce((acc, t) => add(acc, getTxUsdEquivalent(t, rates)), 0);

  const aggregatedData = {};
  filteredSpents.forEach(t => {
    const usdAmount = getTxUsdEquivalent(t, rates);
    const cat = translateCategory(t.category) || 'Sin categoría';
    if (!aggregatedData[cat]) {
      aggregatedData[cat] = 0;
    }
    aggregatedData[cat] += usdAmount;
  });

  const pieData = Object.entries(aggregatedData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const injectAdvancedTestData = () => {
    requestConfirm({
      title: 'Cargar datos de prueba',
      message: '¿Estás seguro de que quieres borrar todos los datos actuales y cargar el conjunto completo de datos de prueba?',
      confirmText: 'Cargar datos',
      variant: 'danger',
      onConfirm: () => {
        const mock = generateTestData(rates);
        localStorage.setItem('personal_assets', JSON.stringify(mock.assets));
        localStorage.setItem('personal_transactions', JSON.stringify(mock.transactions));
        localStorage.setItem('obligations', JSON.stringify(mock.obligations));
        localStorage.setItem('personal_budgets', JSON.stringify(mock.budgets));
        localStorage.removeItem('finanzas_sync_queue');
        localStorage.setItem(TEST_DATA_SEED_KEY, 'applied');

        setAssets(mock.assets);
        setTransactions(mock.transactions);
        setObligations(mock.obligations);
        setBudgets(mock.budgets);
        showToast('Datos de prueba cargados con éxito');
      }
    });
  };

  const clearAllAppData = () => {
    requestConfirm({
      title: 'Eliminar todos los datos',
      message: '¿Estás seguro de que deseas eliminar todas las cuentas, transacciones, compromisos y presupuestos precargados para empezar desde cero?',
      confirmText: 'Sí, limpiar todo',
      variant: 'danger',
      onConfirm: () => {
        localStorage.setItem('personal_assets', JSON.stringify([]));
        localStorage.setItem('personal_transactions', JSON.stringify([]));
        localStorage.setItem('obligations', JSON.stringify([]));
        localStorage.setItem('personal_budgets', JSON.stringify({}));
        localStorage.removeItem('finanzas_sync_queue');
        localStorage.removeItem(TEST_DATA_SEED_KEY);

        setAssets([]);
        setTransactions([]);
        setObligations([]);
        setBudgets({});
        showToast('Todos los datos fueron eliminados. App lista desde cero.');
      }
    });
  };

  const handleExportBackup = async () => {
    try {
      const filename = await exportBackup({ assets, transactions, obligations, veRates, budgets });
      showToast(`Copia de seguridad exportada con éxito (${filename})`);
    } catch (err) {
      if (err?.message && String(err.message).toLowerCase().includes('cancel')) {
        return;
      }
      showToast('Error al exportar copia de seguridad', 'error');
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      <PwaInstallPrompt />
      <AutoUpdater showToast={showToast} />
      <div className="content-area" key={currentPage}>
        <div className="page-enter">
          <Suspense fallback={<div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Cargando...</div>}>
            {/* DASHBOARD PAGE */}
            {currentPage === 'dashboard' && (
              <DashboardView
                isBalanceHidden={isBalanceHidden}
                setIsBalanceHidden={setIsBalanceHidden}
                grandTotalUsd={grandTotalUsd}
                rates={rates}
                ratesDetails={ratesDetails}
                totalIncomeUsd={totalIncomeUsd}
                totalSpentUsd={totalSpentUsd}
                timeFrame={timeFrame}
                setTimeFrame={setTimeFrame}
                pieData={pieData}
                nextPayments={nextPayments}
                nextCollections={nextCollections}
                onNavigateTransactions={(type) => {
                  setTxFilter(type);
                  setCurrentPage('transactions');
                }}
                budgets={budgets}
                transactions={transactions}
                assets={assets}
                onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
                auth={auth}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
              />
            )}

            {/* BALANCES PAGE */}
            {currentPage === 'balances' && (
              <BalancesView
                grandTotalUsd={grandTotalUsd}
                rates={rates}
                ratesDetails={ratesDetails}
                assets={assets}
                transactions={transactions}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                assetsByLocation={assetsByLocation}
                accountTotalsUsd={accountTotalsUsd}
                uniqueAssetNames={uniqueAssetNames}
                deleteMode={deleteMode}
                onAdjustAsset={(asset) => setAdjustingAsset(asset)}
                onDeleteAsset={handleDeleteAsset}
                onAdjustBalance={handleAdjustBalance}
                auth={auth}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onExportBackup={handleExportBackup}
                onNavigateToCalculator={() => setCurrentPage('calculator')}
              />
            )}

            {/* OBLIGATIONS PAGE */}
            {currentPage === 'obligations' && (
              <ObligationsView
                obligations={obligations}
                flippedObId={flippedObId}
                setFlippedObId={setFlippedObId}
                onEdit={(ob) => {
                  setNewOb({ ...ob });
                  setIsObModalOpen(true);
                }}
                onPay={(ob) => {
                  setPayingOb(ob);
                  setPayData({
                    assetId: '',
                    actualAmount: ob.amount.toString(),
                    rateType: (ob.currency || '').toUpperCase() === 'EUR' ? 'EUR' : 'BCV_USD',
                    customRate: ''
                  });
                }}
                onDelete={handleDeleteObligation}
              />
            )}

            {/* CALCULATOR PAGE */}
            {currentPage === 'calculator' && (
              <CalculatorView
                calcBaseCurrency={calcBaseCurrency}
                setCalcBaseCurrency={setCalcBaseCurrency}
                calcBaseAmount={calcBaseAmount}
                setCalcBaseAmount={setCalcBaseAmount}
                amountBs={amountBs}
                veRates={veRates}
                ratesDetails={ratesDetails}
                setVeRates={(newVal) => {
                  const custom = newVal?.custom !== undefined ? newVal.custom : newVal;
                  setCustomRate(custom);
                }}
                fetchVeRates={refreshRates}
                isFetchingRates={isFetchingRates}
                assets={assets}
                transactions={transactions}
                obligations={obligations}
                budgets={budgets}
                showToast={showToast}
                onInjectTestData={injectAdvancedTestData}
                onClearAllData={clearAllAppData}
                auth={auth}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onSyncNow={handleSyncNow}
                onRequestConfirm={requestConfirm}
                onRestoreBackup={(data) => {
                  setAssets(data.assets);
                  setTransactions(data.transactions);
                  setObligations(data.obligations);
                  if (data.veRates?.custom) setCustomRate(data.veRates.custom);
                  if (data.budgets) setBudgets(data.budgets);
                }}
              />
            )}

            {/* TRANSACTIONS PAGE */}
            {currentPage === 'transactions' && (
              <TransactionsView
                transactions={transactions}
                assets={assets}
                txFilter={txFilter}
                setTxFilter={setTxFilter}
                deleteMode={deleteMode}
                setDeleteMode={setDeleteMode}
                selectedTxs={selectedTxs}
                toggleSelectTx={toggleSelectTx}
                flippedTxId={flippedTxId}
                setFlippedTxId={setFlippedTxId}
                rates={rates}
                onEdit={handleEditTransaction}
              />
            )}
          </Suspense>
        </div>
      </div>

      {currentPage !== 'dashboard' && currentPage !== 'calculator' && (
        <>
          {deleteMode ? (
            <div style={{ position: 'absolute', bottom: 'calc(60px + env(safe-area-inset-bottom))', right: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', zIndex: 60 }}>
              <button
                onClick={handleBulkDelete}
                style={{ width: '52px', height: '52px', borderRadius: '50%', border: 'none', background: 'var(--success-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)', cursor: 'pointer', position: 'relative' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {selectedTxs.length > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#fff', color: 'var(--success-color)', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    {selectedTxs.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setDeleteMode(false); setSelectedTxs([]); }}
                style={{ width: '52px', height: '52px', borderRadius: '50%', border: 'none', background: 'var(--danger-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)', cursor: 'pointer' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          ) : (
            <>
              {isFabExpanded && (
                <div
                  className="fab-backdrop"
                  onClick={() => setIsFabExpanded(false)}
                />
              )}

              {currentPage === 'transactions' && isFabExpanded && (
                <div className="fab-menu" style={{ position: 'fixed', bottom: 'calc(118px + env(safe-area-inset-bottom))', right: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', zIndex: 70, alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="fab-action-pill"
                    onClick={() => { setTxModalMode('form'); setNewTx({ id: '', assetId: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal() }); setIsFabExpanded(false); }}
                    style={{
                      backgroundColor: '#1b2230',
                      border: '1px solid #2a3447',
                      borderRadius: '9999px',
                      padding: '0.75rem 1.25rem',
                      fontWeight: 600,
                      color: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#14332b', color: '#10b981' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5"></line>
                        <polyline points="5 12 12 5 19 12"></polyline>
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Ingreso</span>
                  </button>

                  <button
                    type="button"
                    className="fab-action-pill"
                    onClick={() => { setIsTransferModalOpen(true); setIsFabExpanded(false); }}
                    style={{
                      backgroundColor: '#1b2230',
                      border: '1px solid #2a3447',
                      borderRadius: '9999px',
                      padding: '0.75rem 1.25rem',
                      fontWeight: 600,
                      color: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#172742', color: '#3b82f6' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9"></polyline>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                        <polyline points="7 23 3 19 7 15"></polyline>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Transferencia / Cambio</span>
                  </button>

                  <button
                    type="button"
                    className="fab-action-pill"
                    onClick={() => { setTxModalMode('form'); setNewTx({ id: '', assetId: '', type: 'spent', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal() }); setIsFabExpanded(false); }}
                    style={{
                      backgroundColor: '#1b2230',
                      border: '1px solid #2a3447',
                      borderRadius: '9999px',
                      padding: '0.75rem 1.25rem',
                      fontWeight: 600,
                      color: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#311b22', color: '#ef4444' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <polyline points="19 12 12 19 5 12"></polyline>
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Gasto</span>
                  </button>
                </div>
              )}

              {currentPage === 'obligations' && isFabExpanded && (
                <div className="fab-menu" style={{ position: 'fixed', bottom: 'calc(118px + env(safe-area-inset-bottom))', right: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', zIndex: 70, alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="fab-action-pill"
                    onClick={() => {
                      setNewOb({ id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0 });
                      setIsObModalOpen(true);
                      setIsFabExpanded(false);
                    }}
                    style={{
                      backgroundColor: '#1b2230',
                      border: '1px solid #2a3447',
                      borderRadius: '9999px',
                      padding: '0.75rem 1.25rem',
                      fontWeight: 600,
                      color: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#311b22', color: '#ef4444' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <polyline points="19 12 12 19 5 12"></polyline>
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Lo que debo / Cuentas</span>
                  </button>

                  <button
                    type="button"
                    className="fab-action-pill"
                    onClick={() => {
                      setNewOb({ id: '', type: 'receive', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0 });
                      setIsObModalOpen(true);
                      setIsFabExpanded(false);
                    }}
                    style={{
                      backgroundColor: '#1b2230',
                      border: '1px solid #2a3447',
                      borderRadius: '9999px',
                      padding: '0.75rem 1.25rem',
                      fontWeight: 600,
                      color: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#14332b', color: '#10b981' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5"></line>
                        <polyline points="5 12 12 5 19 12"></polyline>
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Me deben</span>
                  </button>
                </div>
              )}

              {currentPage === 'balances' && isFabExpanded && (
                <div className="fab-menu" style={{ position: 'fixed', bottom: 'calc(118px + env(safe-area-inset-bottom))', right: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', zIndex: 70, alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="fab-action-pill"
                    onClick={() => { setAssetInitialType('fiat'); setIsAssetModalOpen(true); setIsFabExpanded(false); }}
                    style={{
                      backgroundColor: '#1b2230',
                      border: '1px solid #2a3447',
                      borderRadius: '9999px',
                      padding: '0.75rem 1.25rem',
                      fontWeight: 600,
                      color: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#14332b', color: '#10b981' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Cuenta Fiat / Banco</span>
                  </button>

                  <button
                    type="button"
                    className="fab-action-pill"
                    onClick={() => { setAssetInitialType('crypto'); setIsAssetModalOpen(true); setIsFabExpanded(false); }}
                    style={{
                      backgroundColor: '#1b2230',
                      border: '1px solid #2a3447',
                      borderRadius: '9999px',
                      padding: '0.75rem 1.25rem',
                      fontWeight: 600,
                      color: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#312615', color: '#f59e0b' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9"></circle>
                        <path d="M10 8h3a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-3"></path>
                        <path d="M10 12h3.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H10"></path>
                        <path d="M10 6v12"></path>
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Billetera Cripto</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                className="fab"
                style={{
                  transform: isFabExpanded ? 'rotate(45deg)' : 'none',
                  transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: 70
                }}
                onClick={() => setIsFabExpanded(!isFabExpanded)}
              >
                +
              </button>
            </>
          )}
        </>
      )}

      {/* BOTTOM NAV */}
      <nav className="floating-nav">
        <button className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => { setCurrentPage('dashboard'); setIsFabExpanded(false); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
          Inicio
        </button>
        <button className={`nav-item ${currentPage === 'balances' ? 'active' : ''}`} onClick={() => { setCurrentPage('balances'); setIsFabExpanded(false); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            <rect x="14" y="9" width="7" height="6" rx="1.5" />
            <circle cx="17" cy="12" r="0.8" fill="currentColor" />
          </svg>
          Cuentas
        </button>
        <button className={`nav-item ${currentPage === 'transactions' ? 'active' : ''}`} onClick={() => { setCurrentPage('transactions'); setIsFabExpanded(false); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 20V4m0 0L3 8m4-4 4 4" />
            <path d="M17 4v16m0 0 4-4m-4 4-4-4" />
          </svg>
          Movimientos
        </button>
        <button className={`nav-item ${currentPage === 'obligations' ? 'active' : ''}`} onClick={() => { setCurrentPage('obligations'); setIsFabExpanded(false); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2h12a2 2 0 0 1 2 2v17l-3-2-3 2-3-2-3 2-3-2V4a2 2 0 0 1 2-2z" />
            <path d="M12 6.5v8" />
            <path d="M14.2 8.5a1.8 1.3 0 0 0-2.2-1.2h-.8a1.3 1.3 0 0 0 0 2.6h1.6a1.3 1.3 0 0 1 0 2.6H12a1.8 1.3 0 0 1-2.2-1.2" />
          </svg>
          Deudas
        </button>
        <button className={`nav-item ${currentPage === 'calculator' ? 'active' : ''}`} onClick={() => { setCurrentPage('calculator'); setIsFabExpanded(false); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 2.1l4 4-4 4" />
            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
            <path d="M7 21.9l-4-4 4-4" />
            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            <path d="M12 8.5v7" />
            <path d="M13.8 10.2a1.5 1.1 0 0 0-1.8-.9h-.7a1.1 1.1 0 0 0 0 2.2h1.4a1.1 1.1 0 0 1 0 2.2H12a1.5 1.1 0 0 1-1.8-.9" />
          </svg>
          Cambio
        </button>
      </nav>

      {/* MODALS */}
      <AssetModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onAddAsset={handleAddAsset}
        showToast={showToast}
        initialType={assetInitialType}
        rates={rates}
        setRates={setRates}
        binanceSymbols={binanceSymbols}
        knownFiatCurrencies={knownFiatCurrencies}
      />

      <BalanceAdjustModal
        asset={adjustingAsset}
        onClose={() => setAdjustingAsset(null)}
        onAdjustBalance={handleAdjustBalance}
      />

      <TransactionModal
        mode={txModalMode}
        onClose={() => {
          setTxModalMode(null);
          setTxValidationError('');
          setNewTx({ id: '', assetId: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal() });
        }}
        newTx={newTx}
        setNewTx={setNewTx}
        setMode={setTxModalMode}
        assets={assets}
        transactions={transactions}
        validationError={txValidationError}
        setValidationError={setTxValidationError}
        onSubmit={handleAddTransaction}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        newTransfer={newTransfer}
        setNewTransfer={setNewTransfer}
        assets={assets}
        validationError={txValidationError}
        setValidationError={setTxValidationError}
        onSubmit={handleTransferSubmit}
      />

      <ObligationModal
        isOpen={isObModalOpen}
        onClose={() => setIsObModalOpen(false)}
        newOb={newOb}
        setNewOb={setNewOb}
        onSubmit={handleAddObligation}
      />

      <PayObligationModal
        payingOb={payingOb}
        onClose={() => {
          setPayingOb(null);
          setPayData({ assetId: '', actualAmount: '', rateType: 'BCV_USD', customRate: '' });
        }}
        payData={payData}
        setPayData={setPayData}
        assets={assets}
        rates={rates}
        veRates={veRates}
        onSubmit={handlePayObligationSubmit}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        budgets={budgets}
        onSave={updateAllBudgets}
        showToast={showToast}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        auth={auth}
        onSyncNow={handleSyncNow}
        showToast={showToast}
        localState={{ assets, transactions, obligations, budgets }}
        onRequestConfirm={requestConfirm}
        onExportBackup={handleExportBackup}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        hasPin={appLock.hasPin}
        onClearLocalData={() => {
          localStorage.removeItem('personal_assets');
          localStorage.removeItem('personal_transactions');
          localStorage.removeItem('obligations');
          localStorage.removeItem('personal_budgets');
          localStorage.removeItem('finanzas_sync_queue');
          localStorage.removeItem('finanzas_data_owner');
          setAssets([]);
          setTransactions([]);
          setObligations([]);
          setBudgets({});
        }}
      />

      <ConfirmModal
        config={confirmConfig}
        onCancel={() => setConfirmConfig(null)}
      />

      {/* BLOQUEO DE LA APP */}
      <PinLockModal
        isOpen={appLock.isLocked}
        bioEnabled={appLock.bioEnabled}
        bioAvailable={appLock.bioAvailable}
        biometryTitle={appLock.biometryTitle}
        onUnlockWithPin={appLock.unlockWithPin}
        onUnlockWithBiometrics={appLock.unlockWithBiometrics}
      />

      {/* CONFIGURACIÓN DE SEGURIDAD (PIN Y BIOMETRÍA) */}
      <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        hasPin={appLock.hasPin}
        bioEnabled={appLock.bioEnabled}
        bioAvailable={appLock.bioAvailable}
        biometryTitle={appLock.biometryTitle}
        onConfigurePin={appLock.configurePin}
        onUpdatePin={appLock.updatePin}
        onDisablePin={appLock.disablePin}
        onToggleBiometrics={appLock.toggleBiometrics}
      />

      {/* TOAST */}
      <Toast message={toast} />
    </div>
  );
}

export default App;
