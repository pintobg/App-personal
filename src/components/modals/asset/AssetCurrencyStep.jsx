import React from 'react';
import CurrencyIcon from '../../common/CurrencyIcon';
import { PRESET_FIAT, PRESET_CRYPTO } from './assetUtils';

export default function AssetCurrencyStep({
  newAsset,
  setNewAsset,
  isCustomAsset,
  setIsCustomAsset,
  assetValidationError,
  setAssetValidationError,
  suggestedSymbols,
  setSuggestedSymbols,
  validateAndFetchCurrency,
  handleSelectFromList,
  filteredBinanceList,
  filteredFiatList,
  formatPreviewRate,
  setAssetStep
}) {
  return (
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
                flexDirection: 'column'
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
  );
}
