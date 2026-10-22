import { describe, it, expect } from 'vitest';
import { calculateInstallmentPlan, DEFAULT_INSTALLMENTS } from './installmentPurchase';

describe('calculateInstallmentPlan - Compra en cuotas estilo Cashea', () => {
  it('tiene DEFAULT_INSTALLMENTS = 4', () => {
    expect(DEFAULT_INSTALLMENTS).toBe(4);
  });

  it('calcula correctamente una compra de $120 con inicial de $40 en 4 cuotas', () => {
    const result = calculateInstallmentPlan({
      totalAmount: 120,
      downPayment: 40,
      installmentsCount: 4,
      currency: 'USD'
    });

    expect(result.total).toBe(120);
    expect(result.initial).toBe(40);
    expect(result.remaining).toBe(80);
    expect(result.installmentsCount).toBe(4);
    expect(result.installmentAmount).toBe(20); // 4 cuotas de $20
    expect(result.lastInstallmentAmount).toBe(20);
    expect(result.hasDifferentLast).toBe(false);
  });

  it('acepta montos escritos con comas como "120,00" con inicial "40,00" en 4 cuotas', () => {
    const result = calculateInstallmentPlan({
      totalAmount: '120,00',
      downPayment: '40,00',
      installmentsCount: 4,
      currency: 'USD'
    });

    expect(result.total).toBe(120);
    expect(result.initial).toBe(40);
    expect(result.remaining).toBe(80);
    expect(result.installmentsCount).toBe(4);
    expect(result.installmentAmount).toBe(20);
    expect(result.lastInstallmentAmount).toBe(20);
    expect(result.hasDifferentLast).toBe(false);
  });

  it('maneja compra sin inicial (inicial 0) usando DEFAULT_INSTALLMENTS por defecto', () => {
    const result = calculateInstallmentPlan({
      totalAmount: 90,
      downPayment: 0,
      currency: 'USD'
    });

    expect(result.total).toBe(90);
    expect(result.initial).toBe(0);
    expect(result.remaining).toBe(90);
    expect(result.installmentsCount).toBe(4);
    expect(result.installmentAmount).toBe(22.5);
    expect(result.lastInstallmentAmount).toBe(22.5);
    expect(result.hasDifferentLast).toBe(false);
  });

  it('ajusta la última cuota si la división tiene centavos de diferencia por redondeo', () => {
    const result = calculateInstallmentPlan({
      totalAmount: '100,00',
      downPayment: '30,00',
      installmentsCount: 3,
      currency: 'USD'
    });

    expect(result.remaining).toBe(70);
    // 70 / 3 = 23.3333... cuota base: 23.33 (2 cuotas = 46.66)
    expect(result.installmentAmount).toBe(23.33);
    // Última cuota ajustada para sumar exactamente 70.00: 70 - 46.66 = 23.34
    expect(result.lastInstallmentAmount).toBe(23.34);
    expect(result.hasDifferentLast).toBe(true);
    // Verificación exacta de la suma: 23.33 * 2 + 23.34 = 70.00
    expect(result.installmentAmount * 2 + result.lastInstallmentAmount).toBe(70);
  });

  it('lanza error si la inicial es mayor que el monto total', () => {
    expect(() => {
      calculateInstallmentPlan({
        totalAmount: '50,00',
        downPayment: '60,00',
        installmentsCount: 4,
        currency: 'USD'
      });
    }).toThrow('La inicial no puede ser mayor que el total');
  });

  it('lanza error si el número de cuotas es menor o igual a 0', () => {
    expect(() => {
      calculateInstallmentPlan({
        totalAmount: 100,
        downPayment: 0,
        installmentsCount: 0,
        currency: 'USD'
      });
    }).toThrow('El número de cuotas debe ser mayor a 0');
  });
});
