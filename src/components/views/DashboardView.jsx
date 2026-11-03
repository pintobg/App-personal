import { useState, useMemo, useContext } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import CategoryDetailModal from '../modals/CategoryDetailModal';
import NetWorthCard from './dashboard/NetWorthCard';
import MonthSummary from './dashboard/MonthSummary';
import DashboardAlerts from './dashboard/DashboardAlerts';
import ExchangeGapBar from './dashboard/ExchangeGapBar';
import DashboardCharts from './dashboard/DashboardCharts';
import DashboardBudgets from './dashboard/DashboardBudgets';
import DashboardObligations from './dashboard/DashboardObligations';
import {
  calculateMonthlyComparison,
  calculateExchangeGapData,
  calculateBudgetStats,
  calculateDashboardAlerts,
  calculateWealthEvolution
} from '../../domain/dashboard';

export default function DashboardView({
  isBalanceHidden,
  setIsBalanceHidden,
  grandTotalUsd,
  alternateGrandTotalUsd,
  referenceRate,
  setReferenceRate,
  rateHistory,
  rates,
  ratesDetails,
  totalSpentUsd,
  timeFrame,
  setTimeFrame,
  pieData = [],
  nextPayments = [],
  nextCollections = [],
  onNavigateTransactions,
  budgets = {},
  transactions = [],
  assets = [],
  obligations = [],
  onOpenBudgetModal,
  auth,
  onOpenAuthModal,
  getCategoryName,
  onOpenCategories,
  categories = [],
  onOpenSettings
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

  const exchangeGapData = useMemo(() => {
    return calculateExchangeGapData(rates, ratesDetails, rateHistory);
  }, [rates, ratesDetails, rateHistory]);

  const budgetStats = useMemo(() => {
    return calculateBudgetStats(transactions, budgets, rates, getCategoryName);
  }, [transactions, budgets, rates, getCategoryName]);

  const alerts = useMemo(() => {
    return calculateDashboardAlerts(allObligations, budgetStats);
  }, [allObligations, budgetStats]);

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
      {/* 1. Tarjeta de patrimonio total */}
      <NetWorthCard
        isBalanceHidden={isBalanceHidden}
        setIsBalanceHidden={setIsBalanceHidden}
        grandTotalUsd={grandTotalUsd}
        alternateGrandTotalUsd={alternateGrandTotalUsd}
        referenceRate={referenceRate}
        setReferenceRate={setReferenceRate}
        rates={rates}
        ratesDetails={ratesDetails}
        auth={auth}
        onOpenAuthModal={onOpenAuthModal}
        onOpenSettings={onOpenSettings}
      />

      {/* 2. Resumen del mes */}
      <MonthSummary
        monthlyMetrics={monthlyMetrics}
        isBalanceHidden={isBalanceHidden}
        onNavigateTransactions={onNavigateTransactions}
      />

      {/* 3. Alertas y vencimientos */}
      <DashboardAlerts alerts={alerts} />

      {/* 4. Brecha cambiaria en una línea */}
      <ExchangeGapBar exchangeGapData={exchangeGapData} />

      {/* 5. Gráficos interactivos colapsables */}
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

      {/* 6. Presupuestos mensuales */}
      <DashboardBudgets
        budgetStats={budgetStats}
        onOpenBudgetModal={onOpenBudgetModal}
        onOpenCategories={onOpenCategories}
        allCategories={allCategories}
      />

      {/* 7. Próximos pagos y cobros */}
      <DashboardObligations
        nextPayments={nextPayments}
        nextCollections={nextCollections}
      />
    </div>
  );
}
