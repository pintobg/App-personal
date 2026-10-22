import { describe, it, expect } from 'vitest';
import { add, sub, mul, div, round, convert, convertForPayment, parseAmount, getDecimals, toNullableNumber, toNullableInt } from './money';
import { formatAmount } from '../utils/formatters';

describe('Domain: money.js - Precisión monetaria y conversión', () => {
  describe('Suma sin errores de punto flotante', () => {
    it('0,1 + 0,2 = 0,30 exactamente', () => {
      // En JS nativo: 0.1 + 0.2 === 0.30000000000000004
      const result = add(0.1, 0.2);
      expect(result).toBe(0.3);
      expect(round(result, 'USD')).toBe(0.3);
      expect(formatAmount(result, 'USD')).toBe('0,30');
    });

    it('sub, mul y div mantienen precisión exacta', () => {
      expect(sub(1.0, 0.9)).toBe(0.1);
      expect(mul(0.1, 0.2)).toBe(0.02);
      expect(div(1, 3)).toBeCloseTo(0.33333333, 6);
    });
  });

  describe('Conversión de divisas (convert)', () => {
    it('convertir 100 USD a Bs. y de vuelta da 100,00', () => {
      const rates = { VES: 742 }; // 742 Bs por 1 USD
      // 100 USD a Bs.
      const enBolivares = convert(100, 'USD', 'VES', rates);
      expect(enBolivares).toBe(74200);

      // 74200 Bs. de vuelta a USD
      const deVueltaEnUsd = convert(enBolivares, 'VES', 'USD', rates);
      expect(deVueltaEnUsd).toBe(100);
      expect(formatAmount(deVueltaEnUsd, 'USD')).toBe('100,00');
    });

    it('convierte criptomonedas (BTC) con sus tasas', () => {
      const rates = { BTC: 65000 };
      const enUsd = convert(0.5, 'BTC', 'USD', rates);
      expect(enUsd).toBe(32500);

      const enBtc = convert(32500, 'USD', 'BTC', rates);
      expect(enBtc).toBe(0.5);
    });

    it('devuelve el mismo monto si las monedas son idénticas', () => {
      expect(convert(50, 'USD', 'USD')).toBe(50);
      expect(convert(1000, 'VES', 'VES')).toBe(1000);
    });
  });

  describe('parseAmount - Parser numérico flexible', () => {
    it('acepta formato venezolano con separador de miles "1.234,56"', () => {
      expect(parseAmount('1.234,56')).toBe(1234.56);
    });

    it('acepta formato con coma decimal "1234,56"', () => {
      expect(parseAmount('1234,56')).toBe(1234.56);
    });

    it('acepta formato estándar con punto decimal "1234.56"', () => {
      expect(parseAmount('1234.56')).toBe(1234.56);
    });

    it('acepta números directos', () => {
      expect(parseAmount(1234.56)).toBe(1234.56);
      expect(parseAmount(0)).toBe(0);
    });

    it('retorna null para entradas inválidas', () => {
      expect(parseAmount('abc')).toBeNull();
      expect(parseAmount('12.34.56')).toBeNull();
      expect(parseAmount('')).toBeNull();
      expect(parseAmount(null)).toBeNull();
      expect(parseAmount(undefined)).toBeNull();
    });
  });

  describe('toNullableNumber y toNullableInt', () => {
    it('toNullableNumber convierte strings numéricos, montos con coma o punto a número', () => {
      expect(toNullableNumber('1.234,56')).toBe(1234.56);
      expect(toNullableNumber('1234,56')).toBe(1234.56);
      expect(toNullableNumber('50')).toBe(50);
      expect(toNullableNumber(50)).toBe(50);
      expect(toNullableNumber(0)).toBe(0);
      expect(toNullableNumber('0')).toBe(0);
    });

    it('toNullableNumber retorna null para texto vacío, NaN, null o undefined', () => {
      expect(toNullableNumber('')).toBeNull();
      expect(toNullableNumber('   ')).toBeNull();
      expect(toNullableNumber(null)).toBeNull();
      expect(toNullableNumber(undefined)).toBeNull();
      expect(toNullableNumber(NaN)).toBeNull();
      expect(toNullableNumber('abc')).toBeNull();
    });

    it('toNullableInt convierte valores a enteros truncados', () => {
      expect(toNullableInt('12')).toBe(12);
      expect(toNullableInt(12)).toBe(12);
      expect(toNullableInt('12,8')).toBe(12);
      expect(toNullableInt(12.9)).toBe(12);
      expect(toNullableInt('0')).toBe(0);
      expect(toNullableInt(0)).toBe(0);
    });

    it('toNullableInt retorna null para texto vacío, NaN, null o undefined', () => {
      expect(toNullableInt('')).toBeNull();
      expect(toNullableInt(null)).toBeNull();
      expect(toNullableInt(undefined)).toBeNull();
      expect(toNullableInt(NaN)).toBeNull();
      expect(toNullableInt('abc')).toBeNull();
    });
  });

  describe('Decimales por moneda y formateo es-VE', () => {
    it('asigna decimales correctos por moneda', () => {
      expect(getDecimals('VES')).toBe(2);
      expect(getDecimals('USD')).toBe(2);
      expect(getDecimals('EUR')).toBe(2);
      expect(getDecimals('USDT')).toBe(2);
      expect(getDecimals('USDC')).toBe(2);
      expect(getDecimals('BTC')).toBe(8);
      expect(getDecimals('ETH')).toBe(8);
      expect(getDecimals('SOL')).toBe(6);
    });

    it('formatea montos con estilo venezolano (punto para miles, coma para decimales)', () => {
      expect(formatAmount(1234.56, 'USD')).toBe('1.234,56');
      expect(formatAmount(1000000, 'VES')).toBe('1.000.000,00');
    });

    it('formatea BTC con 8 decimales', () => {
      expect(formatAmount(0.00123456, 'BTC')).toBe('0,00123456');
    });
  });

  describe('convertForPayment - Conversión para pago de obligaciones', () => {
    const tasas = {
      VES: 74.20,
      bcvUsd: 74.20,
      bcvEur: 79.50,
      paralelo: 88.00,
      USDT: 1.0,
      USDC: 1.0,
      EUR: 1.08,
      BTC: 50000,
      COP: 0.00025 // 4000 COP por 1 USD
    };

    it('pagar 100 USD desde una cuenta USDT propone 100 USDT (Criterio de aceptación)', () => {
      const res = convertForPayment(100, 'USD', 'USDT', tasas);
      expect(res).toBe(100);
    });

    it('pagar 100 USD desde una cuenta USDC propone 100 USDC', () => {
      const res = convertForPayment(100, 'USD', 'USDC', tasas);
      expect(res).toBe(100);
    });

    it('pagar 100 USD desde Bs. a BCV propone 100 × tasa BCV (Criterio de aceptación)', () => {
      const res = convertForPayment(100, 'USD', 'VES', tasas, tasas.bcvUsd);
      expect(res).toBe(7420); // 100 * 74.20
    });

    it('pagar 100 USD desde Bs. a paralelo propone 100 × tasa paralelo', () => {
      const res = convertForPayment(100, 'USD', 'VES', tasas, tasas.paralelo);
      expect(res).toBe(8800); // 100 * 88.00
    });

    it('pagar 50 EUR en Bs. sin tasa explícita usa BCV EUR por defecto', () => {
      const res = convertForPayment(50, 'EUR', 'VES', tasas);
      expect(res).toBe(3975); // 50 * 79.50
    });

    it('pagar 100 USD desde una cuenta BTC propone el equivalente en BTC sin multiplicar por Bs', () => {
      // 100 USD / 50000 = 0.002 BTC
      const res = convertForPayment(100, 'USD', 'BTC', tasas);
      expect(res).toBe(0.002);
    });

    it('si son la misma moneda el monto no cambia', () => {
      expect(convertForPayment(500, 'VES', 'VES', tasas)).toBe(500);
      expect(convertForPayment(120, 'USD', 'USD', tasas)).toBe(120);
    });
  });
});
