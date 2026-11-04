import { describe, it, expect } from 'vitest';
import { getTxRateSnapshot, getTxUsdEquivalent } from './formatters';

describe('Utils: formatters.js - Snapshots y Equivalentes USD', () => {
  const currentRates = {
    VES: 50, // 50 Bs por 1 USD (tasa directa publicada)
    USDT: 1.0,
    BTC: 65000
  };

  describe('getTxRateSnapshot', () => {
    it('calcula la tasa para VES como Bs por USD', () => {
      const tx = { currency: 'VES' };
      const rate = getTxRateSnapshot(tx, currentRates);
      expect(rate).toBe(50);
    });

    it('soporta tasas VES heredadas invertidas (< 1)', () => {
      const tx = { currency: 'VES' };
      const legacyRates = { VES: 1 / 50 };
      const rate = getTxRateSnapshot(tx, legacyRates);
      expect(rate).toBeCloseTo(50, 2);
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
      const tx = { currency: 'VES', rateSnapshot: 40 };
      const rate = getTxRateSnapshot(tx, currentRates);
      expect(rate).toBe(40);
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

describe('formatNumber y formatPercent', () => {
  it('usa coma decimal y punto de miles', async () => {
    const { formatNumber, formatPercent } = await import('./formatters');
    expect(formatNumber(0)).toBe('0,00');
    expect(formatNumber(1234.5)).toBe('1.234,50');
    expect(formatNumber(-36.523, 2)).toBe('-36,52');
    expect(formatNumber('abc')).toBe('0,00');
    expect(formatPercent(12.345, 1)).toBe('12,3%');
    expect(formatPercent(4.2, 1, { signed: true })).toBe('+4,2%');
    expect(formatPercent(-3, 0, { signed: true })).toBe('-3%');
  });
});
