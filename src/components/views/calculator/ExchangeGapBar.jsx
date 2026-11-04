import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatAmount, formatNumber } from '../../../utils/formatters';
import { InfoHint } from '../../ui';

export default function ExchangeGapBar({ exchangeGapData }) {
  const [showGapChart, setShowGapChart] = useState(false);

  // Sin ambas tasas la brecha no aporta nada: se oculta para no cargar la pantalla.
  if (!exchangeGapData || !(exchangeGapData.bcv > 0) || !(exchangeGapData.paralelo > 0)) return null;

  return (
    <>
      <div className="gap-row">
        <div className="gap-row-main">
          <span className="gap-row-title">
            Diferencia BCV vs paralelo
            <InfoHint label="Qué es la diferencia BCV vs paralelo">
              Cuánto más caro está el dólar paralelo que el oficial del BCV, en porcentaje.
            </InfoHint>
          </span>
          <span className="gap-row-sub">
            Paralelo {formatAmount(exchangeGapData.paralelo, 'VES')} · BCV {formatAmount(exchangeGapData.bcv, 'VES')}
          </span>
        </div>
        <span className={`gap-pill${exchangeGapData.currentGap > 15 ? ' high' : ''}`}>
          {exchangeGapData.currentGap >= 0 ? '+' : ''}{formatNumber(exchangeGapData.currentGap, 1)}%
        </span>
        {exchangeGapData.historyPoints?.length > 0 && (
          <button
            type="button"
            className="icon-hit"
            onClick={() => setShowGapChart(!showGapChart)}
            aria-expanded={showGapChart}
            aria-label={showGapChart ? 'Ocultar gráfico de la diferencia' : 'Ver gráfico de la diferencia'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showGapChart ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        )}
      </div>

      {showGapChart && exchangeGapData.historyPoints?.length > 0 && (
        <div className="gap-chart">
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
                  formatter={(val) => [`${val}%`, 'Diferencia']}
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
