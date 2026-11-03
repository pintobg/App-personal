import React from 'react';
import { Amount } from '../../ui';
import CurrencyIcon from '../../common/CurrencyIcon';
import { formatAmount, getRateString } from '../../../utils/formatters';

export default function CurrencyGroupCard({
  group,
  isExpanded,
  onToggleExpand,
  grandTotalUsd,
  onAdjustAsset,
  onDeleteAsset
}) {
  const pctOfTotal = grandTotalUsd > 0 ? (group.totalUsd / grandTotalUsd) * 100 : 0;
  const rateText = getRateString(group.symbol, group.rateVal);

  return (
    <div
      className="glass-card"
      style={{
        borderRadius: '16px',
        padding: '1rem 1.15rem',
        border: isExpanded
          ? '1px solid color-mix(in srgb, var(--color-success) 35%, transparent)'
          : group.isUnrecognized
            ? '1px solid color-mix(in srgb, var(--color-warning) 45%, transparent)'
            : undefined,
        transition: 'border-color 0.2s ease'
      }}
    >
      <div
        onClick={onToggleExpand}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          gap: '0.75rem',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.displayName}</span>
            <span style={{ fontSize: '0.65rem', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', padding: '0.1rem 0.35rem', borderRadius: '4px', color: 'var(--text-secondary)', flexShrink: 0 }}>
              {group.symbol}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500, flexShrink: 0 }}>
              • {group.items.length} {group.items.length === 1 ? 'cuenta' : 'cuentas'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Amount
              amount={group.totalAmount}
              currency={group.symbol}
              secondary={group.symbol === 'USD' ? null : group.totalUsd}
              secondaryCurrency="USD"
              secondaryPrefix=""
              size="xl"
            />
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {pctOfTotal.toFixed(1)}% del total
            </span>
          </div>

          {rateText && (
            <div style={{ fontSize: '0.7rem', color: 'var(--color-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ~ {rateText}
            </div>
          )}
          {group.isUnrecognized && (
            <div style={{ fontSize: '0.7rem', color: 'var(--color-warning)' }}>
              ⚠️ Moneda sin tasa reconocida
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
          <CurrencyIcon symbol={group.symbol} type={group.type} size={38} />
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              color: isExpanded ? 'var(--color-accent)' : 'var(--text-secondary)',
              marginTop: '0.85rem'
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div
          style={{
            marginTop: '0.85rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem'
          }}
        >
          {group.items.map((item, idx) => {
            const shareInCurrency = group.totalAmount > 0 ? (item.amountNum / group.totalAmount) * 100 : 0;
            const isLast = idx === group.items.length - 1;
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.55rem 0.25rem',
                  borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '3px',
                      height: '28px',
                      borderRadius: '999px',
                      background: 'var(--color-accent-strong)',
                      opacity: 0.75,
                      flexShrink: 0
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.location}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {shareInCurrency.toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span>{formatAmount(item.amountNum, group.symbol)} {group.displayName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>•</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${formatAmount(item.usdVal, 'USD')}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => onAdjustAsset && onAdjustAsset(item)}
                    aria-label="Ajustar saldo"
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-info)', cursor: 'pointer', padding: '0.25rem', opacity: 0.85 }}
                    title="Ajustar saldo"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAsset && onDeleteAsset(item.id, item.name, item.location)}
                    aria-label="Eliminar activo"
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.25rem', opacity: 0.65 }}
                    title="Eliminar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
