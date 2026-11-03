import { useRef, useMemo } from 'react';
import CustomSelect from '../common/CustomSelect';
import { formatAmount } from '../../utils/formatters';
import { parseAmount, round } from '../../domain/money';
import { toLocalDateString, toLocalDateTimeString } from '../../utils/dates';
import { resolveHistoricalRate } from '../../domain/rates';

export default function TransferModal({
  isOpen,
  onClose,
  newTransfer,
  setNewTransfer,
  assets,
  rates = {},
  rateHistory = [],
  validationError,
  setValidationError,
  onSubmit
}) {
  const userEditedReceivedRef = useRef(false);

  const src = (assets || []).find(a => a.id === newTransfer.sourceAssetId);
  const dest = (assets || []).find(a => a.id === newTransfer.destAssetId);
  const isSameCurrency = Boolean(src && dest && src.name === dest.name);

  const now = new Date();
  const maxDateTime = toLocalDateTimeString(now);
  const currentTransferDate = newTransfer.date || maxDateTime;

  const isToday = toLocalDateString(currentTransferDate) === toLocalDateString(now);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = toLocalDateString(currentTransferDate) === toLocalDateString(yesterday);

  // Sugerencia de tasa histórica
  const suggestedRateInfo = useMemo(() => {
    if (isSameCurrency || !src || !dest) return null;
    return resolveHistoricalRate({
      date: currentTransferDate,
      fromCurrency: src.name,
      toCurrency: dest.name,
      rates,
      rateHistory
    });
  }, [isSameCurrency, src, dest, currentTransferDate, rates, rateHistory]);

  if (!isOpen) return null;

  const handleClose = () => {
    userEditedReceivedRef.current = false;
    onClose();
    if (setValidationError) setValidationError('');
  };

  const calcSuggestedReceived = (deductedVal, dateVal, currentSrc, currentDest) => {
    const parsedDed = parseAmount(deductedVal);
    if (!parsedDed || parsedDed <= 0 || !currentSrc || !currentDest || currentSrc.name === currentDest.name) return '';
    const rateInfo = resolveHistoricalRate({
      date: dateVal || new Date(),
      fromCurrency: currentSrc.name,
      toCurrency: currentDest.name,
      rates,
      rateHistory
    });
    if (!rateInfo || !rateInfo.rate) return '';

    const fromCurr = currentSrc.name.toUpperCase();
    const toCurr = currentDest.name.toUpperCase();
    let receivedNum = 0;
    if (toCurr === 'VES') {
      receivedNum = round(parsedDed * rateInfo.rate, toCurr);
    } else if (fromCurr === 'VES') {
      receivedNum = round(parsedDed / rateInfo.rate, toCurr);
    } else {
      receivedNum = round(parsedDed * rateInfo.rate, toCurr);
    }
    return receivedNum > 0 ? String(receivedNum) : '';
  };

  const handleDateChange = (val) => {
    let finalVal = val;
    if (finalVal && finalVal > maxDateTime) {
      finalVal = maxDateTime;
    }
    let autoFill = newTransfer.amountReceived;
    if (!isSameCurrency && (!autoFill || !userEditedReceivedRef.current)) {
      const suggested = calcSuggestedReceived(newTransfer.amountDeducted, finalVal, src, dest);
      if (suggested) autoFill = suggested;
    }
    setNewTransfer({
      ...newTransfer,
      date: finalVal,
      amountReceived: autoFill
    });
  };

  const handleSetToday = () => {
    const timePart = currentTransferDate.includes('T')
      ? currentTransferDate.split('T')[1]
      : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const target = `${toLocalDateString(now)}T${timePart}`;
    handleDateChange(target > maxDateTime ? maxDateTime : target);
  };

  const handleSetYesterday = () => {
    const timePart = currentTransferDate.includes('T')
      ? currentTransferDate.split('T')[1]
      : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    handleDateChange(`${toLocalDateString(yesterday)}T${timePart}`);
  };

  const handleSourceChange = (srcId) => {
    const selectedSrc = assets.find(a => a.id === srcId);
    const currentDest = assets.find(a => a.id === newTransfer.destAssetId);
    let autoFill = newTransfer.amountReceived;

    if (selectedSrc && currentDest && selectedSrc.name === currentDest.name && newTransfer.amountDeducted) {
      autoFill = newTransfer.amountDeducted;
    } else if (selectedSrc && currentDest && selectedSrc.name !== currentDest.name && (!autoFill || !userEditedReceivedRef.current)) {
      const suggested = calcSuggestedReceived(newTransfer.amountDeducted, currentTransferDate, selectedSrc, currentDest);
      if (suggested) autoFill = suggested;
    }

    const parsedDed = parseAmount(newTransfer.amountDeducted);
    let nextComm = newTransfer.commissionAmount;
    let nextHasComm = newTransfer.hasCommission;
    let nextIgtf = newTransfer.igtfAmount;
    let nextHasIgtf = newTransfer.hasIgtf;

    if (selectedSrc) {
      if (selectedSrc.hasTransferCommission || selectedSrc.commissionPercent > 0 || selectedSrc.commissionFixed > 0) {
        if (parsedDed !== null && parsedDed > 0) {
          const calcComm = round((parsedDed * ((selectedSrc.commissionPercent || 0) / 100)) + (selectedSrc.commissionFixed || 0), selectedSrc.name);
          if (calcComm > 0) {
            nextHasComm = true;
            nextComm = calcComm.toString();
          }
        }
      }
      if (selectedSrc.name !== 'VES' && selectedSrc.appliesIgtf) {
        if (parsedDed !== null && parsedDed > 0) {
          const calcIgtf = round(parsedDed * (selectedSrc.igtfPercent || 3) / 100, selectedSrc.name);
          if (calcIgtf > 0) {
            nextHasIgtf = true;
            nextIgtf = calcIgtf.toString();
          }
        }
      }
    }

    setNewTransfer({
      ...newTransfer,
      sourceAssetId: srcId,
      amountReceived: autoFill,
      hasCommission: nextHasComm,
      commissionAmount: nextComm,
      hasIgtf: nextHasIgtf,
      igtfAmount: nextIgtf
    });
  };

  const handleDestChange = (destId) => {
    const selectedDest = assets.find(a => a.id === destId);
    const currentSrc = assets.find(a => a.id === newTransfer.sourceAssetId);
    let autoFill = newTransfer.amountReceived;

    if (currentSrc && selectedDest && currentSrc.name === selectedDest.name && newTransfer.amountDeducted) {
      autoFill = newTransfer.amountDeducted;
    } else if (currentSrc && selectedDest && currentSrc.name !== selectedDest.name && (!autoFill || !userEditedReceivedRef.current)) {
      const suggested = calcSuggestedReceived(newTransfer.amountDeducted, currentTransferDate, currentSrc, selectedDest);
      if (suggested) autoFill = suggested;
    }

    setNewTransfer({
      ...newTransfer,
      destAssetId: destId,
      amountReceived: autoFill
    });
  };

  const handleAmountDeductedChange = (val) => {
    let autoFill = newTransfer.amountReceived;
    if (isSameCurrency) {
      autoFill = val;
    } else if (!autoFill || !userEditedReceivedRef.current) {
      const suggested = calcSuggestedReceived(val, currentTransferDate, src, dest);
      if (suggested) autoFill = suggested;
    }

    const parsedDed = parseAmount(val);
    let nextComm = newTransfer.commissionAmount;
    let nextHasComm = newTransfer.hasCommission;
    let nextIgtf = newTransfer.igtfAmount;
    let nextHasIgtf = newTransfer.hasIgtf;

    if (src) {
      if (src.hasTransferCommission || src.commissionPercent > 0 || src.commissionFixed > 0) {
        if (parsedDed !== null && parsedDed > 0) {
          const calcComm = round((parsedDed * ((src.commissionPercent || 0) / 100)) + (src.commissionFixed || 0), src.name);
          if (calcComm > 0) {
            nextHasComm = true;
            nextComm = calcComm.toString();
          }
        } else {
          nextComm = '';
        }
      }
      if (src.name !== 'VES' && src.appliesIgtf) {
        if (parsedDed !== null && parsedDed > 0) {
          const calcIgtf = round(parsedDed * (src.igtfPercent || 3) / 100, src.name);
          if (calcIgtf > 0) {
            nextHasIgtf = true;
            nextIgtf = calcIgtf.toString();
          }
        } else {
          nextIgtf = '';
        }
      }
    }

    setNewTransfer({
      ...newTransfer,
      amountDeducted: val,
      amountReceived: autoFill,
      hasCommission: nextHasComm,
      commissionAmount: nextComm,
      hasIgtf: nextHasIgtf,
      igtfAmount: nextIgtf
    });
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={handleClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>{newTransfer.id ? 'Editar Transferencia / Cambio' : 'Transferencia / Cambio'}</h2>
          <div style={{ width: '64px' }} />
        </div>
        <form onSubmit={onSubmit}>
          <div className="input-group">
            <label>Cuenta de Origen</label>
            <CustomSelect
              placeholder="Seleccionar Origen"
              title="Seleccionar Cuenta de Origen"
              value={newTransfer.sourceAssetId}
              onChange={e => handleSourceChange(e.target.value)}
              options={assets.map(a => ({
                value: a.id,
                label: `${a.location} (${a.name}) - Bal: ${formatAmount(a.amount, a.name)}`
              }))}
            />
          </div>

          <div className="input-group">
            <label>Cuenta de Destino</label>
            <CustomSelect
              placeholder="Seleccionar Destino"
              title="Seleccionar Cuenta de Destino"
              value={newTransfer.destAssetId}
              onChange={e => handleDestChange(e.target.value)}
              options={assets.filter(a => a.id !== newTransfer.sourceAssetId).map(a => ({
                value: a.id,
                label: `${a.location} (${a.name})`
              }))}
            />
          </div>

          {/* Fecha y hora con valor por defecto ahora, chips Hoy / Ayer y selector datetime-local sin fechas futuras */}
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ margin: 0 }}>Fecha y hora</label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={handleSetToday}
                  style={{
                    background: isToday ? '#0284c7' : '#1e293b',
                    border: '1px solid ' + (isToday ? '#0284c7' : '#334155'),
                    color: isToday ? '#fff' : '#cbd5e1',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  style={{
                    background: isYesterday ? '#0284c7' : '#1e293b',
                    border: '1px solid ' + (isYesterday ? '#0284c7' : '#334155'),
                    color: isYesterday ? '#fff' : '#cbd5e1',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Ayer
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              className="input-field"
              value={currentTransferDate}
              max={maxDateTime}
              onChange={e => handleDateChange(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>{isSameCurrency ? 'Monto a transferir' : 'Monto Deducido'}</label>
            <input
              type="text"
              inputMode="decimal"
              className="input-field"
              value={newTransfer.amountDeducted}
              onChange={e => handleAmountDeductedChange(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>

          {!isSameCurrency && (
            <div className="input-group">
              <label>Monto Recibido</label>
              <input
                type="text"
                inputMode="decimal"
                className="input-field"
                value={newTransfer.amountReceived || ''}
                onChange={e => {
                  userEditedReceivedRef.current = true;
                  setNewTransfer({ ...newTransfer, amountReceived: e.target.value });
                }}
                placeholder="0,00"
                required
              />
              {suggestedRateInfo && (
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.35rem', display: 'flex', alignItems: 'flex-start', gap: '0.3rem' }}>
                  <span>💡</span>
                  <span>{suggestedRateInfo.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Comisiones bancarias e IGTF configurados/propuestos */}
          <div style={{ marginTop: '0.75rem', padding: '0.85rem', background: '#151b26', borderRadius: '12px', border: '1px solid #2a3447', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🧾</span>
              <span>Comisión bancaria e IGTF (editables)</span>
            </div>

            {/* Comisión */}
            <div style={{ marginBottom: src && src.name !== 'VES' && src.appliesIgtf ? '0.75rem' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    id="hasCommission"
                    checked={Boolean(newTransfer.hasCommission)}
                    onChange={e => setNewTransfer({ ...newTransfer, hasCommission: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Comisión por transferencia</span>
                </label>
                {newTransfer.hasCommission && (
                  <div style={{ width: '110px' }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input-field"
                      placeholder="0,00"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', textAlign: 'right' }}
                      value={newTransfer.commissionAmount || ''}
                      onChange={e => setNewTransfer({ ...newTransfer, commissionAmount: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* IGTF si aplica */}
            {src && src.name !== 'VES' && src.appliesIgtf && (
              <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #232c3d' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    <input
                      type="checkbox"
                      id="hasIgtf"
                      checked={Boolean(newTransfer.hasIgtf)}
                      onChange={e => setNewTransfer({ ...newTransfer, hasIgtf: e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Aplica IGTF ({src.igtfPercent || 3}%)</span>
                  </label>
                  {newTransfer.hasIgtf && (
                    <div style={{ width: '110px' }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="input-field"
                        placeholder="0,00"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', textAlign: 'right' }}
                        value={newTransfer.igtfAmount || ''}
                        onChange={e => setNewTransfer({ ...newTransfer, igtfAmount: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isSameCurrency && newTransfer.amountDeducted && newTransfer.amountReceived && src && dest && (() => {
            const parsedRec = parseAmount(newTransfer.amountReceived);
            const parsedDed = parseAmount(newTransfer.amountDeducted);
            if (!parsedRec || !parsedDed || parsedDed <= 0) return null;
            return (
              <div
                style={{
                  marginTop: '0.5rem',
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#232c3d',
                  border: '1px solid #2a3447',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              >
                <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>Tasa de cambio aplicada:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: 600, color: '#10b981' }}>
                  <div>
                    1 {src.name} = {formatAmount(parsedRec / parsedDed, dest.name)} {dest.name}
                  </div>
                  <div style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.75rem' }}>
                    1 {dest.name} = {formatAmount(parsedDed / parsedRec, src.name)} {src.name}
                  </div>
                </div>
              </div>
            );
          })()}

          {validationError && (
            <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
              {validationError}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {newTransfer.id ? 'Guardar Cambios' : 'Completar Transferencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
