import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FinanceProvider, useFinance, simplifyErrorMessage } from './FinanceContext';
import { syncService } from '../services/syncService';
import * as authHook from '../hooks/useAuth';

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

  it('simplifyErrorMessage simplifica errores comunes de Postgres y red', () => {
    expect(simplifyErrorMessage('invalid input syntax for type integer: ""')).toBe('formato de número o cuotas inválido');
    expect(simplifyErrorMessage('invalid input syntax for type numeric: "abc"')).toBe('formato de monto inválido');
    expect(simplifyErrorMessage('TypeError: Failed to fetch')).toBe('sin conexión con el servidor');
    expect(simplifyErrorMessage('JWT expired')).toBe('sesión expirada');
  });

  it('syncNow con un elemento fallido no muestra el aviso de éxito', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'user-fail-test' },
      isGuest: false,
      syncStatus: 'error',
      pendingCount: 1
    });

    vi.spyOn(syncService, 'flushQueue').mockResolvedValue({
      ok: false,
      pending: 1,
      errors: ['invalid input syntax for type integer: ""']
    });

    vi.spyOn(syncService, 'fetchRemoteAll').mockResolvedValue({
      assets: [],
      transactions: [],
      obligations: [],
      budgets: {},
      goals: []
    });

    const showToastMock = vi.fn();
    const customWrapper = ({ children }) => (
      <FinanceProvider showToast={showToastMock} requestConfirm={vi.fn()}>
        {children}
      </FinanceProvider>
    );

    const { result } = renderHook(() => useFinance(), { wrapper: customWrapper });

    await act(async () => {
      await result.current.syncNow();
    });

    expect(showToastMock).not.toHaveBeenCalledWith('Datos sincronizados con éxito');
    expect(showToastMock).toHaveBeenCalledWith(
      expect.stringContaining('No se pudieron subir 1 cambio'),
      'error'
    );
  });
});
