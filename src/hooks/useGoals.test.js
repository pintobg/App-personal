import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGoals } from './useGoals';
import { syncService } from '../services/syncService';

vi.mock('../services/syncService', () => ({
  syncService: {
    queueChange: vi.fn()
  }
}));

describe('Hook: useGoals', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('permite agregar, actualizar y eliminar metas de ahorro', () => {
    const user = { id: 'usr-123' };
    const { result } = renderHook(() => useGoals(user));

    expect(result.current.goals).toEqual([]);

    let added;
    act(() => {
      added = result.current.addGoal({
        name: 'Viaje a Mérida',
        targetAmount: 500,
        currency: 'USD',
        deadline: '2026-12-31',
        accountIds: ['ast-1', 'ast-2']
      });
    });

    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].name).toBe('Viaje a Mérida');
    expect(result.current.goals[0].targetAmount).toBe(500);
    expect(syncService.queueChange).toHaveBeenCalledWith('goals', 'upsert', expect.objectContaining({ name: 'Viaje a Mérida' }), 'usr-123');

    act(() => {
      result.current.updateGoal(added.id, { targetAmount: 600 });
    });

    expect(result.current.goals[0].targetAmount).toBe(600);

    act(() => {
      result.current.deleteGoal(added.id);
    });

    expect(result.current.goals).toHaveLength(0);
    expect(syncService.queueChange).toHaveBeenCalledWith('goals', 'delete', expect.objectContaining({ id: added.id }), 'usr-123');
  });
});
