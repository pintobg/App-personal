import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import EmptyState from '../common/EmptyState';
import CategoryDetailModal from '../modals/CategoryDetailModal';
import {
  formatAmount,
  getCurrencySymbol,
  getTxUsdEquivalent,
  getBudgetColor,
  translateCategory,
  translateFrequency
} from '../../utils/formatters';
import { COLORS } from '../../utils/constants';
import { toLocalDateString, parseLocalDate } from '../../utils/dates';

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

export default function DashboardView({
  isBalanceHidden,
  setIsBalanceHidden,
  grandTotalUsd,
  rates,
  totalIncomeUsd,
  totalSpentUsd,
  timeFrame,
  setTimeFrame,
  pieData,
  nextPayments,
  nextCollections,
  onNavigateTransactions,
  budgets = {},
  transactions = [],
  assets = [],
  onOpenBudgetModal,
  auth,
  onOpenAuthModal
}) {
  const [activeChart, setActiveChart] = useState('pie'); // 'pie' | 'evolution'
  const [evolutionGrouping, setEvolutionGrouping] = useState('monthly'); // 'weekly' | 'monthly'
  const [selectedPieCategory, setSelectedPieCategory] = useState(null);
  const [detailCategory, setDetailCategory] = useState(null); // { name, color } | null

  const budgetStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthSpents = (transactions || []).filter(t => {
      if (t.type !== 'spent') return false;
      const d = parseLocalDate(toLocalDateString(t.date));
      return d >= startOfMonth && d <= endOfMonth;
    });

    const categorySpentMap = {};
    monthSpents.forEach(t => {
      const cat = translateCategory(t.category) || 'Otros';
      const usdAmount = getTxUsdEquivalent(t, rates);
      categorySpentMap[cat] = (categorySpentMap[cat] || 0) + usdAmount;
    });

    // Categories with active budget (limit > 0)
    const activeBudgetCategories = Object.entries(budgets || {})
      .filter(([_, limit]) => Number(limit) > 0)
      .map(([cat, limit]) => {
        const spent = categorySpentMap[cat] || 0;
        const numLimit = Number(limit);
        const percent = numLimit > 0 ? (spent / numLimit) * 100 : 0;
        return {
          category: cat,
          limit: numLimit,
          spent,
          percent
        };
      })
      .sort((a, b) => b.percent - a.percent);

    const totalBudgetUsd = activeBudgetCategories.reduce((sum, item) => sum + item.limit, 0);
    const totalSpentInBudgets = activeBudgetCategories.reduce((sum, item) => sum + item.spent, 0);
    const totalPercent = totalBudgetUsd > 0 ? (totalSpentInBudgets / totalBudgetUsd) * 100 : 0;

    return {
      activeBudgetCategories,
      totalBudgetUsd,
      totalSpentInBudgets,
      totalPercent
    };
  }, [transactions, budgets, rates]);

  // RECONSTRUCTION OF HISTORICAL WEALTH EVOLUTION
  const evolutionStats = useMemo(() => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const currentTotal = Number(grandTotalUsd) || 0;

    if (evolutionGrouping === 'weekly') {
      const numWeeks = 8;
      const periods = [];
      for (let i = numWeeks - 1; i >= 0; i--) {
        const end = new Date(now.getTime() - i * 7 * 86400000);
        const start = new Date(now.getTime() - (i + 1) * 7 * 86400000);
        const label = i === 0 ? 'Hoy' : `${start.getDate()} ${monthNames[start.getMonth()]}`;
        periods.push({ start, end, label });
      }

      const deltas = periods.map(p => {
        let delta = 0;
        let income = 0;
        let spent = 0;
        (transactions || []).forEach(t => {
          if (!t.date) return;
          const d = new Date(t.date);
          if (d >= p.start && d <= p.end) {
            const val = getTxUsdEquivalent(t, rates);
            if (t.type === 'income') {
              delta += val;
              income += val;
            } else if (t.type === 'spent') {
              delta -= val;
              spent += val;
            }
          }
        });
        return { delta, income, spent };
      });

      // Work backwards from currentTotal
      const balances = new Array(numWeeks);
      let running = currentTotal;
      for (let i = numWeeks - 1; i >= 0; i--) {
        balances[i] = Math.max(0, running);
        running = running - deltas[i].delta;
      }

      const points = periods.map((p, idx) => ({
        label: p.label,
        balance: Math.round(balances[idx] * 100) / 100,
        income: Math.round(deltas[idx].income * 100) / 100,
        spent: Math.round(deltas[idx].spent * 100) / 100
      }));

      const startBalance = points[0]?.balance || 0;
      const diff = currentTotal - startBalance;
      const diffPercent = startBalance > 0 ? (diff / startBalance) * 100 : 0;

      return { points, diff, diffPercent };
    } else {
      // Monthly grouping (last 6 months)
      const numMonths = 6;
      const periods = [];
      for (let i = numMonths - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
        const end = i === 0
          ? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          : new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        const label = `${monthNames[start.getMonth()]} ${String(start.getFullYear()).slice(-2)}`;
        periods.push({ start, end, label });
      }

      const deltas = periods.map(p => {
        let delta = 0;
        let income = 0;
        let spent = 0;
        (transactions || []).forEach(t => {
          if (!t.date) return;
          const d = new Date(t.date);
          if (d >= p.start && d <= p.end) {
            const val = getTxUsdEquivalent(t, rates);
            if (t.type === 'income') {
              delta += val;
              income += val;
            } else if (t.type === 'spent') {
              delta -= val;
              spent += val;
            }
          }
        });
        return { delta, income, spent };
      });

      // Work backwards from currentTotal
      const balances = new Array(numMonths);
      let running = currentTotal;
      for (let i = numMonths - 1; i >= 0; i--) {
        balances[i] = Math.max(0, running);
        running = running - deltas[i].delta;
      }

      const points = periods.map((p, idx) => ({
        label: p.label,
        balance: Math.round(balances[idx] * 100) / 100,
        income: Math.round(deltas[idx].income * 100) / 100,
        spent: Math.round(deltas[idx].spent * 100) / 100
      }));

      const startBalance = points[0]?.balance || 0;
      const diff = currentTotal - startBalance;
      const diffPercent = startBalance > 0 ? (diff / startBalance) * 100 : 0;

      return { points, diff, diffPercent };
    }
  }, [transactions, rates, grandTotalUsd, evolutionGrouping]);

  if (detailCategory) {
    return (
      <CategoryDetailModal
        onClose={() => setDetailCategory(null)}
        categoryName={detailCategory.name}
        categoryColor={detailCategory.color || '#10b981'}
        timeFrame={timeFrame}
        transactions={transactions}
        assets={assets}
        rates={rates}
        budgets={budgets}
        totalPeriodSpentUsd={totalSpentUsd}
      />
    );
  }

  return (
    <div className="view-container" style={{ padding: '0 1rem 2rem', color: 'var(--text-primary)' }}>
      <div style={{ marginTop: '1rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#98989d', fontSize: '0.9rem' }}>
            Mi balance
            <button
              onClick={() => setIsBalanceHidden(!isBalanceHidden)}
              style={{ background: 'transparent', border: 'none', color: '#98989d', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              {isBalanceHidden ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
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
              <span>
                {auth?.user
                  ? (auth.syncStatus === 'syncing'
                      ? 'Sincronizando...'
                      : auth.syncStatus === 'offline'
                      ? 'Sin conexión'
                      : auth.pendingCount > 0
                      ? `Pendiente (${auth.pendingCount})`
                      : auth.syncStatus === 'error'
                      ? 'Error, reintentar'
                      : 'Sincronizado')
                  : 'Modo local'}
              </span>
            </button>
          )}
        </div>
        <div style={{ fontSize: 'clamp(1.8rem, 7vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: '#f1f5f9', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'clamp(1.2rem, 5vw, 1.6rem)' }}>$</span>
          {isBalanceHidden ? '***' : formatAmount(grandTotalUsd, 'USD')}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Bs {rates['VES'] ? (1 / rates['VES']).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'} / $
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <div
          className="glass-card"
          style={{ flex: 1, padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '16px', backgroundColor: '#1b2230', cursor: 'pointer' }}
          onClick={() => onNavigateTransactions('income')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </div>
            <span style={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 500 }}>Ingresos <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>&gt;</span></span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f1f5f9', marginTop: '0.5rem' }}>
            $ {isBalanceHidden ? '***' : formatAmount(totalIncomeUsd, 'USD')}
          </div>
        </div>
        <div
          className="glass-card"
          style={{ flex: 1, padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '16px', backgroundColor: '#1b2230', cursor: 'pointer' }}
          onClick={() => onNavigateTransactions('spent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
            </div>
            <span style={{ color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 500 }}>Gastos <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>&gt;</span></span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f1f5f9', marginTop: '0.5rem' }}>
            $ {isBalanceHidden ? '***' : formatAmount(totalSpentUsd, 'USD')}
          </div>
        </div>
      </div>

      <div style={{ width: '50%', margin: '0 auto 2rem', borderBottom: '1px solid #2a3447' }}></div>

      {/* HEADER DE GRÁFICOS CON TOGGLE ENTRE TORTA Y EVOLUCIÓN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 className="section-title" style={{ padding: 0, color: '#f1f5f9', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>
          {activeChart === 'pie' ? 'Análisis de Gastos' : 'Evolución Patrimonial'}
        </h2>

        {/* TOGGLE SEGMENTADO */}
        <div
          style={{
            display: 'inline-flex',
            background: '#1b2230',
            borderRadius: '24px',
            padding: '3px',
            border: '1px solid #2a3447'
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
              color: activeChart === 'pie' ? '#ffffff' : '#94a3b8',
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
              color: activeChart === 'evolution' ? '#ffffff' : '#94a3b8',
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
      </div>

      {/* VISTA 1: GRÁFICO DE TORTA DE GASTOS */}
      {activeChart === 'pie' && (
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
            {['daily', 'weekly', 'monthly', 'all'].map(tf => {
              const tfLabels = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual', all: 'Todo' };
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
                    border: timeFrame === tf ? '1px solid var(--primary-color)' : '1px solid #2a3447',
                    background: timeFrame === tf ? 'var(--primary-color)' : '#1b2230',
                    color: timeFrame === tf ? '#ffffff' : 'var(--text-secondary)',
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
            ) : (() => {
              const totalPieUsd = pieData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
              const activeIndex = pieData.findIndex(item => item.name === selectedPieCategory);
              const activeItem = activeIndex >= 0 ? pieData[activeIndex] : null;
              const activeColor = activeIndex >= 0 ? COLORS[activeIndex % COLORS.length] : '#f1f5f9';

              const renderDissectedSector = (props) => {
                const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, midAngle, fill, name, value } = props;
                const isSelected = activeItem && activeItem.name === name;
                const RADIAN = Math.PI / 180;
                const cos = Math.cos(-midAngle * RADIAN);
                const sin = Math.sin(-midAngle * RADIAN);
                const offset = isSelected ? 6 : 0;
                const dx = cos * offset;
                const dy = sin * offset;
                const currentOuter = isSelected ? outerRadius + 4 : outerRadius;

                const pct = totalPieUsd > 0 ? (Number(value) / totalPieUsd) * 100 : 0;
                const pctText = `${pct.toFixed(1)}%`;

                // Puntos para la línea guía (solo para la categoría seleccionada)
                const sx = cx + dx + cos * (currentOuter + 1);
                const sy = cy + dy + sin * (currentOuter + 1);
                const mx = cx + dx + cos * (currentOuter + 13);
                const my = cy + dy + sin * (currentOuter + 13);
                const isRight = cos >= 0;
                const ex = mx + (isRight ? 16 : -16);
                const ey = my;
                const arrowTipX = ex;
                const arrowBaseX = ex + (isRight ? -4.5 : 4.5);

                return (
                  <g style={{ cursor: 'pointer', outline: 'none' }}>
                    <Sector
                      cx={cx + dx}
                      cy={cy + dy}
                      innerRadius={innerRadius}
                      outerRadius={currentOuter}
                      startAngle={startAngle}
                      endAngle={endAngle}
                      fill={fill}
                      stroke="none"
                      style={{
                        cursor: 'pointer',
                        outline: 'none',
                        opacity: activeItem && !isSelected ? 0.45 : 1,
                        transition: 'opacity 0.2s ease'
                      }}
                    />
                    {isSelected && (
                      <g style={{ pointerEvents: 'none' }}>
                        {/* Punto de origen en el borde del sector */}
                        <circle cx={sx} cy={sy} r={2.2} fill={fill} />
                        {/* Línea guía angulada */}
                        <polyline
                          points={`${sx},${sy} ${mx},${my} ${ex},${ey}`}
                          fill="none"
                          stroke={fill}
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Punta de flecha al final de la línea guía */}
                        <polygon
                          points={`${arrowTipX},${ey} ${arrowBaseX},${ey - 3} ${arrowBaseX},${ey + 3}`}
                          fill={fill}
                        />
                        {/* Porcentaje al lado de la línea guía */}
                        <text
                          x={ex + (isRight ? 6 : -6)}
                          y={ey}
                          fill={fill}
                          textAnchor={isRight ? 'start' : 'end'}
                          dominantBaseline="central"
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            letterSpacing: '-0.01em'
                          }}
                        >
                          {pctText}
                        </text>
                      </g>
                    )}
                  </g>
                );
              };

              const centerValue = activeItem ? activeItem.value : totalPieUsd;
              const centerAmountText = `$${centerValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              const totalShortText = `Total: $${totalPieUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
              const amountFontSize = centerAmountText.length > 11
                ? '0.84rem'
                : centerAmountText.length > 9
                  ? '0.92rem'
                  : '1rem';

              return (
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
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                              style={{ outline: 'none' }}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Monto total siempre en el centro del anillo, adaptativo sin solaparse */}
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
                              color: '#f1f5f9',
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
                              color: '#94a3b8',
                              marginTop: '1px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {totalShortText}
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            Total Gastos
                          </span>
                          <span style={{ fontSize: amountFontSize, fontWeight: 700, color: '#f1f5f9', marginTop: '2px', whiteSpace: 'nowrap' }}>
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
                      const color = COLORS[index % COLORS.length];
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
                            color: isSelected ? '#f1f5f9' : color,
                            backgroundColor: isSelected ? '#232c3d' : 'transparent',
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
              );
            })()}
          </div>

          {/* Desglose por Categoría (interactivo -> abre página de detalle y transacciones) */}
          {pieData.length > 0 && (() => {
            const totalPieUsd = pieData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
            return (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: 'clamp(1rem, 4vw, 1.15rem)', margin: '0 0 0.85rem', color: '#f1f5f9' }}>
                  Desglose por Categoría (USD)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {pieData.map((entry, index) => {
                    const color = COLORS[index % COLORS.length];
                    const pct = totalPieUsd > 0 ? ((entry.value / totalPieUsd) * 100).toFixed(1) : '0.0';
                    return (
                      <div
                        key={entry.name}
                        className="glass-card"
                        onClick={() => setDetailCategory({ name: entry.name, color })}
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
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}></div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {translateCategory(entry.name)}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap' }}>
                              {pct}% del total
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap' }}>
                            ${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
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
          })()}
        </>
      )}

      {/* VISTA 2: GRÁFICO DE EVOLUCIÓN PATRIMONIAL */}
      {activeChart === 'evolution' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Variación en el período</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: evolutionStats.diff >= 0 ? '#10b981' : '#ef4444'
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
                    background: evolutionStats.diff >= 0 ? '#14332b' : '#311b22',
                    color: evolutionStats.diff >= 0 ? '#10b981' : '#ef4444'
                  }}
                >
                  {evolutionStats.diff >= 0 ? '+' : ''}{evolutionStats.diffPercent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* AGRUPACIÓN: SEMANAS VS MESES */}
            <div style={{ display: 'flex', gap: '0.4rem', background: '#1b2230', border: '1px solid #2a3447', borderRadius: '16px', padding: '3px' }}>
              <button
                type="button"
                onClick={() => setEvolutionGrouping('weekly')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: evolutionGrouping === 'weekly' ? '#14332b' : 'transparent',
                  color: evolutionGrouping === 'weekly' ? '#10b981' : '#94a3b8',
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
                  background: evolutionGrouping === 'monthly' ? '#14332b' : 'transparent',
                  color: evolutionGrouping === 'monthly' ? '#10b981' : '#94a3b8',
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
                <CartesianGrid strokeDasharray="3 3" stroke="#263042" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#2a3447' }}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  dy={6}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                />
                <Tooltip
                  formatter={(value) => [
                    `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
                    'Patrimonio'
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #2a3447',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    background: '#171d29',
                    color: '#f1f5f9',
                    fontSize: '0.82rem'
                  }}
                  itemStyle={{ color: '#10b981', fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Patrimonio"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="#173332"
                  dot={{ r: 3.5, fill: '#10b981', strokeWidth: 1.5, stroke: '#1b2230' }}
                  activeDot={{ r: 5.5, fill: '#10b981', stroke: '#f1f5f9', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* SECCIÓN PRESUPUESTOS MENSUALES */}
      <div style={{ marginTop: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 className="section-title" style={{ padding: 0, color: '#f1f5f9', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>
              Presupuestos Mensuales
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Control de gasto mensual por categoría
            </div>
          </div>
          <button
            type="button"
            className="btn"
            onClick={onOpenBudgetModal}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: '#14332b',
              border: '1px solid #1f5143',
              color: '#10b981',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Ajustar
          </button>
        </div>

        {budgetStats.activeBudgetCategories.length === 0 ? (
          <div className="glass-card" style={{ padding: '1.25rem 1rem', textAlign: 'center', borderRadius: '16px' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎯</span>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.25rem' }}>
              Sin presupuestos definidos
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Establece límites de gasto para mantener tus finanzas bajo control.
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenBudgetModal}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
            >
              Definir presupuestos
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* INDICADOR GENERAL TOTAL */}
            <div
              className="glass-card"
              style={{
                padding: '1rem 1.15rem',
                borderRadius: '16px',
                backgroundColor: '#1b2230',
                border: '1px solid #2a3447'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Presupuesto Total Consumido
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ${formatAmount(budgetStats.totalSpentInBudgets, 'USD')}{' '}
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                      / ${formatAmount(budgetStats.totalBudgetUsd, 'USD')}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    backgroundColor: '#232c3d',
                    color: getBudgetColor(budgetStats.totalPercent),
                    border: '1px solid #2a3447',
                    flexShrink: 0
                  }}
                >
                  {budgetStats.totalPercent.toFixed(1)}%
                </div>
              </div>

              {/* BARRA DE PROGRESO GENERAL */}
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  borderRadius: '5px',
                  backgroundColor: '#232c3d',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(budgetStats.totalPercent, 100)}%`,
                    backgroundColor: getBudgetColor(budgetStats.totalPercent),
                    borderRadius: '5px',
                    transition: 'width 0.4s ease, background-color 0.3s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                  {budgetStats.totalPercent >= 100
                    ? `⚠️ Excedido por $${formatAmount(budgetStats.totalSpentInBudgets - budgetStats.totalBudgetUsd, 'USD')}`
                    : `Disponible: $${formatAmount(budgetStats.totalBudgetUsd - budgetStats.totalSpentInBudgets, 'USD')}`}
                </span>
                <span style={{ flexShrink: 0, marginLeft: '0.5rem' }}>
                  {budgetStats.activeBudgetCategories.length} categorías activas
                </span>
              </div>
            </div>

            {/* LISTA DE CATEGORÍAS INDIVIDUALES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {budgetStats.activeBudgetCategories.map(item => {
                const color = getBudgetColor(item.percent);
                const isOverBudget = item.percent > 100;
                const icon = CATEGORY_ICONS[item.category] || '🏷️';

                return (
                  <div
                    key={item.category}
                    className="glass-card"
                    style={{
                      padding: '1rem 1.15rem',
                      borderRadius: '16px',
                      backgroundColor: '#1b2230'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {translateCategory(item.category)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Límite: ${formatAmount(item.limit, 'USD')}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isOverBudget ? 'var(--danger-color)' : '#f1f5f9' }}>
                          ${formatAmount(item.spent, 'USD')}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: color
                          }}
                        >
                          {item.percent.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* BARRA DE PROGRESO INDIVIDUAL */}
                    <div
                      style={{
                        width: '100%',
                        height: '7px',
                        borderRadius: '4px',
                        backgroundColor: '#232c3d',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(item.percent, 100)}%`,
                          backgroundColor: color,
                          borderRadius: '4px',
                          transition: 'width 0.4s ease, background-color 0.3s ease'
                        }}
                      />
                    </div>

                    {isOverBudget && (
                      <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '0.35rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>⚠️ Superado por ${formatAmount(item.spent - item.limit, 'USD')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PROXIMOS PAGOS */}
      <div style={{ marginTop: '2.5rem' }}>
        <h2 className="section-title" style={{ padding: 0, color: '#f1f5f9', fontSize: 'clamp(1rem, 4vw, 1.2rem)', marginBottom: '1rem' }}>Próximos Pagos</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {nextPayments.length === 0 && <EmptyState icon="💸" message="No hay pagos próximos" />}
          {nextPayments.map(ob => (
            <div
              key={ob.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                padding: '0.9rem 1.05rem',
                borderRadius: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                  {ob.title}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--danger-color)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  -{getCurrencySymbol(ob.currency)}{formatAmount(ob.amount, ob.currency)} {ob.currency}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  Vence: {ob.dueDate || 'Sin fecha'}
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    backgroundColor: '#232c3d',
                    border: '1px solid #2a3447',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {translateFrequency(ob.frequency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PROXIMOS COBROS */}
      <div style={{ marginTop: '2rem' }}>
        <h2 className="section-title" style={{ padding: 0, color: '#f1f5f9', fontSize: 'clamp(1rem, 4vw, 1.2rem)', marginBottom: '1rem' }}>Próximos Cobros</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {nextCollections.length === 0 && <EmptyState icon="🤝" message="No hay cobros próximos" />}
          {nextCollections.map(ob => (
            <div
              key={ob.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                padding: '0.9rem 1.05rem',
                borderRadius: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                  {ob.title}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--success-color)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  +{getCurrencySymbol(ob.currency)}{formatAmount(ob.amount, ob.currency)} {ob.currency}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  Vence: {ob.dueDate || 'Sin fecha'}
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    backgroundColor: '#232c3d',
                    border: '1px solid #2a3447',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {translateFrequency(ob.frequency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
