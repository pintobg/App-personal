import { describe, it, expect } from 'vitest';
import { calculateExchangeGap, calculateEffectiveExchangeRate } from './rates';

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
});
