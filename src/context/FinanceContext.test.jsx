import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FinanceProvider, useFinance } from './FinanceContext';

describe('FinanceContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }) => (
    <FinanceProvider showToast={vi.fn()} requestConfirm={vi.fn()}>
      {children}
    </FinanceProvider>
  );

  it('provee listas iniciales y métodos de actualización', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    expect(Array.isArray(result.current.assets)).toBe(true);
    expect(Array.isArray(result.current.transactions)).toBe(true);
    expect(Array.isArray(result.current.obligations)).toBe(true);
    expect(typeof result.current.saveTransaction).toBe('function');
    expect(typeof result.current.transferFunds).toBe('function');
    expect(typeof result.current.payObligation).toBe('function');
    expect(typeof result.current.bulkDeleteTransactions).toBe('function');
  });

  it('agrega un activo correctamente mediante addAsset', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    act(() => {
      result.current.addAsset({
        name: 'USD',
        location: 'Efectivo',
        amount: 100
      });
    });

    expect(result.current.assets).toHaveLength(1);
    expect(result.current.assets[0].name).toBe('USD');
    expect(result.current.assets[0].amount).toBe(100);
  });
});
