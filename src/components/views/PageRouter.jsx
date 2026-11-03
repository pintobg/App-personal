import React, { Suspense, lazy } from 'react';
import DashboardView from './DashboardView';
import BalancesView from './BalancesView';
import TransactionsView from './TransactionsView';
import { prepareObligationPaymentData } from './pageRouterUtils';

const PlanningView = lazy(() => import('./PlanningView'));
const CalculatorView = lazy(() => import('./CalculatorView'));
const SettingsView = lazy(() => import('./SettingsView'));
const CategoriesView = lazy(() => import('./CategoriesView'));
import { todayLocal } from '../../utils/dates';

export default function PageRouter({
  currentPage, setCurrentPage,
  isBalanceHidden, setIsBalanceHidden,
  grandTotalUsd, alternateGrandTotalUsd,
  referenceRate, setReferenceRate,
  rateHistory, refreshRateHistory,
  rates, ratesDetails,
  totalIncomeUsd, totalSpentUsd,
  timeFrame, setTimeFrame,
  pieData, nextPayments, nextCollections,
  budgets, transactions, assets,
  setIsBudgetModalOpen, auth, setIsAuthModalOpen,
  setTxFilter, activeFilter, setActiveFilter,
  selectedFilters, setSelectedFilters,
  assetsByLocation, accountTotalsUsd, uniqueAssetNames,
  goals, onOpenGoalModal, onDeleteGoal,
  deleteMode, setDeleteMode,
  setAdjustingAsset, handleDeleteAsset, handleAdjustBalance,
  exportBackup, flippedObId, setFlippedObId,
  setNewOb, setIsObModalOpen, setPayingOb,
  setPayData, handleDeleteObligation,
  calcBaseCurrency, setCalcBaseCurrency,
  calcBaseAmount, setCalcBaseAmount, amountBs,
  veRates, setCustomRate, refreshRates, isFetchingRates,
  obligations, showToast, injectAdvancedTestData,
  clearAllAppData, syncNow, requestConfirm,
  setAssets, setTransactions, setObligations, setBudgets,
  txFilter, selectedTxs, toggleSelectTx,
  flippedTxId, setFlippedTxId, handleEditTransaction,
  onOpenReportsModal, getCategoryName, getSubcategoryName,
  planningSubTab, setPlanningSubTab,
  selectedShoppingListId, setSelectedShoppingListId,
  onRegisterShoppingPurchase, appLock, onOpenSecurityModal
}) {
  const handleOpenPayObligation = (ob) => {
    setPayingOb(ob);
    setPayData(prepareObligationPaymentData(ob, assets, rates, veRates));
  };

  const handleOpenNewObligation = () => {
    setNewOb({
      id: '',
      type: 'pay',
      title: '',
      amount: '',
      currency: 'USD',
      frequency: 'monthly',
      category: 'Otros',
      dueDate: todayLocal(),
      totalInstallments: '',
      paidInstallments: 0,
      installmentsCount: '3'
    });
    setIsObModalOpen(true);
  };

  return (
    <div className="content-area" key={currentPage}>
      <div className="page-enter">
        <Suspense fallback={<div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Cargando...</div>}>
          {currentPage === 'dashboard' && (
            <DashboardView
              isBalanceHidden={isBalanceHidden}
              setIsBalanceHidden={setIsBalanceHidden}
              grandTotalUsd={grandTotalUsd}
              alternateGrandTotalUsd={alternateGrandTotalUsd}
              referenceRate={referenceRate}
              setReferenceRate={setReferenceRate}
              rateHistory={rateHistory}
              refreshRateHistory={refreshRateHistory}
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
              obligations={obligations}
              transactions={transactions}
              assets={assets}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
              onOpenCategories={() => setCurrentPage('categories')}
              auth={auth}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              getCategoryName={getCategoryName}
              onOpenSettings={() => setCurrentPage('settings')}
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
              onOpenReportsModal={onOpenReportsModal}
              getCategoryName={getCategoryName}
              getSubcategoryName={getSubcategoryName}
              onOpenSettings={() => setCurrentPage('settings')}
            />
          )}

          {currentPage === 'balances' && (
            <BalancesView
              grandTotalUsd={grandTotalUsd}
              alternateGrandTotalUsd={alternateGrandTotalUsd}
              referenceRate={referenceRate}
              setReferenceRate={setReferenceRate}
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
              goals={goals}
              onOpenGoalModal={onOpenGoalModal}
              onDeleteGoal={onDeleteGoal}
              deleteMode={deleteMode}
              onAdjustAsset={(asset) => setAdjustingAsset(asset)}
              onDeleteAsset={handleDeleteAsset}
              onAdjustBalance={handleAdjustBalance}
              auth={auth}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onExportBackup={exportBackup}
              onNavigateToCalculator={() => setCurrentPage('rates')}
              onOpenSettings={() => setCurrentPage('settings')}
            />
          )}

          {(currentPage === 'planning' || currentPage === 'obligations') && (
            <PlanningView
              activeSubTab={planningSubTab}
              setActiveSubTab={setPlanningSubTab}
              budgets={budgets}
              obligations={obligations}
              transactions={transactions}
              rates={rates}
              veRates={veRates}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
              getCategoryName={getCategoryName}
              onOpenCategories={() => setCurrentPage('categories')}
              flippedObId={flippedObId}
              setFlippedObId={setFlippedObId}
              onEditObligation={(ob) => {
                setNewOb({ ...ob });
                setIsObModalOpen(true);
              }}
              onPayObligation={handleOpenPayObligation}
              onDeleteObligation={handleDeleteObligation}
              onOpenObModal={handleOpenNewObligation}
              goals={goals}
              onOpenGoalModal={onOpenGoalModal}
              onDeleteGoal={onDeleteGoal}
              assets={assets}
              onOpenSettings={() => setCurrentPage('settings')}
              selectedShoppingListId={selectedShoppingListId}
              setSelectedShoppingListId={setSelectedShoppingListId}
              onRegisterShoppingPurchase={onRegisterShoppingPurchase}
            />
          )}

          {(currentPage === 'rates' || currentPage === 'calculator') && (
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
              showToast={showToast}
              onOpenSettings={() => setCurrentPage('settings')}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsView
              onBack={() => setCurrentPage('dashboard')}
              auth={auth}
              onSyncNow={syncNow}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              assets={assets}
              transactions={transactions}
              obligations={obligations}
              veRates={veRates}
              budgets={budgets}
              showToast={showToast}
              onRestoreBackup={(data) => {
                setAssets(data.assets);
                setTransactions(data.transactions);
                setObligations(data.obligations);
                if (data.veRates?.custom) setCustomRate(data.veRates.custom);
                if (data.budgets) setBudgets(data.budgets);
              }}
              onRequestConfirm={requestConfirm}
              onClearAllData={clearAllAppData}
              onInjectTestData={injectAdvancedTestData}
              onOpenCategories={() => setCurrentPage('categories')}
              referenceRate={referenceRate}
              setReferenceRate={setReferenceRate}
              setCustomRate={setCustomRate}
              refreshRates={refreshRates}
              isFetchingRates={isFetchingRates}
              appLock={appLock}
              onOpenSecurityModal={onOpenSecurityModal}
            />
          )}

          {currentPage === 'categories' && (
            <CategoriesView onBack={() => setCurrentPage('settings')} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
