import React, { useState, lazy, Suspense } from 'react';

const ExpensePieChart = lazy(() => import('./ExpensePieChart'));
const EvolutionAreaChart = lazy(() => import('./EvolutionAreaChart'));

export default function DashboardCharts({
  pieData = [],
  timeFrame,
  setTimeFrame,
  evolutionStats,
  evolutionGrouping,
  setEvolutionGrouping,
  onOpenDetailCategory,
  allCategories = []
}) {
  const [activeChart, setActiveChart] = useState('pie'); // 'pie' | 'evolution'
  // Gráficos plegados por defecto: la pantalla de inicio muestra primero lo esencial.
  const [isChartsCollapsed, setIsChartsCollapsedState] = useState(() => {
    try { return localStorage.getItem('dashboard_charts_open') !== '1'; } catch { return true; }
  });
  const setIsChartsCollapsed = (collapsed) => {
    setIsChartsCollapsedState(collapsed);
    try { localStorage.setItem('dashboard_charts_open', collapsed ? '0' : '1'); } catch { /* sin almacenamiento */ }
  };

  return (
    <div style={{ marginTop: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem', width: '100%' }}>
          <h2 className="section-title" style={{ padding: 0, color: 'var(--text-primary)', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>
            {isChartsCollapsed ? 'Análisis' : (activeChart === 'pie' ? 'Análisis de gastos' : 'Evolución patrimonial')}
          </h2>
          <button
            type="button"
            onClick={() => setIsChartsCollapsed(!isChartsCollapsed)}
            aria-label={isChartsCollapsed ? 'Mostrar gráficos' : 'Ocultar gráficos'}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              padding: '2px 4px',
              gap: '4px'
            }}
          >
            <span>{isChartsCollapsed ? 'Ver gráficos ▼' : 'Ocultar gráficos ▲'}</span>
          </button>
        </div>

        {!isChartsCollapsed && (
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              borderRadius: '24px',
              padding: '3px',
              border: '1px solid var(--border-color)'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveChart('pie')}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                border: 'none',
                background: activeChart === 'pie' ? 'var(--primary-color)' : 'transparent',
                color: activeChart === 'pie' ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
            >
              <span>📊</span>
              <span>Gastos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveChart('evolution')}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                border: 'none',
                background: activeChart === 'evolution' ? 'var(--primary-color)' : 'transparent',
                color: activeChart === 'evolution' ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
            >
              <span>📈</span>
              <span>Patrimonio</span>
            </button>
          </div>
        )}
      </div>

      {!isChartsCollapsed && (
        <Suspense fallback={
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Cargando gráfico...
          </div>
        }>
          {activeChart === 'pie' && (
            <ExpensePieChart
              pieData={pieData}
              timeFrame={timeFrame}
              setTimeFrame={setTimeFrame}
              onOpenDetailCategory={onOpenDetailCategory}
              allCategories={allCategories}
            />
          )}

          {activeChart === 'evolution' && (
            <EvolutionAreaChart
              evolutionStats={evolutionStats}
              evolutionGrouping={evolutionGrouping}
              setEvolutionGrouping={setEvolutionGrouping}
            />
          )}
        </Suspense>
      )}
    </div>
  );
}
