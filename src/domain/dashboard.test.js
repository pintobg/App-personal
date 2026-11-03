import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyComparison,
  calculateExchangeGapData,
  calculateBudgetStats,
  calculateDashboardAlerts,
  calculateWealthEvolution
} from './dashboard';

describe('dashboard domain logic', () => {
  it('calculateMonthlyComparison: calcula ingresos, gastos y balance del mes actual y variación vs mes anterior', () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const prevYear = now.getMonth() === 0 ? curYear - 1 : curYear;
    const prevMonth = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0');

    const transactions = [
      { id: '1', type: 'income', amount: 500, currency: 'USD', date: `${curYear}-${curMonth}-05` },
      { id: '2', type: 'spent', amount: 200, currency: 'USD', date: `${curYear}-${curMonth}-10` },
      { id: '3', type: 'income', amount: 400, currency: 'USD', date: `${prevYear}-${prevMonth}-05` },
      { id: '4', type: 'spent', amount: 100, currency: 'USD', date: `${prevYear}-${prevMonth}-10` }
    ];

    const result = calculateMonthlyComparison(transactions, { USD: 1 });
    expect(result.curIncome).toBe(500);
    expect(result.curSpent).toBe(200);
    expect(result.curNet).toBe(300);
    expect(result.prevIncome).toBe(400);
    expect(result.prevSpent).toBe(100);
    expect(result.prevNet).toBe(300);
    expect(result.incomeDeltaPct).toBe(25); // (500 - 400)/400 * 100
    expect(result.spentDeltaPct).toBe(100); // (200 - 100)/100 * 100
  });

  it('calculateExchangeGapData: calcula brecha y mapea historial', () => {
    const rates = { bcvUsd: 50, paralelo: 60 };
    const ratesDetails = { bcvUsd: { valor: 50 }, paralelo: { valor: 60 } };
    const rateHistory = [
      { date: '2026-10-01', bcvUsd: 48, paralelo: 55 }
    ];

    const gapData = calculateExchangeGapData(rates, ratesDetails, rateHistory);
    expect(gapData.bcv).toBe(50);
    expect(gapData.paralelo).toBe(60);
    expect(gapData.currentGap).toBe(20);
    expect(gapData.historyPoints.length).toBe(1);
    expect(gapData.historyPoints[0].gap).toBeGreaterThan(0);
  });

  it('calculateBudgetStats: agrupa gastos y calcula porcentajes contra límites', () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');

    const transactions = [
      { id: '1', type: 'spent', amount: 85, currency: 'USD', category: 'Alimentación', date: `${curYear}-${curMonth}-02` }
    ];
    const budgets = {
      'Alimentación': 100
    };

    const stats = calculateBudgetStats(transactions, budgets, { USD: 1 }, null);
    expect(stats.activeBudgetCategories.length).toBe(1);
    expect(stats.activeBudgetCategories[0].spent).toBe(85);
    expect(stats.activeBudgetCategories[0].percent).toBe(85);
    expect(stats.totalBudgetUsd).toBe(100);
  });

  it('calculateDashboardAlerts: genera alertas para presupuestos sobre 80% y obligaciones próximas', () => {
    const now = new Date();
    const in3Days = new Date();
    in3Days.setDate(now.getDate() + 3);
    const dueStr = in3Days.toISOString().split('T')[0];

    const obligations = [
      { id: 'ob1', type: 'pay', title: 'Cashea Cuota 1', amount: 25, currency: 'USD', dueDate: dueStr }
    ];
    const budgetStats = {
      activeBudgetCategories: [
        { category: 'Alimentación', percent: 85, spent: 85, limit: 100 }
      ]
    };

    const alerts = calculateDashboardAlerts(obligations, budgetStats);
    expect(alerts.length).toBe(2);
    expect(alerts.some(a => a.type === 'cashea')).toBe(true);
    expect(alerts.some(a => a.type === 'budget')).toBe(true);
  });

  it('calculateWealthEvolution: genera puntos de evolución mensual y semanal', () => {
    const transactions = [
      { id: '1', type: 'income', amount: 100, currency: 'USD', date: new Date().toISOString() }
    ];
    const monthly = calculateWealthEvolution(transactions, { USD: 1 }, 1000, 'monthly');
    expect(monthly.points.length).toBe(6);
    expect(monthly.points[5].balance).toBe(1000);

    const weekly = calculateWealthEvolution(transactions, { USD: 1 }, 1000, 'weekly');
    expect(weekly.points.length).toBe(8);
  });
});
