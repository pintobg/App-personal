import React from 'react';
import { translateCategory, formatNumber, formatAmount } from '../../../utils/formatters';
import { COLORS } from '../../../utils/constants';
import { tint } from '../../../utils/colors';

const CATEGORY_ICONS = {
  'Vivienda': '🏠',
  'Alimentación': '🍔',
  'Transporte': '🚗',
  'Salud': '💊',
  'Entretenimiento': '🎉',
  'Compras': '🛍️',
  'Cuidado Personal': '💈',
  'Educación': '📚',
  'Deudas/Préstamos': '💳',
  'Sin categoría': '❓',
  'Transferencia': '🔄',
  'Otros': '📦'
};

export default function ExpenseCategoryBreakdown({
  pieData = [],
  totalPieUsd,
  allCategories = [],
  onOpenDetailCategory
}) {
  if (pieData.length === 0) return null;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h3 style={{ fontSize: 'clamp(1rem, 4vw, 1.15rem)', margin: '0 0 0.85rem', color: 'var(--text-primary)' }}>
        Desglose por Categoría (USD)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {pieData.map((entry, index) => {
          const catObj = allCategories.find(c => c.name === entry.name || c.id === entry.name);
          const color = catObj?.color || COLORS[index % COLORS.length];
          const icon = catObj?.icon || CATEGORY_ICONS[entry.name] || '🏷️';
          const pct = totalPieUsd > 0 ? formatNumber((entry.value / totalPieUsd) * 100, 1) : '0,0';
          return (
            <div
              key={entry.name}
              className="glass-card"
              onClick={() => onOpenDetailCategory && onOpenDetailCategory({ name: entry.name, color })}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.05rem',
                borderRadius: '16px',
                gap: '0.75rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: tint(color, 0.15),
                    border: `1.5px solid ${tint(color, 0.31)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    flexShrink: 0
                  }}
                >
                  {icon}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {translateCategory(entry.name)}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                    {pct}% del total
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  ${formatAmount(entry.value, 'USD')}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-accent)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
                  <span>Ver transacciones</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
