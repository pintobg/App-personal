import { useState, useEffect } from 'react';
import CustomSelect from '../common/CustomSelect';
import { VENEZUELAN_BANKS, INTERNATIONAL_WALLETS_BANKS, CRYPTO_WALLETS } from '../../utils/constants';

export default function AssetModal({ isOpen, onClose, onAddAsset, showToast, initialType = 'fiat' }) {
  const [assetStep, setAssetStep] = useState(2);
  const [isCustomAsset, setIsCustomAsset] = useState(false);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [assetValidationError, setAssetValidationError] = useState('');
  const [isAssetValidating, setIsAssetValidating] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: initialType || 'fiat',
    amount: '',
    location: ''
  });

  useEffect(() => {
    if (isOpen) {
      setNewAsset({
        name: '',
        type: initialType || 'fiat',
        amount: '',
        location: ''
      });
      setAssetStep(2);
      setIsCustomAsset(false);
      setIsCustomLocation(false);
      setAssetValidationError('');
      setIsAssetValidating(false);
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const resetModal = () => {
    setNewAsset({ name: '', type: initialType || 'fiat', amount: '', location: '' });
    setAssetStep(2);
    setIsCustomAsset(false);
    setIsCustomLocation(false);
    setAssetValidationError('');
    setIsAssetValidating(false);
    onClose();
  };

  const validateCryptoAsset = async (symbol) => {
    setIsAssetValidating(true);
    setAssetValidationError('');
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`);
      if (res.ok) {
        setIsAssetValidating(false);
        return true;
      } else {
        setAssetValidationError(`El activo ${symbol.toUpperCase()} no fue encontrado en Binance.`);
        setIsAssetValidating(false);
        return false;
      }
    } catch {
      setAssetValidationError('Error al validar el activo. Verifica tu conexión de red.');
      setIsAssetValidating(false);
      return false;
    }
  };

  const handleAssetNextStep = async () => {
    if (assetStep === 1) {
      if (!newAsset.type) return;
    } else if (assetStep === 2) {
      if (!newAsset.name) return;
      if (newAsset.type === 'crypto' && isCustomAsset) {
        const isValid = await validateCryptoAsset(newAsset.name);
        if (!isValid) return;
      }
    } else if (assetStep === 3) {
      if (!newAsset.location || newAsset.location === 'Otro') return;
    }
    setAssetStep(prev => prev + 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (assetStep < 4) {
      handleAssetNextStep();
      return;
    }
    if (!newAsset.name || !newAsset.amount || !newAsset.location) return;
    onAddAsset({ ...newAsset, name: newAsset.name.toUpperCase(), amount: Number(newAsset.amount) });
    resetModal();
    if (showToast) showToast('Cuenta guardada con éxito');
  };

  const getLocationOptions = () => {
    if (newAsset.type === 'crypto') {
      return [
        ...CRYPTO_WALLETS.map(w => ({ label: w, value: w })),
        { label: 'Otro...', value: 'Otro' }
      ];
    }
    if (newAsset.name === 'VES') {
      return [
        ...VENEZUELAN_BANKS.map(bank => ({ label: bank, value: bank })),
        { label: 'Otro...', value: 'Otro' }
      ];
    }
    return [
      ...INTERNATIONAL_WALLETS_BANKS.map(b => ({ label: b, value: b })),
      { label: 'Otro...', value: 'Otro' }
    ];
  };

  const getLocationLabel = () => {
    if (newAsset.type === 'crypto') return 'Seleccionar Billetera o Exchange';
    if (newAsset.name === 'VES') return 'Seleccionar Banco';
    return 'Seleccionar Banco o Plataforma';
  };

  return (
    <div className="modal-overlay" onClick={resetModal}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={resetModal} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>{newAsset.type === 'crypto' ? 'Añadir Billetera Cripto' : 'Añadir Cuenta Fiat / Banco'}</h2>
          <div style={{ width: '64px' }} />
        </div>
        <form onSubmit={handleSubmit}>
          <div key={assetStep} className="step-transition">
            {assetStep === 1 && (
              <div className="input-group">
                <label>Tipo de Moneda</label>
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segmented-btn ${newAsset.type === 'fiat' ? 'active-success' : ''}`}
                    onClick={() => { setNewAsset({ ...newAsset, type: 'fiat', name: '' }); setAssetStep(2); }}
                  >
                    Moneda Fiat
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${newAsset.type === 'crypto' ? 'active-success' : ''}`}
                    onClick={() => { setNewAsset({ ...newAsset, type: 'crypto', name: '' }); setAssetStep(2); }}
                  >
                    Criptomoneda
                  </button>
                </div>
              </div>
            )}

            {assetStep === 2 && (
              <div className="input-group">
                <label>Nombre de la Moneda</label>
                <div className="segmented-control" style={{ flexWrap: 'wrap', marginBottom: isCustomAsset ? '0.85rem' : '0' }}>
                  {newAsset.type === 'fiat' ? (
                    <>
                      {['VES', 'USD', 'EUR'].map(a => (
                        <button
                          key={a}
                          type="button"
                          className={`segmented-btn ${newAsset.name === a && !isCustomAsset ? 'active-success' : ''}`}
                          onClick={() => { setNewAsset({ ...newAsset, name: a }); setIsCustomAsset(false); setAssetStep(3); }}
                        >
                          {a}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {['USDT', 'BTC', 'ETH', 'SOL', 'ZEC', 'LTC'].map(a => (
                        <button
                          key={a}
                          type="button"
                          className={`segmented-btn ${newAsset.name === a && !isCustomAsset ? 'active-success' : ''}`}
                          onClick={() => { setNewAsset({ ...newAsset, name: a }); setIsCustomAsset(false); setAssetStep(3); }}
                        >
                          {a}
                        </button>
                      ))}
                    </>
                  )}
                  <button
                    type="button"
                    className={`segmented-btn ${isCustomAsset ? 'active-success' : ''}`}
                    onClick={() => { setNewAsset({ ...newAsset, name: '' }); setIsCustomAsset(true); }}
                  >
                    + Otro
                  </button>
                </div>
                {isCustomAsset && (
                  <input
                    type="text"
                    className="input-field"
                    placeholder={`ej. ${newAsset.type === 'crypto' ? 'DOGE' : 'COP'}`}
                    value={newAsset.name}
                    onChange={e => setNewAsset({ ...newAsset, name: e.target.value.toUpperCase() })}
                    autoFocus
                    required
                  />
                )}
                {assetValidationError && (
                  <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    {assetValidationError}
                  </div>
                )}
              </div>
            )}

            {assetStep === 3 && (
              <div className="input-group">
                <label>{getLocationLabel()}</label>
                <CustomSelect
                  value={isCustomLocation ? 'Otro' : newAsset.location}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'Otro') {
                      setIsCustomLocation(true);
                      setNewAsset({ ...newAsset, location: '' });
                    } else {
                      setIsCustomLocation(false);
                      setNewAsset({ ...newAsset, location: val });
                    }
                  }}
                  placeholder={getLocationLabel()}
                  options={getLocationOptions()}
                  title={getLocationLabel()}
                  required
                />
                {isCustomLocation && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={`Escribe el nombre ${newAsset.type === 'crypto' ? 'de la billetera' : 'del banco o plataforma'}`}
                      value={newAsset.location}
                      onChange={e => setNewAsset({ ...newAsset, location: e.target.value })}
                      autoFocus
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {assetStep === 4 && (
              <div className="input-group">
                <label>Balance Inicial</label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  placeholder="0.00"
                  value={newAsset.amount}
                  onChange={e => setNewAsset({ ...newAsset, amount: e.target.value })}
                  autoFocus
                  required
                />
              </div>
            )}
          </div>

          <div className="modal-actions">
            {assetStep > 1 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setAssetStep(prev => prev - 1); setAssetValidationError(''); }}
              >
                Atrás
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={resetModal}>
                Cancelar
              </button>
            )}
            {assetStep < 4 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAssetNextStep}
                disabled={isAssetValidating}
              >
                {isAssetValidating ? 'Validando...' : 'Siguiente'}
              </button>
            ) : (
              <button type="submit" className="btn btn-primary">
                Guardar Balance
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
