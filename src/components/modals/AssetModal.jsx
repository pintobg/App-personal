import { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../common/CustomSelect';
import CurrencyIcon from '../common/CurrencyIcon';
import { VENEZUELAN_BANKS, INTERNATIONAL_WALLETS_BANKS, CRYPTO_WALLETS } from '../../utils/constants';
import { KNOWN_FIAT_CURRENCIES } from '../../hooks/useRates';
import { parseAmount, round } from '../../domain/money';

const PRESET_FIAT = ['VES', 'USD', 'EUR'];
const PRESET_CRYPTO = ['USDT', 'USDC', 'BTC', 'ETH', 'SOL', 'BNB', 'ZEC', 'LTC'];

function getSimilarSymbols(input, candidates = [], maxResults = 5) {
  const clean = (input || '').trim().toUpperCase();
  if (!clean) return [];

  const scored = [];
  for (const cand of candidates) {
    const c = cand.toUpperCase();
    if (c === clean) continue;

    let score = 0;
    if (c.startsWith(clean) || clean.startsWith(c)) score += 5;
    if (c.includes(clean) || clean.includes(c)) score += 3;

    // Character set overlap (catches transpositions like USCD -> USDC)
    const cleanChars = clean.split('');
    const candChars = c.split('');
    const common = cleanChars.filter(ch => candChars.includes(ch)).length;
    const lenDiff = Math.abs(clean.length - c.length);
    if (lenDiff <= 2 && common >= Math.max(2, clean.length - 1)) {
      score += 4 - lenDiff;
    }

    if (score > 0) {
      scored.push({ symbol: c, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.symbol);
}

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
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: initialType || 'fiat',
    amount: '',
    location: '',
    hasTransferCommission: false,
    commissionPercent: '',
    commissionFixed: '',
    appliesIgtf: false,
    igtfPercent: '3'
  });

  useEffect(() => {
    if (isOpen) {
      setNewAsset({
        name: '',
        type: initialType || 'fiat',
        amount: '',
        location: '',
        hasTransferCommission: false,
        commissionPercent: '',
        commissionFixed: '',
        appliesIgtf: false,
        igtfPercent: '3'
      });
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
    setNewAsset({
      name: '',
      type: initialType || 'fiat',
      amount: '',
      location: '',
      hasTransferCommission: false,
      commissionPercent: '',
      commissionFixed: '',
      appliesIgtf: false,
      igtfPercent: '3'
    });
    setAssetStep(2);
    setIsCustomAsset(false);
    setIsCustomLocation(false);
    setAssetValidationError('');
    setSuggestedSymbols([]);
    setIsAssetValidating(false);
    onClose();
  };

  const validateAndFetchCurrency = async (symbol, type) => {
    const sym = (symbol || '').trim().toUpperCase();
    if (!sym) {
      setAssetValidationError('Por favor ingresa o selecciona el código de la moneda.');
      return false;
    }

    setIsAssetValidating(true);
    setAssetValidationError('');
    setSuggestedSymbols([]);

    if (type === 'fiat') {
      const isKnownFiat = knownFiatCurrencies.some(f => f.code === sym);
      if (isKnownFiat || sym === 'VES' || sym === 'USD' || sym === 'EUR') {
        setIsAssetValidating(false);
        return true;
      }

      // Check if it exists in rates or open.er-api
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
          const data = await res.json();
          if (data?.rates?.[sym] && Number(data.rates[sym]) > 0) {
            const usdRate = 1 / Number(data.rates[sym]);
            if (setRates) {
              setRates(prev => ({ ...prev, [sym]: usdRate }));
            }
            setIsAssetValidating(false);
            return true;
          }
        }
      } catch {
        // Fallback to local check
      }

      const fiatCodes = knownFiatCurrencies.map(f => f.code);
      const suggestions = getSimilarSymbols(sym, fiatCodes);
      setSuggestedSymbols(suggestions);
      setAssetValidationError(
        `La moneda fiat "${sym}" no existe o está mal escrita. Verifica el código oficial (ej. VES, USD, EUR, COP, BRL) o selecciónala del listado.`
      );
      setIsAssetValidating(false);
      return false;
    }

    // Crypto validation against Binance Public API
    if (sym === 'USDT') {
      if (setRates) setRates(prev => ({ ...prev, USDT: 1 }));
      setIsAssetValidating(false);
      return true;
    }

    try {
      // 1. Check direct <SYM>USDT pair on Binance (e.g., USDCUSDT, BTCUSDT, ETHUSDT)
      const directRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(sym)}USDT`);
      if (directRes.ok) {
        const data = await directRes.json();
        const price = Number(data?.price);
        if (price > 0) {
          if (setRates) {
            setRates(prev => ({ ...prev, [sym]: price }));
          }
          setIsAssetValidating(false);
          return true;
        }
      }

      // 2. Check inverse USDT<SYM> pair on Binance
      const inverseRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=USDT${encodeURIComponent(sym)}`);
      if (inverseRes.ok) {
        const invData = await inverseRes.json();
        const invPrice = Number(invData?.price);
        if (invPrice > 0) {
          const computedRate = 1 / invPrice;
          if (setRates) {
            setRates(prev => ({ ...prev, [sym]: computedRate }));
          }
          setIsAssetValidating(false);
          return true;
        }
      }

      // Not found on Binance -> show warning and suggestions
      const suggestions = getSimilarSymbols(sym, binanceSymbols);
      setSuggestedSymbols(suggestions);
      setAssetValidationError(
        `La criptomoneda "${sym}" no fue encontrada en Binance o está mal escrita. Por favor verifica el símbolo o selecciónala del listado.`
      );
      setIsAssetValidating(false);
      return false;
    } catch {
      // If offline but exists in known rates/catalog
      if (rates[sym] && rates[sym] > 0) {
        setIsAssetValidating(false);
        return true;
      }
      setAssetValidationError('No se pudo conectar con la API pública de Binance para verificar la moneda. Verifica tu conexión.');
      setIsAssetValidating(false);
      return false;
    }
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
    const ok = await validateAndFetchCurrency(clean, newAsset.type);
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
      const isValid = await validateAndFetchCurrency(newAsset.name, newAsset.type);
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

  const formatPreviewRate = (sym) => {
    const r = rates[sym];
    if (!r || r <= 0) return null;
    if (sym === 'VES') return `Bs. ${(r < 1 ? 1 / r : r).toFixed(2)} / $`;
    if (sym === 'USD') return '$1.00';
    const maxDec = r < 0.01 ? 6 : r < 1 ? 4 : 2;
    return `$${r.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: maxDec })}`;
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
                  {(newAsset.type === 'fiat' ? PRESET_FIAT : PRESET_CRYPTO).map(a => (
                    <button
                      key={a}
                      type="button"
                      className={`segmented-btn ${newAsset.name === a && !isCustomAsset ? 'active-success' : ''}`}
                      onClick={() => {
                        setNewAsset({
                          ...newAsset,
                          name: a,
                          appliesIgtf: a !== 'VES',
                          igtfPercent: '3'
                        });
                        setIsCustomAsset(false);
                        setAssetValidationError('');
                        setSuggestedSymbols([]);
                        validateAndFetchCurrency(a, newAsset.type).then(ok => {
                          if (ok) setAssetStep(3);
                        });
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      <CurrencyIcon symbol={a} type={newAsset.type} size={20} />
                      <span>{a}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`segmented-btn ${isCustomAsset ? 'active-success' : ''}`}
                    onClick={() => {
                      setNewAsset({ ...newAsset, name: '' });
                      setIsCustomAsset(true);
                      setAssetValidationError('');
                      setSuggestedSymbols([]);
                    }}
                  >
                    + Otro / Buscar
                  </button>
                </div>

                {isCustomAsset && (
                  <div>
                    <input
                      type="text"
                      className="input-field"
                      placeholder={
                        newAsset.type === 'crypto'
                          ? 'Buscar cripto en Binance (ej. USDC, DOGE, XRP, ADA)...'
                          : 'Buscar moneda fiat (ej. COP, BRL, ARS, MXN, GBP)...'
                      }
                      value={newAsset.name}
                      onChange={e => {
                        setNewAsset({ ...newAsset, name: e.target.value.toUpperCase() });
                        if (assetValidationError) setAssetValidationError('');
                      }}
                      autoFocus
                      required
                    />

                    {/* Warning Alert if Unrecognized or Misspelled */}
                    {assetValidationError && (
                      <div
                        style={{
                          marginTop: '0.65rem',
                          padding: '0.75rem 0.85rem',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#fca5a5',
                          fontSize: '0.82rem',
                          lineHeight: 1.4
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                          <span style={{ fontSize: '1rem', lineHeight: 1 }}>⚠️</span>
                          <span>{assetValidationError}</span>
                        </div>
                        {suggestedSymbols.length > 0 && (
                          <div style={{ marginTop: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>¿Quisiste decir?</span>
                            {suggestedSymbols.map(sug => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => handleSelectFromList(sug)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: '8px',
                                  border: '1px solid #10b981',
                                  background: '#14332b',
                                  color: '#10b981',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <CurrencyIcon symbol={sug} type={newAsset.type} size={16} />
                                <span>{sug}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Searchable List from Binance or Fiat Catalog */}
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                        {newAsset.type === 'crypto'
                          ? 'Listado disponible en Binance (toca para seleccionar):'
                          : 'Monedas oficiales disponibles (toca para seleccionar):'}
                      </div>
                      <div
                        style={{
                          maxHeight: '185px',
                          overflowY: 'auto',
                          borderRadius: '12px',
                          border: '1px solid #2a3447',
                          background: '#151b26',
                          display: 'flex',
                          flexDirection: 'column',
                          divideY: '1px solid #232c3d'
                        }}
                      >
                        {newAsset.type === 'crypto' ? (
                          filteredBinanceList.length === 0 ? (
                            <div style={{ padding: '0.85rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                              No se encontraron coincidencias en Binance para "{newAsset.name}".
                            </div>
                          ) : (
                            filteredBinanceList.map(sym => {
                              const priceStr = formatPreviewRate(sym);
                              return (
                                <button
                                  key={sym}
                                  type="button"
                                  onClick={() => handleSelectFromList(sym)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.55rem 0.75rem',
                                    background: newAsset.name === sym ? '#1e293b' : 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid #1f2937',
                                    color: '#f1f5f9',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <CurrencyIcon symbol={sym} type="crypto" size={26} />
                                    <div>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{sym}</div>
                                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Binance Spot ({sym}/USDT)</div>
                                    </div>
                                  </div>
                                  {priceStr && (
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                                      {priceStr}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )
                        ) : (
                          filteredFiatList.length === 0 ? (
                            <div style={{ padding: '0.85rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                              No se encontraron monedas fiat para "{newAsset.name}".
                            </div>
                          ) : (
                            filteredFiatList.map(item => {
                              const priceStr = formatPreviewRate(item.code);
                              return (
                                <button
                                  key={item.code}
                                  type="button"
                                  onClick={() => handleSelectFromList(item.code)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.55rem 0.75rem',
                                    background: newAsset.name === item.code ? '#1e293b' : 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid #1f2937',
                                    color: '#f1f5f9',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <CurrencyIcon symbol={item.code} type="fiat" size={26} />
                                    <div>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{item.code}</div>
                                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.name}</div>
                                    </div>
                                  </div>
                                  {priceStr && (
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#10b981' }}>
                                      {priceStr}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!isCustomAsset && assetValidationError && (
                  <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    ⚠️ {assetValidationError}
                  </div>
                )}
              </div>
            )}

            {assetStep === 3 && (
              <div className="input-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '10px', background: '#171f2e', border: '1px solid #2a3447' }}>
                  <CurrencyIcon symbol={newAsset.name} type={newAsset.type} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                      Moneda seleccionada: {newAsset.name}
                    </div>
                    {formatPreviewRate(newAsset.name) && (
                      <div style={{ fontSize: '0.72rem', color: '#10b981' }}>
                        Cotización actual: {formatPreviewRate(newAsset.name)}
                      </div>
                    )}
                  </div>
                </div>

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
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '10px', background: '#171f2e', border: '1px solid #2a3447' }}>
                  <CurrencyIcon symbol={newAsset.name} type={newAsset.type} size={28} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {newAsset.location} ({newAsset.name})
                    </div>
                    {formatPreviewRate(newAsset.name) && (
                      <div style={{ fontSize: '0.72rem', color: '#10b981' }}>
                        Tasa: {formatPreviewRate(newAsset.name)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="input-group">
                  <label>Balance Inicial ({newAsset.name})</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field"
                    placeholder="0,00"
                    value={newAsset.amount}
                    onChange={e => setNewAsset({ ...newAsset, amount: e.target.value })}
                    autoFocus
                    required
                  />
                </div>

                {/* Comisiones configurables e IGTF */}
                <div style={{ marginTop: '1rem', padding: '0.85rem', background: '#151b26', borderRadius: '12px', border: '1px solid #2a3447' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>⚙️</span>
                    <span>Costos y Comisiones de la cuenta</span>
                  </div>

                  {/* Transferencia saliente */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={newAsset.hasTransferCommission}
                        onChange={e => setNewAsset({ ...newAsset, hasTransferCommission: e.target.checked })}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>Comisión por transferencia saliente</span>
                    </label>

                    {newAsset.hasTransferCommission && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>% Comisión</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="input-field"
                            placeholder="0,3 %"
                            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                            value={newAsset.commissionPercent}
                            onChange={e => setNewAsset({ ...newAsset, commissionPercent: e.target.value })}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Monto fijo ({newAsset.name})</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="input-field"
                            placeholder="0,00"
                            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                            value={newAsset.commissionFixed}
                            onChange={e => setNewAsset({ ...newAsset, commissionFixed: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* IGTF para divisas */}
                  {newAsset.name !== 'VES' && (
                    <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #232c3d' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={newAsset.appliesIgtf}
                          onChange={e => setNewAsset({ ...newAsset, appliesIgtf: e.target.checked })}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>Aplica IGTF en pagos en divisas</span>
                      </label>

                      {newAsset.appliesIgtf && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Porcentaje de IGTF (%)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="input-field"
                            placeholder="3 %"
                            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                            value={newAsset.igtfPercent}
                            onChange={e => setNewAsset({ ...newAsset, igtfPercent: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
