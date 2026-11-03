import { describe, it, expect } from 'vitest';
import { calculateExchangeGap, calculateEffectiveExchangeRate, resolveHistoricalRate } from './rates';

describe('Domain: rates (Cálculo de brecha cambiaria y tasa efectiva)', () => {
  describe('calculateExchangeGap', () => {
    it('calcula la brecha porcentual entre paralelo y BCV correctamente', () => {
      // Paralelo 55, BCV 50 => ((55 - 50) / 50) * 100 = 10%
      const gap = calculateExchangeGap(55, 50);
      expect(gap).toBe(10);
    });

    it('devuelve 0 si BCV o paralelo son 0 o no válidos', () => {
      expect(calculateExchangeGap(0, 50)).toBe(0);
      expect(calculateExchangeGap(50, 0)).toBe(0);
      expect(calculateExchangeGap(null, undefined)).toBe(0);
    });

    it('calcula correctamente con decimales', () => {
      // Paralelo 52.30, BCV 50.00 => ((52.30 - 50) / 50) * 100 = 4.6%
      const gap = calculateExchangeGap('52.30', '50.00');
      expect(gap).toBe(4.6);
    });
  });

  describe('calculateEffectiveExchangeRate', () => {
    it('retorna null si las monedas de origen y destino son idénticas', () => {
      const res = calculateEffectiveExchangeRate({
        fromCurrency: 'USD',
        fromAmount: 100,
        toCurrency: 'USD',
        toAmount: 100
      });
      expect(res).toBeNull();
    });

    it('calcula tasa efectiva al cambiar 100 USDT por 5.230 Bs sin comisión', () => {
      const res = calculateEffectiveExchangeRate({
        fromCurrency: 'USDT',
        fromAmount: 100,
        toCurrency: 'VES',
        toAmount: 5230,
        commission: 0,
        ratesSnapshot: { bcvUsd: 50.0, paralelo: 52.0 }
      });

      expect(res).not.toBeNull();
      expect(res.rate).toBe(52.3);
      expect(res.unitText).toBe('Bs./USDT');
      // Comparación con BCV (52.30 vs 50.00 => +4.6%)
      expect(res.bcvDiffPct).toBe(4.6);
    });

    it('ajusta la tasa efectiva considerando la comisión debitada', () => {
      // Enviar 100 USDT + 2 USDT de comisión = 102 USDT netos para recibir 5100 Bs
      // Tasa efectiva real = 5100 / 102 = 50.00 Bs/USDT
      const res = calculateEffectiveExchangeRate({
        fromCurrency: 'USDT',
        fromAmount: 100,
        toCurrency: 'VES',
        toAmount: 5100,
        commission: 2,
        ratesSnapshot: { bcvUsd: 50.0 }
      });

      expect(res).not.toBeNull();
      expect(res.rate).toBe(50);
      expect(res.bcvDiffPct).toBe(0);
    });

    it('calcula tasa al comprar divisas (de VES a USD)', () => {
      // Entregar 5500 Bs para recibir 100 USD => 55 Bs/USD
      const res = calculateEffectiveExchangeRate({
        fromCurrency: 'VES',
        fromAmount: 5500,
        toCurrency: 'USD',
        toAmount: 100,
        ratesSnapshot: { bcvUsd: 50.0 }
      });

      expect(res).not.toBeNull();
      expect(res.rate).toBe(55);
      expect(res.unitText).toBe('Bs./USD');
      expect(res.bcvDiffPct).toBe(10);
    });
  });

  describe('resolveHistoricalRate', () => {
    const history = [
      { date: '2026-10-15', bcvUsd: 45.0, bcvEur: 49.0, paralelo: 48.0 },
      { date: '2026-10-16', bcvUsd: 45.5, bcvEur: 49.5, paralelo: 48.5 },
      { date: '2026-10-19', bcvUsd: 46.0, bcvEur: 50.0, paralelo: 49.0 }
    ];

    it('retorna la tasa exacta cuando existe la fecha en el historial', () => {
      const res = resolveHistoricalRate({
        date: '2026-10-16T10:00:00Z',
        fromCurrency: 'USD',
        toCurrency: 'VES',
        rateHistory: history
      });

      expect(res).not.toBeNull();
      expect(res.rate).toBe(45.5);
      expect(res.dateUsed).toBe('2026-10-16');
      expect(res.isExact).toBe(true);
      expect(res.message).toContain('Tasa del día (2026-10-16)');
    });

    it('retorna la tasa más cercana anterior si la fecha cae en fin de semana sin registro (ej. 2026-10-18)', () => {
      const res = resolveHistoricalRate({
        date: '2026-10-18T14:30:00',
        fromCurrency: 'USD',
        toCurrency: 'VES',
        rateHistory: history
      });

      expect(res).not.toBeNull();
      expect(res.rate).toBe(45.5); // Corresponde al viernes 16
      expect(res.dateUsed).toBe('2026-10-16');
      expect(res.isExact).toBe(false);
      expect(res.message).toContain('más cercana anterior a 2026-10-18');
    });

    it('recurre a la tasa actual si no hay historial disponible', () => {
      const res = resolveHistoricalRate({
        date: '2026-10-21',
        fromCurrency: 'USD',
        toCurrency: 'VES',
        rates: { bcvUsd: 50.0 },
        rateHistory: []
      });

      expect(res).not.toBeNull();
      expect(res.rate).toBe(50.0);
      expect(res.dateUsed).toBe('actual');
      expect(res.isExact).toBe(false);
      expect(res.message).toContain('Tasa sugerida actual');
    });
  });
});
