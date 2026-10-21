import { useState, useEffect, useRef } from 'react';
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
    goals,
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

  // Navegación y filtros
  const [currentPage, setCurrentPage] = useState('balances');
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
    selectedFilters
  });

  useEffect(() => {
    modalState.setIsFabExpanded(false);
  }, [currentPage]);

  // Bloquear scroll de fondo cuando cualquier modal esté abierto
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

      <PageRouter
        currentPage={currentPage}
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
        flippedObId={modalState.flippedObId}
        setFlippedObId={modalState.setFlippedObId}
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
        flippedTxId={modalState.flippedTxId}
        setFlippedTxId={modalState.setFlippedTxId}
        handleEditTransaction={modalState.handleEditTransaction}
      />

      <FabOverlay
        currentPage={currentPage}
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
        isTransferModalOpen={modalState.isTransferModalOpen}
        setIsTransferModalOpen={modalState.setIsTransferModalOpen}
        newTransfer={modalState.newTransfer}
        setNewTransfer={modalState.setNewTransfer}
        handleTransferSubmit={modalState.handleTransferSubmit}
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
      />
    </div>
  );
}

export default function App() {
  const [toast, setToast] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(typeof msg === 'string' && type !== 'success' ? { message: msg, type } : msg);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
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
