import { describe, it, expect } from 'vitest';
import { mergeById, mergeBudgets } from './merge';

describe('Service: merge - Resiliencia y resolución de conflictos', () => {
  it('mergeById preserva elementos locales que tengan id vacío o nulo asignándoles un UUID válido', () => {
    const localList = [
      { id: '', title: 'Deuda Cashea sin ID', amount: 25 },
      { id: 'ob-valid', title: 'Deuda Válida', amount: 50 }
    ];
    const remoteList = [];

    const merged = mergeById(localList, remoteList);
    expect(merged).toHaveLength(2);

    const rescued = merged.find(m => m.title === 'Deuda Cashea sin ID');
    expect(rescued).toBeDefined();
    expect(rescued.id).toBeDefined();
    expect(rescued.id).not.toBe('');
    expect(rescued.id.length).toBeGreaterThan(10);
  });

  it('mergeById prefiere el registro más reciente según updated_at', () => {
    const localList = [
      { id: 'ob-1', amount: 20, updated_at: '2026-10-24T10:00:00Z' }
    ];
    const remoteList = [
      { id: 'ob-1', amount: 30, updated_at: '2026-10-24T11:00:00Z' }
    ];

    const merged = mergeById(localList, remoteList);
    expect(merged).toHaveLength(1);
    expect(merged[0].amount).toBe(30);
  });

  it('mergeById respeta el borrado lógico más reciente', () => {
    const localList = [
      { id: 'ob-1', amount: 20, updated_at: '2026-10-24T10:00:00Z' }
    ];
    const remoteList = [
      { id: 'ob-1', amount: 20, deleted_at: '2026-10-24T11:00:00Z', updated_at: '2026-10-24T11:00:00Z' }
    ];

    const merged = mergeById(localList, remoteList);
    expect(merged).toHaveLength(0);
  });

  it('mergeBudgets fusiona presupuestos por categoría correctamente', () => {
    const local = { Comida: 200, Casa: 500 };
    const remote = { Comida: { amount: 250, updated_at: '2026-10-24T11:00:00Z' }, Transporte: 100 };

    const merged = mergeBudgets(local, remote);
    expect(merged.Comida).toBe(250);
    expect(merged.Casa).toBe(500);
    expect(merged.Transporte).toBe(100);
  });
});
