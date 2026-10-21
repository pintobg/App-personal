import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  isPinSet,
  verifyPin,
  savePin,
  removePin,
  isBiometricsEnabled,
  setBiometricsEnabled,
  checkBiometricsAvailability,
  authenticateWithBiometrics
} from '../services/securityService.js';

export const LOCK_TIMEOUT_MS = 60 * 1000; // 1 minuto en segundo plano

export function useAppLock({ showToast } = {}) {
  const [hasPin, setHasPin] = useState(() => isPinSet());
  // Si tiene PIN configurado al abrir la aplicación, inicia bloqueada
  const [isLocked, setIsLocked] = useState(() => isPinSet());
  const [bioEnabled, setBioEnabled] = useState(() => isBiometricsEnabled());
  const [bioAvailable, setBioAvailable] = useState(false);
  const [biometryTitle, setBiometryTitle] = useState('Huella dactilar');

  const backgroundTimeRef = useRef(null);

  // Comprobar disponibilidad de biometría en el dispositivo
  const refreshSecurityStatus = useCallback(async () => {
    const pinConfigured = isPinSet();
    setHasPin(pinConfigured);
    const bioPref = isBiometricsEnabled();
    setBioEnabled(bioPref);

    const bioStatus = await checkBiometricsAvailability();
    setBioAvailable(Boolean(bioStatus.isAvailable));
    if (bioStatus.biometryName) {
      setBiometryTitle(bioStatus.biometryName);
    }
  }, []);

  useEffect(() => {
    refreshSecurityStatus();
  }, [refreshSecurityStatus]);

  // Manejo de eventos de segundo plano y temporizador de 1 minuto
  useEffect(() => {
    if (!hasPin) {
      setIsLocked(false);
      return;
    }

    const handleAppBackground = () => {
      backgroundTimeRef.current = Date.now();
    };

    const handleAppForeground = () => {
      if (backgroundTimeRef.current && hasPin) {
        const elapsed = Date.now() - backgroundTimeRef.current;
        if (elapsed >= LOCK_TIMEOUT_MS) {
          setIsLocked(true);
        }
      }
      backgroundTimeRef.current = null;
    };

    // 1. Escuchar cambios de visibilidad del navegador / WebView
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleAppBackground();
      } else if (document.visibilityState === 'visible') {
        handleAppForeground();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 2. Escuchar ciclo de vida nativo de Capacitor App
    let appStateHandle = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', (state) => {
        if (!state.isActive) {
          handleAppBackground();
        } else {
          handleAppForeground();
        }
      }).then((h) => {
        appStateHandle = h;
      }).catch((e) => {
        console.warn('Error listening to appStateChange for lock:', e);
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (appStateHandle?.remove) {
        appStateHandle.remove();
      }
    };
  }, [hasPin]);

  // Función para desbloquear con PIN
  const unlockWithPin = useCallback(async (pinInput) => {
    if (!hasPin) {
      setIsLocked(false);
      return { success: true };
    }
    const isValid = await verifyPin(pinInput);
    if (isValid) {
      setIsLocked(false);
      backgroundTimeRef.current = null;
      return { success: true };
    }
    return { success: false, error: 'PIN incorrecto' };
  }, [hasPin]);

  // Función para desbloquear con biometría
  const unlockWithBiometrics = useCallback(async () => {
    if (!hasPin || !bioEnabled || !bioAvailable) {
      return { success: false, error: 'Biometría no disponible o desactivada' };
    }
    const res = await authenticateWithBiometrics('Desbloquear Finanzas con tu huella');
    if (res.success) {
      setIsLocked(false);
      backgroundTimeRef.current = null;
      return { success: true };
    }
    return { success: false, error: res.error || 'Autenticación biométrica cancelada' };
  }, [hasPin, bioEnabled, bioAvailable]);

  // Configurar un nuevo PIN
  const configurePin = useCallback(async (newPin) => {
    await savePin(newPin);
    setHasPin(true);
    setIsLocked(false);
    await refreshSecurityStatus();
    if (showToast) showToast('PIN de seguridad configurado exitosamente');
  }, [refreshSecurityStatus, showToast]);

  // Cambiar PIN existente
  const updatePin = useCallback(async (currentPin, newPin) => {
    const isCurrentValid = await verifyPin(currentPin);
    if (!isCurrentValid) {
      return { success: false, error: 'El PIN actual no es correcto' };
    }
    await savePin(newPin);
    setHasPin(true);
    await refreshSecurityStatus();
    if (showToast) showToast('PIN modificado exitosamente');
    return { success: true };
  }, [refreshSecurityStatus, showToast]);

  // Desactivar PIN
  const disablePin = useCallback(async (currentPin) => {
    const isCurrentValid = await verifyPin(currentPin);
    if (!isCurrentValid) {
      return { success: false, error: 'El PIN actual no es correcto' };
    }
    removePin();
    setHasPin(false);
    setIsLocked(false);
    setBioEnabled(false);
    await refreshSecurityStatus();
    if (showToast) showToast('Bloqueo por PIN desactivado');
    return { success: true };
  }, [refreshSecurityStatus, showToast]);

  // Alternar biometría
  const toggleBiometrics = useCallback(async (enable) => {
    if (enable) {
      const bio = await checkBiometricsAvailability();
      if (!bio.isAvailable) {
        if (showToast) showToast('El dispositivo no cuenta con sensor biométrico configurado', 'error');
        return { success: false, error: 'Biometría no disponible' };
      }
      // Probar que el usuario pueda autenticar antes de activar
      const testAuth = await authenticateWithBiometrics('Confirma tu huella para habilitar el desbloqueo rápido');
      if (!testAuth.success) {
        if (showToast) showToast('No se pudo verificar la huella', 'error');
        return { success: false, error: testAuth.error };
      }
      setBiometricsEnabled(true);
      setBioEnabled(true);
      if (showToast) showToast('Desbloqueo biométrico activado');
      return { success: true };
    } else {
      setBiometricsEnabled(false);
      setBioEnabled(false);
      if (showToast) showToast('Desbloqueo biométrico desactivado');
      return { success: true };
    }
  }, [showToast]);

  return {
    isLocked,
    hasPin,
    bioEnabled,
    bioAvailable,
    biometryTitle,
    unlockWithPin,
    unlockWithBiometrics,
    configurePin,
    updatePin,
    disablePin,
    toggleBiometrics,
    refreshSecurityStatus,
    setIsLocked
  };
}
