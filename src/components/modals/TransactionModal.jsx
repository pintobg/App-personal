import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../common/CustomSelect';
import CategoryPicker from '../common/CategoryPicker';
import { getFrequentExpenses } from '../../domain/frequentExpenses';
import { todayLocal, toLocalDateString } from '../../utils/dates';
import { formatAmount } from '../../utils/formatters';
import { calculateAssetFees, getCurrencyOptions, filterAssetsByCurrency, findMatchingAssetForCurrency } from './transaction/transactionCalculations';
import TransactionVesDetails from './transaction/TransactionVesDetails';
import TransactionAccountSection from './transaction/TransactionAccountSection';
import TransactionFeesSection from './transaction/TransactionFeesSection';
import TransactionFormFooter from './transaction/TransactionFormFooter';

export default function TransactionModal({
  mode, onClose, newTx, setNewTx, setMode: _setMode,
  assets = [], transactions = [],
  validationError, setValidationError,
  onSubmit, onSaveAndAddAnother, onSwitchToTransfer
}) {
  const todayStr = todayLocal();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterdayDate);

  const txDateStr = newTx?.date ? toLocalDateString(newTx.date) : todayStr;
  const isToday = txDateStr === todayStr;
  const isYesterday = txDateStr === yesterdayStr;
  const isCustomDate = !isToday && !isYesterday;
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(isCustomDate);
  // "Más detalles" se abre solo si ya hay algo cargado en esos campos (por ejemplo al editar).
  const hasExtraDetails = Boolean(
    (newTx?.notes || '').trim() || newTx?.includeCommission || newTx?.includeIgtf ||
    newTx?.paymentMethod || newTx?.reference || isCustomDate || isYesterday
  );
  const [showDetails, setShowDetails] = useState(hasExtraDetails);

  const isEditing = Boolean(newTx?.id);
  const oldTx = isEditing ? transactions.find(t => t.id === newTx.id) : null;

  const currencyOptions = useMemo(() => getCurrencyOptions(assets), [assets]);
  // Solo se ofrecen como origen/destino las cuentas que manejan la moneda o activo elegido.
  const availableAssetsForTx = useMemo(() => filterAssetsByCurrency(assets, newTx?.currency), [assets, newTx?.currency]);

  const selectedAsset = assets.find(a => a.id === newTx?.assetId) ||
    assets.find(a => (a.name || '').toUpperCase() === (newTx?.currency || '').toUpperCase() && a.location === newTx?.origin) || null;

  const handleCurrencyChange = (e) => {
    const nextCurrency = (e.target.value || '').toUpperCase();
    if (!nextCurrency) return;
    const currentAsset = assets.find(a => a.id === newTx?.assetId);
    if (currentAsset && (currentAsset.name || '').toUpperCase() === nextCurrency) {
      setNewTx(prev => ({ ...prev, currency: nextCurrency }));
      return;
    }
    const matchingAsset = findMatchingAssetForCurrency(assets, transactions, nextCurrency);
    if (matchingAsset) {
      handleAssetSelect(matchingAsset.id);
    } else {
      setNewTx(prev => ({ ...prev, currency: nextCurrency, assetId: '', origin: '' }));
    }
  };

  // No se enfoca ningún campo al abrir: el teclado solo aparece cuando el usuario toca un campo.

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

  const frequentExpenses = useMemo(
    () => (mode && !isEditing ? getFrequentExpenses(transactions, { days: 60, limit: 4 }) : []),
    [mode, isEditing, transactions]
  );

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

  // Toca un gasto frecuente: llena categoría, monto, moneda y cuenta de una vez.
  const applyFrequent = (f) => {
    const target = assets.find(a => a.id === f.assetId) || null;
    const fees = calculateAssetFees(String(f.amount), target, true);
    setNewTx(prev => ({
      ...prev,
      amount: String(f.amount),
      currency: target ? target.name : f.currency,
      assetId: target ? target.id : prev.assetId,
      origin: target ? target.location : prev.origin,
      category: f.category,
      category_id: f.category_id,
      subcategory: f.subcategory,
      subcategory_id: f.subcategory_id,
      includeIgtf: fees.includeIgtf,
      igtfAmount: fees.igtfAmount,
      includeCommission: fees.includeCommission,
      commissionAmount: fees.commissionAmount
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
      onSaveAndAddAnother(e);
    } else if (onSubmit) {
      onSubmit(e);
    }
  };


  const detailsSummary = [
    isToday ? null : (isYesterday ? 'Ayer' : 'Otra fecha'),
    (newTx.notes || '').trim() ? 'con nota' : null,
    newTx.includeCommission ? 'con comisión' : null,
    newTx.includeIgtf ? 'con IGTF' : null,
    newTx.paymentMethod || null
  ].filter(Boolean).join(' · ');

  const singleCurrency = currencyOptions.length <= 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content tx-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>
            {isEditing
              ? (newTx.type === 'income' ? 'Editar ingreso' : 'Editar gasto')
              : (newTx.type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto')}
          </h2>
          <div style={{ width: '64px' }} />
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* 1. Tipo */}
          <div className="segmented-control" role="group" aria-label="Tipo de movimiento">
            <button
              type="button"
              className={`segmented-btn ${newTx.type === 'spent' ? 'active' : ''}`}
              aria-pressed={newTx.type === 'spent'}
              onClick={() => handleTypeChange('spent')}
            >
              Gasto
            </button>
            <button
              type="button"
              className={`segmented-btn ${newTx.type === 'income' ? 'active' : ''}`}
              aria-pressed={newTx.type === 'income'}
              onClick={() => handleTypeChange('income')}
            >
              Ingreso
            </button>
            {!isEditing && onSwitchToTransfer && (
              <button
                type="button"
                className="segmented-btn"
                onClick={() => onSwitchToTransfer({ amount: newTx.amount, currency: newTx.currency, assetId: newTx.assetId })}
              >
                Transferencia
              </button>
            )}
          </div>

          {/* Atajos: tus gastos frecuentes de los últimos 60 días */}
          {!isEditing && newTx.type === 'spent' && !newTx.amount && frequentExpenses.length > 0 && (
            <div className="frequent-chips" role="group" aria-label="Gastos frecuentes">
              {frequentExpenses.map(f => (
                <button
                  key={f.key}
                  type="button"
                  className="frequent-chip"
                  onClick={() => applyFrequent(f)}
                  aria-label={`Usar gasto frecuente: ${f.label}, ${formatAmount(f.amount, f.currency)} ${f.currency}`}
                >
                  <span className="frequent-chip-label">{f.label}</span>
                  <span className="frequent-chip-amount">{formatAmount(f.amount, f.currency)} {f.currency}</span>
                </button>
              ))}
            </div>
          )}

          {/* 2. Monto grande + moneda */}
          <div className="tx-amount-hero">
            <input
              type="text"
              inputMode="decimal"
              aria-label="Monto"
              placeholder="0,00"
              value={newTx.amount}
              onChange={e => handleAmountChange(e.target.value)}
              required
            />
            <div className="tx-currency-chip-wrap">
              {singleCurrency ? (
                <span className="tx-currency-chip" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {newTx.currency || currencyOptions[0]?.value || '—'}
                </span>
              ) : (
                <CustomSelect
                  placeholder="Moneda"
                  title="Seleccionar moneda"
                  value={newTx.currency || ''}
                  onChange={handleCurrencyChange}
                  options={currencyOptions}
                />
              )}
            </div>
          </div>

          {/* 3. Categoría */}
          {(newTx.type === 'spent' || newTx.type === 'income') && (
            <div className="input-group">
              <span className="form-section-label">Categoría</span>
              <CategoryPicker
                compact
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

          {/* 4. Cuenta */}
          <TransactionAccountSection
            newTx={newTx}
            assets={assets}
            availableAssetsForTx={availableAssetsForTx}
            handleAssetSelect={handleAssetSelect}
            oldTx={oldTx}
          />

          {/* 5. Más detalles (plegado): fecha, nota, comisión e IGTF, pago en Bs */}
          <button
            type="button"
            className="tx-more-toggle"
            aria-expanded={showDetails}
            onClick={() => setShowDetails(v => !v)}
          >
            <span>Más detalles</span>
            <span className="summary">{detailsSummary ? `· ${detailsSummary}` : ''}</span>
            <span aria-hidden="true">{showDetails ? '▴' : '▾'}</span>
          </button>

          {showDetails && (
            <div className="tx-more-panel">
              <TransactionFormFooter
                section="details"
                newTx={newTx}
                setNewTx={setNewTx}
                todayStr={todayStr}
                yesterdayStr={yesterdayStr}
                isToday={isToday}
                isYesterday={isYesterday}
                showCustomDatePicker={showCustomDatePicker}
                setShowCustomDatePicker={setShowCustomDatePicker}
              />
              <TransactionFeesSection
                newTx={newTx}
                setNewTx={setNewTx}
                selectedAsset={selectedAsset}
              />
              <TransactionVesDetails
                newTx={newTx}
                setNewTx={setNewTx}
              />
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* 6. Guardar (fijo abajo) */}
          <TransactionFormFooter
            section="actions"
            newTx={newTx}
            setNewTx={setNewTx}
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
