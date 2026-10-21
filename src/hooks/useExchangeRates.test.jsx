import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExchangeRates } from './useExchangeRates';

describe('Hook: useExchangeRates', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('no vuelve a descargar de Binance si cambia el saldo pero los símbolos son iguales', async () => {
    let binanceFetchCount = 0;

    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('binance.com')) {
        binanceFetchCount++;
        return {
          ok: true,
          json: async () => [
            { symbol: 'BTCUSDT', price: '65000' }
          ]
        };
      }
      if (urlStr.includes('dolarvzla')) {
        return {
          ok: true,
          json: async () => ({ current: { usd: 74.20 } })
        };
      }
      if (urlStr.includes('open.er-api.com')) {
        return {
          ok: true,
          json: async () => ({ rates: { EUR: 0.92 } })
        };
      }
      return {
        ok: true,
        json: async () => ({ promedio: 74.20 })
      };
    });

    const initialAssets = [
      { id: '1', name: 'VES', location: 'Banesco', amount: 100 },
      { id: '2', name: 'USD', location: 'Efectivo', amount: 50 }
    ];

    const { rerender } = renderHook(
      ({ assets }) => useExchangeRates(assets),
      { initialProps: { assets: initialAssets } }
    );

    // Esperar a que complete la carga inicial
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    const initialBinanceCalls = binanceFetchCount;
    expect(initialBinanceCalls).toBeGreaterThan(0);

    // Simulamos 10 cambios de saldo consecutivos (mismos símbolos VES y USD)
    for (let i = 1; i <= 10; i++) {
      const updatedAssets = [
        { id: '1', name: 'VES', location: 'Banesco', amount: 100 + i * 10 },
        { id: '2', name: 'USD', location: 'Efectivo', amount: 50 + i * 5 }
      ];
      rerender({ assets: updatedAssets });
    }

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // Las llamadas a Binance no deben haber aumentado 10 veces
    expect(binanceFetchCount).toBe(initialBinanceCalls);
  });

  it('la tasa BCV es idéntica en rates.VES y en veRates.bcvUsd (fuente única de verdad)', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('dolarvzla')) {
        return {
          ok: true,
          json: async () => ({ current: { usd: 74.85 } })
        };
      }
      return {
        ok: true,
        json: async () => ({})
      };
    });

    const { result } = renderHook(() => useExchangeRates([]));

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.rates.VES).toBe(74.85);
    expect(result.current.veRates.bcvUsd).toBe(74.85);
    expect(result.current.ratesDetails.bcvUsd.valor).toBe(74.85);
  });
});
