import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useObligations } from './useObligations';
import { syncService } from '../services/syncService';

vi.mock('../services/syncService', () => {
  return {
    syncService: {
      queueChange: vi.fn()
    }
  };
});

describe('Hook: useObligations - Pago de cuotas y llamadas a syncService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('actualizar cuota de deuda llama a queueChange con paidInstallments actualizado', () => {
    const user = { id: 'usr-abc-123' };
    const initialObligations = [
      {
        id: 'ob-1',
        title: 'Préstamo vehículo',
        amount: 200,
        currency: 'USD',
        totalInstallments: 12,
        paidInstallments: 3,
        dueDate: '2026-10-31'
      }
    ];
    localStorage.setItem('obligations', JSON.stringify(initialObligations));

    const { result } = renderHook(() => useObligations(user));

    // Simular el pago de una cuota: actualizamos paidInstallments a 4 y dueDate
    act(() => {
      result.current.updateObligation('ob-1', {
        paidInstallments: 4,
        dueDate: '2026-11-30'
      });
    });

    // 1. Estado local en el hook actualizado
    const updated = result.current.obligations.find(o => o.id === 'ob-1');
    expect(updated.paidInstallments).toBe(4);
    expect(updated.dueDate).toBe('2026-11-30');

    // 2. queueChange debe haberse llamado con el objeto que contiene paidInstallments = 4
    expect(syncService.queueChange).toHaveBeenCalledTimes(1);
    expect(syncService.queueChange).toHaveBeenCalledWith(
      'obligations',
      'upsert',
      expect.objectContaining({
        id: 'ob-1',
        paidInstallments: 4,
        dueDate: '2026-11-30'
      }),
      'usr-abc-123'
    );
  });
});
