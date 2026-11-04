import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatAmount, formatPercent, formatNumber } from '../../../utils/formatters';

export default function EvolutionAreaChart({
  evolutionStats,
  evolutionGrouping,
  setEvolutionGrouping
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Variación en el período</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
            <span
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: evolutionStats.diff >= 0 ? 'var(--color-accent)' : 'var(--color-danger)'
              }}
            >
              {evolutionStats.diff >= 0 ? '+' : '-'}${formatAmount(Math.abs(evolutionStats.diff), 'USD')}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: '8px',
                background: evolutionStats.diff >= 0 ? 'var(--color-accent-soft)' : 'var(--color-danger-soft)',
                color: evolutionStats.diff >= 0 ? 'var(--color-accent)' : 'var(--color-danger)'
              }}
            >
              {formatPercent(evolutionStats.diffPercent, 1, { signed: evolutionStats.diff >= 0 })}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '3px' }}>
          <button
            type="button"
            onClick={() => setEvolutionGrouping('weekly')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '12px',
              border: 'none',
              background: evolutionGrouping === 'weekly' ? 'var(--color-accent-soft)' : 'transparent',
              color: evolutionGrouping === 'weekly' ? 'var(--color-accent)' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Semanas
          </button>
          <button
            type="button"
            onClick={() => setEvolutionGrouping('monthly')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '12px',
              border: 'none',
              background: evolutionGrouping === 'monthly' ? 'var(--color-accent-soft)' : 'transparent',
              color: evolutionGrouping === 'monthly' ? 'var(--color-accent)' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Meses
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1rem 0.5rem 0.75rem 0', height: '280px', borderRadius: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={evolutionStats.points}
            margin={{ top: 16, right: 12, left: -18, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--text-secondary)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              dy={6}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              tickFormatter={(val) => `$${val >= 1000 ? `${formatNumber(val / 1000, 1)}k` : formatNumber(val, 0)}`}
            />
            <Tooltip
              formatter={(value) => [
                `$${formatAmount(value, 'USD')} USD`,
                'Total'
              ]}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem'
              }}
              itemStyle={{ color: 'var(--color-accent)', fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              name="Total"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="var(--color-accent-soft)"
              dot={{ r: 3.5, fill: 'var(--color-accent)', strokeWidth: 1.5, stroke: 'var(--bg-surface)' }}
              activeDot={{ r: 5.5, fill: 'var(--color-accent)', stroke: 'var(--text-primary)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
