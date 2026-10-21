import { describe, it, expect } from 'vitest';
import { calculateInstallmentPlan } from './installmentPurchase';

describe('calculateInstallmentPlan - Compra en cuotas estilo Cashea', () => {
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
  });

  it('maneja compra sin inicial (inicial 0)', () => {
    const result = calculateInstallmentPlan({
      totalAmount: 90,
      downPayment: 0,
      installmentsCount: 3,
      currency: 'USD'
    });

    expect(result.total).toBe(90);
    expect(result.initial).toBe(0);
    expect(result.remaining).toBe(90);
    expect(result.installmentsCount).toBe(3);
    expect(result.installmentAmount).toBe(30);
  });

  it('redondea adecuadamente si la división tiene decimales', () => {
    const result = calculateInstallmentPlan({
      totalAmount: 100,
      downPayment: 30,
      installmentsCount: 3,
      currency: 'USD'
    });

    expect(result.remaining).toBe(70);
    // 70 / 3 = 23.3333... redondeado a 2 decimales = 23.33
    expect(result.installmentAmount).toBe(23.33);
  });
});
