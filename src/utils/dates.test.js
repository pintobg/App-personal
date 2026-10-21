import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { todayLocal, addMonthsClamped, toLocalDateString, parseLocalDate, getNextDueDate } from './dates';

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

  describe('getNextDueDate() - Cálculo de próximos vencimientos', () => {
    describe('Frecuencia Quincenal (15 y último) - semi-monthly', () => {
      it('una deuda quincenal que vence el 15 pasa al último día del mes (Criterio de aceptación)', () => {
        // Enero: del 15 pasa al 31 de enero
        expect(getNextDueDate('2026-01-15', 'semi-monthly')).toBe('2026-01-31');
      });

      it('si vence el 15 de febrero en año no bisiesto (2026), pasa al 28 de febrero', () => {
        expect(getNextDueDate('2026-02-15', 'semi-monthly')).toBe('2026-02-28');
      });

      it('si vence el 15 de febrero en año bisiesto (2024), pasa al 29 de febrero', () => {
        expect(getNextDueDate('2024-02-15', 'semi-monthly')).toBe('2024-02-29');
      });

      it('si vence el último día del mes, pasa al 15 del mes siguiente', () => {
        // 31 de enero -> 15 de febrero
        expect(getNextDueDate('2026-01-31', 'semi-monthly')).toBe('2026-02-15');
        // 28 de febrero -> 15 de marzo
        expect(getNextDueDate('2026-02-28', 'semi-monthly')).toBe('2026-03-15');
        // 30 de abril -> 15 de mayo
        expect(getNextDueDate('2026-04-30', 'semi-monthly')).toBe('2026-05-15');
      });

      it('si vence en diciembre último día (2026-12-31), pasa al 15 de enero del año siguiente', () => {
        expect(getNextDueDate('2026-12-31', 'semi-monthly')).toBe('2027-01-15');
      });
    });

    describe('Frecuencia Cada 15 días - bi-weekly', () => {
      it('suma exactamente 15 días de calendario', () => {
        expect(getNextDueDate('2026-01-15', 'bi-weekly')).toBe('2026-01-30');
        expect(getNextDueDate('2026-01-30', 'bi-weekly')).toBe('2026-02-14');
      });
    });

    describe('Frecuencia Mensual - monthly', () => {
      it('31 de enero pasa al 28 de febrero sin desbordar', () => {
        expect(getNextDueDate('2025-01-31', 'monthly')).toBe('2025-02-28');
      });
    });
  });
});
