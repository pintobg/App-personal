import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNotificationSettings,
  saveNotificationSettings,
  getNotificationBaseId,
  scheduleObligationReminders,
  cancelObligationReminders,
  checkAndNotifyBcvChange
} from './notificationService';

// Mock de @capacitor/local-notifications
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn(async () => ({ display: 'granted' })),
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    schedule: vi.fn(async () => {}),
    cancel: vi.fn(async () => {})
  }
}));

import { LocalNotifications } from '@capacitor/local-notifications';

describe('Service: notificationService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('guarda y recupera la configuración de notificaciones', () => {
    const initial = getNotificationSettings();
    expect(initial.enabled).toBe(true);
    expect(initial.bcvAlertEnabled).toBe(false);

    saveNotificationSettings({ bcvAlertEnabled: true, bcvAlertThresholdPct: 3.5 });
    const updated = getNotificationSettings();
    expect(updated.bcvAlertEnabled).toBe(true);
    expect(updated.bcvAlertThresholdPct).toBe(3.5);
  });

  it('calcula hash de id numérico consistente para Capacitor', () => {
    const id1 = getNotificationBaseId('ob-12345');
    const id2 = getNotificationBaseId('ob-12345');
    expect(id1).toBe(id2);
    expect(typeof id1).toBe('number');
  });

  it('programa recordatorios el día anterior y el día del vencimiento si están en el futuro', async () => {
    // Definimos vencimiento a 5 días en el futuro
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const yyyy = futureDate.getFullYear();
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const dd = String(futureDate.getDate()).padStart(2, '0');
    const dueDateStr = `${yyyy}-${mm}-${dd}`;

    const ob = {
      id: 'ob-test-1',
      title: 'Condominio',
      amount: 45,
      currency: 'USD',
      dueDate: dueDateStr,
      status: 'pending',
      reminderEnabled: true
    };

    await scheduleObligationReminders(ob);

    // Debe cancelar anteriores y luego agendar
    expect(LocalNotifications.cancel).toHaveBeenCalled();
    expect(LocalNotifications.schedule).toHaveBeenCalled();

    const scheduleCalls = vi.mocked(LocalNotifications.schedule).mock.calls;
    expect(scheduleCalls.length).toBeGreaterThan(0);
    const notifications = scheduleCalls[0][0].notifications;
    expect(notifications).toHaveLength(2);
    expect(notifications[0].title).toContain('Vence mañana');
    expect(notifications[1].title).toContain('Vence hoy');
  });

  it('cancela y no programa recordatorios si la obligación ya fue pagada', async () => {
    const ob = {
      id: 'ob-paid',
      title: 'Colegio',
      amount: 100,
      currency: 'USD',
      dueDate: '2026-12-01',
      status: 'paid'
    };

    await scheduleObligationReminders(ob);
    expect(LocalNotifications.cancel).toHaveBeenCalled();
    expect(LocalNotifications.schedule).not.toHaveBeenCalled();

    await cancelObligationReminders('ob-custom-id');
    expect(LocalNotifications.cancel).toHaveBeenCalledTimes(2);
  });

  it('emite alerta de variación BCV si está activada y el cambio supera el umbral', async () => {
    saveNotificationSettings({ bcvAlertEnabled: true, bcvAlertThresholdPct: 2.0 });

    // Ayer: 50 Bs, Hoy: 52 Bs (+4%)
    await checkAndNotifyBcvChange({ currentBcv: 52, previousBcv: 50 });
    expect(LocalNotifications.schedule).toHaveBeenCalled();

    const notifs = vi.mocked(LocalNotifications.schedule).mock.calls[0][0].notifications;
    expect(notifs[0].title).toBe('Variación cambiaria BCV');
    expect(notifs[0].body).toContain('+4%');
  });
});
