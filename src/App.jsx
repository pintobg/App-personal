import { useState, useEffect, useRef, useCallback } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';

import Toast from './components/common/Toast';
import PwaInstallPrompt from './components/common/PwaInstallPrompt';
import AutoUpdater from './components/common/AutoUpdater';
import FabOverlay from './components/common/FabOverlay';
import BottomNav from './components/common/BottomNav';
import AppModals from './components/common/AppModals';
import PageRouter from './components/views/PageRouter';
import { useAppModalsState } from './hooks/useAppModalsState';
import { useFinanceMetrics } from './hooks/useFinanceMetrics';
import { useAppLock } from './hooks/useAppLock';
import { useAppGesturesAndBack } from './hooks/useAppGesturesAndBack';
import { generateTestData, TEST_DATA_SEED_KEY } from './utils/testData';
import './App.css';

const MAIN_TABS = ['dashboard', 'transactions', 'balances', 'planning', 'rates'];

function normalizePageName(page) {
  if (!page) return 'dashboard';
  if (page === 'debts' || page === 'obligations') return 'planning';
  if (page === 'calculator') return 'rates';
  return page;
}

function AppContent({ showToast, confirmConfig, setConfirmConfig, requestConfirm }) {
  const finance = useFinance();
  const {
    auth,
    assets,
    transactions,
    obligations,
    budgets,
    goals,
    categories,
    rates,
    ratesDetails,
    veRates,
    referenceRate,
    setReferenceRate,
    rateHistory,
    refreshRateHistory,
    binanceSymbols,
    knownFiatCurrencies,
    isFetchingRates,
    setCustomRate,
    refreshRates,
    updateAllBudgets,
    setAssets,
    setTransactions,
    setObligations,
    setBudgets,
    setRates,
    syncNow,
    exportBackup,
    clearLocalData
  } = finance;

  // Navegación y filtros (Inicio por defecto)
  const [currentPage, setCurrentPageState] = useState(() => {
    try {
      const saved = localStorage.getItem('active_page') || localStorage.getItem('last_tab') || localStorage.getItem('currentPage');
      return normalizePageName(saved);
    } catch {
      return 'dashboard';
    }
  });
  const previousPageRef = useRef('dashboard');
  const [planningSubTab, setPlanningSubTab] = useState('presupuestos');
  const [selectedShoppingListId, setSelectedShoppingListId] = useState(null);

  const setCurrentPage = useCallback((page) => {
    const normalized = normalizePageName(page);
    setCurrentPageState(prev => {
      if (prev !== normalized) {
        previousPageRef.current = prev;
      }
      return normalized;
    });
    try {
      localStorage.setItem('active_page', normalized);
    } catch {
      // Ignore storage errors
    }
  }, []);
  const [timeFrame, setTimeFrame] = useState('monthly');
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [txFilter, setTxFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedFilters, setSelectedFilters] = useState([]);

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

  const modalState = useAppModalsState(requestConfirm, showToast);
  const appLock = useAppLock({ showToast });

  const metrics = useFinanceMetrics({
    assets,
    transactions,
    obligations,
    rates,
    timeFrame,
    activeFilter,
    selectedFilters,
    categories
  });

  useEffect(() => {
    modalState.setIsFabExpanded(false);
  }, [currentPage]);

  const isAnyModalActive = Boolean(
    modalState.isAssetModalOpen ||
    modalState.adjustingAsset ||
    modalState.txModalMode ||
    modalState.isTransferModalOpen ||
    modalState.isObModalOpen ||
    modalState.payingOb ||
    modalState.isBudgetModalOpen ||
    modalState.isAuthModalOpen ||
    modalState.isSecurityModalOpen ||
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

  const { handleTouchStart, handleTouchEnd } = useAppGesturesAndBack({
    isAnyModalActive,
    confirmConfig,
    setConfirmConfig,
    modalState,
    currentPage,
    setCurrentPage,
    previousPageRef,
    planningSubTab,
    setPlanningSubTab,
    selectedShoppingListId,
    setSelectedShoppingListId,
    mainTabs: MAIN_TABS
  });

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
    <div
      className="app-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <PwaInstallPrompt />
      <AutoUpdater showToast={showToast} />

      <PageRouter
        currentPage={currentPage}
        onAddAsset={() => { modalState.setAssetInitialType('fiat'); modalState.setIsAssetModalOpen(true); }}
        setCurrentPage={setCurrentPage}
        isBalanceHidden={isBalanceHidden}
        setIsBalanceHidden={setIsBalanceHidden}
        grandTotalUsd={metrics.grandTotalUsd}
        alternateGrandTotalUsd={metrics.alternateGrandTotalUsd}
        referenceRate={referenceRate}
        setReferenceRate={setReferenceRate}
        rateHistory={rateHistory}
        refreshRateHistory={refreshRateHistory}
        rates={rates}
        ratesDetails={ratesDetails}
        totalIncomeUsd={metrics.totalIncomeUsd}
        totalSpentUsd={metrics.totalSpentUsd}
        timeFrame={timeFrame}
        setTimeFrame={setTimeFrame}
        pieData={metrics.pieData}
        nextPayments={metrics.nextPayments}
        nextCollections={metrics.nextCollections}
        budgets={budgets}
        transactions={transactions}
        assets={assets}
        setIsBudgetModalOpen={modalState.setIsBudgetModalOpen}
        auth={auth}
        setIsAuthModalOpen={modalState.setIsAuthModalOpen}
        setTxFilter={setTxFilter}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        assetsByLocation={metrics.assetsByLocation}
        accountTotalsUsd={metrics.accountTotalsUsd}
        uniqueAssetNames={metrics.uniqueAssetNames}
        goals={goals}
        onOpenGoalModal={(g) => {
          modalState.setEditingGoal(g || null);
          modalState.setIsGoalModalOpen(true);
        }}
        onDeleteGoal={modalState.handleDeleteGoal}
        deleteMode={modalState.deleteMode}
        setDeleteMode={modalState.setDeleteMode}
        setAdjustingAsset={modalState.setAdjustingAsset}
        handleDeleteAsset={modalState.handleDeleteAsset}
        handleAdjustBalance={modalState.handleAdjustBalance}
        exportBackup={exportBackup}
        actionObId={modalState.actionObId}
        setActionObId={modalState.setActionObId}
        setNewOb={modalState.setNewOb}
        setIsObModalOpen={modalState.setIsObModalOpen}
        setPayingOb={modalState.setPayingOb}
        setPayData={modalState.setPayData}
        handleDeleteObligation={modalState.handleDeleteObligation}
        calcBaseCurrency={calcBaseCurrency}
        setCalcBaseCurrency={setCalcBaseCurrency}
        calcBaseAmount={calcBaseAmount}
        setCalcBaseAmount={setCalcBaseAmount}
        amountBs={amountBs}
        veRates={veRates}
        setCustomRate={setCustomRate}
        refreshRates={refreshRates}
        isFetchingRates={isFetchingRates}
        obligations={obligations}
        showToast={showToast}
        injectAdvancedTestData={injectAdvancedTestData}
        clearAllAppData={clearAllAppData}
        syncNow={syncNow}
        requestConfirm={requestConfirm}
        setAssets={setAssets}
        setTransactions={setTransactions}
        setObligations={setObligations}
        setBudgets={setBudgets}
        txFilter={txFilter}
        selectedTxs={modalState.selectedTxs}
        toggleSelectTx={modalState.toggleSelectTx}
        actionTxId={modalState.actionTxId}
        setActionTxId={modalState.setActionTxId}
        handleEditTransaction={modalState.handleEditTransaction}
        handleRepeatTransaction={modalState.handleRepeatTransaction}
        onOpenReportsModal={() => modalState.setIsReportsModalOpen(true)}
        getCategoryName={finance.getCategoryName}
        getSubcategoryName={finance.getSubcategoryName}
        planningSubTab={planningSubTab}
        setPlanningSubTab={setPlanningSubTab}
        selectedShoppingListId={selectedShoppingListId}
        setSelectedShoppingListId={setSelectedShoppingListId}
        onRegisterShoppingPurchase={modalState.handleRegisterShoppingPurchase}
        appLock={appLock}
        onOpenSecurityModal={() => modalState.setIsSecurityModalOpen(true)}
      />

      <FabOverlay
        currentPage={currentPage}
        showToast={showToast}
        deleteMode={modalState.deleteMode}
        selectedTxs={modalState.selectedTxs}
        handleBulkDelete={modalState.handleBulkDelete}
        setDeleteMode={modalState.setDeleteMode}
        setSelectedTxs={modalState.setSelectedTxs}
        isFabExpanded={modalState.isFabExpanded}
        setIsFabExpanded={modalState.setIsFabExpanded}
        setTxModalMode={modalState.setTxModalMode}
        setNewTx={modalState.setNewTx}
        setIsTransferModalOpen={modalState.setIsTransferModalOpen}
        setNewOb={modalState.setNewOb}
        setIsObModalOpen={modalState.setIsObModalOpen}
        setAssetInitialType={modalState.setAssetInitialType}
        setIsAssetModalOpen={modalState.setIsAssetModalOpen}
        onAddShoppingItem={() => {
          setCurrentPage('planning');
          setPlanningSubTab('compras');
          const active = (finance.shoppingLists || []).filter(l => l.status !== 'done' && !l.deleted_at);
          if (active.length === 1) {
            setSelectedShoppingListId(active[0].id);
          } else {
            setSelectedShoppingListId(null);
          }
        }}
      />

      <BottomNav
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
      />

      <AppModals
        isAssetModalOpen={modalState.isAssetModalOpen}
        setIsAssetModalOpen={modalState.setIsAssetModalOpen}
        handleAddAsset={modalState.handleAddAsset}
        showToast={showToast}
        assetInitialType={modalState.assetInitialType}
        rates={rates}
        setRates={setRates}
        referenceRate={referenceRate}
        setReferenceRate={setReferenceRate}
        binanceSymbols={binanceSymbols}
        knownFiatCurrencies={knownFiatCurrencies}
        adjustingAsset={modalState.adjustingAsset}
        setAdjustingAsset={modalState.setAdjustingAsset}
        handleAdjustBalance={modalState.handleAdjustBalance}
        txModalMode={modalState.txModalMode}
        setTxModalMode={modalState.setTxModalMode}
        newTx={modalState.newTx}
        setNewTx={modalState.setNewTx}
        assets={assets}
        transactions={transactions}
        txValidationError={modalState.txValidationError}
        setTxValidationError={modalState.setTxValidationError}
        handleAddTransaction={modalState.handleAddTransaction}
        handleSaveAndAddAnother={modalState.handleSaveAndAddAnother}
        isTransferModalOpen={modalState.isTransferModalOpen}
        setIsTransferModalOpen={modalState.setIsTransferModalOpen}
        newTransfer={modalState.newTransfer}
        setNewTransfer={modalState.setNewTransfer}
        handleTransferSubmit={modalState.handleTransferSubmit}
        rateHistory={rateHistory}
        isObModalOpen={modalState.isObModalOpen}
        setIsObModalOpen={modalState.setIsObModalOpen}
        newOb={modalState.newOb}
        setNewOb={modalState.setNewOb}
        handleAddObligation={modalState.handleAddObligation}
        payingOb={modalState.payingOb}
        setPayingOb={modalState.setPayingOb}
        payData={modalState.payData}
        setPayData={modalState.setPayData}
        veRates={veRates}
        handlePayObligationSubmit={modalState.handlePayObligationSubmit}
        isBudgetModalOpen={modalState.isBudgetModalOpen}
        setIsBudgetModalOpen={modalState.setIsBudgetModalOpen}
        budgets={budgets}
        updateAllBudgets={updateAllBudgets}
        isAuthModalOpen={modalState.isAuthModalOpen}
        setIsAuthModalOpen={modalState.setIsAuthModalOpen}
        onNavigateCategories={() => setCurrentPage('categories')}
        auth={auth}
        syncNow={syncNow}
        obligations={obligations}
        requestConfirm={requestConfirm}
        exportBackup={exportBackup}
        setIsSecurityModalOpen={modalState.setIsSecurityModalOpen}
        appLock={appLock}
        clearLocalData={clearLocalData}
        confirmConfig={confirmConfig}
        setConfirmConfig={setConfirmConfig}
        isSecurityModalOpen={modalState.isSecurityModalOpen}
        isGoalModalOpen={modalState.isGoalModalOpen}
        setIsGoalModalOpen={modalState.setIsGoalModalOpen}
        editingGoal={modalState.editingGoal}
        setEditingGoal={modalState.setEditingGoal}
        handleSaveGoal={modalState.handleSaveGoal}
        handleDeleteGoal={modalState.handleDeleteGoal}
        isReportsModalOpen={modalState.isReportsModalOpen}
        setIsReportsModalOpen={modalState.setIsReportsModalOpen}
      />
    </div>
  );
}

export default function App() {
  const [toast, setToast] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (msg, type = 'success', duration) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    const isObj = typeof msg === 'object' && msg !== null;
    const toastPayload = isObj
      ? msg
      : (type !== 'success' ? { message: msg, type } : msg);
    const toastDuration = (isObj && msg.duration)
      || (typeof duration === 'number' ? duration : 3000);

    setToast(toastPayload);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, toastDuration);
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
      <Toast message={toast} onClose={() => setToast(null)} />
    </FinanceProvider>
  );
}
