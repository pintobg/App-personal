import { useState, useEffect } from 'react';

export default function PinLockModal({
  isOpen,
  bioEnabled,
  bioAvailable,
  biometryTitle,
  onUnlockWithPin,
  onUnlockWithBiometrics
}) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Intentar desbloqueo biométrico automático al presentarse la pantalla si está habilitado
  useEffect(() => {
    if (isOpen && bioEnabled && bioAvailable) {
      const timer = setTimeout(() => {
        onUnlockWithBiometrics().then((res) => {
          if (!res?.success && res?.error && !res.error.toLowerCase().includes('cancel')) {
            setErrorMsg(res.error);
          }
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, bioEnabled, bioAvailable, onUnlockWithBiometrics]);

  // Manejar teclado físico
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmitPin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    setErrorMsg('');
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      // Si llega a 6 dígitos o si ya tiene 4+, podemos validar automáticamente si coincide
      if (nextPin.length >= 4) {
        attemptUnlock(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  };

  const attemptUnlock = async (pinToTest) => {
    setIsVerifying(true);
    try {
      const res = await onUnlockWithPin(pinToTest);
      if (res.success) {
        setPin('');
        setErrorMsg('');
      } else {
        // Solo mostrar error si ya tiene 4 dígitos completos o el usuario pulsó enviar
        if (pinToTest.length >= 4) {
          setErrorMsg(res.error || 'PIN incorrecto');
        }
      }
    } catch {
      setErrorMsg('Error al verificar PIN');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmitPin = () => {
    if (pin.length < 4) {
      setErrorMsg('Ingresa al menos 4 dígitos');
      return;
    }
    attemptUnlock(pin);
  };

  const handleBiometricClick = async () => {
    setErrorMsg('');
    const res = await onUnlockWithBiometrics();
    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--plomo-950)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        color: 'var(--plomo-50)',
        userSelect: 'none',
        touchAction: 'manipulation'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '340px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            marginBottom: '1rem',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
          }}
        >
          🔒
        </div>

        <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Finanzas Bloqueada
        </h2>
        <p style={{ margin: '0 0 1.8rem 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Ingresa tu PIN de seguridad para continuar
        </p>

        {/* Indicadores de PIN (círculos) */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.8rem', height: '24px', alignItems: 'center' }}>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const isFilled = index < pin.length;
            return (
              <div
                key={index}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  border: `2px solid ${isFilled ? 'var(--color-accent)' : 'var(--plomo-500)'}`,
                  backgroundColor: isFilled ? 'var(--color-accent-strong)' : 'transparent',
                  transition: 'all 0.15s ease',
                  boxShadow: isFilled ? '0 0 8px color-mix(in srgb, var(--color-accent) 50%, transparent)' : 'none'
                }}
              />
            );
          })}
        </div>

        {/* Mensaje de error */}
        <div style={{ minHeight: '24px', marginBottom: '1rem' }}>
          {errorMsg && (
            <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 500 }}>
              {errorMsg}
            </span>
          )}
        </div>

        {/* Teclado numérico táctil */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            width: '100%',
            marginBottom: '1.5rem'
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isVerifying}
              onClick={() => handleDigit(String(num))}
              style={{
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--plomo-50)',
                fontSize: '1.4rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
                transition: 'background-color 0.1s'
              }}
              onPointerDown={(e) => { e.currentTarget.style.backgroundColor = 'var(--border-color)'; }}
              onPointerUp={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'; }}
              onPointerLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'; }}
            >
              {num}
            </button>
          ))}

          {/* Botón Biometría o espacio */}
          {bioEnabled && bioAvailable ? (
            <button
              type="button"
              onClick={handleBiometricClick}
              title={biometryTitle}
              aria-label={biometryTitle || "Desbloquear con biometría"}
              style={{
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-info-soft)',
                border: '1px solid var(--color-info-border)',
                color: 'var(--color-accent)',
                fontSize: '1.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)'
              }}
            >
              🖐️
            </button>
          ) : (
            <div />
          )}

          {/* Botón 0 */}
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleDigit('0')}
            style={{
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              color: 'var(--plomo-50)',
              fontSize: '1.4rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)'
            }}
            onPointerDown={(e) => { e.currentTarget.style.backgroundColor = 'var(--border-color)'; }}
            onPointerUp={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'; }}
            onPointerLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'; }}
          >
            0
          </button>

          {/* Botón Borrar */}
          <button
            type="button"
            disabled={isVerifying || pin.length === 0}
            onClick={handleBackspace}
            aria-label="Borrar dígito"
            style={{
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '1.2rem',
              cursor: pin.length > 0 ? 'pointer' : 'default',
              opacity: pin.length > 0 ? 1 : 0.4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)'
            }}
          >
            ⌫
          </button>
        </div>

        {/* Botón de desbloquear manual si tiene entre 4 y 6 dígitos */}
        {pin.length >= 4 && (
          <button
            type="button"
            onClick={handleSubmitPin}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '12px',
              backgroundColor: 'var(--color-accent-strong)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginTop: '0.5rem',
              boxShadow: '0 4px 12px color-mix(in srgb, var(--color-accent) 35%, transparent)'
            }}
          >
            Desbloquear
          </button>
        )}
      </div>
    </div>
  );
}
