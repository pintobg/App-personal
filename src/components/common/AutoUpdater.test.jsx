import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import AutoUpdater from './AutoUpdater';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';

vi.mock('@capgo/capacitor-updater', () => ({
  CapacitorUpdater: {
    notifyAppReady: vi.fn().mockResolvedValue({}),
    download: vi.fn(),
    set: vi.fn()
  }
}));

describe('AutoUpdater Component - Seguridad OTA', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  });

  it('rechaza cualquier bundle remoto que no incluya checksum obligatorio y muestra toast de error', async () => {
    const showToastMock = vi.fn();

    // Mock fetch devolviendo manifiesto sin checksum
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: 'v2.0.0-insecure',
        bundleUrl: 'https://example.com/malicious.zip'
        // Falta checksum a propósito
      })
    });

    render(<AutoUpdater showToast={showToastMock} />);

    // Disparar evento manual de comprobación
    window.dispatchEvent(new CustomEvent('finanzas:check-update'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Actualización rechazada: falta checksum de seguridad obligatorio',
        'error'
      );
    });
  });

  it('rechaza y muestra error si la descarga o verificación de firma falla', async () => {
    const showToastMock = vi.fn();

    CapacitorUpdater.download.mockRejectedValue(new Error('Signature verification failed'));

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: 'v2.0.1-tampered',
        bundleUrl: 'https://example.com/bundle.zip',
        checksum: 'abc123invalidchecksum'
      })
    });

    render(<AutoUpdater showToast={showToastMock} />);

    window.dispatchEvent(new CustomEvent('finanzas:check-update'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringContaining('Actualización rechazada o firma inválida: Signature verification failed'),
        'error'
      );
    });
  });
});
