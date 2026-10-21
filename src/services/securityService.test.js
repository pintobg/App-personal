import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSalt,
  hashPin,
  isPinSet,
  savePin,
  verifyPin,
  removePin,
  isBiometricsEnabled,
  setBiometricsEnabled,
  PIN_HASH_KEY,
  PIN_SALT_KEY
} from './securityService.js';

describe('securityService - PIN y Seguridad', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('generateSalt genera una cadena hexadecimal aleatoria de 32 caracteres', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    expect(salt1).toHaveLength(32);
    expect(salt2).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/.test(salt1)).toBe(true);
    expect(salt1).not.toBe(salt2);
  });

  it('hashPin genera el mismo hash para el mismo PIN y sal, y diferente con sal o PIN distinto', async () => {
    const saltA = '0123456789abcdef0123456789abcdef';
    const saltB = 'fedcba9876543210fedcba9876543210';
    const pin = '1234';

    const hash1 = await hashPin(pin, saltA);
    const hash2 = await hashPin(pin, saltA);
    const hashDifferentPin = await hashPin('5678', saltA);
    const hashDifferentSalt = await hashPin(pin, saltB);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferentPin);
    expect(hash1).not.toBe(hashDifferentSalt);
    expect(hash1).toHaveLength(64); // SHA-256 hex tiene 64 chars
  });

  it('savePin almacena únicamente hash y sal, y nunca almacena el PIN en texto plano', async () => {
    const rawPin = '54321';
    await savePin(rawPin);

    expect(isPinSet()).toBe(true);
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    const storedSalt = localStorage.getItem(PIN_SALT_KEY);

    expect(storedHash).toBeTruthy();
    expect(storedSalt).toBeTruthy();

    // Comprobar que en ninguna clave de localStorage existe el texto plano '54321'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      expect(val).not.toContain(rawPin);
    }
  });

  it('rechaza PIN con longitud inválida o caracteres no numéricos', async () => {
    await expect(savePin('123')).rejects.toThrow('El PIN debe tener entre 4 y 6 dígitos numéricos');
    await expect(savePin('1234567')).rejects.toThrow('El PIN debe tener entre 4 y 6 dígitos numéricos');
    await expect(savePin('abcd')).rejects.toThrow('El PIN debe tener entre 4 y 6 dígitos numéricos');
    await expect(savePin('')).rejects.toThrow('El PIN debe tener entre 4 y 6 dígitos numéricos');
  });

  it('verifyPin valida correctamente el PIN ingresado y rechaza PIN erróneo', async () => {
    await savePin('4826');

    const ok = await verifyPin('4826');
    const wrong = await verifyPin('0000');
    const empty = await verifyPin('');

    expect(ok).toBe(true);
    expect(wrong).toBe(false);
    expect(empty).toBe(false);
  });

  it('removePin elimina las claves asociadas de localStorage', async () => {
    await savePin('9999');
    setBiometricsEnabled(true);
    expect(isPinSet()).toBe(true);
    expect(isBiometricsEnabled()).toBe(true);

    removePin();

    expect(isPinSet()).toBe(false);
    expect(isBiometricsEnabled()).toBe(false);
    expect(localStorage.getItem(PIN_HASH_KEY)).toBeNull();
    expect(localStorage.getItem(PIN_SALT_KEY)).toBeNull();
  });
});
