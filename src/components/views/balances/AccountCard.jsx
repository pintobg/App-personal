import React, { memo } from 'react';
import { Amount } from '../../ui';
import CurrencyIcon from '../../common/CurrencyIcon';
import { getRateString } from '../../../utils/formatters';

const AccountCard = memo(function AccountCard({
  asset,
  valueUsd,
  rateVal,
  isUnrecognized,
  deleteMode = false,
  onAdjustAsset,
  onDeleteAsset
}) {
  const assetSymbol = (asset.name || '').trim().toUpperCase();
  const assetDisplayName = assetSymbol === 'VES' ? 'Bs.' : assetSymbol;
  const displayTitle = (asset.location || '').toLowerCase() === 'cash' ? `${assetDisplayName} Efectivo` : assetDisplayName;

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.15rem',
        borderRadius: '16px',
        gap: '0.75rem',
        border: isUnrecognized ? '1px solid color-mix(in srgb, var(--color-warning) 45%, transparent)' : undefined
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</span>
          <span style={{ fontSize: '0.65rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '4px', marginLeft: '0.5rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{assetSymbol}</span>
        </div>
        <Amount
          amount={asset.amount}
          currency={assetSymbol}
          secondary={assetSymbol === 'USD' ? null : valueUsd}
          secondaryCurrency="USD"
          secondaryPrefix=""
          size="xl"
        />
        {getRateString(assetSymbol, rateVal) && (
          <div style={{ fontSize: '0.7rem', color: 'var(--color-accent)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ~ {getRateString(assetSymbol, rateVal)}
          </div>
        )}
        {isUnrecognized && (
          <div style={{ fontSize: '0.72rem', color: 'var(--color-warning)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
            <span>⚠️ Moneda no reconocida en Binance o mal escrita</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', height: '100%', justifyContent: 'space-between', flexShrink: 0 }}>
        <CurrencyIcon symbol={assetSymbol} type={asset.type} size={38} />
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexShrink: 0 }}>
          <button
            onClick={() => onAdjustAsset && onAdjustAsset(asset)}
            aria-label="Ajustar saldo"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-info)', cursor: 'pointer', padding: '0.25rem', opacity: deleteMode ? 1 : 0.85 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button
            onClick={() => onDeleteAsset && onDeleteAsset(asset.id, asset.name, asset.location)}
            aria-label="Eliminar activo"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.25rem', opacity: deleteMode ? 1 : 0.6 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
});

export default AccountCard;
