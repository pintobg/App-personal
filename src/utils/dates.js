/**
 * Utilidades para manejo de fechas en hora local del dispositivo (Venezuela UTC-4)
 * Evita desfaces causados por new Date().toISOString() que trabaja en UTC.
 */

/**
 * Devuelve la fecha local del dispositivo en formato 'YYYY-MM-DD'.
 */
export function todayLocal() {
  return toLocalDateString(new Date());
}

/**
 * Convierte un objeto Date (o timestamp/string válido) a 'YYYY-MM-DD' según la hora local del dispositivo.
 */
export function toLocalDateString(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsea una cadena 'YYYY-MM-DD' creando un Date a las 12:00:00 (mediodía) local,
 * evitando problemas de saltos de día por zonas horarias o cambios de hora.
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  // Si viene con hora o formato ISO completo (ej: 2026-10-21T18:00:00Z)
  const cleanDateStr = String(dateStr).split('T')[0];
  const parts = cleanDateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  return new Date(dateStr);
}

/**
 * Suma 'n' meses a una fecha sin desbordar el último día del mes destino.
 * Ej: 31 de enero + 1 mes = 28 o 29 de febrero (en lugar de saltar a marzo).
 * Acepta string 'YYYY-MM-DD' o Date. Retorna Date a las 12:00 locales.
 */
export function addMonthsClamped(dateInput, n = 1) {
  const base = parseLocalDate(dateInput);
  const originalDay = base.getDate();
  const targetYear = base.getFullYear();
  const targetMonth = base.getMonth() + n;

  // Creamos la fecha en el día 1 del mes destino
  const result = new Date(targetYear, targetMonth, 1, 12, 0, 0, 0);

  // Cantidad máxima de días en el mes destino: día 0 del siguiente mes
  const maxDaysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();

  // Clampeamos el día para no desbordar
  const clampedDay = Math.min(originalDay, maxDaysInTargetMonth);
  result.setDate(clampedDay);

  return result;
}

/**
 * Calcula la siguiente fecha de vencimiento según la frecuencia.
 * Soporta:
 * - 'weekly': +7 días
 * - 'bi-weekly': +15 días ("Cada 15 días")
 * - 'semi-monthly': "Quincenal (15 y último)" (si vence el 15 pasa al último del mes; si vence el último, al 15 del mes siguiente)
 * - 'monthly': +1 mes usando addMonthsClamped (sin desbordar)
 */
export function getNextDueDate(currentDueDate, frequency) {
  if (!currentDueDate || frequency === 'one-time') return currentDueDate;
  const baseDate = parseLocalDate(currentDueDate);
  if (isNaN(baseDate.getTime())) return currentDueDate;

  if (frequency === 'weekly') {
    baseDate.setDate(baseDate.getDate() + 7);
    return toLocalDateString(baseDate);
  }

  if (frequency === 'bi-weekly') {
    baseDate.setDate(baseDate.getDate() + 15);
    return toLocalDateString(baseDate);
  }

  if (frequency === 'semi-monthly') {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const day = baseDate.getDate();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    if (day < 15) {
      return toLocalDateString(new Date(year, month, 15, 12, 0, 0, 0));
    } else if (day === 15) {
      return toLocalDateString(new Date(year, month, lastDayOfMonth, 12, 0, 0, 0));
    } else {
      // Si vence el último día del mes (o > 15), pasa al 15 del mes siguiente
      return toLocalDateString(new Date(year, month + 1, 15, 12, 0, 0, 0));
    }
  }

  if (frequency === 'monthly') {
    const clamped = addMonthsClamped(baseDate, 1);
    return toLocalDateString(clamped);
  }

  return currentDueDate;
}
