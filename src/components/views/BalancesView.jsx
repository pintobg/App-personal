import EmptyState from '../common/EmptyState';
import { formatAmount, getRateString } from '../../utils/formatters';
import { getCryptoIcon, getCryptoColor } from '../../utils/constants';

export default function BalancesView({
  grandTotalUsd,
  rates,
  assets,
  activeFilter,
  setActiveFilter,
  selectedFilters,
  setSelectedFilters,
  assetsByLocation,
  accountTotalsUsd,
  uniqueAssetNames,
  deleteMode,
  onAdjustAsset,
  onDeleteAsset,
  auth,
  onOpenAuthModal
}) {
  return (
    <>
      <div style={{ padding: '0 1rem', marginTop: '1.5rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ color: '#98989d', fontSize: '0.9rem' }}>
            Balance General
          </div>
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              style={{
                background: auth?.user ? '#14332b' : '#1b2230',
                border: `1px solid ${auth?.user ? '#1f5143' : '#2a3447'}`,
                borderRadius: '9999px',
                padding: '4px 10px',
                color: auth?.user ? '#10b981' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>{auth?.user ? '☁️' : '👤'}</span>
              <span>{auth?.user ? (auth.syncStatus === 'syncing' ? 'Sincronizando...' : 'Nube activa') : 'Modo local'}</span>
            </button>
          )}
        </div>
        <div style={{ fontSize: 'clamp(1.8rem, 7vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: '#f1f5f9', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'clamp(1.2rem, 5vw, 1.6rem)' }}>$</span>
          {formatAmount(grandTotalUsd, 'USD')}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Bs {rates['VES'] ? (1 / rates['VES']).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'} / $
        </div>
      </div>

      <div style={{ padding: '0 1rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'flex',
            gap: '1.25rem',
            borderBottom: '1px solid #2a3447',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '2px'
          }}
        >
          <button
            onClick={() => { setActiveFilter('all'); setSelectedFilters([]); }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.5rem 0',
              color: activeFilter === 'all' ? '#10b981' : '#94a3b8',
              borderBottom: activeFilter === 'all' ? '2px solid #10b981' : '2px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveFilter('asset')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.5rem 0',
              color: activeFilter === 'asset' ? '#10b981' : '#94a3b8',
              borderBottom: activeFilter === 'asset' ? '2px solid #10b981' : '2px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Por Moneda
          </button>
          <button
            onClick={() => setActiveFilter('account')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.5rem 0',
              color: activeFilter === 'account' ? '#10b981' : '#94a3b8',
              borderBottom: activeFilter === 'account' ? '2px solid #10b981' : '2px solid transparent',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Por Cuenta
          </button>
        </div>

        {activeFilter === 'asset' && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              paddingTop: '0.85rem',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingBottom: '4px'
            }}
          >
            {uniqueAssetNames.map(name => (
              <button
                key={name}
                onClick={() => {
                  if (selectedFilters.includes(name)) setSelectedFilters(selectedFilters.filter(f => f !== name));
                  else setSelectedFilters([...selectedFilters, name]);
                }}
                style={{
                  padding: '0.3rem 0.8rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  border: selectedFilters.includes(name) ? '1px solid #10b981' : '1px solid #2a3447',
                  background: selectedFilters.includes(name) ? '#10b981' : '#1b2230',
                  color: selectedFilters.includes(name) ? '#ffffff' : '#94a3b8',
                  fontWeight: selectedFilters.includes(name) ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {activeFilter === 'account' && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              paddingTop: '0.85rem',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingBottom: '4px'
            }}
          >
            {Array.from(new Set(assets.map(a => a.location))).map(loc => (
              <button
                key={loc}
                onClick={() => {
                  if (selectedFilters.includes(loc)) setSelectedFilters(selectedFilters.filter(f => f !== loc));
                  else setSelectedFilters([...selectedFilters, loc]);
                }}
                style={{
                  padding: '0.3rem 0.8rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  border: selectedFilters.includes(loc) ? '1px solid #10b981' : '1px solid #2a3447',
                  background: selectedFilters.includes(loc) ? '#10b981' : '#1b2230',
                  color: selectedFilters.includes(loc) ? '#ffffff' : '#94a3b8',
                  fontWeight: selectedFilters.includes(loc) ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {loc}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '0 1rem', marginBottom: '2rem', width: '100%', boxSizing: 'border-box' }}>
        {Object.keys(assetsByLocation).length === 0 && (
          <EmptyState icon="🏦" message="No se encontraron cuentas" />
        )}
        {Object.entries(assetsByLocation).map(([location, locAssets]) => (
          <div key={location} className="portfolio-section">
            <div className="portfolio-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', marginBottom: '0.5rem', gap: '0.75rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{location}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', flexShrink: 0 }}>${formatAmount(accountTotalsUsd[location], 'USD') || 0}</span>
            </div>

            <div className="capsule-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {locAssets.map(asset => {
                const isCrypto = asset.type === 'crypto';
                const valueUsd = Number(asset.amount) * (rates[asset.name] || 0);
                const assetDisplayName = asset.name === 'VES' ? 'Bs.' : asset.name;
                const displayTitle = asset.location.toLowerCase() === 'cash' ? `${assetDisplayName} Efectivo` : assetDisplayName;

                return (
                  <div key={asset.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</span>
                        <span style={{ fontSize: '0.65rem', background: '#232c3d', border: '1px solid #2a3447', padding: '0.1rem 0.35rem', borderRadius: '4px', marginLeft: '0.5rem', color: '#94a3b8', flexShrink: 0 }}>{asset.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formatAmount(asset.amount, asset.name)} {assetDisplayName}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ${formatAmount(valueUsd, 'USD')}
                      </div>
                      {getRateString(asset.name, rates[asset.name]) && (
                        <div style={{ fontSize: '0.7rem', color: '#10b981', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ~ {getRateString(asset.name, rates[asset.name])}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', height: '100%', justifyContent: 'space-between', flexShrink: 0 }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isCrypto ? getCryptoColor(asset.name) : '#14332b', border: isCrypto ? 'none' : '1px solid #1f5143', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', color: '#fff', flexShrink: 0 }}>
                        {isCrypto ? getCryptoIcon(asset.name) : '💵'}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexShrink: 0 }}>
                        <button
                          onClick={() => onAdjustAsset(asset)}
                          style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.25rem', opacity: deleteMode ? 1 : 0.85 }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button
                          onClick={() => onDeleteAsset(asset.id, asset.name, asset.location)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', opacity: deleteMode ? 1 : 0.6 }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ width: '50%', margin: '2rem auto', borderBottom: '1px solid #2a3447' }}></div>
          </div>
        ))}
      </div>
    </>
  );
}
