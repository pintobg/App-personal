import { describe, it, expect } from 'vitest';
import { convertForPayment } from './money';
import { formatAmount } from '../utils/formatters';

describe('Domain: Indexación de Obligaciones a Bolívares a la tasa del día', () => {
  const rates = {
    USD: 1,
    EUR: 1.08,
    bcvUsd: 52.3,
    bcvEur: 56.48,
    paralelo: 58.0
  };

  it('calcula exactamente $45 indexados a BCV USD hoy dando Bs. 2.353,50', () => {
    const amount = 45;
    const currency = 'USD';
    const activeRate = rates.bcvUsd; // 52.30

    const bsResult = convertForPayment(amount, currency, 'VES', rates, activeRate);
    expect(bsResult).toBe(2353.5);

    const formatted = formatAmount(bsResult, 'VES');
    expect(formatted).toBe('2.353,50');
  });

  it('calcula deuda en EUR indexada a BCV EUR', () => {
    const amount = 100;
    const currency = 'EUR';
    const activeRate = rates.bcvEur; // 56.48

    const bsResult = convertForPayment(amount, currency, 'VES', rates, activeRate);
    expect(bsResult).toBe(5648);
  });

  it('calcula deuda indexada a Paralelo', () => {
    const amount = 50;
    const currency = 'USD';
    const activeRate = rates.paralelo; // 58.0

    const bsResult = convertForPayment(amount, currency, 'VES', rates, activeRate);
    expect(bsResult).toBe(2900);
  });
});

import { getObligationBreakdown, summarizeObligations } from './obligations';

describe('Domain: desglose y totales de deudas', () => {
  it('calcula pagado, pendiente y total de una deuda en cuotas', () => {
    const b = getObligationBreakdown({ type: 'pay', amount: '25', currency: 'USD', totalInstallments: '6', paidInstallments: 2 });
    expect(b.totalAmount).toBe(150);
    expect(b.paidAmount).toBe(50);
    expect(b.remainingAmount).toBe(100);
    expect(b.remainingInstallments).toBe(4);
    expect(b.isOpenEnded).toBe(false);
  });

  it('un pago único debe el monto completo', () => {
    const b = getObligationBreakdown({ type: 'pay', amount: 80, currency: 'USD', frequency: 'one-time' });
    expect(b.totalAmount).toBe(80);
    expect(b.remainingAmount).toBe(80);
  });

  it('una deuda recurrente sin cuotas cuenta solo el próximo pago', () => {
    const b = getObligationBreakdown({ type: 'pay', amount: 30, currency: 'USD', frequency: 'monthly' });
    expect(b.isOpenEnded).toBe(true);
    expect(b.remainingAmount).toBe(30);
    expect(b.totalAmount).toBeNull();
  });

  it('una deuda pagada no tiene saldo pendiente', () => {
    const b = getObligationBreakdown({ type: 'pay', amount: 10, totalInstallments: 3, paidInstallments: 3 });
    expect(b.remainingAmount).toBe(0);
    expect(b.paidAmount).toBe(30);
  });

  it('suma todas las deudas pendientes por moneda y en USD', () => {
    const s = summarizeObligations([
      { type: 'pay', amount: 25, currency: 'USD', totalInstallments: 4, paidInstallments: 1 },
      { type: 'pay', amount: 1000, currency: 'VES', frequency: 'one-time' },
      { type: 'pay', amount: 50, currency: 'USD', status: 'paid' },
      { type: 'receive', amount: 40, currency: 'USD', frequency: 'one-time' }
    ], { VES: 50 });
    expect(s.pay.count).toBe(2);
    expect(s.pay.byCurrency.USD).toBe(75);
    expect(s.pay.byCurrency.VES).toBe(1000);
    expect(s.pay.usd).toBe(95);
    expect(s.receive.usd).toBe(40);
  });
});
