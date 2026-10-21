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
    bulkDeleteTransactions,
    addGoal,
    updateGoal,
    deleteGoal
  } = finance;

  // Asset Modal
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetInitialType, setAssetInitialType] = useState('fiat');
  const [adjustingAsset, setAdjustingAsset] = useState(null);

  // Transaction Modal
  const [txModalMode, setTxModalMode] = useState(null);
  const [txValidationError, setTxValidationError] = useState('');
  const [newTx, setNewTx] = useState({
    id: '',
    assetId: '',
    type: 'income',
    currency: '',
    amount: '',
    origin: '',
    category: '',
    subcategory: '',
    date: todayLocal(),
    includeIgtf: false,
    igtfAmount: '',
    includeCommission: false,
    commissionAmount: '',
    paymentMethod: '',
    referenceNumber: '',
    bank: '',
    recipientId: ''
  });
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedTxs, setSelectedTxs] = useState([]);
  const [flippedTxId, setFlippedTxId] = useState(null);

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    sourceAssetId: '',
    amountDeducted: '',
    destAssetId: '',
    amountReceived: '',
    hasCommission: false,
    commissionAmount: '',
    hasIgtf: false,
    igtfAmount: ''
  });

  // Obligation Modal
  const [isObModalOpen, setIsObModalOpen] = useState(false);
  const [newOb, setNewOb] = useState({
    id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0
  });
  const [payingOb, setPayingOb] = useState(null);
  const [payData, setPayData] = useState({ assetId: '', actualAmount: '', rateType: 'BCV_USD', customRate: '' });
  const [flippedObId, setFlippedObId] = useState(null);

  // Budget, Auth, Security, Goal, Reports & FAB
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);

  // Handlers
  const handleAddAsset = (assetData) => addAsset(assetData);

  const handleAdjustBalance = (asset, delta, newAmount, extraConfig) => {
    if (!asset) return;
    adjustAssetBalance(asset, newAmount, delta, extraConfig);
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

  const handleAddObligation = (e, overrideOb) => {
    if (e && e.preventDefault) e.preventDefault();
    const obToSave = overrideOb || newOb;
    const parsedAmount = parseAmount(obToSave.amount);
    if (!obToSave.title || parsedAmount === null || parsedAmount <= 0 || !obToSave.currency || !obToSave.category) {
      showToast('Completa todos los campos con un monto válido', 'error');
      return;
    }
    const finalInstallments = obToSave.frequency === 'one-time' ? '1' : (obToSave.totalInstallments || '1');
    const finalAmount = round(parsedAmount, obToSave.currency);

    // Si es compra en cuotas y se pagó una inicial desde una cuenta
    if (obToSave.isInstallmentPurchase && Number(obToSave.downPayment) > 0 && obToSave.downPaymentAssetId) {
      saveTransaction({
        type: 'spent',
        amount: String(obToSave.downPayment),
        assetId: obToSave.downPaymentAssetId,
        category: obToSave.category,
        subcategory: `Inicial ${obToSave.title}`,
        date: todayLocal()
      });
    }

    if (obToSave.id) {
      updateObligation(obToSave.id, { ...obToSave, amount: finalAmount, totalInstallments: finalInstallments });
      showToast('Obligación actualizada');
    } else {
      addObligation({ ...obToSave, amount: finalAmount, totalInstallments: finalInstallments });
      if (obToSave.isInstallmentPurchase && Number(obToSave.downPayment) > 0) {
        showToast(`Compra en cuotas creada (${finalInstallments} cuotas de $${finalAmount}) e inicial registrada`);
      } else {
        showToast('Obligación creada');
      }
    }

    setIsObModalOpen(false);
    setNewOb({
      id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0
    });
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

  const handleSaveGoal = (goalData) => {
    if (goalData.id) {
      updateGoal(goalData.id, goalData);
      showToast('Meta actualizada con éxito');
    } else {
      addGoal(goalData);
      showToast('Meta creada con éxito');
    }
  };

  const handleDeleteGoal = (goalId) => {
    requestConfirm({
      title: 'Eliminar meta',
      message: '¿Estás seguro de que deseas eliminar esta meta de ahorro?',
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: () => {
        deleteGoal(goalId);
        showToast('Meta eliminada');
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
      setNewTx({
        id: '',
        assetId: '',
        type: 'income',
        currency: '',
        amount: '',
        origin: '',
        category: '',
        subcategory: '',
        date: todayLocal(),
        includeIgtf: false,
        igtfAmount: '',
        includeCommission: false,
        commissionAmount: '',
        paymentMethod: '',
        referenceNumber: '',
        bank: '',
        recipientId: ''
      });
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
      setNewTransfer({
        sourceAssetId: '',
        amountDeducted: '',
        destAssetId: '',
        amountReceived: '',
        hasCommission: false,
        commissionAmount: '',
        hasIgtf: false,
        igtfAmount: ''
      });
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
    isGoalModalOpen,
    setIsGoalModalOpen,
    editingGoal,
    setEditingGoal,
    isReportsModalOpen,
    setIsReportsModalOpen,
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
    toggleSelectTx,
    handleSaveGoal,
    handleDeleteGoal
  };
}
