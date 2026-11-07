import { parseLocalDate, toLocalDateString } from '../utils/dates';
import { getTxUsdEquivalent, translateCategory, formatAmount } from '../utils/formatters';
import { calculateExchangeGap } from './rates';

/**
 * Calcula el resumen del mes actual vs mes anterior (ingresos, gastos, balance neto y % de variación).
 */
export function calculateMonthlyComparison(transactions = [], rates = {}) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const prevYear = curMonth === 0 ? curYear - 1 : curYear;
  const prevMonth = curMonth === 0 ? 11 : curMonth - 1;

  let curIncome = 0;
  let curSpent = 0;
  let prevIncome = 0;
  let prevSpent = 0;

  transactions.forEach(tx => {
    if (!tx.date) return;
    const d = parseLocalDate(toLocalDateString(tx.date));
    const y = d.getFullYear();
    const m = d.getMonth();
    const usd = getTxUsdEquivalent(tx, rates);

    if (y === curYear && m === curMonth) {
      if (tx.type === 'income') curIncome += usd;
      if (tx.type === 'spent') curSpent += usd;
    } else if (y === prevYear && m === prevMonth) {
      if (tx.type === 'income') prevIncome += usd;
      if (tx.type === 'spent') prevSpent += usd;
    }
  });

  const curNet = curIncome - curSpent;
  const prevNet = prevIncome - prevSpent;

  const incomeDeltaPct = prevIncome > 0
    ? ((curIncome - prevIncome) / prevIncome) * 100
    : null;
  const spentDeltaPct = prevSpent > 0
    ? ((curSpent - prevSpent) / prevSpent) * 100
    : null;

  return {
    curIncome,
    curSpent,
    curNet,
    prevIncome,
    prevSpent,
    prevNet,
    incomeDeltaPct,
    spentDeltaPct
  };
}

/**
 * Calcula la brecha cambiaria actual y los puntos históricos de los últimos 30 días.
 */
export function calculateExchangeGapData(rates = {}, ratesDetails = {}, rateHistory = []) {
  const bcv = Number(ratesDetails?.bcvUsd?.valor || rates?.bcvUsd || rates?.VES || 0);
  const par = Number(ratesDetails?.paralelo?.valor || rates?.paralelo || 0);
  const currentGap = calculateExchangeGap(par, bcv);

  const historyPoints = (rateHistory || [])
    .slice(-30)
    .map(item => {
      const itemBcv = Number(item.bcvUsd || 0);
      const itemPar = Number(item.paralelo || 0);
      const gap = calculateExchangeGap(itemPar, itemBcv);
      let shortDate = item.date;
      if (item.date && item.date.length >= 10) {
        const parts = item.date.substring(5, 10).split('-');
        if (parts.length === 2) shortDate = `${parts[1]}/${parts[0]}`;
      }
      return {
        date: shortDate,
        fullDate: item.date,
        gap,
        bcv: itemBcv,
        paralelo: itemPar
      };
    })
    .filter(p => p.gap !== 0 || p.bcv > 0);

  return {
    currentGap,
    bcv,
    paralelo: par,
    historyPoints
  };
}

/** Clave reservada en el mapa de presupuestos para el tope total del mes. */
export const MONTHLY_LIMIT_KEY = '__tope_mensual__';

/** Monto de un presupuesto, sea número (formato viejo) u objeto { amount }. */
export function budgetAmount(value) {
  if (value && typeof value === 'object') return Number(value.amount) || 0;
  return Number(value) || 0;
}

function isInCurrentMonth(t, startOfMonth, endOfMonth) {
  if (!t?.date) return false;
  const d = parseLocalDate(toLocalDateString(t.date));
  return d >= startOfMonth && d <= endOfMonth;
}

/**
 * Tope total de gasto del mes: suma TODOS los gastos del mes, tengan o no
 * presupuesto por categoría, y los compara con el tope definido.
 */
export function calculateMonthlySpendingCap(transactions = [], rates = {}, limit = 0, budgetStats = null) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let spent = 0;
  (transactions || []).forEach(t => {
    if (t.type !== 'spent' || !isInCurrentMonth(t, startOfMonth, endOfMonth)) return;
    spent += getTxUsdEquivalent(t, rates);
  });
  spent = Math.round(spent * 100) / 100;

  const numLimit = budgetAmount(limit);
  const hasLimit = numLimit > 0;
  const inBudgets = Math.min(spent, budgetStats?.totalSpentInBudgets || 0);
  const outsideBudgets = Math.max(0, Math.round((spent - inBudgets) * 100) / 100);
  const remaining = hasLimit ? Math.round((numLimit - spent) * 100) / 100 : null;
  const daysInMonth = endOfMonth.getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;

  return {
    hasLimit,
    limit: numLimit,
    spent,
    remaining,
    exceeded: hasLimit && spent > numLimit,
    percent: hasLimit ? (spent / numLimit) * 100 : 0,
    outsideBudgets,
    categoryBudgetsTotal: budgetStats?.totalBudgetUsd || 0,
    daysLeft,
    dailyAllowance: hasLimit && remaining > 0 ? Math.floor((remaining / daysLeft) * 100) / 100 : 0
  };
}

/**
 * Calcula estadísticas de presupuestos del mes actual.
 */
