import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatAmount } from '../../../utils/formatters';

export default function ExchangeGapBar({ exchangeGapData }) {
  const [showGapChart, setShowGapChart] = useState(false);

  if (!exchangeGapData) return null;

  return (
    <>
      <div
        className="glass-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          fontSize: '0.82rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
          <span>⚖️</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Brecha:</span>
          <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Paralelo ({formatAmount(exchangeGapData.paralelo, 'VES')} Bs.) vs BCV ({formatAmount(exchangeGapData.bcv, 'VES')} Bs.)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: exchangeGapData.currentGap > 15 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: exchangeGapData.currentGap > 15 ? 'var(--color-danger)' : 'var(--color-accent)'
            }}
          >
            {exchangeGapData.currentGap >= 0 ? '+' : ''}{exchangeGapData.currentGap}%
          </span>
          {exchangeGapData.historyPoints?.length > 0 && (
            <button
              type="button"
              onClick={() => setShowGapChart(!showGapChart)}
              aria-label="Alternar gráfico de brecha cambiaria"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                padding: '2px 4px'
              }}
            >
              {showGapChart ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {showGapChart && exchangeGapData.historyPoints?.length > 0 && (
        <div className="glass-card" style={{ padding: '0.75rem', borderRadius: '12px', marginBottom: '1.5rem', background: 'var(--bg-surface)' }}>
          <div style={{ width: '100%', height: 130 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={exchangeGapData.historyPoints} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} unit="%" />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Brecha']}
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="gap" stroke="var(--color-accent)" fillOpacity={1} fill="url(#gapGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
