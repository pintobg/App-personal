import { formatPercent } from '../../../utils/formatters';
import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { formatCalcNumber, formatShortDate, formatFullDate } from './calculatorUtils';

export default function RateHistoryChart({
  rateHistory = [],
  historyCurrency,
  setHistoryCurrency,
  historyRange,
  setHistoryRange,
  historySeries = [],
  historyStats,
  historyCurrencyMeta,
  onSelectDateFromHistory
}) {
  return (
    <div className="glass-card" style={{ padding: '1rem 1.1rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Historial de tasas
          </h3>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Evolución diaria en Bolívares (Bs) • Toca una fecha para usarla
          </div>
        </div>
      </div>

      {/* Selector de Moneda del Historial */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }}>
        {[
          { id: 'bcvUsd', label: 'USD BCV', activeBg: 'var(--color-success-soft)', activeColor: 'var(--color-success)', border: 'var(--color-success-border)' },
          { id: 'bcvEur', label: 'EUR BCV', activeBg: 'var(--color-info-soft)', activeColor: 'var(--color-info)', border: 'var(--color-info-border)' },
          { id: 'paralelo', label: 'Paralelo', activeBg: 'var(--color-warning-soft)', activeColor: 'var(--color-warning)', border: 'var(--color-warning-border)' }
        ].map(tab => {
          const isActive = historyCurrency === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setHistoryCurrency(tab.id)}
              style={{
                flex: 1,
                padding: '0.38rem 0.6rem',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: isActive ? `1px solid ${tab.border}` : '1px solid var(--border-color)',
                background: isActive ? tab.activeBg : 'var(--bg-surface-elevated)',
                color: isActive ? tab.activeColor : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Selector de Rango */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
          {historyCurrencyMeta.subtitle}
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {[
            { label: '7D', value: 7 },
            { label: '15D', value: 15 },
            { label: '30D', value: 30 },
            { label: '90D', value: 90 }
          ].map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => setHistoryRange(r.value)}
              style={{
                padding: '0.22rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: historyRange === r.value ? '1px solid var(--color-accent)' : '1px solid transparent',
                background: historyRange === r.value ? 'var(--color-accent-soft)' : 'transparent',
                color: historyRange === r.value ? 'var(--color-accent)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRÁFICO RECHARTS */}
      {historySeries.length > 0 ? (
        <div style={{ width: '100%', height: 180, marginBottom: '0.85rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="calcRateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={historyCurrencyMeta.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={historyCurrencyMeta.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={10}
                tickLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `Bs. ${val}`}
              />
              <Tooltip
                formatter={(val) => [`Bs. ${formatCalcNumber(val, 2)}`, historyCurrencyMeta.label]}
                labelFormatter={(_, arr) => {
                  const item = arr?.[0]?.payload;
                  return item?.date ? formatFullDate(item.date) : '';
                }}
                contentStyle={{ backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={historyCurrencyMeta.color}
                fillOpacity={1}
                fill="url(#calcRateGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Cargando historial...
        </div>
      )}

      {/* RESUMEN DE ESTADÍSTICAS */}
      {historyStats && historyStats.latest > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', padding: '0.65rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '0.85rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>Mínimo</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              Bs. {formatCalcNumber(historyStats.min, 2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>Máximo</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              Bs. {formatCalcNumber(historyStats.max, 2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>Variación</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: historyStats.changeBs >= 0 ? 'var(--color-success)' : 'var(--color-warning)', marginTop: '2px' }}>
              {historyStats.changeBs >= 0 ? '+' : ''}{formatCalcNumber(historyStats.changeBs, 2)} Bs.
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>% Periodo</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: historyStats.changePct >= 0 ? 'var(--color-success)' : 'var(--color-warning)', marginTop: '2px' }}>
              {formatPercent(historyStats.changePct, 2, { signed: true })}
            </div>
          </div>
        </div>
      )}

      {/* TABLA DE FECHAS */}
      {historySeries.length > 0 && (
        <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '6px 10px' }}>Fecha</th>
                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Tasa</th>
                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Var. Diaria</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {historySeries.slice().reverse().map((item) => (
                <tr
                  key={item.date}
                  style={{ borderBottom: '1px solid var(--bg-surface-elevated)', cursor: 'pointer' }}
                  onClick={() => onSelectDateFromHistory(item.date)}
                >
                  <td style={{ padding: '6px 10px', color: 'var(--text-primary)' }}>
                    {formatShortDate(item.date)}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: historyCurrencyMeta.color }}>
                    Bs. {formatCalcNumber(item.value, 2)}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', color: item.diff >= 0 ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 500 }}>
                    {item.diff !== 0 ? formatPercent(item.diffPct, 1, { signed: true }) : '—'}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--color-success-soft)', color: 'var(--color-success)', fontWeight: 600 }}>
                      Usar
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
