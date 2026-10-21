import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchBcvRates,
  fetchParaleloRate,
  fetchBinanceRates,
  fetchAllExchangeRates,
  getRateStatus
} from './ratesService';

describe('Service: ratesService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchBcvRates', () => {
    it('obtiene tasas de dolarvzla cuando está disponible', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          current: { usd: 74.25, eur: 79.80, date: '2026-10-21' }
        })
      }));

      const res = await fetchBcvRates();
      expect(res.bcvUsd.valor).toBe(74.25);
      expect(res.bcvUsd.fuente).toBe('dolarvzla');
      expect(res.bcvUsd.fechaValor).toBe('2026-10-21');
      expect(res.bcvEur.valor).toBe(79.80);
      expect(res.bcvEur.fuente).toBe('dolarvzla');
    });

    it('recurre a dolarapi si dolarvzla falla', async () => {
      vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Network error dolarvzla'))
        .mockImplementationOnce(async () => ({
          ok: true,
          json: async () => ({ promedio: 74.10, fechaActualizacion: '2026-10-21T12:00:00Z' })
        }))
        .mockImplementationOnce(async () => ({
          ok: true,
          json: async () => ({ promedio: 79.50, fechaActualizacion: '2026-10-21T12:00:00Z' })
        }));

      const res = await fetchBcvRates();
      expect(res.bcvUsd.valor).toBe(74.10);
      expect(res.bcvUsd.fuente).toBe('dolarapi');
      expect(res.bcvEur.valor).toBe(79.50);
      expect(res.bcvEur.fuente).toBe('dolarapi');
    });
  });

  describe('fetchParaleloRate', () => {
    it('obtiene tasa de paralelo desde dolarapi', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ promedio: 88.50, fechaActualizacion: '2026-10-21T14:00:00Z' })
      });

      const res = await fetchParaleloRate();
      expect(res.valor).toBe(88.50);
      expect(res.fuente).toBe('dolarapi');
      expect(res.fechaValor).toBe('2026-10-21T14:00:00Z');
    });
  });

  describe('fetchBinanceRates', () => {
    it('no excluye monedas reales como JUP pero sí excluye tokens apalancados con pareja UP/DOWN', async () => {
      const mockBinanceTickers = [
        { symbol: 'BTCUSDT', price: '65000' },
        { symbol: 'BTCUPUSDT', price: '120' },
        { symbol: 'BTCDOWNUSDT', price: '0.05' },
        { symbol: 'JUPUSDT', price: '1.25' }, // Moneda real Jupiter
        { symbol: 'ETHUSDT', price: '2600' }
      ];

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockBinanceTickers
      });

      const { cryptoRates, binanceSymbols } = await fetchBinanceRates();

      expect(cryptoRates['BTC'].valor).toBe(65000);
      expect(cryptoRates['ETH'].valor).toBe(2600);
      // JUP debe existir porque no tiene JDOWN
      expect(cryptoRates['JUP']).toBeDefined();
      expect(cryptoRates['JUP'].valor).toBe(1.25);
      expect(binanceSymbols).toContain('JUP');

      // BTCUP y BTCDOWN deben descartarse por existir ambos
      expect(cryptoRates['BTCUP']).toBeUndefined();
      expect(cryptoRates['BTCDOWN']).toBeUndefined();
      expect(binanceSymbols).not.toContain('BTCUP');
      expect(binanceSymbols).not.toContain('BTCDOWN');
    });

    it('pares inversos USDT* de Binance no sobrescriben divisas oficiales de open.er-api', async () => {
      const mockBinanceTickers = [
        { symbol: 'USDTARS', price: '1350' },
        { symbol: 'USDTCOP', price: '4200' },
        { symbol: 'USDTBRL', price: '5.60' },
        { symbol: 'USDTXYZ', price: '10' } // Moneda desconocida no oficial
      ];

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockBinanceTickers
      });

      const officialFiatCodes = new Set(['ARS', 'COP', 'BRL']);
      const { cryptoRates } = await fetchBinanceRates([], officialFiatCodes);

      // ARS, COP y BRL no deben provenir de Binance
      expect(cryptoRates['ARS']).toBeUndefined();
      expect(cryptoRates['COP']).toBeUndefined();
      expect(cryptoRates['BRL']).toBeUndefined();

      // XYZ sí se agrega porque no estaba en open.er-api
      expect(cryptoRates['XYZ']).toBeDefined();
      expect(cryptoRates['XYZ'].valor).toBeCloseTo(1 / 10, 4);
    });
  });

  describe('getRateStatus', () => {
    it('reporta "Sin tasa" cuando no hay valor de tasa', () => {
      const status1 = getRateStatus(null);
      expect(status1.hasRate).toBe(false);
      expect(status1.label).toBe('Sin tasa');

      const status2 = getRateStatus({ valor: 0 });
      expect(status2.hasRate).toBe(false);
      expect(status2.label).toBe('Sin tasa');
    });

    it('reporta advertencia ámbar "Tasa del [fecha]" si tiene más de 24 horas', () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const status = getRateStatus({ valor: 74.5, fechaValor: twoDaysAgo });
      expect(status.hasRate).toBe(true);
      expect(status.isStale).toBe(true);
      expect(status.label).toMatch(/^Tasa del \d{2}\/\d{2}\/\d{4}$/);
    });

    it('reporta hora si la tasa tiene menos de 24 horas', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const status = getRateStatus({ valor: 74.5, fechaConsulta: oneHourAgo });
      expect(status.hasRate).toBe(true);
      expect(status.isStale).toBe(false);
      expect(status.label).toMatch(/^Actualizado: \d{1,2}:\d{2}/);
    });
  });

  describe('fetchAllExchangeRates', () => {
    it('consolida todas las referencias sin valores fijos en silencio si fallan las consultas', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Sin internet'));

      const { rates, details } = await fetchAllExchangeRates();
      // No debe inventar VES 742 ni BTC 64000
      expect(rates.VES).toBeUndefined();
      expect(rates.BTC).toBeUndefined();
      expect(details.bcvUsd.valor).toBeNull();
      expect(details.paralelo.valor).toBeNull();
    });
  });
});
