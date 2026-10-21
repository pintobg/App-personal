import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppLock, LOCK_TIMEOUT_MS } from './useAppLock.js';
import * as securityService from '../services/securityService.js';

describe('useAppLock Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicia desbloqueado si no hay PIN configurado', () => {
    const { result } = renderHook(() => useAppLock());

    expect(result.current.hasPin).toBe(false);
    expect(result.current.isLocked).toBe(false);
  });

  it('inicia bloqueado si hay un PIN configurado', async () => {
    await securityService.savePin('1234');

    const { result } = renderHook(() => useAppLock());

    expect(result.current.hasPin).toBe(true);
    expect(result.current.isLocked).toBe(true);
  });

  it('desbloquea con PIN correcto y rechaza PIN incorrecto', async () => {
    await securityService.savePin('4321');

    const { result } = renderHook(() => useAppLock());
    expect(result.current.isLocked).toBe(true);

    let unlockRes;
    await act(async () => {
      unlockRes = await result.current.unlockWithPin('9999');
    });
    expect(unlockRes.success).toBe(false);
    expect(result.current.isLocked).toBe(true);

    await act(async () => {
      unlockRes = await result.current.unlockWithPin('4321');
    });
    expect(unlockRes.success).toBe(true);
    expect(result.current.isLocked).toBe(false);
  });

  it('bloquea la app si regresa de segundo plano tras más de 1 minuto', async () => {
    await securityService.savePin('5555');

    const { result } = renderHook(() => useAppLock());

    // Desbloquear primero
    await act(async () => {
      await result.current.unlockWithPin('5555');
    });
    expect(result.current.isLocked).toBe(false);

    // Simular que la app se va a segundo plano
    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Avanzar el tiempo 65 segundos (más de 1 minuto)
    act(() => {
      vi.advanceTimersByTime(LOCK_TIMEOUT_MS + 5000);
    });

    // Simular que la app regresa a primer plano
    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Debe estar bloqueada
    expect(result.current.isLocked).toBe(true);
  });

  it('NO bloquea la app si regresa de segundo plano antes de cumplir 1 minuto', async () => {
    await securityService.savePin('5555');

    const { result } = renderHook(() => useAppLock());

    // Desbloquear primero
    await act(async () => {
      await result.current.unlockWithPin('5555');
    });
    expect(result.current.isLocked).toBe(false);

    // Simular que la app se va a segundo plano
    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Avanzar solo 30 segundos (menos de 60 segundos)
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Regresa a primer plano
    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Sigue desbloqueada
    expect(result.current.isLocked).toBe(false);
  });
});
