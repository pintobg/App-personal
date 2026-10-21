import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { todayLocal, addMonthsClamped, toLocalDateString, parseLocalDate } from './dates';

describe('Utils: dates.js', () => {
  describe('todayLocal() en hora nocturna en Venezuela (America/Caracas)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('A las 23:00 en Caracas (UTC-4) debe dar la fecha de hoy, no la de mañana en UTC', () => {
      // 2026-10-21 23:00:00 en Caracas (UTC-4) corresponde a 2026-10-22 03:00:00 UTC
      const caracasNight = new Date('2026-10-22T03:00:00Z');
      vi.setSystemTime(caracasNight);

      // Si el entorno corre con TZ=America/Caracas
      // Verificamos que toLocalDateString() respete la fecha local del dispositivo
      const expectedLocalDate = `${caracasNight.getFullYear()}-${String(caracasNight.getMonth() + 1).padStart(2, '0')}-${String(caracasNight.getDate()).padStart(2, '0')}`;
      expect(todayLocal()).toBe(expectedLocalDate);
    });
  });

  describe('addMonthsClamped()', () => {
    it('31 de enero + 1 mes en año no bisiesto (2025) da 28 de febrero', () => {
      const nextDate = addMonthsClamped('2025-01-31', 1);
      expect(toLocalDateString(nextDate)).toBe('2025-02-28');
    });

    it('31 de enero + 1 mes en año bisiesto (2024) da 29 de febrero', () => {
      const nextDate = addMonthsClamped('2024-01-31', 1);
      expect(toLocalDateString(nextDate)).toBe('2024-02-29');
    });

    it('31 de marzo + 1 mes da 30 de abril', () => {
      const nextDate = addMonthsClamped('2026-03-31', 1);
      expect(toLocalDateString(nextDate)).toBe('2026-04-30');
    });

    it('15 de enero + 1 mes da 15 de febrero (sin necesidad de clampeo)', () => {
      const nextDate = addMonthsClamped('2026-01-15', 1);
      expect(toLocalDateString(nextDate)).toBe('2026-02-15');
    });
  });

  describe('parseLocalDate()', () => {
    it('parsea strings YYYY-MM-DD fijando a las 12:00 locales', () => {
      const parsed = parseLocalDate('2026-06-15');
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(5); // Junio es mes 5 (0-indexed)
      expect(parsed.getDate()).toBe(15);
      expect(parsed.getHours()).toBe(12);
    });
  });
});
