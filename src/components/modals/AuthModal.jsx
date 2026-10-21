import { useState } from 'react';

export default function AuthModal({
  isOpen,
  onClose,
  auth,
  onSyncNow,
  showToast,
  localState,
  onRequestConfirm,
  onExportBackup,
  onClearLocalData
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
    pendingCount = 0,
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
    const askWipeOption = () => {
      if (onRequestConfirm) {
        onRequestConfirm({
          title: '¿Borrar los datos de este teléfono?',
          message: 'Tus datos ya están guardados en tu cuenta en la nube. Se recomienda borrarlos de este teléfono si el dispositivo es compartido o prestado.',
          confirmText: 'Sí, borrar del teléfono',
          cancelText: 'Mantener en este teléfono',
          variant: 'danger',
          onConfirm: async () => {
            await signOut();
            if (onClearLocalData) {
              onClearLocalData();
            } else {
              localStorage.removeItem('personal_assets');
              localStorage.removeItem('personal_transactions');
              localStorage.removeItem('obligations');
              localStorage.removeItem('personal_budgets');
              localStorage.removeItem('finanzas_sync_queue');
              localStorage.removeItem('finanzas_data_owner');
            }
            showToast('Sesión cerrada y datos locales eliminados');
            onClose();
          },
          onCancel: async () => {
            await signOut();
            showToast('Sesión cerrada (datos locales conservados)');
            onClose();
          }
        });
      } else {
        signOut();
        showToast('Sesión cerrada');
        onClose();
      }
    };

    // Si hay cambios pendientes en la cola, avisa y ofrece sincronizar primero
    if (pendingCount > 0) {
      if (onRequestConfirm) {
        onRequestConfirm({
          title: 'Cambios pendientes por sincronizar',
          message: `Tienes ${pendingCount} cambio(s) guardado(s) solo en este teléfono que no se han subido a la nube. ¿Deseas sincronizarlos antes de cerrar sesión?`,
          confirmText: 'Sincronizar ahora',
          cancelText: 'Cerrar sin subir',
          onConfirm: async () => {
            if (onSyncNow) await onSyncNow();
            askWipeOption();
          },
          onCancel: () => {
            askWipeOption();
          }
        });
        return;
      }
    }

    askWipeOption();
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
                  color: (syncStatus === 'synced' && pendingCount === 0) ? '#10b981' : syncStatus === 'syncing' ? '#3b82f6' : (syncStatus === 'offline' || pendingCount > 0) ? '#f59e0b' : '#ef4444'
                }}>
                  {syncStatus === 'syncing' && '🔄 Sincronizando...'}
                  {syncStatus !== 'syncing' && syncStatus === 'offline' && '⚠️ Sin conexión'}
                  {syncStatus !== 'syncing' && syncStatus !== 'offline' && pendingCount > 0 && `⏳ Pendiente (${pendingCount})`}
                  {syncStatus !== 'syncing' && syncStatus !== 'offline' && pendingCount === 0 && syncStatus === 'synced' && '● Sincronizado'}
                  {syncStatus !== 'syncing' && syncStatus !== 'offline' && pendingCount === 0 && syncStatus === 'error' && (
                    <button
                      type="button"
                      onClick={onSyncNow}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 600,
                        textDecoration: 'underline'
                      }}
                    >
                      ✕ Error, reintentar
                    </button>
                  )}
                  {syncStatus === 'guest' && '👤 Local'}
                </span>
              </div>
            </div>

            {!isSupabaseConfigured && (
              <div
                style={{
                  background: '#231c12',
                  border: '1px solid #5a3e1b',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: '1.2' }}>📱</span>
                  <div style={{ fontSize: '0.82rem', color: '#fde68a', lineHeight: '1.35', fontWeight: 500 }}>
                    Tus datos están guardados solo en este teléfono. Haz respaldos frecuentes.
                  </div>
                </div>
                {onExportBackup && (
                  <div>
                    <button
                      type="button"
                      onClick={onExportBackup}
                      style={{
                        background: '#f59e0b',
                        color: '#1a1306',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Exportar respaldo
                    </button>
                  </div>
                )}
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
            {!isSupabaseConfigured && (
              <div
                style={{
                  background: '#231c12',
                  border: '1px solid #5a3e1b',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: '1.2' }}>📱</span>
                  <div style={{ fontSize: '0.82rem', color: '#fde68a', lineHeight: '1.35', fontWeight: 500 }}>
                    Tus datos están guardados solo en este teléfono. Haz respaldos frecuentes.
                  </div>
                </div>
                {onExportBackup && (
                  <div>
                    <button
                      type="button"
                      onClick={onExportBackup}
                      style={{
                        background: '#f59e0b',
                        color: '#1a1306',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Exportar respaldo
                    </button>
                  </div>
                )}
              </div>
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
