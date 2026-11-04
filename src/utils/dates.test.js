import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { todayLocal, addMonthsClamped, toLocalDateString, parseLocalDate, getNextDueDate, hasExplicitTime, toLocalDateTimeString, formatTxDateTime } from './dates';

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

  describe('hasExplicitTime()', () => {
    it('retorna false para fechas YYYY-MM-DD sin hora o con medianoche', () => {
      expect(hasExplicitTime('2026-10-22')).toBe(false);
      expect(hasExplicitTime('2026-10-22T00:00:00')).toBe(false);
      expect(hasExplicitTime('2026-10-22T00:00:00Z')).toBe(false);
      expect(hasExplicitTime('2026-10-22T00:00:00-04:00')).toBe(false);
      expect(hasExplicitTime('')).toBe(false);
      expect(hasExplicitTime(null)).toBe(false);
    });

    it('retorna true para timestamps con hora real', () => {
      expect(hasExplicitTime('2026-10-22T16:12:51.985Z')).toBe(true);
      expect(hasExplicitTime('2026-10-22T17:01:00-04:00')).toBe(true);
      expect(hasExplicitTime('2026-10-22 17:01:00')).toBe(true);
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

  describe('toLocalDateTimeString()', () => {
    it('formatea un objeto Date a YYYY-MM-DDTHH:mm local', () => {
      const d = new Date(2026, 9, 21, 14, 35); // Octubre 21, 2026 14:35
      expect(toLocalDateTimeString(d)).toBe('2026-10-21T14:35');
    });

    it('devuelve cadena vacía si el input no es válido', () => {
      expect(toLocalDateTimeString(null)).toBe('');
      expect(toLocalDateTimeString('invalido')).toBe('');
    });
  });

  describe('formatTxDateTime()', () => {
    it('muestra fecha y hora si la fecha tiene hora explícita', () => {
      const d = new Date(2026, 9, 18, 10, 45);
      const res = formatTxDateTime(d);
      expect(res).toBe('2026-10-18 10:45');
    });

    it('muestra solo fecha si no tiene hora explícita (medianoche)', () => {
      expect(formatTxDateTime('2026-10-18')).toBe('2026-10-18');
    });
  });
});

describe('fechas legibles', () => {
  const now = new Date(2026, 10, 3, 10, 0, 0); // 3 nov 2026

  it('formatFriendlyDate: hoy, ayer, mañana, mismo año y otro año', async () => {
    const { formatFriendlyDate } = await import('./dates');
    expect(formatFriendlyDate('2026-11-03', { now })).toBe('Hoy');
    expect(formatFriendlyDate('2026-11-02', { now })).toBe('Ayer');
    expect(formatFriendlyDate('2026-11-04', { now })).toBe('Mañana');
    expect(formatFriendlyDate('2026-10-15', { now })).toBe('15 oct');
    expect(formatFriendlyDate('2025-12-31', { now })).toBe('31 dic 2025');
  });

  it('formatFriendlyDate: con hora real la incluye', async () => {
    const { formatFriendlyDate } = await import('./dates');
    const withTime = new Date(2026, 10, 3, 14, 30, 0).toISOString();
    expect(formatFriendlyDate(withTime, { now, withTime: true })).toBe('Hoy, 14:30');
    expect(formatFriendlyDate('2026-11-03', { now, withTime: true })).toBe('Hoy');
  });

  it('formatFriendlyDate: cambio de año el 1 de enero', async () => {
    const { formatFriendlyDate } = await import('./dates');
    const jan1 = new Date(2027, 0, 1, 9, 0, 0);
    expect(formatFriendlyDate('2026-12-31', { now: jan1 })).toBe('Ayer');
    expect(formatFriendlyDate('2026-12-30', { now: jan1 })).toBe('30 dic 2026');
  });

  it('formatDayHeader y formatDueLabel', async () => {
    const { formatDayHeader, formatDueLabel } = await import('./dates');
    expect(formatDayHeader('2026-11-03', { now })).toBe('Hoy');
    expect(formatDayHeader('2026-11-02', { now })).toBe('Ayer');
    expect(formatDayHeader('2026-11-01', { now })).toBe('Domingo 1 nov');
    expect(formatDueLabel('2026-11-01', { now })).toBe('Vencido hace 2 días');
    expect(formatDueLabel('2026-11-03', { now })).toBe('Vence hoy');
    expect(formatDueLabel('2026-11-08', { now })).toBe('Vence en 5 días');
    expect(formatDueLabel('2026-12-20', { now })).toBe('Vence el 20 dic');
  });
});
