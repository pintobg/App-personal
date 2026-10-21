import { useState, useEffect } from 'react';
import { parseAmount, sub } from '../../domain/money';

export default function BalanceAdjustModal({ asset, onClose, onAdjustBalance }) {
  const [newAdjustedAmount, setNewAdjustedAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (asset) {
      setNewAdjustedAmount(asset.amount != null ? asset.amount.toString() : '');
      setError('');
    } else {
      setNewAdjustedAmount('');
      setError('');
    }
  }, [asset]);

  if (!asset) return null;

  const handleClose = () => {
    setNewAdjustedAmount('');
    setError('');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!asset || newAdjustedAmount === '') return;
    const amountNum = parseAmount(newAdjustedAmount);
    if (amountNum === null) {
      setError('Ingresa un monto válido (ej. 1.234,56 o 1234.56)');
      return;
    }

    const delta = sub(amountNum, Number(asset.amount) || 0);
    if (delta !== 0) {
      onAdjustBalance(asset, delta, amountNum);
    }

    setNewAdjustedAmount('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={handleClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>Ajustar Balance</h2>
          <div style={{ width: '64px' }} />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Nuevo Balance para {asset.name} ({asset.location})</label>
            <input
              type="text"
              inputMode="decimal"
              className="input-field"
              placeholder="0,00"
              value={newAdjustedAmount}
              onChange={e => {
                setNewAdjustedAmount(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              required
            />
            {error && (
              <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {error}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
