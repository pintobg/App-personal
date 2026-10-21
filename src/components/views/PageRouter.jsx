import { Suspense } from 'react';
import DashboardView from './DashboardView';
import BalancesView from './BalancesView';
import ObligationsView from './ObligationsView';
import CalculatorView from './CalculatorView';
import TransactionsView from './TransactionsView';
import { convertForPayment } from '../../domain/money';

export default function PageRouter({
  currentPage,
  setCurrentPage,
  isBalanceHidden,
  setIsBalanceHidden,
  grandTotalUsd,
  alternateGrandTotalUsd,
  referenceRate,
  setReferenceRate,
  rateHistory,
  refreshRateHistory,
  rates,
  ratesDetails,
  totalIncomeUsd,
  totalSpentUsd,
  timeFrame,
  setTimeFrame,
  pieData,
  nextPayments,
  nextCollections,
  budgets,
  transactions,
  assets,
  setIsBudgetModalOpen,
  auth,
  setIsAuthModalOpen,
  setTxFilter,
  activeFilter,
  setActiveFilter,
  selectedFilters,
  setSelectedFilters,
  assetsByLocation,
  accountTotalsUsd,
  uniqueAssetNames,
  goals,
  onOpenGoalModal,
  onDeleteGoal,
  deleteMode,
  setDeleteMode,
  setAdjustingAsset,
  handleDeleteAsset,
  handleAdjustBalance,
  exportBackup,
  flippedObId,
  setFlippedObId,
  setNewOb,
  setIsObModalOpen,
  setPayingOb,
  setPayData,
  handleDeleteObligation,
  calcBaseCurrency,
  setCalcBaseCurrency,
  calcBaseAmount,
  setCalcBaseAmount,
  amountBs,
  veRates,
  setCustomRate,
  refreshRates,
  isFetchingRates,
  obligations,
  showToast,
  injectAdvancedTestData,
  clearAllAppData,
  syncNow,
  requestConfirm,
  setAssets,
  setTransactions,
  setObligations,
  setBudgets,
  txFilter,
  selectedTxs,
  toggleSelectTx,
  flippedTxId,
  setFlippedTxId,
  handleEditTransaction
}) {
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
              onNavigateToCalculator={() => setCurrentPage('calculator')}
            />
          )}

          {currentPage === 'obligations' && (
            <ObligationsView
              obligations={obligations}
              flippedObId={flippedObId}
              setFlippedObId={setFlippedObId}
              rates={rates}
              veRates={veRates}
              onEdit={(ob) => {
                setNewOb({ ...ob });
                setIsObModalOpen(true);
              }}
              onPay={(ob) => {
                setPayingOb(ob);
                const isIndexedToBs = Boolean(ob.payInBs);
                const vesAccount = assets.find(a => (a.name || '').toUpperCase() === 'VES');
                const targetAsset = (isIndexedToBs && vesAccount) ? vesAccount : null;
                const chosenRateType = ob.indexRateType || ((ob.currency || '').toUpperCase() === 'EUR' ? 'EUR' : 'BCV_USD');

                let initialAmountStr = ob.amount.toString();
                if (isIndexedToBs && targetAsset) {
                  let activeVeRate = null;
                  if (chosenRateType === 'PARALELO') activeVeRate = veRates?.paralelo;
                  else if (chosenRateType === 'BCV_EUR' || chosenRateType === 'EUR') activeVeRate = veRates?.bcvEur || veRates?.bcvUsd;
                  else activeVeRate = veRates?.bcvUsd || rates?.bcvUsd || rates?.VES;

                  const converted = convertForPayment(
                    ob.amount,
                    ob.currency,
                    'VES',
                    { ...rates, ...veRates },
                    activeVeRate
                  );
                  if (converted != null) initialAmountStr = converted.toString();
                }

                setPayData({
                  assetId: targetAsset ? targetAsset.id : '',
                  actualAmount: initialAmountStr,
                  rateType: chosenRateType,
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
  );
}
