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
