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
  setValidationError,
  isEditing,
  onClose,
  handleSaveAndAddAnotherClick
}) {
  return (
    <>
      {/* Fecha */}
      <div className="input-group">
        <label>Fecha</label>
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
        <label>Descripción / Concepto (Opcional)</label>
        <input
          type="text"
          className="input-field"
          placeholder="ej. Almuerzo, Zapatos, Mercado, Salario quincenal..."
          value={newTx.notes || ''}
          onChange={e => setNewTx(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      {validationError && (
        <div style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
          {validationError}
        </div>
      )}

      <div className="modal-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            onClose();
            if (setValidationError) setValidationError('');
          }}
          style={{ flex: 1, minWidth: '90px' }}
        >
          Cancelar
        </button>
        {!isEditing && (
          <button
            type="button"
            className="btn"
            onClick={handleSaveAndAddAnotherClick}
            style={{
              flex: 1.5,
              minWidth: '150px',
              background: 'var(--color-accent-soft)',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-accent-border)',
              fontWeight: 600
            }}
          >
            Guardar y agregar otro
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          style={{ flex: 1.5, minWidth: '120px' }}
        >
          {isEditing ? 'Actualizar Transacción' : 'Guardar Transacción'}
        </button>
      </div>
    </>
  );
}
