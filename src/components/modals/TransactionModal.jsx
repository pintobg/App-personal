import React, { useState, useEffect, useRef } from 'react';
import CategoryPicker from '../common/CategoryPicker';
import { todayLocal, toLocalDateString } from '../../utils/dates';
import { calculateAssetFees } from './transaction/transactionCalculations';
import TransactionTypeSelector from './transaction/TransactionTypeSelector';
import TransactionVesDetails from './transaction/TransactionVesDetails';
import TransactionAccountSection from './transaction/TransactionAccountSection';
import TransactionFormFooter from './transaction/TransactionFormFooter';

export default function TransactionModal({
  mode, // 'select' | 'form' | null
  onClose,
  newTx,
  setNewTx,
  setMode,
  assets = [],
  transactions = [],
  validationError,
  setValidationError,
  onSubmit,
  onSaveAndAddAnother
}) {
  const amountInputRef = useRef(null);

  const todayStr = todayLocal();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterdayDate);

  const txDateStr = newTx?.date ? toLocalDateString(newTx.date) : todayStr;
  const isToday = txDateStr === todayStr;
  const isYesterday = txDateStr === yesterdayStr;
  const isCustomDate = !isToday && !isYesterday;
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(isCustomDate);

  const isEditing = Boolean(newTx?.id);
  const oldTx = isEditing ? transactions.find(t => t.id === newTx.id) : null;

  const availableAssetsForTx = newTx?.currency
    ? assets.filter(a => (a.name || '').toUpperCase() === newTx.currency.toUpperCase())
    : assets;

  const selectedAsset = assets.find(a => a.id === newTx?.assetId) ||
    assets.find(a => (a.name || '').toUpperCase() === (newTx?.currency || '').toUpperCase() && a.location === newTx?.origin) || null;

  useEffect(() => {
    if (mode === 'form') {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select?.();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'form' && !isEditing && newTx) {
      if (!newTx.date) {
        setNewTx(prev => ({ ...prev, date: todayStr }));
      }
      if (!newTx.assetId && Array.isArray(transactions) && Array.isArray(assets) && assets.length > 0) {
        const lastTx = transactions.slice().reverse().find(t => t.type === newTx.type && (t.assetId || t.currency));
        let matchedAsset = null;
        if (lastTx) {
          matchedAsset = assets.find(a => (lastTx.assetId && a.id === lastTx.assetId) ||
            ((a.name || '').toUpperCase() === (lastTx.currency || '').toUpperCase() && a.location === lastTx.origin));
        }
        if (!matchedAsset) {
          matchedAsset = assets[0];
        }
        if (matchedAsset) {
          handleAssetSelect(matchedAsset.id);
        }
      }
    }
  }, [mode, newTx?.type, isEditing]);

  if (!mode) return null;

  const handleAmountChange = (val) => {
    const fees = calculateAssetFees(val, selectedAsset, newTx.type === 'spent');
    setNewTx(prev => ({
      ...prev,
      amount: val,
      igtfAmount: fees.igtfAmount || (val ? prev.igtfAmount : ''),
      includeIgtf: fees.includeIgtf ? true : prev.includeIgtf,
      commissionAmount: fees.commissionAmount || (val ? prev.commissionAmount : ''),
      includeCommission: fees.includeCommission ? true : prev.includeCommission
    }));
  };

  const handleAssetSelect = (assetId) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) {
      setNewTx(prev => ({ ...prev, assetId: '', origin: '' }));
      return;
    }
    const fees = calculateAssetFees(newTx?.amount, target, newTx?.type === 'spent');

    setNewTx(prev => ({
      ...prev,
      assetId: target.id,
      currency: target.name,
      origin: target.location,
      includeIgtf: fees.includeIgtf,
      igtfAmount: fees.igtfAmount,
      includeCommission: fees.includeCommission,
      commissionAmount: fees.commissionAmount
    }));
  };

  const handleTypeChange = (nextType) => {
    const lastTx = transactions.slice().reverse().find(t => t.type === nextType && (t.assetId || t.currency));
    let matchedAsset = null;
    if (lastTx) {
      matchedAsset = assets.find(a => (lastTx.assetId && a.id === lastTx.assetId) ||
        ((a.name || '').toUpperCase() === (lastTx.currency || '').toUpperCase() && a.location === lastTx.origin));
    }
    if (!matchedAsset) matchedAsset = selectedAsset || assets[0];

    setNewTx(prev => ({
      ...prev,
      type: nextType,
      category: '',
      category_id: null,
      subcategory: '',
      subcategory_id: null,
      assetId: matchedAsset ? matchedAsset.id : prev.assetId,
      currency: matchedAsset ? matchedAsset.name : prev.currency,
      origin: matchedAsset ? matchedAsset.location : prev.origin
    }));
  };

  const handleSaveAndAddAnotherClick = (e) => {
    e.preventDefault();
    if (onSaveAndAddAnother) {
      const ok = onSaveAndAddAnother(e);
      if (ok) {
        setTimeout(() => {
          amountInputRef.current?.focus();
        }, 50);
      }
    } else if (onSubmit) {
      onSubmit(e);
    }
  };

  if (mode === 'select') {
    return (
      <TransactionTypeSelector
        onClose={onClose}
        setNewTx={setNewTx}
        setMode={setMode}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>
            {isEditing
              ? (newTx.type === 'income' ? 'Editar Ingreso' : 'Editar Gasto')
              : (newTx.type === 'income' ? 'Nuevo Ingreso' : 'Nuevo Gasto')}
          </h2>
          <div style={{ width: '64px' }} />
        </div>

        <form onSubmit={onSubmit}>
          {/* 1. Selector de Tipo */}
          <div className="input-group">
            <label>Tipo de Transacción</label>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-btn ${newTx.type === 'income' ? 'active-success' : ''}`}
                onClick={() => handleTypeChange('income')}
              >
                Ingreso (+)
              </button>
              <button
                type="button"
                className={`segmented-btn ${newTx.type === 'spent' ? 'active-danger' : ''}`}
                onClick={() => handleTypeChange('spent')}
              >
                Gasto (-)
              </button>
            </div>
          </div>

          {/* 2. Monto con autofocus */}
          <div className="input-group">
            <label>Monto</label>
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              className="input-field"
              placeholder="0,00"
              value={newTx.amount}
              onChange={e => handleAmountChange(e.target.value)}
              required
              autoFocus
              style={{ fontSize: '1.2rem', fontWeight: 700 }}
            />
          </div>

          {/* 3. CategoryPicker */}
          {(newTx.type === 'spent' || newTx.type === 'income') && (
            <div className="input-group">
              <label>Categoría</label>
              <CategoryPicker
                kind={newTx.type === 'income' ? 'income' : 'expense'}
                selectedCategoryId={newTx.category_id}
                selectedSubcategoryId={newTx.subcategory_id}
                transactions={transactions}
                onChange={({ categoryId, categoryName, subcategoryId, subcategoryName }) => {
                  setNewTx({
                    ...newTx,
                    category: categoryName,
                    category_id: categoryId,
                    subcategory: subcategoryName || '',
                    subcategory_id: subcategoryId || null
                  });
                }}
              />
            </div>
          )}

          {/* 4. Cuenta y comisiones */}
          <TransactionAccountSection
            newTx={newTx}
            setNewTx={setNewTx}
            assets={assets}
            availableAssetsForTx={availableAssetsForTx}
            selectedAsset={selectedAsset}
            handleAssetSelect={handleAssetSelect}
            oldTx={oldTx}
          />

          {/* Detalles opcionales VES */}
          <TransactionVesDetails
            newTx={newTx}
            setNewTx={setNewTx}
          />

          {/* 5 y 6. Fecha, Nota y Acciones */}
          <TransactionFormFooter
            newTx={newTx}
            setNewTx={setNewTx}
            todayStr={todayStr}
            yesterdayStr={yesterdayStr}
            isToday={isToday}
            isYesterday={isYesterday}
            showCustomDatePicker={showCustomDatePicker}
            setShowCustomDatePicker={setShowCustomDatePicker}
            validationError={validationError}
            setValidationError={setValidationError}
            isEditing={isEditing}
            onClose={onClose}
            handleSaveAndAddAnotherClick={handleSaveAndAddAnotherClick}
          />
        </form>
      </div>
    </div>
  );
}
