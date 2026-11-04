import { useState } from 'react';

export default function SecuritySettingsModal({
  isOpen,
  onClose,
  hasPin,
  bioEnabled,
  bioAvailable,
  biometryTitle,
  onConfigurePin,
  onUpdatePin,
  onDisablePin,
  onToggleBiometrics
}) {
  const [mode, setMode] = useState('menu'); // 'menu' | 'setup' | 'change' | 'disable'
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setErrorMsg('');
    setMode('menu');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSetupPin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!/^\d{4,6}$/.test(newPin)) {
      setErrorMsg('El PIN debe tener entre 4 y 6 dígitos numéricos');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('Los PIN ingresados no coinciden');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfigurePin(newPin);
      resetForm();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'No pudimos guardar el PIN. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPin) {
      setErrorMsg('Ingresa tu PIN actual');
      return;
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      setErrorMsg('El nuevo PIN debe tener entre 4 y 6 dígitos');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('La confirmación del nuevo PIN no coincide');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onUpdatePin(currentPin, newPin);
      if (res.success) {
        resetForm();
        onClose();
      } else {
        setErrorMsg(res.error || 'PIN actual incorrecto');
      }
    } catch (err) {
      setErrorMsg(err.message || 'No pudimos cambiar el PIN. Revisa el PIN actual e intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisablePin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPin) {
      setErrorMsg('Ingresa tu PIN actual para confirmar');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onDisablePin(currentPin);
      if (res.success) {
        resetForm();
        onClose();
      } else {
        setErrorMsg(res.error || 'PIN incorrecto');
      }
    } catch (err) {
      setErrorMsg(err.message || 'No pudimos quitar el PIN. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--plomo-850)',
          border: '1px solid var(--bg-surface-elevated)',
          borderRadius: '16px',
          padding: '1.5rem',
          color: 'var(--plomo-50)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🔒</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Seguridad y Bloqueo</h3>
          </div>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: 'var(--color-danger-soft)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* MODO MENÚ PRINCIPAL */}
        {mode === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                backgroundColor: 'var(--plomo-800)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--plomo-700)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Bloqueo por PIN</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {hasPin
                      ? 'Activado (se solicita al abrir y tras 1 min en 2do plano)'
                      : 'Protege tu información financiera con un código numérico'}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: hasPin ? 'var(--color-success-border)' : 'var(--border-color)',
                    color: hasPin ? 'var(--color-success)' : 'var(--text-secondary)'
                  }}
                >
                  {hasPin ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                {!hasPin ? (
                  <button
                    type="button"
                    onClick={() => { setErrorMsg(''); setMode('setup'); }}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-accent-strong)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Configurar PIN
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setErrorMsg(''); setMode('change'); }}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        color: 'var(--plomo-50)',
                        border: '1px solid var(--border-color)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cambiar PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => { setErrorMsg(''); setMode('disable'); }}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-danger-soft)',
                        color: 'var(--color-danger)',
                        border: '1px solid var(--color-danger-border)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Desactivar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* OPCIÓN BIOMETRÍA */}
            {hasPin && (
              <div
                style={{
                  backgroundColor: 'var(--plomo-800)',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--plomo-700)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {biometryTitle || 'Desbloqueo por huella'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {bioAvailable
                      ? 'Desbloquea rápidamente con sensor biométrico'
                      : 'Sensor biométrico no detectado o no disponible en este dispositivo'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={!bioAvailable}
                  checked={bioEnabled && bioAvailable}
                  onChange={(e) => onToggleBiometrics(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: bioAvailable ? 'pointer' : 'not-allowed',
                    accentColor: 'var(--color-accent)'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* MODO CONFIGURAR PIN NUEVO */}
        {mode === 'setup' && (
          <form onSubmit={handleSetupPin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Nuevo PIN (4 a 6 dígitos):
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 1234"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--plomo-950)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--plomo-50)',
                  fontSize: '1.1rem',
                  letterSpacing: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Confirma el nuevo PIN:
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Repite el PIN"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--plomo-950)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--plomo-50)',
                  fontSize: '1.1rem',
                  letterSpacing: '4px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setMode('menu')}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || newPin.length < 4}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-accent-strong)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: isSubmitting || newPin.length < 4 ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || newPin.length < 4 ? 0.6 : 1
                }}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar PIN'}
              </button>
            </div>
          </form>
        )}

        {/* MODO CAMBIAR PIN */}
        {mode === 'change' && (
          <form onSubmit={handleChangePin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                PIN actual:
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--plomo-950)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--plomo-50)',
                  fontSize: '1.1rem',
                  letterSpacing: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Nuevo PIN (4 a 6 dígitos):
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--plomo-950)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--plomo-50)',
                  fontSize: '1.1rem',
                  letterSpacing: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Confirma el nuevo PIN:
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--plomo-950)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--plomo-50)',
                  fontSize: '1.1rem',
                  letterSpacing: '4px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setMode('menu')}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !currentPin || newPin.length < 4}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-accent-strong)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: isSubmitting || !currentPin || newPin.length < 4 ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !currentPin || newPin.length < 4 ? 0.6 : 1
                }}
              >
                {isSubmitting ? 'Modificando...' : 'Cambiar PIN'}
              </button>
            </div>
          </form>
        )}

        {/* MODO DESACTIVAR PIN */}
        {mode === 'disable' && (
          <form onSubmit={handleDisablePin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-danger)', margin: '0 0 0.5rem 0' }}>
              Para desactivar la protección por PIN y huella, confirma tu PIN actual:
            </p>
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="PIN actual"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--plomo-950)',
                  border: '1px solid var(--color-danger-border)',
                  color: 'var(--plomo-50)',
                  fontSize: '1.1rem',
                  letterSpacing: '4px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setMode('menu')}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !currentPin}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-danger-hover)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: isSubmitting || !currentPin ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting || !currentPin ? 0.6 : 1
                }}
              >
                {isSubmitting ? 'Desactivando...' : 'Confirmar y Desactivar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
