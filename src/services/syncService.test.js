import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Creamos un mock del supabaseClient
vi.mock('./supabaseClient', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ data: null, error: new Error('PostgREST connection error') }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: new Error('PostgREST update error') })
          })
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Delete error') })
          })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch error') })
          })
        })
      }))
    }
  };
});

describe('Service: syncService - Manejo de fallos en Supabase', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('Con cliente Supabase que devuelve error, el elemento sigue en la cola con intentos registrados', async () => {
    const { syncService, getPendingCount, getSyncStatus } = await import('./syncService');

    // Encolar un movimiento mientras estamos online
    await syncService.queueChange('transactions', 'upsert', { id: 'tx-test-error', amount: 50 }, 'user-123');

    // Dado que el mock devuelve error en upsert, flushQueue no debe eliminar el item
    expect(getPendingCount()).toBe(1);
    expect(getSyncStatus()).toBe('error');

    // El elemento en localStorage debe registrar attempts = 1 y el mensaje de lastError
    const rawQueue = JSON.parse(localStorage.getItem('finanzas_sync_queue') || '[]');
    expect(rawQueue.length).toBe(1);
    expect(rawQueue[0].id || rawQueue[0].payload?.id).toBe('tx-test-error');
    expect(rawQueue[0].attempts).toBe(1);
    expect(rawQueue[0].lastError).toContain('PostgREST connection error');
  });

  it('flushQueue devuelve { ok, pending, errors } con los errores de los elementos fallidos', async () => {
    const { syncService } = await import('./syncService');

    await syncService.queueChange('transactions', 'upsert', { id: 'tx-test-2', amount: 100 }, 'user-123');
    const result = await syncService.flushQueue();

    expect(result).toBeDefined();
    expect(result.ok).toBe(false);
    expect(result.pending).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0]).toContain('PostgREST connection error');
  });

  it('una deuda con totalInstallments \'\' genera total_installments null en mapObToDb', async () => {
    const { mapObToDb, mapDbToOb } = await import('./syncService');

    const mapped = mapObToDb({
      id: 'ob-1',
      type: 'pay',
      title: 'Alquiler',
      amount: '500,50',
      currency: 'USD',
      frequency: 'monthly',
      totalInstallments: '',
      paidInstallments: 0
    }, 'user-test');

    expect(mapped.total_installments).toBeNull();
    expect(mapped.amount).toBe(500.50);

    // En mapDbToOb, null debe convertirse en ''
    const fromDb = mapDbToOb({
      id: 'ob-1',
      total_installments: null,
      amount: 500.50
    });
    expect(fromDb.totalInstallments).toBe('');
  });

  it('discardQueueItem elimina el elemento seleccionado y actualiza la cola', async () => {
    const { syncService, getQueue } = await import('./syncService');

    await syncService.queueChange('obligations', 'upsert', { id: 'ob-to-discard', title: 'Test' }, 'user-123');
    const queue = getQueue();
    expect(queue.length).toBeGreaterThanOrEqual(1);

    const itemToDiscard = queue.find(i => i.payload?.id === 'ob-to-discard');
    expect(itemToDiscard).toBeDefined();

    syncService.discardQueueItem(itemToDiscard.id);
    const updatedQueue = getQueue();
    expect(updatedQueue.find(i => i.payload?.id === 'ob-to-discard')).toBeUndefined();
  });
});
