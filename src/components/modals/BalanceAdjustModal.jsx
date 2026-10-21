import { useState, useEffect } from 'react';
import { parseAmount, sub } from '../../domain/money';

export default function BalanceAdjustModal({ asset, onClose, onAdjustBalance }) {
  const [newAdjustedAmount, setNewAdjustedAmount] = useState('');
  const [hasTransferCommission, setHasTransferCommission] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState('');
  const [commissionFixed, setCommissionFixed] = useState('');
  const [appliesIgtf, setAppliesIgtf] = useState(false);
  const [igtfPercent, setIgtfPercent] = useState('3');
  const [error, setError] = useState('');

  useEffect(() => {
    if (asset) {
      setNewAdjustedAmount(asset.amount != null ? asset.amount.toString() : '');
      setHasTransferCommission(Boolean(asset.hasTransferCommission));
      setCommissionPercent(asset.commissionPercent != null ? asset.commissionPercent.toString() : '');
      setCommissionFixed(asset.commissionFixed != null ? asset.commissionFixed.toString() : '');
      setAppliesIgtf(Boolean(asset.appliesIgtf));
      setIgtfPercent(asset.igtfPercent != null ? asset.igtfPercent.toString() : '3');
      setError('');
    } else {
      setNewAdjustedAmount('');
      setHasTransferCommission(false);
      setCommissionPercent('');
      setCommissionFixed('');
      setAppliesIgtf(false);
      setIgtfPercent('3');
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
    const commPct = hasTransferCommission && commissionPercent ? (parseAmount(commissionPercent) ?? 0) : 0;
    const commFix = hasTransferCommission && commissionFixed ? (parseAmount(commissionFixed) ?? 0) : 0;
    const igtfPct = appliesIgtf && igtfPercent ? (parseAmount(igtfPercent) ?? 3) : 3;

    onAdjustBalance(asset, delta, amountNum, {
      hasTransferCommission: Boolean(hasTransferCommission),
      commissionPercent: Number(commPct) || 0,
      commissionFixed: Number(commFix) || 0,
      appliesIgtf: asset.name !== 'VES' && Boolean(appliesIgtf),
      igtfPercent: Number(igtfPct) || 3
    });

    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={handleClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>Ajustar Balance y Cuenta</h2>
          <div style={{ width: '64px' }} />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Balance para {asset.name} ({asset.location})</label>
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

          {/* Configuración de comisiones e IGTF */}
          <div style={{ marginTop: '1rem', padding: '0.85rem', background: '#151b26', borderRadius: '12px', border: '1px solid #2a3447' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>⚙️</span>
              <span>Costos y Comisiones configuradas</span>
            </div>

            {/* Transferencia saliente */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={hasTransferCommission}
                  onChange={e => setHasTransferCommission(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>Comisión por transferencia saliente</span>
              </label>

              {hasTransferCommission && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>% Comisión</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input-field"
                      placeholder="0,3 %"
                      style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                      value={commissionPercent}
                      onChange={e => setCommissionPercent(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Monto fijo ({asset.name})</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input-field"
                      placeholder="0,00"
                      style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                      value={commissionFixed}
                      onChange={e => setCommissionFixed(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* IGTF para divisas */}
            {asset.name !== 'VES' && (
              <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #232c3d' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={appliesIgtf}
                    onChange={e => setAppliesIgtf(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Aplica IGTF en pagos en divisas</span>
                </label>

                {appliesIgtf && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Porcentaje de IGTF (%)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input-field"
                      placeholder="3 %"
                      style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                      value={igtfPercent}
                      onChange={e => setIgtfPercent(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
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
