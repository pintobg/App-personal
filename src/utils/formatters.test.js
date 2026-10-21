import { describe, it, expect } from 'vitest';
import { getTxRateSnapshot, getTxUsdEquivalent } from './formatters';

describe('Utils: formatters.js - Snapshots y Equivalentes USD', () => {
  const currentRates = {
    VES: 1 / 50, // 50 Bs por 1 USD
    USDT: 1.0,
    BTC: 65000
  };

  describe('getTxRateSnapshot', () => {
    it('calcula la tasa para VES', () => {
      const tx = { currency: 'VES' };
      const rate = getTxRateSnapshot(tx, currentRates);
      expect(rate).toBeCloseTo(0.02, 5); // 1 / 50
    });

    it('calcula la tasa para USDT (1.0)', () => {
      const tx = { currency: 'USDT' };
      const rate = getTxRateSnapshot(tx, currentRates);
      expect(rate).toBe(1.0);
    });

    it('calcula la tasa para BTC', () => {
      const tx = { currency: 'BTC' };
      const rate = getTxRateSnapshot(tx, currentRates);
      expect(rate).toBe(65000);
    });

    it('respeta un rateSnapshot ya existente en la transacción', () => {
      const tx = { currency: 'VES', rateSnapshot: 0.025 };
      const rate = getTxRateSnapshot(tx, currentRates);
      expect(rate).toBe(0.025);
    });
  });

  describe('getTxUsdEquivalent', () => {
    it('calcula equivalente en USD para un gasto en VES', () => {
      // 100 Bs a 50 Bs/$ = 2 USD
      const tx = { currency: 'VES', amount: 100 };
      const usd = getTxUsdEquivalent(tx, currentRates);
      expect(usd).toBeCloseTo(2.0, 2);
    });

    it('calcula equivalente en USD para USDT', () => {
      const tx = { currency: 'USDT', amount: 50 };
      const usd = getTxUsdEquivalent(tx, currentRates);
      expect(usd).toBe(50);
    });

    it('calcula equivalente en USD para BTC', () => {
      // 0.1 BTC a 65000 $/BTC = 6500 USD
      const tx = { currency: 'BTC', amount: 0.1 };
      const usd = getTxUsdEquivalent(tx, currentRates);
      expect(usd).toBe(6500);
    });

    it('respeta usdEquivalent ya guardado en la transacción', () => {
      const tx = { currency: 'VES', amount: 100, usdEquivalent: 3.5 };
      const usd = getTxUsdEquivalent(tx, currentRates);
      expect(usd).toBe(3.5);
    });
  });
});