export function calculateBudgetStats(transactions = [], budgets = {}, rates = {}, getCategoryName = null) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const monthSpents = transactions.filter(t => {
    if (t.type !== 'spent') return false;
    const d = parseLocalDate(toLocalDateString(t.date));
    return d >= startOfMonth && d <= endOfMonth;
  });

  const categorySpentMap = {};
  monthSpents.forEach(t => {
    const cat = (t.category_id && getCategoryName ? getCategoryName(t.category_id) : '') || translateCategory(t.category) || 'Otros';
    const usdAmount = getTxUsdEquivalent(t, rates);
    categorySpentMap[cat] = (categorySpentMap[cat] || 0) + usdAmount;
    if (t.category_id) {
      categorySpentMap[t.category_id] = (categorySpentMap[t.category_id] || 0) + usdAmount;
    }
  });

  const activeBudgetCategories = Object.entries(budgets || {})
    .filter(([catKey, limit]) => catKey !== MONTHLY_LIMIT_KEY && budgetAmount(limit) > 0)
    .map(([catKey, limit]) => {
      const displayName = (getCategoryName ? getCategoryName(catKey) : '') || translateCategory(catKey) || catKey;
      const spent = categorySpentMap[displayName] || categorySpentMap[catKey] || 0;
      const numLimit = budgetAmount(limit);
      const percent = numLimit > 0 ? (spent / numLimit) * 100 : 0;
      return {
        category: displayName,
        rawKey: catKey,
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
}

/**
 * Calcula las alertas accionables para el dashboard.
 */
export function calculateDashboardAlerts(obligations = [], budgetStats = null) {
  const list = [];
  const now = new Date();
  const todayStr = toLocalDateString(now);
  const in7Days = new Date();
  in7Days.setDate(now.getDate() + 7);
  const in7DaysStr = toLocalDateString(in7Days);

  obligations.forEach(ob => {
    if (ob.type === 'pay' && ob.dueDate) {
      const dueStr = toLocalDateString(ob.dueDate);
      if (dueStr >= todayStr && dueStr <= in7DaysStr) {
        const isCashea = (ob.title || '').toLowerCase().includes('cashea') ||
                         (ob.category || '').toLowerCase().includes('cashea') ||
                         Boolean(ob.installmentsCount);
        list.push({
          id: `pay-${ob.id}`,
          type: isCashea ? 'cashea' : 'payment',
          title: ob.title,
          amount: ob.amount,
          currency: ob.currency,
          dueDate: ob.dueDate,
          daysLeft: Math.ceil((parseLocalDate(dueStr) - parseLocalDate(todayStr)) / (1000 * 60 * 60 * 24)),
          subtitle: isCashea ? `Cuota Cashea vence el ${ob.dueDate}` : `Vence el ${ob.dueDate}`
        });
      }
    }
  });

  if (budgetStats?.activeBudgetCategories) {
    budgetStats.activeBudgetCategories.forEach(b => {
      if (b.percent >= 80) {
        list.push({
          id: `budget-${b.category}`,
          type: 'budget',
          category: b.category,
          percent: b.percent,
          spent: b.spent,
          limit: b.limit,
          subtitle: b.percent >= 100
            ? `Superado por $${formatAmount(b.spent - b.limit, 'USD')}`
            : `Al ${b.percent.toFixed(0)}% del límite ($${formatAmount(b.spent, 'USD')} de $${formatAmount(b.limit, 'USD')})`
        });
      }
    });
  }

  return list;
}

/**
 * Reconstrucción de la evolución de patrimonio histórico.
 */
export function calculateWealthEvolution(transactions = [], rates = {}, grandTotalUsd = 0, evolutionGrouping = 'monthly') {
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
      transactions.forEach(t => {
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
      transactions.forEach(t => {
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
}

/**
 * Próximos vencimientos para Inicio: une pagos, cobros y presupuestos en alerta
 * en una sola lista sin duplicados. Los vencidos van primero, luego por fecha.
 * Los presupuestos (sin fecha) van al final.
 */
export function buildUpcomingDue(obligations = [], budgetStats = null, today = new Date(), capStats = null) {
  const todayStr = toLocalDateString(today);
  const seen = new Set();
  const dated = [];

  obligations.forEach(ob => {
    if (!ob || ob.deleted_at || seen.has(ob.id)) return;
    if (ob.type !== 'pay' && ob.type !== 'receive') return;
    if (ob.status === 'paid') return;
    if (ob.totalInstallments && Number(ob.paidInstallments) >= Number(ob.totalInstallments)) return;
    seen.add(ob.id);
    const dueStr = ob.dueDate ? toLocalDateString(ob.dueDate) : null;
    const daysLeft = dueStr
      ? Math.round((parseLocalDate(dueStr) - parseLocalDate(todayStr)) / (1000 * 60 * 60 * 24))
      : null;
    dated.push({
      id: `ob-${ob.id}`,
      obligationId: ob.id,
      kind: ob.type === 'pay' ? 'pay' : 'collect',
      title: ob.title || 'Sin título',
      amount: ob.amount,
      currency: ob.currency,
      dueDate: dueStr,
      daysLeft,
      overdue: daysLeft !== null && daysLeft < 0
    });
  });

  dated.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const budgets = (budgetStats?.activeBudgetCategories || [])
    .filter(b => b.percent >= 80)
    .sort((a, b) => b.percent - a.percent)
    .map(b => ({
      id: `budget-${b.category}`,
      kind: 'budget',
      title: b.category,
      percent: b.percent,
      spent: b.spent,
      limit: b.limit,
      overdue: b.percent >= 100
    }));

  const cap = capStats && capStats.hasLimit && capStats.percent >= 80
    ? [{
        id: 'budget-total-mes',
        kind: 'budget',
        isCap: true,
        title: 'Tope total del mes',
        percent: capStats.percent,
        spent: capStats.spent,
        limit: capStats.limit,
        overdue: capStats.percent >= 100
      }]
    : [];

  return [...dated, ...cap, ...budgets];
}
