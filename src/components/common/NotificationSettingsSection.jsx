import { useState, useEffect } from 'react';
import { Icon } from '../ui';
import {
  getNotificationSettings,
  saveNotificationSettings,
  checkNotificationPermission,
  requestNotificationPermission,
  syncAllObligationReminders
} from '../../services/notificationService';

export default function NotificationSettingsSection({ obligations = [], showToast }) {
  const [settings, setSettings] = useState(() => getNotificationSettings());
  const [hasPermission, setHasPermission] = useState(true);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  useEffect(() => {
    checkNotificationPermission().then(granted => {
      setHasPermission(granted);
    });
  }, []);

  const handleToggleReminders = (checked) => {
    const updated = saveNotificationSettings({ enabled: checked });
    setSettings(updated);
    if (showToast) {
      showToast(checked ? 'Recordatorios de vencimiento activados' : 'Recordatorios de vencimiento desactivados');
    }
    syncAllObligationReminders(obligations);
  };

  const handleToggleBcvAlert = (checked) => {
    const updated = saveNotificationSettings({ bcvAlertEnabled: checked });
    setSettings(updated);
    if (showToast) {
      showToast(checked ? 'Aviso por cambio de tasa BCV activado' : 'Aviso por cambio de tasa BCV desactivado');
    }
  };

  const handleChangeThreshold = (val) => {
    const num = Number(val) || 2.0;
    const updated = saveNotificationSettings({ bcvAlertThresholdPct: num });
    setSettings(updated);
  };

  const handleRequestPermissionWithExplanation = async () => {
    setShowExplanationModal(false);
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    if (granted) {
      if (showToast) showToast('Permiso de notificaciones concedido');
      syncAllObligationReminders(obligations);
    } else {
      if (showToast) showToast('Permiso denegado por el dispositivo', 'error');
    }
  };

  return (
    <>
      <div
        style={{
          background: 'var(--plomo-800)',
          border: '1px solid var(--plomo-700)',
          borderRadius: '14px',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="section-icon"><Icon name="bell" /></span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Notificaciones y Recordatorios</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Avisos automáticos a las 9:00 a.m.
              </div>
            </div>
          </div>
          {!hasPermission && (
            <button
              type="button"
              onClick={() => setShowExplanationModal(true)}
              style={{
                background: 'var(--color-warning-strong)',
                color: 'var(--color-warning-soft)',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Habilitar permiso
            </button>
          )}
        </div>

        {/* Toggle 1: Recordatorios de vencimiento */}
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.35rem 0', borderTop: '1px solid var(--plomo-700)' }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Recordatorios de deudas
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Aviso a las 9:00 a.m. el día anterior y el día de vencimiento
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => handleToggleReminders(e.target.checked)}
            style={{ accentColor: 'var(--color-accent)', width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </label>

        {/* Toggle 2: Aviso variación BCV */}
        <div style={{ paddingTop: '0.35rem', borderTop: '1px solid var(--plomo-700)' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Aviso por cambio brusco en BCV
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Notificar si la tasa oficial varía más del umbral
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.bcvAlertEnabled}
              onChange={(e) => handleToggleBcvAlert(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)', width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </label>

          {settings.bcvAlertEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem', paddingLeft: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Umbral de variación mínima:</span>
              <select
                value={settings.bcvAlertThresholdPct}
                onChange={(e) => handleChangeThreshold(e.target.value)}
                style={{
                  background: 'var(--plomo-900)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.78rem'
                }}
              >
                <option value={1.5}>Más de 1.5%</option>
                <option value={2.0}>Más de 2.0%</option>
                <option value={3.0}>Más de 3.0%</option>
                <option value={5.0}>Más de 5.0%</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CON EXPLICACIÓN PREVIA DE PERMISOS ANDROID 13+ */}
      {showExplanationModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setShowExplanationModal(false)}
        >
          <div
            style={{
              background: 'var(--plomo-900)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              maxWidth: '380px',
              width: '100%',
              padding: '1.25rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-icon" style={{ display: 'flex', marginBottom: 'var(--space-2)' }}>
              <Icon name="bell" size={32} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', margin: '0 0 0.5rem 0' }}>
              Activar avisos de vencimiento
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, textAlign: 'center', margin: '0 0 1.25rem 0' }}>
              Para que nunca olvides pagar tus cuentas (colegios, condominio o servicios), la aplicación necesita permiso de Android para avisarte a las <strong>9:00 a.m.</strong> el día anterior y el día exacto de vencimiento.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowExplanationModal(false)}
                style={{
                  flex: 1,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={handleRequestPermissionWithExplanation}
                style={{
                  flex: 1,
                  background: 'var(--color-accent-strong)',
                  color: 'var(--color-success-soft)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Permitir avisos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
