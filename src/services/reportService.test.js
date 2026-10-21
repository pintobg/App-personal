import { describe, it, expect } from 'vitest';
import { generateTransactionsCsv, calculateMonthlyReportData, generateMonthlyReportHtml } from './reportService';

describe('Service: reportService', () => {
  const dummyTransactions = [
    {
      id: 'tx-1',
      date: '2026-10-05T10:00:00Z',
      type: 'income',
      origin: 'Banesco',
      currency: 'VES',
      amount: 4000.50,
      rateSnapshot: 40.25,
      usdEquivalent: 99.39,
      category: 'Salario',
      subcategory: 'Quincena',
      notes: 'Pago de nómina'
    },
    {
      id: 'tx-2',
      date: '2026-10-12T14:30:00Z',
      type: 'spent',
      origin: 'Efectivo',
      currency: 'USD',
      amount: 45.20,
      rateSnapshot: 1.0,
      usdEquivalent: 45.20,
      category: 'Alimentación',
      subcategory: 'Supermercado',
      notes: 'Compras de la semana; vegetales y carnes'
    },
    {
      id: 'tx-3',
      date: '2026-09-20T12:00:00Z', // Mes anterior
      type: 'spent',
      origin: 'Efectivo',
      currency: 'USD',
      amount: 30.00,
      category: 'Servicios',
      usdEquivalent: 30.00
    }
  ];

  const dummyAssets = [
    { id: 'a-1', name: 'USD', location: 'Efectivo', amount: 150 },
    { id: 'a-2', name: 'VES', location: 'Banesco', amount: 5000 }
  ];

  const dummyBudgets = {
    Alimentación: 100,
    Servicios: 50
  };

  const dummyRates = {
    USD: 1,
    VES: 50
  };

  describe('generateTransactionsCsv', () => {
    it('genera un CSV con BOM UTF-8, separador punto y coma y decimales con coma', () => {
      const csv = generateTransactionsCsv(dummyTransactions);

      // Comienza con BOM UTF-8
      expect(csv.startsWith('\uFEFF')).toBe(true);

      const lines = csv.replace('\uFEFF', '').split('\r\n');
      expect(lines[0]).toBe('Fecha;Tipo;Cuenta;Moneda;Monto;Tasa;Equivalente en $;Categoría;Notas');

      // Buscar la fila de tx-1 (4000.50 -> 4000,50 con coma decimal)
      const tx1Line = lines.find(l => l.includes('4000,50'));
      expect(tx1Line).toBeDefined();
      expect(tx1Line).toContain('Ingreso;Banesco;VES;4000,50;40,2500;99,39;Salario - Quincena;Pago de nómina');

      // Comprobar tx-2 con punto y coma en las notas escapado
      const tx2Line = lines.find(l => l.includes('45,20'));
      expect(tx2Line).toBeDefined();
      expect(tx2Line).toContain('Gasto;Efectivo;USD;45,20');
      expect(tx2Line).toContain('"Compras de la semana; vegetales y carnes"');
    });

    it('filtra por rango de fechas (startDate y endDate)', () => {
      const csv = generateTransactionsCsv(dummyTransactions, {
        startDate: '2026-10-01',
        endDate: '2026-10-31'
      });

      const lines = csv.replace('\uFEFF', '').split('\r\n');
      // Debe incluir encabezado + tx-1 + tx-2 (2 transacciones de octubre, excluyendo la de septiembre)
      expect(lines.length).toBe(3);
      expect(lines.some(l => l.includes('2026-09-20'))).toBe(false);
      expect(lines.some(l => l.includes('2026-10-05'))).toBe(true);
      expect(lines.some(l => l.includes('2026-10-12'))).toBe(true);
    });
  });

  describe('calculateMonthlyReportData', () => {
    it('calcula los ingresos, gastos por categoría, presupuestos y saldos al cierre del mes especificado', () => {
      const report = calculateMonthlyReportData({
        transactions: dummyTransactions,
        assets: dummyAssets,
        budgets: dummyBudgets,
        rates: dummyRates,
        year: 2026,
        month: 9 // Octubre (0-indexado)
      });

      expect(report.totalIncomeUsd).toBe(99.39);
      expect(report.totalSpentUsd).toBe(45.20);
      expect(report.netSavingsUsd).toBe(54.19);
      expect(report.transactionsCount).toBe(2);

      // Gastos por categoría
      expect(report.expensesByCategory).toEqual([
        { category: 'Alimentación', amountUsd: 45.20, percentage: 100 }
      ]);

      // Presupuestos vs Real
      const alimentacionBudget = report.budgetsComparison.find(b => b.category === 'Alimentación');
      expect(alimentacionBudget).toBeDefined();
      expect(alimentacionBudget.budgetUsd).toBe(100);
      expect(alimentacionBudget.spentUsd).toBe(45.20);
      expect(alimentacionBudget.diffUsd).toBe(54.80);
      expect(alimentacionBudget.percentUsed).toBe(45.2);
      expect(alimentacionBudget.isOver).toBe(false);

      // Saldos al cierre: 150 USD + 5000 VES (5000 / 50 = 100 USD) = 250 USD
      expect(report.totalBalancesUsd).toBe(250);
      expect(report.closingBalances.length).toBe(2);
    });
  });

  describe('generateMonthlyReportHtml', () => {
    it('genera un documento HTML bien estructurado con los datos del reporte', () => {
      const report = calculateMonthlyReportData({
        transactions: dummyTransactions,
        assets: dummyAssets,
        budgets: dummyBudgets,
        rates: dummyRates,
        year: 2026,
        month: 9
      });

      const html = generateMonthlyReportHtml(report);
      expect(html).toContain('Resumen Financiero Mensual');
      expect(html).toContain('Octubre 2026');
      expect(html).toContain('Ingresos Totales');
      expect(html).toContain('Gastos por Categoría');
      expect(html).toContain('Ejecución de Presupuestos');
      expect(html).toContain('Saldos al Cierre');
      expect(html).toContain('Alimentación');
    });
  });
});
