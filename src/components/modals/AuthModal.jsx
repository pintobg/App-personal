import { useState } from 'react';

export default function AuthModal({
  isOpen,
  onClose,
  auth,
  onSyncNow,
  showToast,
  localState,
  onRequestConfirm
}) {
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncLocalData, setSyncLocalData] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const {
    user,
    isGuest,
    syncStatus,
    isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    continueAsGuest
  } = auth;

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
      if (tab === 'signin') {
        const res = await signIn(email, password, { syncLocalData, localState });
        if (res.success) {
          showToast(`¡Sesión iniciada como ${email}!`);
          onClose();
        } else {
          setErrorMsg(res.error || 'Credenciales inválidas');
        }
      } else {
        const res = await signUp(email, password, { syncLocalData, localState });
        if (res.success) {
          if (res.needsEmailConfirmation) {
            showToast('Cuenta creada. Revisa tu correo para confirmar.');
          } else {
            showToast(`¡Cuenta creada y sincronizada!`);
          }
          onClose();
        } else {
          setErrorMsg(res.error || 'Error al crear la cuenta');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    const executeSignOut = async () => {
      await signOut();
      showToast('Sesión cerrada');
      onClose();
    };

    if (onRequestConfirm) {
      onRequestConfirm({
        title: 'Cerrar sesión',
        message: '¿Deseas cerrar tu sesión? Tus datos locales se mantendrán en este dispositivo.',
        confirmText: 'Cerrar sesión',
        variant: 'danger',
        onConfirm: executeSignOut
      });
    } else {
      executeSignOut();
    }
  };

  const handleGuestContinue = () => {
    continueAsGuest();
    showToast('Modo invitado activo (almacenamiento local)');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: '#14332b',
              border: '1px solid #1f5143',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>{user ? 'Cuenta y Nube' : 'Acceso en la Nube'}</h2>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Modo Cloud Activo'}
              </div>
            </div>
          </div>
          <div style={{ width: '64px' }} />
        </div>

        {/* LOGGED IN VIEW */}
        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              background: '#232c3d',
              border: '1px solid #2a3447',
              borderRadius: '16px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', wordBreak: 'break-all' }}>
                    {user.email}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    ID: {user.id?.slice(0, 12)}...
                  </div>
                </div>
              </div>

              {/* Status pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                background: '#1b2230',
                border: '1px solid #2a3447',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: '#94a3b8' }}>Estado de sincronización:</span>
                <span style={{
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: syncStatus === 'synced' ? '#10b981' : syncStatus === 'syncing' ? '#3b82f6' : syncStatus === 'offline' ? '#f59e0b' : '#ef4444'
                }}>
                  {syncStatus === 'synced' && '● Sincronizado'}
                  {syncStatus === 'syncing' && '🔄 Sincronizando...'}
                  {syncStatus === 'offline' && '⚠️ Sin conexión (offline)'}
                  {syncStatus === 'error' && '✕ Error al sincronizar'}
                  {syncStatus === 'guest' && '👤 Local'}
                </span>
              </div>
            </div>

            {!isSupabaseConfigured && (
              <div style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                background: '#312615',
                border: '1px solid #4d391b',
                borderRadius: '12px',
                padding: '0.75rem'
              }}>
                💡 <strong style={{ color: '#f59e0b' }}>Simulación Cloud Activa</strong>: Para vincular tu base de datos Supabase en tiempo real, añade tus credenciales en el archivo <code>.env</code> (ver <code>.env.example</code>).
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSignOut}
                style={{ color: '#ef4444' }}
              >
                Cerrar sesión
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onSyncNow}
                style={{ gap: '0.4rem' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                Sincronizar
              </button>
            </div>
          </div>
        ) : (
          /* GUEST / LOGIN VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                background: '#311b22',
                border: '1px solid #4d2631',
                color: '#f87171',
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

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  checked={syncLocalData}
                  onChange={(e) => setSyncLocalData(e.target.checked)}
                  style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                />
                Subir y respaldar mis datos locales actuales a esta cuenta
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleGuestContinue}
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
        )}
      </div>
    </div>
  );
}
