import { useState, useEffect, lazy, Suspense } from 'react';
import { useAssets } from './hooks/useAssets';
import { useTransactions } from './hooks/useTransactions';
import { useRates } from './hooks/useRates';
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

import Toast from './components/common/Toast';
import PwaInstallPrompt from './components/common/PwaInstallPrompt';
import AutoUpdater from './components/common/AutoUpdater';
import { formatAmount, getTxUsdEquivalent, translateCategory } from './utils/formatters';
import { generateTestData, TEST_DATA_SEED_KEY } from './utils/testData';
import './App.css';

if (typeof window !== 'undefined' && localStorage.getItem(TEST_DATA_SEED_KEY) !== 'applied') {
  try {
    const initialMock = generateTestData();
    localStorage.setItem('personal_assets', JSON.stringify(initialMock.assets));
    localStorage.setItem('personal_transactions', JSON.stringify(initialMock.transactions));
    localStorage.setItem('obligations', JSON.stringify(initialMock.obligations));
    localStorage.setItem('personal_budgets', JSON.stringify(initialMock.budgets));
    localStorage.removeItem('finanzas_sync_queue');
    localStorage.setItem(TEST_DATA_SEED_KEY, 'applied');
  } catch (e) {
    console.error('Error initializing test seed data:', e);
  }
}

