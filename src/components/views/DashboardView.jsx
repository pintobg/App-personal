import { useState, useMemo, useContext } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import CategoryDetailModal from '../modals/CategoryDetailModal';
import NetWorthCard from './dashboard/NetWorthCard';
import MonthSummary from './dashboard/MonthSummary';
import DashboardCharts from './dashboard/DashboardCharts';
import DashboardUpcoming from './dashboard/DashboardUpcoming';
import {
  calculateMonthlyComparison,
  calculateBudgetStats,
  calculateWealthEvolution,
  buildUpcomingDue
} from '../../domain/dashboard';

export default function DashboardView({
  isBalanceHidden,
  setIsBalanceHidden,
  grandTotalUsd,
  alternateGrandTotalUsd,
  referenceRate,
  setReferenceRate: _setReferenceRate,
  rateHistory: _rateHistory,
  rates,
  ratesDetails,
  totalSpentUsd,
  timeFrame,
  setTimeFrame,
  pieData = [],
  nextPayments: _nextPayments = [],
  nextCollections: _nextCollections = [],
  onNavigateTransactions,
  budgets = {},
  transactions = [],
  assets = [],
  obligations = [],
  onOpenBudgetModal: _onOpenBudgetModal,
  auth,
  onOpenAuthModal: _onOpenAuthModal,
  getCategoryName,
  onOpenCategories: _onOpenCategories,
  categories = [],
  onOpenSettings,
  onOpenRates,
  onOpenPlanning,
  rateNotice = null
}) {
  const finance = useContext(FinanceContext);
  const allCategories = categories.length > 0 ? categories : (finance?.categories || []);
  const allObligations = obligations.length > 0 ? obligations : (finance?.obligations || []);

  const [detailCategory, setDetailCategory] = useState(null);
  const [evolutionGrouping, setEvolutionGrouping] = useState('monthly');

  // Cálculos de dominio
  const monthlyMetrics = useMemo(() => {
    return calculateMonthlyComparison(transactions, rates);
  }, [transactions, rates]);

  const budgetStats = useMemo(() => {
    return calculateBudgetStats(transactions, budgets, rates, getCategoryName);
  }, [transactions, budgets, rates, getCategoryName]);

  const upcoming = useMemo(() => {
    return buildUpcomingDue(allObligations, budgetStats);
  }, [allObligations, budgetStats]);

  const activeBudgetCount = budgetStats?.activeBudgetCategories?.length || 0;

  const evolutionStats = useMemo(() => {
    return calculateWealthEvolution(transactions, rates, grandTotalUsd, evolutionGrouping);
  }, [transactions, rates, grandTotalUsd, evolutionGrouping]);

  if (detailCategory) {
    return (
      <CategoryDetailModal
        onClose={() => setDetailCategory(null)}
        categoryName={detailCategory.name}
        categoryColor={detailCategory.color || 'var(--color-accent)'}
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
      {/* 1. ¿Cuánto tengo? */}
      <NetWorthCard
        isBalanceHidden={isBalanceHidden}
        setIsBalanceHidden={setIsBalanceHidden}
        grandTotalUsd={grandTotalUsd}
        alternateGrandTotalUsd={alternateGrandTotalUsd}
        referenceRate={referenceRate}
        rates={rates}
        ratesDetails={ratesDetails}
        auth={auth}
        onOpenSettings={onOpenSettings}
        onOpenRates={onOpenRates}
        notice={rateNotice}
      />

      {/* 2. ¿Cómo voy este mes? */}
      <MonthSummary
        monthlyMetrics={monthlyMetrics}
        isBalanceHidden={isBalanceHidden}
        onNavigateTransactions={onNavigateTransactions}
      />

      {/* 3. ¿Qué tengo que pagar pronto? */}
      <DashboardUpcoming
        items={upcoming}
        isBalanceHidden={isBalanceHidden}
        onSeeAll={onOpenPlanning ? () => onOpenPlanning('deudas') : undefined}
      />

      {/* Enlaces discretos: presupuestos y gráficos (plegados) */}
      {activeBudgetCount > 0 && onOpenPlanning && (
        <div className="home-links">
          <button type="button" className="link-btn" onClick={() => onOpenPlanning('presupuestos')}>
            Presupuestos del mes ({activeBudgetCount}) ›
          </button>
        </div>
      )}

      <DashboardCharts
        pieData={pieData}
        timeFrame={timeFrame}
        setTimeFrame={setTimeFrame}
        evolutionStats={evolutionStats}
        evolutionGrouping={evolutionGrouping}
        setEvolutionGrouping={setEvolutionGrouping}
        onOpenDetailCategory={setDetailCategory}
        allCategories={allCategories}
      />
    </div>
  );
}
