import React from 'react';
import { toLocalDateString } from '../../../utils/dates';

export default function TransactionFormFooter({
  newTx,
  setNewTx,
  todayStr,
  yesterdayStr,
  isToday,
  isYesterday,
  showCustomDatePicker,
  setShowCustomDatePicker,
  validationError,
  setValidationError: _setValidationError,
  isEditing,
  onClose: _onClose,
  handleSaveAndAddAnotherClick,
  section = 'all' // 'details' (fecha y nota) | 'actions' (botones) | 'all'
}) {
  const showDetails = section === 'all' || section === 'details';
  const showActions = section === 'all' || section === 'actions';
  return (
    <>
      {showDetails && (
      <>
      {/* Fecha */}
      <div className="input-group">
        <label className="form-section-label">Fecha</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${isToday && !showCustomDatePicker ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', borderRadius: '16px' }}
            onClick={() => {
              setShowCustomDatePicker(false);
              setNewTx(prev => ({ ...prev, date: todayStr }));
            }}
          >
            Hoy
          </button>
          <button
            type="button"
            className={`btn ${isYesterday && !showCustomDatePicker ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', borderRadius: '16px' }}
            onClick={() => {
              setShowCustomDatePicker(false);
              setNewTx(prev => ({ ...prev, date: yesterdayStr }));
            }}
          >
            Ayer
          </button>
          <button
            type="button"
            className={`btn ${showCustomDatePicker || (!isToday && !isYesterday) ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', borderRadius: '16px' }}
            onClick={() => setShowCustomDatePicker(true)}
          >
            Otra
          </button>
        </div>

        {(showCustomDatePicker || (!isToday && !isYesterday)) && (
          <input
            type="date"
            className="input-field"
            value={newTx.date ? toLocalDateString(newTx.date) : todayStr}
            onChange={e => setNewTx(prev => ({ ...prev, date: e.target.value }))}
            required
          />
        )}
      </div>

      {/* Nota opcional */}
      <div className="input-group">
        <label className="form-section-label" htmlFor="tx-note">Nota</label>
        <input
          id="tx-note"
          type="text"
          className="input-field"
          placeholder="Ej. almuerzo, mercado, quincena"
          value={newTx.notes || ''}
          onChange={e => setNewTx(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>
      </>
      )}

      {showActions && (
        <div className="sticky-form-footer">
          {validationError && (
            <div className="form-error" role="alert">{validationError}</div>
          )}
          <button type="submit" className="btn-save">
            {isEditing ? 'Guardar cambios' : 'Guardar'}
          </button>
          {!isEditing && (
            <button type="button" className="link-btn" onClick={handleSaveAndAddAnotherClick}>
              Guardar y agregar otro
            </button>
          )}
        </div>
      )}
    </>
  );
}
