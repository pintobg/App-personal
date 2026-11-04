import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { translateCategory, formatAmount, formatNumber } from '../../../utils/formatters';
import { COLORS } from '../../../utils/constants';
import ExpenseCategoryBreakdown from './ExpenseCategoryBreakdown';
import { createPieSectorRenderer } from './PieSectorRenderer';

export default function ExpensePieChart({
  pieData = [],
  timeFrame,
  setTimeFrame,
  onOpenDetailCategory,
  allCategories = []
}) {
  const [selectedPieCategory, setSelectedPieCategory] = useState(null);

  const totalPieUsd = pieData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const activeIndex = pieData.findIndex(item => item.name === selectedPieCategory);
  const activeItem = activeIndex >= 0 ? pieData[activeIndex] : null;
  const activeColor = activeIndex >= 0 ? COLORS[activeIndex % COLORS.length] : 'var(--text-primary)';

  const renderDissectedSector = useMemo(
    () => createPieSectorRenderer({ activeItem, totalPieUsd }),
    [activeItem, totalPieUsd]
  );

  const centerValue = activeItem ? activeItem.value : totalPieUsd;
  const centerAmountText = `$${formatAmount(centerValue, 'USD')}`;
  const totalShortText = `Total: $${formatNumber(totalPieUsd, 0)}`;
  const longestLen = Math.max(
    centerAmountText.length,
    activeItem ? Math.min(14, translateCategory(activeItem.name).length) : 10,
    activeItem ? totalShortText.length - 2 : 0
  );

  const extraRadius = Math.max(0, (longestLen - 8) * 2.5) + (activeItem ? 5 : 0);
  const adaptiveInnerRadius = Math.min(72, Math.round(56 + extraRadius));
  const adaptiveOuterRadius = adaptiveInnerRadius + 24;
  const adaptiveChartHeight = Math.max(235, (adaptiveOuterRadius + 34) * 2);
  const safeCenterWidth = Math.round(adaptiveInnerRadius * 1.66);
  const amountFontSize = centerAmountText.length > 11 ? '0.84rem' : centerAmountText.length > 9 ? '0.92rem' : '1rem';

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '2px'
        }}
      >
        {['daily', 'weekly', 'monthly', 'last30', 'all'].map(tf => {
          const tfLabels = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual', last30: 'Últimos 30 días', all: 'Todo' };
          return (
            <button
              key={tf}
              className="btn"
              style={{
                flex: '1 0 auto',
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                textAlign: 'center',
                border: timeFrame === tf ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                background: timeFrame === tf ? 'var(--primary-color)' : 'var(--bg-surface)',
                color: timeFrame === tf ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              onClick={() => {
                setTimeFrame(tf);
                setSelectedPieCategory(null);
              }}
            >
              {tfLabels[tf]}
            </button>
          );
        })}
      </div>

      <div className="glass-card" style={{ padding: '1rem 0.75rem 0.9rem', borderRadius: '16px' }}>
        {pieData.length === 0 ? (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Sin datos de gastos para este período
          </div>
        ) : (
          <>
            <div style={{ position: 'relative', width: '100%', height: `${adaptiveChartHeight}px`, transition: 'height 0.2s ease' }}>
              <ResponsiveContainer width="100%" height={adaptiveChartHeight}>
                <PieChart margin={{ top: 20, right: 28, bottom: 20, left: 28 }} style={{ outline: 'none' }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={adaptiveInnerRadius}
                    outerRadius={adaptiveOuterRadius}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                    shape={renderDissectedSector}
                    onClick={(entry) => {
                      const clickedName = entry?.name || entry?.payload?.name;
                      if (!clickedName) return;
                      setSelectedPieCategory(prev => (prev === clickedName ? null : clickedName));
                    }}
                  >
                    {pieData.map((entry, index) => {
                      const catObj = allCategories.find(c => c.name === entry.name || c.id === entry.name);
                      const fillColor = catObj?.color || COLORS[index % COLORS.length];
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={fillColor}
                          style={{ outline: 'none' }}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div
                onClick={() => setSelectedPieCategory(null)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${safeCenterWidth}px`,
                  padding: '0 4px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: activeItem ? 'pointer' : 'default',
                  userSelect: 'none',
                  pointerEvents: activeItem ? 'auto' : 'none'
                }}
              >
                {activeItem ? (
                  <>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: activeColor,
                        maxWidth: `${safeCenterWidth - 8}px`,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2
                      }}
                    >
                      {translateCategory(activeItem.name)}
                    </span>
                    <span
                      style={{
                        fontSize: amountFontSize,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        lineHeight: 1.25,
                        marginTop: '2px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {centerAmountText}
                    </span>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        marginTop: '1px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {totalShortText}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Total Gastos
                    </span>
                    <span style={{ fontSize: amountFontSize, fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {centerAmountText}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '0.35rem 0.6rem',
                paddingTop: '0.35rem',
                marginTop: '0.15rem'
              }}
            >
              {pieData.map((entry, index) => {
                const isSelected = activeItem && activeItem.name === entry.name;
                const catObj = allCategories.find(c => c.name === entry.name || c.id === entry.name);
                const color = catObj?.color || COLORS[index % COLORS.length];
                return (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => setSelectedPieCategory(prev => (prev === entry.name ? null : entry.name))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.74rem',
                      color: isSelected ? 'var(--text-primary)' : color,
                      backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                      border: isSelected ? `1px solid ${color}` : '1px solid transparent',
                      borderRadius: '9999px',
                      padding: '2px 8px',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      opacity: activeItem && !isSelected ? 0.55 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        flexShrink: 0
                      }}
                    />
                    <span>{translateCategory(entry.name)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ExpenseCategoryBreakdown
        pieData={pieData}
        totalPieUsd={totalPieUsd}
        allCategories={allCategories}
        onOpenDetailCategory={onOpenDetailCategory}
      />
    </>
  );
}
