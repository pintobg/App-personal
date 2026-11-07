import { describe, it, expect } from 'vitest';
import { calculateMonthlySpendingCap, calculateBudgetStats, budgetAmount, MONTHLY_LIMIT_KEY, buildUpcomingDue } from './dashboard';

const today = new Date();
const thisMonth = (day) => new Date(today.getFullYear(), today.getMonth(), day, 12).toISOString();

describe('Tope total del mes', () => {
  const txs = [
    { id: '1', type: 'spent', amount: 300, currency: 'USD', category: 'Alimentación', date: thisMonth(1) },
    { id: '2', type: 'spent', amount: 210, currency: 'USD', category: 'Transporte', date: thisMonth(1) },
    { id: '3', type: 'spent', amount: 10, currency: 'USD', category: 'Salud', date: thisMonth(1) }, // sin presupuesto
    { id: '4', type: 'income', amount: 1000, currency: 'USD', category: 'Sueldo', date: thisMonth(1) },
    { id: '5', type: 'spent', amount: 99, currency: 'USD', category: 'Salud', date: '2000-01-01T12:00:00.000Z' } // otro mes
  ];

  it('suma todos los gastos del mes, incluso los de categorías sin presupuesto', () => {
    const budgets = { 'Alimentación': 300, 'Transporte': 200 };
    const stats = calculateBudgetStats(txs, budgets, {});
    const cap = calculateMonthlySpendingCap(txs, {}, 500, stats);
    expect(cap.spent).toBe(520);
    expect(cap.exceeded).toBe(true);
    expect(cap.remaining).toBe(-20);
    expect(cap.outsideBudgets).toBe(10);
  });

  it('sin tope definido no marca exceso', () => {
    const cap = calculateMonthlySpendingCap(txs, {}, 0, null);
    expect(cap.hasLimit).toBe(false);
    expect(cap.exceeded).toBe(false);
    expect(cap.spent).toBe(520);
  });

  it('ignora la clave reservada del tope al calcular presupuestos por categoría', () => {
    const stats = calculateBudgetStats(txs, { 'Alimentación': 300, [MONTHLY_LIMIT_KEY]: 500 }, {});
    expect(stats.activeBudgetCategories).toHaveLength(1);
    expect(stats.totalBudgetUsd).toBe(300);
  });

  it('acepta presupuestos guardados como objeto { amount } (formato migrado)', () => {
    expect(budgetAmount({ amount: 120, category: 'X' })).toBe(120);
    const stats = calculateBudgetStats(txs, { 'Alimentación': { amount: 300, category: 'Alimentación' } }, {});
    expect(stats.activeBudgetCategories[0].limit).toBe(300);
  });

  it('avisa en Próximos vencimientos cuando el tope pasa del 80%', () => {
    const cap = calculateMonthlySpendingCap(txs, {}, 500, null);
    const list = buildUpcomingDue([], null, today, cap);
    expect(list[0].isCap).toBe(true);
    expect(list[0].overdue).toBe(true);
  });
});
