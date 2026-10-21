import AssetModal from '../modals/AssetModal';
import BalanceAdjustModal from '../modals/BalanceAdjustModal';
import TransactionModal from '../modals/TransactionModal';
import TransferModal from '../modals/TransferModal';
import ObligationModal from '../modals/ObligationModal';
import PayObligationModal from '../modals/PayObligationModal';
import BudgetModal from '../modals/BudgetModal';
import AuthModal from '../modals/AuthModal';
import ConfirmModal from '../modals/ConfirmModal';
import PinLockModal from '../modals/PinLockModal';
import SecuritySettingsModal from '../modals/SecuritySettingsModal';
import { todayLocal } from '../../utils/dates';

export default function AppModals({
  // AssetModal
  isAssetModalOpen,
  setIsAssetModalOpen,
  handleAddAsset,
  showToast,
  assetInitialType,
  rates,
  setRates,
  binanceSymbols,
  knownFiatCurrencies,
  // BalanceAdjustModal
  adjustingAsset,
  setAdjustingAsset,
  handleAdjustBalance,
  // TransactionModal
  txModalMode,
  setTxModalMode,
  newTx,
  setNewTx,
  assets,
  transactions,
  txValidationError,
  setTxValidationError,
  handleAddTransaction,
  // TransferModal
  isTransferModalOpen,
  setIsTransferModalOpen,
  newTransfer,
  setNewTransfer,
  handleTransferSubmit,
  // ObligationModal
  isObModalOpen,
  setIsObModalOpen,
  newOb,
  setNewOb,
  handleAddObligation,
  // PayObligationModal
  payingOb,
  setPayingOb,
  payData,
  setPayData,
  veRates,
  handlePayObligationSubmit,
  // BudgetModal
  isBudgetModalOpen,
  setIsBudgetModalOpen,
  budgets,
  updateAllBudgets,
  // AuthModal
  isAuthModalOpen,
  setIsAuthModalOpen,
  auth,
  syncNow,
  obligations,
  requestConfirm,
  exportBackup,
  setIsSecurityModalOpen,
  appLock,
  clearLocalData,
  // ConfirmModal
  confirmConfig,
  setConfirmConfig,
  // SecuritySettingsModal
  isSecurityModalOpen
}) {
  return (
    <>
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
    </>
  );
}
