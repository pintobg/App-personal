import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { parseAmount, round } from '../domain/money';
import { todayLocal, toLocalDateString } from '../utils/dates';

export function useAppModalsState(requestConfirm, showToast) {
  const finance = useFinance();
  const {
    assets,
    addAsset,
    adjustAssetBalance,
    deleteAsset,
    addObligation,
    updateObligation,
    deleteObligation,
    payObligation: runPayObligation,
    saveTransaction,
    transferFunds,
    bulkDeleteTransactions
  } = finance;

  // Asset Modal
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetInitialType, setAssetInitialType] = useState('fiat');
  const [adjustingAsset, setAdjustingAsset] = useState(null);

  // Transaction Modal
  const [txModalMode, setTxModalMode] = useState(null);
  const [txValidationError, setTxValidationError] = useState('');
  const [newTx, setNewTx] = useState({
    id: '', assetId: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal()
  });
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedTxs, setSelectedTxs] = useState([]);
  const [flippedTxId, setFlippedTxId] = useState(null);

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    sourceAssetId: '', amountDeducted: '', destAssetId: '', amountReceived: '', hasCommission: false, commissionAmount: ''
  });

  // Obligation Modal
  const [isObModalOpen, setIsObModalOpen] = useState(false);
  const [newOb, setNewOb] = useState({
    id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0
  });
  const [payingOb, setPayingOb] = useState(null);
  const [payData, setPayData] = useState({ assetId: '', actualAmount: '', rateType: 'BCV_USD', customRate: '' });
  const [flippedObId, setFlippedObId] = useState(null);

  // Budget, Auth, Security & FAB
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);

  // Handlers
  const handleAddAsset = (assetData) => addAsset(assetData);

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

  return {
    isAssetModalOpen,
    setIsAssetModalOpen,
    assetInitialType,
    setAssetInitialType,
    adjustingAsset,
    setAdjustingAsset,
    txModalMode,
    setTxModalMode,
    txValidationError,
    setTxValidationError,
    newTx,
    setNewTx,
    deleteMode,
    setDeleteMode,
    selectedTxs,
    setSelectedTxs,
    flippedTxId,
    setFlippedTxId,
    isTransferModalOpen,
    setIsTransferModalOpen,
    newTransfer,
    setNewTransfer,
    isObModalOpen,
    setIsObModalOpen,
    newOb,
    setNewOb,
    payingOb,
    setPayingOb,
    payData,
    setPayData,
    flippedObId,
    setFlippedObId,
    isBudgetModalOpen,
    setIsBudgetModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isSecurityModalOpen,
    setIsSecurityModalOpen,
    isFabExpanded,
    setIsFabExpanded,
    // handlers
    handleAddAsset,
    handleAdjustBalance,
    handleDeleteAsset,
    handleAddObligation,
    handleDeleteObligation,
    handlePayObligationSubmit,
    handleEditTransaction,
    handleAddTransaction,
    handleTransferSubmit,
    handleBulkDelete,
    toggleSelectTx
  };
}
