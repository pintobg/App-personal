import { useState, useEffect } from 'react';

export default function BalanceAdjustModal({ asset, onClose, onAdjustBalance, showToast }) {
  const [newAdjustedAmount, setNewAdjustedAmount] = useState('');

  useEffect(() => {
    if (asset) {
      setNewAdjustedAmount(asset.amount != null ? asset.amount.toString() : '');
    } else {
      setNewAdjustedAmount('');
    }
  }, [asset]);

  if (!asset) return null;

  const handleClose = () => {
    setNewAdjustedAmount('');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!asset || !newAdjustedAmount) return;
    const amountNum = Number(newAdjustedAmount);
    if (isNaN(amountNum)) return;

    const delta = amountNum - Number(asset.amount);
    if (delta !== 0) {
      onAdjustBalance(asset.name, asset.location, delta);
    }

    setNewAdjustedAmount('');
    onClose();
    if (showToast) showToast('Balance ajustado');
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
              type="number"
              step="any"
              className="input-field"
              placeholder="0.00"
              value={newAdjustedAmount}
              onChange={e => setNewAdjustedAmount(e.target.value)}
              autoFocus
              required
            />
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
