import { describe, it, expect } from 'vitest';
import { calculateGoalProgress } from './goals';

describe('Domain: goals.js (Metas de Ahorro)', () => {
  describe('calculateGoalProgress', () => {
    it('calcula correctamente el progreso de una meta de $500 con cuentas USD y USDT', () => {
      const goal = {
        id: 'goal-1',
        name: 'Fondo de emergencia',
        targetAmount: 500,
        currency: 'USD',
        deadline: '2026-12-31',
        accountIds: ['ast-usd', 'ast-usdt']
      };

      const assets = [
        { id: 'ast-usd', name: 'USD', location: 'Efectivo', amount: 100 },
        { id: 'ast-usdt', name: 'USDT', location: 'Binance', amount: 150 },
        { id: 'ast-ves', name: 'VES', location: 'Banesco', amount: 50000 } // No está seleccionada
      ];

      const rates = { USD: 1, USDT: 1, VES: 50 };
      const testDate = new Date(2026, 6, 15); // Julio 2026 (quedan aprox 5 meses a dic 2026)

      const result = calculateGoalProgress(goal, assets, rates, testDate);

      // Cuentas USD (100) + USDT (150) = 250 USD
      expect(result.currentSaved).toBe(250);
      expect(result.progressPercent).toBe(50);
      expect(result.remainingAmount).toBe(250);
      expect(result.monthsRemaining).toBe(5);
      // 250 restantes / 5 meses = 50 por mes
      expect(result.monthlySavingsNeeded).toBe(50);
    });

    it('convierte saldos en monedas distintas a la moneda de la meta', () => {
      const goal = {
        id: 'goal-2',
        name: 'Ahorro en Euros',
        targetAmount: 1000,
        currency: 'EUR',
        deadline: '2026-10-31',
        accountIds: ['ast-usd']
      };

      // 110 USD con tasa EUR = 1.10 USD (1 EUR = 1.10 USD => tasa EUR en USD es 1.1)
      const assets = [
        { id: 'ast-usd', name: 'USD', location: 'Zelle', amount: 110 }
      ];

      // EUR rate = 1.10 USD
      const rates = { USD: 1, EUR: 1.10 };
      const testDate = new Date(2026, 8, 1);

      const result = calculateGoalProgress(goal, assets, rates, testDate);
      // 110 USD / 1.10 = 100 EUR
      expect(result.currentSaved).toBe(100);
      expect(result.progressPercent).toBe(10);
      expect(result.remainingAmount).toBe(900);
    });
  });
});
