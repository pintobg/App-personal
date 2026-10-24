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

  it('addObligation genera un UUID válido aunque reciba id vacío (como al registrar una deuda Cashea)', () => {
    const user = { id: 'usr-123' };
    const { result } = renderHook(() => useObligations(user));

    let createdOb;
    act(() => {
      createdOb = result.current.addObligation({
        id: '',
        title: 'Traki Cashea',
        amount: 20,
        currency: 'USD',
        totalInstallments: '4',
        paidInstallments: 0
      });
    });

    // El objeto devuelto y almacenado DEBE tener un ID válido y no vacío
    expect(createdOb.id).toBeDefined();
    expect(createdOb.id).not.toBe('');
    expect(createdOb.id.length).toBeGreaterThan(10);

    const stored = JSON.parse(localStorage.getItem('obligations'));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(createdOb.id);
  });

  it('auto-repara y asigna UUID a obligaciones que tenían id vacío en localStorage para no perderlas al reabrir la app', () => {
    // Simular que en localStorage quedó guardada una deuda con id vacío antes del fix
    const corruptStorage = [
      {
        id: '',
        title: 'Deuda Vieja',
        amount: 50,
        currency: 'USD',
        totalInstallments: '3'
      }
    ];
    localStorage.setItem('obligations', JSON.stringify(corruptStorage));

    const { result } = renderHook(() => useObligations(null));

    expect(result.current.obligations).toHaveLength(1);
    expect(result.current.obligations[0].id).toBeDefined();
    expect(result.current.obligations[0].id).not.toBe('');
    expect(result.current.obligations[0].title).toBe('Deuda Vieja');

    // Debe haberse actualizado también en localStorage
    const repairedStorage = JSON.parse(localStorage.getItem('obligations'));
    expect(repairedStorage[0].id).toBe(result.current.obligations[0].id);
  });
});
