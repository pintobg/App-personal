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
});
