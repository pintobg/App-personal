import { LocalNotifications } from '@capacitor/local-notifications';
import { formatAmount } from '../utils/formatters';

export const NOTIFICATION_SETTINGS_KEY = 'finanzas_notification_settings';
export const LAST_BCV_ALERT_KEY = 'finanzas_last_bcv_alert_date';

export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true, // Recordatorios de vencimiento activados por defecto
  bcvAlertEnabled: false, // Alerta de cambio de tasa BCV opcional (desactivada por defecto)
  bcvAlertThresholdPct: 2.0 // Umbral porcentual X% por defecto (2%)
};

/**
 * Obtiene la configuración de notificaciones guardada en preferencias.
 */
export function getNotificationSettings() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
    }
  } catch {
    // Ignorar errores de parseo
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS };
}

/**
 * Guarda la configuración de notificaciones en preferencias.
 */
export function saveNotificationSettings(newSettings) {
  try {
    const merged = { ...getNotificationSettings(), ...newSettings };
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

/**
 * Genera un ID numérico entero de 32 bits a partir de un string para Capacitor LocalNotifications.
 */
export function getNotificationBaseId(str) {
  if (!str) return 1000;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 10000000;
}

/**
 * Verifica el estado del permiso de notificaciones (Android 13+ / Web).
 */
export async function checkNotificationPermission() {
  try {
    const status = await LocalNotifications.checkPermissions();
    return status?.display === 'granted';
  } catch {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }
}

/**
 * Solicita los permisos nativos de notificaciones.
 */
export async function requestNotificationPermission() {
  try {
    const status = await LocalNotifications.requestPermissions();
    return status?.display === 'granted';
  } catch {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
    return false;
  }
}

/**
 * Cancela las notificaciones programadas para una obligación específica.
 */
export async function cancelObligationReminders(obligationId) {
  if (!obligationId) return;
  const baseId = getNotificationBaseId(obligationId);
  const idDayBefore = baseId * 10 + 1;
  const idDueDay = baseId * 10 + 2;

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: idDayBefore }, { id: idDueDay }]
    });
  } catch {
    // Ignorar si no está soportado en entorno actual
  }
}

/**
 * Programa los recordatorios a las 9:00 a.m. para el día anterior y el día del vencimiento de una obligación.
 */
export async function scheduleObligationReminders(obligation) {
  if (!obligation || !obligation.id) return;

  // Siempre cancelar notificaciones previas de esta deuda
  await cancelObligationReminders(obligation.id);

  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  // Si la obligación está pagada o no tiene recordatorio activado (por defecto true si no se especifica), no programar
  const isPaid = obligation.status === 'paid' ||
    (Boolean(obligation.totalInstallments) && Number(obligation.paidInstallments) >= Number(obligation.totalInstallments));
  const isReminderActive = obligation.reminderEnabled !== false;

  if (isPaid || !isReminderActive || !obligation.dueDate) {
    return;
  }

  // Parsear fecha de vencimiento a las 9:00 a.m.
  const parts = obligation.dueDate.split('-');
  if (parts.length < 3) return;
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return;

  const dueDayAt9 = new Date(year, month - 1, day, 9, 0, 0, 0);
  const dayBeforeAt9 = new Date(dueDayAt9.getTime() - 24 * 60 * 60 * 1000);

  const now = Date.now();
  const baseId = getNotificationBaseId(obligation.id);
  const toSchedule = [];

  const amountStr = `${formatAmount(obligation.amount, obligation.currency)} ${obligation.currency}`;

  // 1. Aviso el día anterior a las 9:00 a.m.
  if (dayBeforeAt9.getTime() > now) {
    toSchedule.push({
      id: baseId * 10 + 1,
      title: `Vence mañana: ${obligation.title}`,
      body: `Mañana vence el pago de ${amountStr}.`,
      schedule: { at: dayBeforeAt9 },
      extra: { obligationId: obligation.id, type: 'day_before' }
    });
  }

  // 2. Aviso el día del vencimiento a las 9:00 a.m.
  if (dueDayAt9.getTime() > now) {
    toSchedule.push({
      id: baseId * 10 + 2,
      title: `Vence hoy: ${obligation.title}`,
      body: `Hoy vence el pago de ${amountStr}. Recuerda registrar tu pago en la app.`,
      schedule: { at: dueDayAt9 },
      extra: { obligationId: obligation.id, type: 'due_day' }
    });
  }

  if (toSchedule.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications: toSchedule });
    } catch (err) {
      if (err?.code !== 'UNAVAILABLE') {
        console.warn('[notificationService] No se pudieron programar recordatorios:', err);
      }
    }
  }
}

/**
 * Sincroniza y reprograma todos los avisos de la lista de obligaciones.
 */
export async function syncAllObligationReminders(obligations = []) {
  if (!Array.isArray(obligations)) return;
  for (const ob of obligations) {
    await scheduleObligationReminders(ob);
  }
}

/**
 * Notificación opcional: aviso cuando la tasa oficial BCV cambia más de X% respecto al día anterior.
 */
export async function checkAndNotifyBcvChange({ currentBcv, previousBcv }) {
  const curr = Number(currentBcv);
  const prev = Number(previousBcv);

  if (!curr || !prev || curr <= 0 || prev <= 0) return;

  const settings = getNotificationSettings();
  if (!settings.bcvAlertEnabled) return;

  const threshold = Number(settings.bcvAlertThresholdPct) || 2.0;
  const diffPct = Number((((curr - prev) / prev) * 100).toFixed(2));

  if (Math.abs(diffPct) < threshold) return;

  // Evitar notificar dos veces en el mismo día
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastAlert = localStorage.getItem(LAST_BCV_ALERT_KEY);
  if (lastAlert === todayStr) return;

  const sign = diffPct >= 0 ? '+' : '';
  const bodyText = `La tasa oficial BCV cambió ${sign}${diffPct}% hoy: ${formatAmount(curr, 'VES')} Bs./$ (ayer: ${formatAmount(prev, 'VES')} Bs./$).`;

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: 888888,
        title: 'Variación cambiaria BCV',
        body: bodyText,
        schedule: { at: new Date(Date.now() + 1000) }
      }]
    });
    localStorage.setItem(LAST_BCV_ALERT_KEY, todayStr);
  } catch (err) {
    if (err?.code !== 'UNAVAILABLE') {
      console.warn('[notificationService] Falló alerta de variación BCV:', err);
    }
  }
}
