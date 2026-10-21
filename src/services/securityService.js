import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';

export const PIN_HASH_KEY = 'finanzas_pin_hash';
export const PIN_SALT_KEY = 'finanzas_pin_salt';
export const BIOMETRICS_ENABLED_KEY = 'finanzas_biometrics_enabled';

/**
 * Genera una sal criptográfica aleatoria de 16 bytes (32 caracteres hexadecimales).
 */
export function generateSalt() {
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Genera el hash SHA-256 del PIN combinado con la sal.
 * Nunca almacena el PIN en texto plano.
 *
 * @param {string} pin - PIN numérico de 4 a 6 dígitos
 * @param {string} salt - Sal aleatoria
 * @returns {Promise<string>} Hex string del hash SHA-256
 */
export async function hashPin(pin, salt) {
  if (!pin || typeof pin !== 'string') {
    throw new Error('PIN inválido');
  }
  if (!salt || typeof salt !== 'string') {
    throw new Error('Sal inválida');
  }

  const message = `${salt}:${pin}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback si crypto.subtle no está disponible (ej. entornos HTTP no seguros o pruebas antiguas)
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  for (let i = 0; i < message.length; i++) {
    const code = message.charCodeAt(i);
    h0 = (h0 ^ code) * 0x5bd1e995;
    h1 = (h1 ^ code) * 0x1b873593;
    h2 = (h2 ^ code) * 0x2c1b3c6d;
    h3 = (h3 ^ code) * 0x7f4a7c15;
  }
  return [h0, h1, h2, h3].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('');
}

/**
 * Verifica si el PIN está configurado en el almacenamiento local.
 */
export function isPinSet() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  const hash = localStorage.getItem(PIN_HASH_KEY);
  const salt = localStorage.getItem(PIN_SALT_KEY);
  return Boolean(hash && salt);
}

/**
 * Guarda un nuevo PIN en formato seguro (únicamente hash + sal aleatoria).
 * Valida que tenga entre 4 y 6 dígitos.
 *
 * @param {string} pin
 * @returns {Promise<boolean>}
 */
export async function savePin(pin) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    throw new Error('El PIN debe tener entre 4 y 6 dígitos numéricos');
  }

  const salt = generateSalt();
  const hash = await hashPin(cleanPin, salt);

  localStorage.setItem(PIN_SALT_KEY, salt);
  localStorage.setItem(PIN_HASH_KEY, hash);
  return true;
}

/**
 * Valida un PIN ingresado contra el hash y sal almacenados.
 *
 * @param {string} pin
 * @returns {Promise<boolean>}
 */
export async function verifyPin(pin) {
  if (!isPinSet()) return true; // Si no hay PIN configurado, no bloquea
  const cleanPin = String(pin || '').trim();
  if (!cleanPin) return false;

  const storedSalt = localStorage.getItem(PIN_SALT_KEY);
  const storedHash = localStorage.getItem(PIN_HASH_KEY);

  if (!storedSalt || !storedHash) return false;

  const computedHash = await hashPin(cleanPin, storedSalt);
  return computedHash === storedHash;
}

/**
 * Elimina la configuración de PIN y desactiva la biometría.
 */
export function removePin() {
  localStorage.removeItem(PIN_HASH_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
  localStorage.removeItem(BIOMETRICS_ENABLED_KEY);
}

/**
 * Indica si el desbloqueo biométrico está habilitado por el usuario.
 */
export function isBiometricsEnabled() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  return localStorage.getItem(BIOMETRICS_ENABLED_KEY) === 'true';
}

/**
 * Activa o desactiva la preferencia de biometría.
 */
export function setBiometricsEnabled(enabled) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.setItem(BIOMETRICS_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Consulta la disponibilidad de hardware de biometría en el dispositivo actual.
 */
export async function checkBiometricsAvailability() {
  if (!Capacitor.isNativePlatform()) {
    return {
      isAvailable: false,
      reason: 'Biometría solo disponible en dispositivos móviles nativos'
    };
  }

  try {
    const result = await NativeBiometric.isAvailable({ useFallback: false });
    const isAvail = Boolean(result?.isAvailable);
    let biometryName = 'Huella / Biometría';

    if (result?.biometryType === BiometryType.FACE_ID || result?.biometryType === BiometryType.FACE_AUTHENTICATION) {
      biometryName = 'Face ID / Reconocimiento facial';
    } else if (result?.biometryType === BiometryType.TOUCH_ID || result?.biometryType === BiometryType.FINGERPRINT) {
      biometryName = 'Huella dactilar';
    }

    return {
      isAvailable: isAvail,
      biometryType: result?.biometryType,
      biometryName,
      deviceIsSecure: Boolean(result?.deviceIsSecure)
    };
  } catch (err) {
    console.warn('Error checking biometrics availability:', err);
    return {
      isAvailable: false,
      reason: err?.message || 'Error de verificación de biometría'
    };
  }
}

/**
 * Solicita autenticación biométrica nativa (huella dactilar o reconocimiento facial).
 */
export async function authenticateWithBiometrics(reason = 'Confirma tu identidad para acceder a Finanzas') {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Plataforma no compatible con biometría nativa' };
  }

  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Desbloquear Finanzas',
      subtitle: 'Usa tu huella o biometría registrada',
      description: 'Por favor escanea tu huella o rostro para continuar',
      negativeButtonText: 'Usar PIN'
    });
    return { success: true };
  } catch (err) {
    console.warn('Biometric authentication failed or was cancelled:', err);
    return {
      success: false,
      error: err?.message || 'Autenticación biométrica no completada'
    };
  }
}
