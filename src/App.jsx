import { useState, useEffect, lazy, Suspense } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';

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
import { todayLocal, toLocalDateString, parseLocalDate } from './utils/dates';
import { add, convert, round, parseAmount } from './domain/money';
import { formatAmount, getTxUsdEquivalent, translateCategory } from './utils/formatters';
import { generateTestData, TEST_DATA_SEED_KEY } from './utils/testData';
import './App.css';

function AppContent({ showToast, confirmConfig, setConfirmConfig, requestConfirm }) {
  const finance = useFinance();
  const {
    auth,
    assets,
    transactions,
    obligations,
    budgets,
    rates,
    ratesDetails,
    veRates,
    binanceSymbols,
    knownFiatCurrencies,
    isFetchingRates,
    setCustomRate,
    refreshRates,
    addAsset,
    deleteAsset,
    addObligation,
    deleteObligation,
    updateObligation,
    updateAllBudgets,
    setAssets,
    setTransactions,
    setObligations,
    setBudgets,
    setRates,
    saveTransaction,
    transferFunds,
    payObligation: runPayObligation,
    bulkDeleteTransactions,
    adjustAssetBalance,
    syncNow,
    exportBackup,
    clearLocalData
  } = finance;

  // Navegación
  const [currentPage, setCurrentPage] = useState('balances');
  const [timeFrame, setTimeFrame] = useState('monthly');
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [txFilter, setTxFilter] = useState('all');

  // Calculadora
  const [calcBaseAmount, setCalcBaseAmount] = useState('');
  const [calcBaseCurrency, setCalcBaseCurrency] = useState('BS');

  const amountBs = (() => {
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
  })();

  // Modales
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetInitialType, setAssetInitialType] = useState('fiat');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [adjustingAsset, setAdjustingAsset] = useState(null);

  const [txModalMode, setTxModalMode] = useState(null);
  const [txValidationError, setTxValidationError] = useState('');
  const [newTx, setNewTx] = useState({
    id: '', assetId: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal()
  });
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedTxs, setSelectedTxs] = useState([]);
  const [flippedTxId, setFlippedTxId] = useState(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    sourceAssetId: '', amountDeducted: '', destAssetId: '', amountReceived: '', hasCommission: false, commissionAmount: ''
  });

  const [isObModalOpen, setIsObModalOpen] = useState(false);
  const [newOb, setNewOb] = useState({
    id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0
  });
  const [payingOb, setPayingOb] = useState(null);
  const [payData, setPayData] = useState({ assetId: '', actualAmount: '', rateType: 'BCV_USD', customRate: '' });
  const [flippedObId, setFlippedObId] = useState(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);

  const appLock = useAppLock({ showToast });

  useEffect(() => {
    setIsFabExpanded(false);
  }, [currentPage]);

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

  // Manejadores
  const handleAddAsset = (assetData) => {
    addAsset(assetData);
  };

  const handleAdjustBalance = (asset, delta, newAmount) => {
    if (!asset || delta === 0) return;
    adjustAssetBalance(asset, newAmount, delta);
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
    setNewOb({
      id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0
    });
    showToast(newOb.id ? 'Obligación actualizada' : 'Obligación creada');
  };

  const handleDeleteObligation = (id) => {
    requestConfirm({
      title: 'Eliminar obligación',
      message: '¿Estás seguro de que quieres eliminar este compromiso?',
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

    const res = runPayObligation(payingOb, payData);
    if (res.success) {
      setPayingOb(null);
      setPayData({ assetId: '', actualAmount: '', rateType: 'BCV_USD', customRate: '' });
    }
  };

  const handleEditTransaction = (tx) => {
    const targetAsset = (tx.assetId && assets.find(a => a.id === tx.assetId)) ||
                        assets.find(a => (a.name || '').toUpperCase() === (tx.currency || '').toUpperCase() && a.location === tx.origin);
    setNewTx({
      id: tx.id,
      assetId: targetAsset ? targetAsset.id : (tx.assetId || ''),
      type: tx.type,
      currency: tx.currency,
      amount: tx.amount,
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

    const res = saveTransaction(newTx);
    if (res.success) {
      setTxModalMode(null);
      setTxValidationError('');
      setNewTx({ id: '', assetId: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal() });
    } else {
      setTxValidationError(res.error);
    }
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    setTxValidationError('');

    const res = transferFunds(newTransfer);
    if (res.success) {
      setIsTransferModalOpen(false);
      setTxValidationError('');
      setNewTransfer({ sourceAssetId: '', amountDeducted: '', destAssetId: '', amountReceived: '', hasCommission: false, commissionAmount: '' });
    } else {
      setTxValidationError(res.error);
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
        bulkDeleteTransactions(selectedTxs);
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

  // Resumen y cálculos
  const grandTotalUsd = assets.reduce((total, asset) => {
    const sym = (asset.name || 'USD').toUpperCase();
    return add(total, convert(asset.amount, sym, 'USD', rates));
  }, 0);

  const accountTotalsUsd = assets.reduce((acc, asset) => {
    if (!acc[asset.location]) acc[asset.location] = 0;
    const sym = (asset.name || 'USD').toUpperCase();
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

  // Filtros de fecha para Analytics
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
        clearLocalData();
        showToast('Todos los datos fueron eliminados. App lista desde cero.');
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
                onExportBackup={exportBackup}
                onNavigateToCalculator={() => setCurrentPage('calculator')}
              />
            )}

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
                onSyncNow={syncNow}
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
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Deuda por pagar</span>
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
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Cobro pendiente</span>
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
                        <line x1="12" y1="2" x2="12" y2="22"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Cuenta Bancaria / Efectivo</span>
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#172742', color: '#3b82f6' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2-5.155-.909m5.155.91-.348 1.97M7.076 11.153l-3.94-.694m3.94.694 1.216-6.894m-1.216 6.894L5.86 18.047m1.216-6.894L4.86 6.279"></path>
                      </svg>
                    </span>
                    <span style={{ color: '#f1f5f9' }}>Criptomoneda / Token</span>
                  </button>
                </div>
              )}

              <button
                className={`fab-btn ${isFabExpanded ? 'expanded' : ''}`}
                onClick={() => setIsFabExpanded(!isFabExpanded)}
                aria-label="Acciones rápidas"
                style={{
                  position: 'fixed',
                  bottom: 'calc(60px + env(safe-area-inset-bottom))',
                  right: '1.25rem',
                  zIndex: 80
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.25s ease', transform: isFabExpanded ? 'rotate(45deg)' : 'none' }}>
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </>
          )}
        </>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="bottom-nav">
        <button
          className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentPage('dashboard')}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
          Inicio
        </button>

        <button
          className={`nav-btn ${currentPage === 'balances' ? 'active' : ''}`}
          onClick={() => setCurrentPage('balances')}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Cuentas
        </button>

        <button
          className={`nav-btn ${currentPage === 'transactions' ? 'active' : ''}`}
          onClick={() => setCurrentPage('transactions')}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Movimientos
        </button>

        <button
          className={`nav-btn ${currentPage === 'obligations' ? 'active' : ''}`}
          onClick={() => setCurrentPage('obligations')}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Deudas
        </button>

        <button
          className={`nav-btn ${currentPage === 'calculator' ? 'active' : ''}`}
          onClick={() => setCurrentPage('calculator')}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
        onSyncNow={syncNow}
        showToast={showToast}
        localState={{ assets, transactions, obligations, budgets }}
        onRequestConfirm={requestConfirm}
        onExportBackup={exportBackup}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        hasPin={appLock.hasPin}
        onClearLocalData={clearLocalData}
      />

      <ConfirmModal
        config={confirmConfig}
        onCancel={() => setConfirmConfig(null)}
      />

      <PinLockModal
        isOpen={appLock.isLocked}
        bioEnabled={appLock.bioEnabled}
        bioAvailable={appLock.bioAvailable}
        biometryTitle={appLock.biometryTitle}
        onUnlockWithPin={appLock.unlockWithPin}
        onUnlockWithBiometrics={appLock.unlockWithBiometrics}
      />

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
      <Toast message={showToast ? undefined : null} />
    </div>
  );
}

export default function App() {
  const [toast, setToast] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast(typeof msg === 'string' && type !== 'success' ? { message: msg, type } : msg);
    setTimeout(() => setToast(null), 3000);
  };

  const requestConfirm = (options) => {
    setConfirmConfig({ isOpen: true, ...options });
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

  return (
    <FinanceProvider showToast={showToast} requestConfirm={requestConfirm}>
      <AppContent
        showToast={showToast}
        confirmConfig={confirmConfig}
        setConfirmConfig={setConfirmConfig}
        requestConfirm={requestConfirm}
      />
      <Toast message={toast} />
    </FinanceProvider>
  );
}
