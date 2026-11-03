import React, { useState } from 'react';
import ReferenceRateSelector from '../../common/ReferenceRateSelector';
import NotificationSettingsSection from '../../common/NotificationSettingsSection';
import AuthGuestWarning from './AuthGuestWarning';

export default function AuthGuestView({
  isGuest,
  isSupabaseConfigured,
  hasLocalData,
  onSubmitAuth,
  onGuestContinue,
  onExportBackup,
  onNavigateCategories,
  onOpenSecurityModal,
  hasPin,
  referenceRate,
  setReferenceRate,
  showToast,
  localState,
  onClose
}) {
  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncLocalData, setSyncLocalData] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !email.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitAuth({ tab, email, password, syncLocalData });
    } catch (err) {
      setErrorMsg(err.message || 'Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {!isSupabaseConfigured && (
        <AuthGuestWarning onExportBackup={onExportBackup} />
      )}

      {/* Segmented Tabs */}
      <div className="segmented-control">
        <button
          type="button"
          className={`segmented-btn ${tab === 'signin' ? 'active-success' : ''}`}
          onClick={() => { setTab('signin'); setErrorMsg(''); }}
        >
          Iniciar Sesión
        </button>
        <button
          type="button"
          className={`segmented-btn ${tab === 'signup' ? 'active-success' : ''}`}
          onClick={() => { setTab('signup'); setErrorMsg(''); }}
        >
          Crear Cuenta
        </button>
      </div>

      {errorMsg && (
        <div style={{
          background: 'var(--color-danger-soft)',
          border: '1px solid var(--color-danger-border)',
          color: 'var(--color-danger)',
          padding: '0.65rem 0.85rem',
          borderRadius: '10px',
          fontSize: '0.82rem'
        }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            className="input-field"
          />
        </div>

        <div className="input-group">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            className="input-field"
          />
        </div>

        {hasLocalData && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              checked={syncLocalData}
              onChange={(e) => setSyncLocalData(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)', width: '16px', height: '16px' }}
            />
            Subir y respaldar mis datos locales actuales a esta cuenta
          </label>
        )}

        {onNavigateCategories && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateCategories();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              marginTop: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🏷️</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Administrar Categorías</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Configurar catálogo de gastos e ingresos</div>
              </div>
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>➔</span>
          </button>
        )}

        {/* AJUSTE GLOBAL: TASA DE REFERENCIA */}
        <div
          style={{
            background: 'var(--plomo-800)',
            border: '1px solid var(--plomo-700)',
            borderRadius: '14px',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            marginTop: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.2rem' }}>💱</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Tasa de referencia global</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Valora tus bolívares en dólares
                </div>
              </div>
            </div>
            <ReferenceRateSelector
              referenceRate={referenceRate}
              setReferenceRate={(newRef) => {
                if (setReferenceRate) setReferenceRate(newRef);
                if (showToast) showToast(`Tasa de referencia cambiada a ${newRef.toUpperCase()}`);
              }}
            />
          </div>
        </div>

        {/* SECCIÓN NOTIFICACIONES Y RECORDATORIOS */}
        <div style={{ marginTop: '0.75rem' }}>
          <NotificationSettingsSection
            obligations={localState?.obligations || []}
            showToast={showToast}
          />
        </div>

        {onOpenSecurityModal && (
          <div
            onClick={() => {
              onClose();
              onOpenSecurityModal();
            }}
            style={{
              background: 'var(--plomo-800)',
              border: '1px solid var(--plomo-700)',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              marginTop: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Seguridad y Bloqueo</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {hasPin ? 'PIN y biometría activados' : 'Configurar PIN de 4 a 6 dígitos'}
                </div>
              </div>
            </div>
            <span style={{ color: 'var(--color-info)', fontSize: '0.82rem', fontWeight: 600 }}>
              {hasPin ? 'Ajustar →' : 'Activar →'}
            </span>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onGuestContinue}
          >
            {isGuest ? 'Modo Invitado' : 'Sin cuenta'}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting
              ? 'Procesando...'
              : tab === 'signin'
              ? 'Iniciar Sesión'
              : 'Crear Cuenta'}
          </button>
        </div>
      </form>
    </div>
  );
}
