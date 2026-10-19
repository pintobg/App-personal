import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const VERSION_JSON_URL = 'https://pintobg.github.io/App-personal/version.json';
const INSTALLED_VERSION_KEY = 'finanzas_installed_ota_version';
const JUST_UPDATED_KEY = 'finanzas_just_updated';

/* global __APP_BUILD_ID__ */
const CURRENT_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'local-dev';

function isLocalDevEnvironment() {
  if (import.meta.env?.DEV) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.endsWith('.local')
  );
}

export default function AutoUpdater({ showToast }) {
  const [statusBanner, setStatusBanner] = useState(null); // { type: 'downloading' | 'applying' | 'updated', text: string }
  const isUpdatingRef = useRef(false);

  // 1. Notificar a CapacitorUpdater que el bundle actual inició correctamente (evita rollback automático)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorUpdater.notifyAppReady().catch((err) => {
        console.warn('Error in notifyAppReady:', err);
      });
    }

    // Si estamos en servidor de desarrollo local, limpiar cualquier bandera residual
    if (!Capacitor.isNativePlatform() && isLocalDevEnvironment()) {
      localStorage.removeItem(JUST_UPDATED_KEY);
      return;
    }

    // Si acabamos de aplicar una actualización OTA, mostrar aviso de éxito
    const justUpdated = localStorage.getItem(JUST_UPDATED_KEY);
    if (justUpdated) {
      localStorage.removeItem(JUST_UPDATED_KEY);
      if (CURRENT_BUILD_ID && CURRENT_BUILD_ID !== 'local-dev') {
        localStorage.setItem(INSTALLED_VERSION_KEY, CURRENT_BUILD_ID);
      }
      setStatusBanner({
        type: 'updated',
        text: `App actualizada (${justUpdated})`
      });
    } else if (CURRENT_BUILD_ID && CURRENT_BUILD_ID !== 'local-dev') {
      localStorage.setItem(INSTALLED_VERSION_KEY, CURRENT_BUILD_ID);
    }
  }, []);

  // Auto-ocultar el banner de actualización completada después de 3.5 segundos (compatible con StrictMode)
  useEffect(() => {
    if (statusBanner?.type === 'updated') {
      const timer = setTimeout(() => {
        setStatusBanner(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [statusBanner]);

  const checkForUpdates = useCallback(async (manual = false) => {
    if (isUpdatingRef.current) return;

    // En entorno de desarrollo local (PC o red local Wi-Fi), no ejecutar auto-update OTA
    if (!Capacitor.isNativePlatform() && isLocalDevEnvironment()) {
      if (manual && showToast) {
        showToast('Modo de desarrollo local activo');
      }
      return;
    }

    try {
      const response = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        if (manual && showToast) {
          showToast('Ya tienes la versión más reciente instalada');
        }
        return;
      }

      const remote = await response.json();
      if (!remote || !remote.version || !remote.bundleUrl) {
        if (manual && showToast) {
          showToast('Ya tienes la versión más reciente instalada');
        }
        return;
      }

      const installedVersion = localStorage.getItem(INSTALLED_VERSION_KEY) || CURRENT_BUILD_ID;

      // Si la versión remota coincide con la instalada o con el build actual, no hay cambios
      if (remote.version === installedVersion || remote.version === CURRENT_BUILD_ID) {
        if (manual && showToast) {
          showToast(`Tienes la última versión (${remote.shortVersion || remote.version.slice(0, 7)})`);
        }
        return;
      }

      isUpdatingRef.current = true;
      const shortVer = remote.shortVersion || remote.version.slice(0, 7);

      setStatusBanner({
        type: 'downloading',
        text: `Descargando nueva actualización (${shortVer})...`
      });

      if (Capacitor.isNativePlatform()) {
        const bundle = await CapacitorUpdater.download({
          url: remote.bundleUrl,
          version: shortVer
        });

        localStorage.setItem(INSTALLED_VERSION_KEY, remote.version);
        localStorage.setItem(JUST_UPDATED_KEY, shortVer);

        setStatusBanner({
          type: 'applying',
          text: 'Aplicando actualización...'
        });

        await CapacitorUpdater.set({ id: bundle.id });
      } else {
        localStorage.setItem(INSTALLED_VERSION_KEY, remote.version);
        localStorage.setItem(JUST_UPDATED_KEY, shortVer);
        window.location.reload();
      }
    } catch (err) {
      console.warn('Update check skipped or failed:', err);
      isUpdatingRef.current = false;
      setStatusBanner(null);
      if (manual && showToast) {
        showToast('No se pudo verificar actualizaciones. Revisa tu conexión.', 'error');
      }
    }
  }, [showToast]);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      checkForUpdates(false);
    }, 2500);

    const interval = setInterval(() => {
      checkForUpdates(false);
    }, 90000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(false);
      }
    };

    const handleManualTrigger = () => {
      checkForUpdates(true);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('finanzas:check-update', handleManualTrigger);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('finanzas:check-update', handleManualTrigger);
    };
  }, [checkForUpdates]);

  if (!statusBanner) return null;

  const isSuccess = statusBanner.type === 'updated';

  return (
    <div
      onClick={() => setStatusBanner(null)}
      style={{
        position: 'fixed',
        top: 'calc(12px + env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'calc(100% - 2rem)',
        maxWidth: '400px',
        background: isSuccess ? '#14332b' : '#172742',
        border: `1px solid ${isSuccess ? '#1f5143' : '#203960'}`,
        color: isSuccess ? '#10b981' : '#60a5fa',
        padding: '0.6rem 0.85rem',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.55rem',
        fontSize: '0.82rem',
        fontWeight: 600,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)',
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
        <span>{isSuccess ? '✅' : '🔄'}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusBanner.text}</span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setStatusBanner(null);
        }}
        aria-label="Cerrar notificación"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          opacity: 0.8,
          cursor: 'pointer',
          padding: '2px 4px',
          fontSize: '0.9rem',
          lineHeight: 1,
          flexShrink: 0
        }}
      >
        ✕
      </button>
    </div>
  );
}