function App() {
  const auth = useAuth();
  const { user } = auth;

  const { assets, setAssets, addAsset, deleteAsset, updateAssetBalance } = useAssets(user);
  const { rates, setRates } = useRates();
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
  const [veRates, setVeRates] = useState(() => {
    try {
      const saved = localStorage.getItem('veRates');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return { bcvUsd: 0, bcvEur: 0, paralelo: 0, custom: 0, lastUpdated: null };
  });
  const [calcBaseAmount, setCalcBaseAmount] = useState('');
  const [calcBaseCurrency, setCalcBaseCurrency] = useState('BS');

  const getAmountInBs = () => {
    if (!calcBaseAmount) return '';
    const num = Number(calcBaseAmount);
    if (isNaN(num)) return '';
    switch (calcBaseCurrency) {
      case 'BS': return num;
      case 'BCV_USD': return num * veRates.bcvUsd;
      case 'PARALELO': return num * veRates.paralelo;
      case 'EUR': return num * veRates.bcvEur;
      case 'CUSTOM': return num * (veRates.custom || 0);
      default: return '';
    }
  };
  const amountBs = getAmountInBs();
  const [isFetchingRates, setIsFetchingRates] = useState(false);

  useEffect(() => {
    localStorage.setItem('veRates', JSON.stringify(veRates));
  }, [veRates]);

  useEffect(() => {
    setIsFabExpanded(false);
  }, [currentPage]);

  const fetchVeRates = async (silent = false) => {
    setIsFetchingRates(true);
    try {
      let bcvUsd = 0;
      let paralelo = 0;
      let bcvEur = 0;

      const [resDolarVzla, resDolarApiUsd, resDolarApiEur] = await Promise.allSettled([
        fetch('https://rates.dolarvzla.com/bcv/current.json'),
        fetch('https://ve.dolarapi.com/v1/dolares'),
        fetch('https://ve.dolarapi.com/v1/euros/oficial')
      ]);

      if (resDolarVzla.status === 'fulfilled' && resDolarVzla.value.ok) {
        const dataVzla = await resDolarVzla.value.json();
        if (dataVzla?.current?.usd) {
          bcvUsd = Number(dataVzla.current.usd);
        }
      }

      if (resDolarApiUsd.status === 'fulfilled' && resDolarApiUsd.value.ok) {
        const dataUsd = await resDolarApiUsd.value.json();
        if (!bcvUsd) {
          bcvUsd = dataUsd.find(d => d.fuente === 'oficial')?.promedio || veRates.bcvUsd;
        }
        paralelo = dataUsd.find(d => d.fuente === 'paralelo')?.promedio || veRates.paralelo;
      }

      if (resDolarApiEur.status === 'fulfilled' && resDolarApiEur.value.ok) {
        const dataEur = await resDolarApiEur.value.json();
        bcvEur = dataEur.promedio || veRates.bcvEur;
      }

      if (!bcvUsd) bcvUsd = veRates.bcvUsd;
      if (!paralelo) paralelo = veRates.paralelo;
      if (!bcvEur) bcvEur = veRates.bcvEur;

      setVeRates(prev => ({
        ...prev,
        bcvUsd,
        paralelo,
        bcvEur,
        lastUpdated: new Date().toISOString()
      }));

      // Mantener sincronizada la tasa maestra en toda la app
      if (bcvUsd > 0 && setRates) {
        setRates(prev => ({ ...prev, VES: 1 / bcvUsd }));
      }
    } catch (err) {
      console.error("Error fetching VE rates:", err);
      if (!silent) {
        showToast("Error al actualizar las tasas. Verifica tu conexión.", "error");
      }
    } finally {
      setIsFetchingRates(false);
    }
  };

  // Sincronizar automáticamente la tasa BCV de useRates hacia la calculadora
  useEffect(() => {
    if (rates?.VES && rates.VES > 0) {
      const currentBcv = Number((1 / rates.VES).toFixed(4));
      setVeRates(prev => {
        if (!prev.bcvUsd || Math.abs(prev.bcvUsd - currentBcv) > 0.01) {
          return { ...prev, bcvUsd: currentBcv, lastUpdated: new Date().toISOString() };
        }
        return prev;
      });
    }
  }, [rates?.VES]);

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
    id: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: new Date().toISOString().split('T')[0]
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
      syncService.fetchRemoteAll(user.id).then(remote => {
        if (remote) {
          if (remote.assets && remote.assets.length > 0) setAssets(remote.assets);
          if (remote.transactions && remote.transactions.length > 0) setTransactions(remote.transactions);
          if (remote.obligations && remote.obligations.length > 0) setObligations(remote.obligations);
          if (remote.budgets && Object.keys(remote.budgets).length > 0) setBudgets(remote.budgets);
        }
      });
    }
  }, [user?.id, setAssets, setTransactions, setObligations, setBudgets]);

  const handleSyncNow = async () => {
    if (!user?.id) {
      setIsAuthModalOpen(true);
      return;
    }
    showToast('Sincronizando con la nube...');
    await syncService.flushQueue();
    const remote = await syncService.fetchRemoteAll(user.id);
    if (remote) {
      if (remote.assets && remote.assets.length > 0) setAssets(remote.assets);
      if (remote.transactions && remote.transactions.length > 0) setTransactions(remote.transactions);
      if (remote.obligations && remote.obligations.length > 0) setObligations(remote.obligations);
      if (remote.budgets && Object.keys(remote.budgets).length > 0) setBudgets(remote.budgets);
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
    id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: new Date().toISOString().split('T')[0], totalInstallments: '', paidInstallments: 0
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

  const handleAdjustBalance = (name, location, delta) => {
    updateAssetBalance(name, location, delta);
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
    if (!newOb.title || !newOb.amount || !newOb.currency || !newOb.category) {
      showToast('Completa todos los campos requeridos', 'error');
      return;
    }

    const finalInstallments = newOb.frequency === 'one-time' ? '1' : newOb.totalInstallments;

    if (newOb.id) {
      updateObligation(newOb.id, { ...newOb, amount: Number(newOb.amount), totalInstallments: finalInstallments });
    } else {
      addObligation({ ...newOb, amount: Number(newOb.amount), totalInstallments: finalInstallments });
    }
    setIsObModalOpen(false);
    setNewOb({ id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: new Date().toISOString().split('T')[0], totalInstallments: '', paidInstallments: 0, dateCreated: '' });
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

  const handlePayObligationSubmit = (e) => {
    e.preventDefault();
    if (!payingOb || !payData.assetId || !payData.actualAmount) return;

    const asset = assets.find(a => a.id === payData.assetId);
    if (!asset) return;

    const actualAmountNum = Number(payData.actualAmount);
    if (payingOb.type === 'pay' && actualAmountNum > Number(asset.amount)) {
      showToast('Saldo insuficiente en la cuenta seleccionada', 'error');
      return;
    }

    const payCurr = asset.name.toUpperCase();
    const payRateSnapshot = rates[payCurr] ?? (payCurr === 'USD' || payCurr === 'USDT' ? 1 : 0);
    const payUsdEquivalent = actualAmountNum * payRateSnapshot;

    const tx = {
      type: payingOb.type === 'pay' ? 'spent' : 'income',
      currency: asset.name,
      amount: actualAmountNum,
      origin: asset.location,
      category: payingOb.category,
      subcategory: payingOb.title,
      rateSnapshot: payRateSnapshot,
      usdEquivalent: payUsdEquivalent
    };
    addTransaction(tx);

    const delta = payingOb.type === 'pay' ? -actualAmountNum : actualAmountNum;
    updateAssetBalance(asset.name, asset.location, delta);

    const nextPaidCount = (Number(payingOb.paidInstallments) || 0) + 1;
    const totalInst = Number(payingOb.totalInstallments) || 0;
    const isStillPending = !totalInst || nextPaidCount < totalInst;

    let nextDueDate = payingOb.dueDate;
    if (isStillPending && payingOb.dueDate && payingOb.frequency !== 'one-time') {
      const baseDate = new Date(payingOb.dueDate + 'T12:00:00');
      if (!isNaN(baseDate.getTime())) {
        if (payingOb.frequency === 'weekly') baseDate.setDate(baseDate.getDate() + 7);
        else if (payingOb.frequency === 'bi-weekly') baseDate.setDate(baseDate.getDate() + 15);
        else if (payingOb.frequency === 'monthly') baseDate.setMonth(baseDate.getMonth() + 1);
        nextDueDate = baseDate.toISOString().split('T')[0];
      }
    }

    updateObligation(payingOb.id, {
      paidInstallments: nextPaidCount,
      dueDate: nextDueDate
    });

    showToast('Pago registrado exitosamente');
    setPayingOb(null);
    setPayData({ assetId: '', actualAmount: '', rateType: 'BCV_USD', customRate: '' });
  };

  // Transaction Actions
  const handleEditTransaction = (tx) => {
    setNewTx({
      id: tx.id,
      type: tx.type,
      currency: tx.currency,
      amount: tx.amount.toString(),
      origin: tx.origin,
      category: tx.category || '',
      subcategory: tx.subcategory || '',
      date: tx.date ? (tx.date.includes('T') ? tx.date.split('T')[0] : tx.date) : new Date().toISOString().split('T')[0]
    });
    setTxValidationError('');
    setTxModalMode('form');
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    setTxValidationError('');
    if (!newTx.currency || !newTx.amount || !newTx.origin) return;

    const amountNum = Number(newTx.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTxValidationError('El monto debe ser mayor a 0');
      return;
    }

    const txDate = newTx.date
      ? (newTx.date.includes('T') ? newTx.date : new Date(newTx.date + 'T12:00:00').toISOString())
      : new Date().toISOString();

    if (newTx.id) {
      // EDIT EXISTING TRANSACTION
      const oldTx = transactions.find(t => t.id === newTx.id);
      if (!oldTx) return;

      const oldAmount = Number(oldTx.amount) || 0;
      const isSameAccount = oldTx.currency.toUpperCase() === newTx.currency.toUpperCase() && oldTx.origin === newTx.origin;

      if (newTx.type === 'spent') {
        const targetAsset = assets.find(a => a.name === newTx.currency.toUpperCase() && a.location === newTx.origin);
        const currentBalance = targetAsset ? Number(targetAsset.amount) : 0;
        const maxAvailable = isSameAccount
          ? (oldTx.type === 'spent' ? currentBalance + oldAmount : currentBalance - oldAmount)
          : currentBalance;
        if (amountNum > maxAvailable) {
          setTxValidationError(`Saldo insuficiente. Tienes ${currentBalance} ${newTx.currency.toUpperCase()} en ${newTx.origin}.`);
          return;
        }
      }

      // Delta calculation and account balance updates
      if (isSameAccount) {
        let delta = 0;
        if (oldTx.type === 'income' && newTx.type === 'income') {
          delta = amountNum - oldAmount;
        } else if (oldTx.type === 'spent' && newTx.type === 'spent') {
          delta = oldAmount - amountNum;
        } else if (oldTx.type === 'income' && newTx.type === 'spent') {
          delta = -oldAmount - amountNum;
        } else {
          delta = oldAmount + amountNum;
        }
        updateAssetBalance(newTx.currency.toUpperCase(), newTx.origin, delta);
      } else {
        // Revert old account balance
        const revertDelta = oldTx.type === 'income' ? -oldAmount : oldAmount;
        updateAssetBalance(oldTx.currency.toUpperCase(), oldTx.origin, revertDelta);

        // Apply to new account balance
        const newDelta = newTx.type === 'income' ? amountNum : -amountNum;
        updateAssetBalance(newTx.currency.toUpperCase(), newTx.origin, newDelta);
      }

      // Rates snapshot and USD equivalent
      const txCurr = newTx.currency.toUpperCase();
      const rateSnapshot = (oldTx.currency.toUpperCase() === txCurr && oldTx.rateSnapshot != null && Number(oldTx.rateSnapshot) > 0)
        ? Number(oldTx.rateSnapshot)
        : (rates[txCurr] ?? (txCurr === 'USD' || txCurr === 'USDT' ? 1 : 0));
      const usdEquivalent = amountNum * rateSnapshot;

      updateTransaction(newTx.id, {
        type: newTx.type,
        currency: newTx.currency,
        amount: amountNum,
        origin: newTx.origin,
        category: newTx.category,
        subcategory: newTx.subcategory,
        date: txDate,
        rateSnapshot,
        usdEquivalent
      });

      setTxModalMode(null);
      setTxValidationError('');
      setNewTx({ id: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: new Date().toISOString().split('T')[0] });
      showToast('Transacción actualizada');
      return;
    }

    // NEW TRANSACTION
    if (newTx.type === 'spent') {
      const asset = assets.find(a => a.name === newTx.currency.toUpperCase() && a.location === newTx.origin);
      const currentBalance = asset ? Number(asset.amount) : 0;
      if (amountNum > currentBalance) {
        setTxValidationError(`Saldo insuficiente. Tienes ${currentBalance} ${newTx.currency.toUpperCase()} en ${newTx.origin}.`);
        return;
      }
    }

    const txCurr = newTx.currency.toUpperCase();
    const txRateSnapshot = rates[txCurr] ?? (txCurr === 'USD' || txCurr === 'USDT' ? 1 : 0);
    const txUsdEquivalent = amountNum * txRateSnapshot;

    addTransaction({
      ...newTx,
      amount: amountNum,
      date: txDate,
      rateSnapshot: txRateSnapshot,
      usdEquivalent: txUsdEquivalent
    });

    // Update linked balance
    const delta = newTx.type === 'income' ? amountNum : -amountNum;
    updateAssetBalance(newTx.currency.toUpperCase(), newTx.origin, delta);

    setTxModalMode(null);
    setTxValidationError('');
    setNewTx({ id: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: new Date().toISOString().split('T')[0] });
    showToast('Movimiento registrado');
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    setTxValidationError('');
    if (!newTransfer.sourceAssetId || !newTransfer.destAssetId || !newTransfer.amountDeducted || !newTransfer.amountReceived) return;

    const sourceAsset = assets.find(a => a.id === newTransfer.sourceAssetId);
    const destAsset = assets.find(a => a.id === newTransfer.destAssetId);
    if (!sourceAsset || !destAsset) return;

    if (sourceAsset.id === destAsset.id) {
      setTxValidationError('Las cuentas de origen y destino deben ser distintas.');
      return;
    }

    const amountDeductedNum = Number(newTransfer.amountDeducted);
    const amountReceivedNum = Number(newTransfer.amountReceived);
    const commissionNum = newTransfer.hasCommission ? (Number(newTransfer.commissionAmount) || 0) : 0;
    const totalDeduction = amountDeductedNum + commissionNum;

    if (totalDeduction > Number(sourceAsset.amount)) {
      setTxValidationError(`Saldo insuficiente. Tienes ${formatAmount(sourceAsset.amount, sourceAsset.name)} ${sourceAsset.name} en ${sourceAsset.location}, pero necesitas ${formatAmount(totalDeduction, sourceAsset.name)} (incluyendo comisión).`);
      return;
    }

    const srcCurr = sourceAsset.name.toUpperCase();
    const srcRateSnapshot = rates[srcCurr] ?? (srcCurr === 'USD' || srcCurr === 'USDT' ? 1 : 0);
    const transferUsdEquivalent = amountDeductedNum * srcRateSnapshot;
    const transferId = crypto.randomUUID();

    addTransaction({
      id: transferId,
      type: 'transfer',
      currency: sourceAsset.name,
      amount: amountDeductedNum,
      origin: sourceAsset.location,
      destCurrency: destAsset.name,
      destAmount: amountReceivedNum,
      destOrigin: destAsset.location,
      commission: commissionNum,
      category: 'Transfer',
      subcategory: `Hacia ${destAsset.location}`,
      rateSnapshot: srcRateSnapshot,
      usdEquivalent: transferUsdEquivalent
    });

    if (commissionNum > 0) {
      addTransaction({
        id: crypto.randomUUID(),
        parentTransferId: transferId,
        type: 'spent',
        currency: sourceAsset.name,
        amount: commissionNum,
        origin: sourceAsset.location,
        category: 'Comisiones',
        subcategory: 'Comisión por transferencia',
        rateSnapshot: srcRateSnapshot,
        usdEquivalent: commissionNum * srcRateSnapshot
      });
    }

    updateAssetBalance(sourceAsset.name, sourceAsset.location, -totalDeduction);
    updateAssetBalance(destAsset.name, destAsset.location, amountReceivedNum);

    setIsTransferModalOpen(false);
    setTxValidationError('');
    setNewTransfer({ sourceAssetId: '', amountDeducted: '', destAssetId: '', amountReceived: '', hasCommission: false, commissionAmount: '' });
    showToast('Transferencia completada');
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
        const selectedIds = new Set(selectedTxs.map(t => t.id));
        const processedIds = new Set();

        selectedTxs.forEach(tx => {
          if (processedIds.has(tx.id)) return;
          processedIds.add(tx.id);

          if (tx.type === 'transfer') {
            updateAssetBalance(tx.currency.toUpperCase(), tx.origin, Number(tx.amount));
            if (tx.destCurrency && tx.destOrigin && tx.destAmount) {
              updateAssetBalance(tx.destCurrency.toUpperCase(), tx.destOrigin, -Number(tx.destAmount));
            }
            // Si la transferencia tenía una comisión vinculada, revertirla y eliminarla automáticamente
            const linkedCommissionTx = transactions.find(t => t.parentTransferId === tx.id);
            if (linkedCommissionTx && !processedIds.has(linkedCommissionTx.id)) {
              processedIds.add(linkedCommissionTx.id);
              updateAssetBalance(linkedCommissionTx.currency.toUpperCase(), linkedCommissionTx.origin, Number(linkedCommissionTx.amount));
              deleteTransaction(linkedCommissionTx.id);
            }
          } else {
            // Si es una comisión vinculada cuya transferencia padre ya fue seleccionada, se procesa con el padre
            if (tx.parentTransferId && selectedIds.has(tx.parentTransferId)) {
              deleteTransaction(tx.id);
              return;
            }
            const reverseDelta = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount);
            updateAssetBalance(tx.currency.toUpperCase(), tx.origin, reverseDelta);
          }
          deleteTransaction(tx.id);
        });

        setSelectedTxs([]);
        setDeleteMode(false);
        showToast('Eliminado con éxito');
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
    return total + (Number(asset.amount) * (rates[asset.name] || 0));
  }, 0);

  const accountTotalsUsd = assets.reduce((acc, asset) => {
    if (!acc[asset.location]) acc[asset.location] = 0;
    acc[asset.location] += Number(asset.amount) * (rates[asset.name] || 0);
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
    : allSpents.filter(t => new Date(t.date) >= filterDate);

  const allIncomes = transactions.filter(t => t.type === 'income');
  const filteredIncomes = timeFrame === 'all'
    ? allIncomes
    : allIncomes.filter(t => new Date(t.date) >= filterDate);

  const totalSpentUsd = filteredSpents.reduce((acc, t) => acc + getTxUsdEquivalent(t, rates), 0);
  const totalIncomeUsd = filteredIncomes.reduce((acc, t) => acc + getTxUsdEquivalent(t, rates), 0);

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
                assets={assets}
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
                auth={auth}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
                  setPayData({ assetId: '', actualAmount: ob.amount.toString(), rateType: 'BCV_USD', customRate: '' });
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
                setVeRates={setVeRates}
                fetchVeRates={fetchVeRates}
                isFetchingRates={isFetchingRates}
                assets={assets}
                transactions={transactions}
                obligations={obligations}
                budgets={budgets}
                showToast={showToast}
                onInjectTestData={injectAdvancedTestData}
                auth={auth}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onSyncNow={handleSyncNow}
                onRequestConfirm={requestConfirm}
                onRestoreBackup={(data) => {
                  setAssets(data.assets);
                  setTransactions(data.transactions);
                  setObligations(data.obligations);
                  if (data.veRates) setVeRates(data.veRates);
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
                    onClick={() => { setTxModalMode('form'); setNewTx({ id: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: new Date().toISOString().split('T')[0] }); setIsFabExpanded(false); }}
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
                    onClick={() => { setTxModalMode('form'); setNewTx({ id: '', type: 'spent', currency: '', amount: '', origin: '', category: '', subcategory: '', date: new Date().toISOString().split('T')[0] }); setIsFabExpanded(false); }}
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
                      setNewOb({ id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: new Date().toISOString().split('T')[0], totalInstallments: '', paidInstallments: 0 });
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
                      setNewOb({ id: '', type: 'receive', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: new Date().toISOString().split('T')[0], totalInstallments: '', paidInstallments: 0 });
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
      />

      <BalanceAdjustModal
        asset={adjustingAsset}
        onClose={() => setAdjustingAsset(null)}
        onAdjustBalance={handleAdjustBalance}
        showToast={showToast}
      />

      <TransactionModal
        mode={txModalMode}
        onClose={() => {
          setTxModalMode(null);
          setTxValidationError('');
          setNewTx({ id: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: new Date().toISOString().split('T')[0] });
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
      />

      <ConfirmModal
        config={confirmConfig}
        onCancel={() => setConfirmConfig(null)}
      />

      {/* TOAST */}
      <Toast message={toast} />
    </div>
  );
}

export default App;
