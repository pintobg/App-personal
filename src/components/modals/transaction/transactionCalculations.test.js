import { describe, it, expect } from 'vitest';
import { filterAssetsByCurrency, getCurrencyOptions } from './transactionCalculations';

const assets = [
  { id: '1', name: 'USD', location: 'Zelle' },
  { id: '2', name: 'VES', location: 'Banesco' },
  { id: '3', name: 'USD', location: 'Efectivo' },
  { id: '4', name: 'USDT', location: 'Binance' },
];

describe('filterAssetsByCurrency', () => {
  it('solo devuelve las cuentas de la moneda elegida', () => {
    expect(filterAssetsByCurrency(assets, 'usd').map(a => a.id)).toEqual(['3', '1']);
    expect(filterAssetsByCurrency(assets, 'VES').map(a => a.id)).toEqual(['2']);
  });
  it('devuelve lista vacía si no hay cuentas en esa moneda', () => {
    expect(filterAssetsByCurrency(assets, 'EUR')).toEqual([]);
  });
  it('sin moneda devuelve todas', () => {
    expect(filterAssetsByCurrency(assets, '')).toHaveLength(4);
  });
});

describe('getCurrencyOptions', () => {
  it('con cuentas, solo ofrece las monedas que el usuario maneja', () => {
    expect(getCurrencyOptions(assets).map(o => o.value)).toEqual(['USD', 'VES', 'USDT']);
  });
  it('sin cuentas, ofrece las monedas por defecto', () => {
    expect(getCurrencyOptions([]).map(o => o.value)).toEqual(['USD', 'VES', 'EUR', 'USDT']);
  });
});
