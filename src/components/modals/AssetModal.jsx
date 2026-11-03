import React, { useState, useEffect, useMemo } from 'react';
import { KNOWN_FIAT_CURRENCIES } from '../../services/ratesService';
import { parseAmount, round } from '../../domain/money';
import { validateAndFetchCurrency, formatPreviewRate as formatRateUtil } from './asset/assetUtils';
import AssetCurrencyStep from './asset/AssetCurrencyStep';
import AssetDetailsStep from './asset/AssetDetailsStep';

const createDefaultAsset = (type = 'fiat') => ({
  name: '',
  type: type || 'fiat',
  amount: '',
  location: '',
  hasTransferCommission: false,
  commissionPercent: '',
  commissionFixed: '',
  appliesIgtf: false,
  igtfPercent: '3'
});

export default function AssetModal({
  isOpen,
  onClose,
  onAddAsset,
  showToast,
  initialType = 'fiat',
  rates = {},
  setRates,
  binanceSymbols = [],
  knownFiatCurrencies = KNOWN_FIAT_CURRENCIES
}) {
  const [assetStep, setAssetStep] = useState(2);
  const [isCustomAsset, setIsCustomAsset] = useState(false);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [assetValidationError, setAssetValidationError] = useState('');
  const [suggestedSymbols, setSuggestedSymbols] = useState([]);
  const [isAssetValidating, setIsAssetValidating] = useState(false);
  const [newAsset, setNewAsset] = useState(() => createDefaultAsset(initialType));

  useEffect(() => {
    if (isOpen) {
      setNewAsset(createDefaultAsset(initialType));
      setAssetStep(2);
      setIsCustomAsset(false);
      setIsCustomLocation(false);
      setAssetValidationError('');
      setSuggestedSymbols([]);
      setIsAssetValidating(false);
    }
  }, [isOpen, initialType]);

  const filteredBinanceList = useMemo(() => {
    const q = (newAsset.name || '').trim().toUpperCase();
    const list = binanceSymbols.length > 0
      ? binanceSymbols
      : ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'TRX', 'TON', 'AVAX', 'DOT', 'LINK', 'POL', 'LTC', 'ZEC', 'DASH', 'DAI', 'SHIB', 'PEPE', 'SUI', 'NEAR', 'UNI'];
    if (!q) return list.slice(0, 20);
    return list
      .filter(sym => sym.includes(q))
      .sort((a, b) => {
        const aStarts = a.startsWith(q) ? 0 : 1;
        const bStarts = b.startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.length - b.length;
      })
      .slice(0, 20);
  }, [newAsset.name, binanceSymbols]);

  const filteredFiatList = useMemo(() => {
    const q = (newAsset.name || '').trim().toUpperCase();
    if (!q) return knownFiatCurrencies;
    return knownFiatCurrencies.filter(
      item => item.code.includes(q) || item.name.toUpperCase().includes(q)
    );
  }, [newAsset.name, knownFiatCurrencies]);

  if (!isOpen) return null;

  const resetModal = () => {
    setNewAsset(createDefaultAsset(initialType));
    setAssetStep(2);
    setIsCustomAsset(false);
    setIsCustomLocation(false);
    setAssetValidationError('');
    setSuggestedSymbols([]);
    setIsAssetValidating(false);
    onClose();
  };

  const handleValidateCurrency = async (symbol, type) => {
    setIsAssetValidating(true);
    setAssetValidationError('');
    setSuggestedSymbols([]);

    const res = await validateAndFetchCurrency({
      symbol,
      type,
      knownFiatCurrencies,
      binanceSymbols,
      rates,
      setRates
    });

    setIsAssetValidating(false);
    if (!res.ok) {
      setAssetValidationError(res.error);
      setSuggestedSymbols(res.suggestions || []);
      return false;
    }
    return true;
  };

  const handleSelectFromList = async (sym) => {
    const clean = sym.toUpperCase();
    setNewAsset(prev => ({
      ...prev,
      name: clean,
      appliesIgtf: clean !== 'VES',
      igtfPercent: '3'
    }));
    setAssetValidationError('');
    setSuggestedSymbols([]);
    const ok = await handleValidateCurrency(clean, newAsset.type);
    if (ok) {
      setAssetStep(3);
    }
  };

  const handleAssetNextStep = async () => {
    if (assetStep === 1) {
      if (!newAsset.type) return;
    } else if (assetStep === 2) {
      if (!newAsset.name || !newAsset.name.trim()) {
        setAssetValidationError('Selecciona o escribe el nombre de una moneda para continuar.');
        return;
      }
      const isValid = await handleValidateCurrency(newAsset.name, newAsset.type);
      if (!isValid) return;
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
    const parsed = parseAmount(newAsset.amount);
    if (parsed === null) {
      setAssetValidationError('Por favor ingresa un monto válido (ej. 1.234,56 o 1234.56).');
      return;
    }
    const cleanSym = newAsset.name.trim().toUpperCase();
    const commPct = newAsset.hasTransferCommission && newAsset.commissionPercent
      ? (parseAmount(newAsset.commissionPercent) ?? 0)
      : 0;
    const commFix = newAsset.hasTransferCommission && newAsset.commissionFixed
      ? (parseAmount(newAsset.commissionFixed) ?? 0)
      : 0;
    const igtfPct = newAsset.appliesIgtf && newAsset.igtfPercent
      ? (parseAmount(newAsset.igtfPercent) ?? 3)
      : 3;

    onAddAsset({
      ...newAsset,
      name: cleanSym,
      amount: round(parsed, cleanSym),
      hasTransferCommission: Boolean(newAsset.hasTransferCommission),
      commissionPercent: Number(commPct) || 0,
      commissionFixed: Number(commFix) || 0,
      appliesIgtf: cleanSym !== 'VES' && Boolean(newAsset.appliesIgtf),
      igtfPercent: Number(igtfPct) || 3
    });
    resetModal();
    if (showToast) showToast('Cuenta guardada con éxito');
  };

  const formatPreviewRate = (sym) => formatRateUtil(sym, rates);

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
              <AssetCurrencyStep
                newAsset={newAsset}
                setNewAsset={setNewAsset}
                isCustomAsset={isCustomAsset}
                setIsCustomAsset={setIsCustomAsset}
                assetValidationError={assetValidationError}
                setAssetValidationError={setAssetValidationError}
                suggestedSymbols={suggestedSymbols}
                setSuggestedSymbols={setSuggestedSymbols}
                validateAndFetchCurrency={handleValidateCurrency}
                handleSelectFromList={handleSelectFromList}
                filteredBinanceList={filteredBinanceList}
                filteredFiatList={filteredFiatList}
                formatPreviewRate={formatPreviewRate}
                setAssetStep={setAssetStep}
              />
            )}

            {(assetStep === 3 || assetStep === 4) && (
              <AssetDetailsStep
                assetStep={assetStep}
                newAsset={newAsset}
                setNewAsset={setNewAsset}
                isCustomLocation={isCustomLocation}
                setIsCustomLocation={setIsCustomLocation}
                formatPreviewRate={formatPreviewRate}
              />
            )}
          </div>

          <div className="modal-actions">
            {assetStep > 1 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setAssetStep(prev => prev - 1); setAssetValidationError(''); setSuggestedSymbols([]); }}
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
                {isAssetValidating ? 'Verificando en Binance...' : 'Siguiente'}
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
