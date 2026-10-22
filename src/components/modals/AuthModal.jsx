import { useState, useEffect } from 'react';
import ReferenceRateSelector from '../common/ReferenceRateSelector';
import NotificationSettingsSection from '../common/NotificationSettingsSection';
import { syncService } from '../../services/syncService';

export default function AuthModal({
  isOpen,
  onClose,
  auth,
  onSyncNow,
  showToast,
  localState,
  onRequestConfirm,
  onExportBackup,
  onClearLocalData,
  onOpenSecurityModal,
  hasPin,
  referenceRate,
  setReferenceRate
}) {
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncLocalData, setSyncLocalData] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [queueItems, setQueueItems] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setQueueItems(syncService.getQueue());
    }
  }, [isOpen, auth?.pendingCount, auth?.syncStatus]);

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
                  color: (syncStatus === 'synced' && pendingCount === 0) ? '#10b981' : syncStatus === 'syncing' ? '#3b82f6' : syncStatus === 'error' ? '#ef4444' : (syncStatus === 'offline' || pendingCount > 0) ? '#f59e0b' : '#ef4444'
                }}>
                  {syncStatus === 'syncing' && '🔄 Sincronizando...'}
                  {syncStatus !== 'syncing' && syncStatus === 'offline' && '⚠️ Sin conexión'}
                  {syncStatus !== 'syncing' && syncStatus !== 'offline' && syncStatus === 'error' && (
                    <button
                      type="button"
                      onClick={() => setShowErrorPanel(prev => !prev)}
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
                  {syncStatus !== 'syncing' && syncStatus !== 'offline' && syncStatus !== 'error' && pendingCount > 0 && `⏳ Pendiente (${pendingCount})`}
                  {syncStatus !== 'syncing' && syncStatus !== 'offline' && syncStatus !== 'error' && pendingCount === 0 && syncStatus === 'synced' && '● Sincronizado'}
                  {syncStatus === 'guest' && '👤 Local'}
                </span>
              </div>

              {showErrorPanel && (
                <div style={{
                  background: '#181f2c',
                  border: '1px solid #ef444444',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171' }}>
                      Elementos pendientes con error ({queueItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowErrorPanel(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      ✕ Cerrar
                    </button>
                  </div>

                  {queueItems.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '0.5rem 0' }}>
                      No hay elementos pendientes en la cola.
                    </div>
                  ) : (
                    queueItems.map((item, idx) => {
                      const tableNames = {
                        obligations: 'Deudas / Compromisos (obligations)',
                        transactions: 'Movimientos (transactions)',
                        assets: 'Cuentas / Activos (assets)',
                        budgets: 'Presupuestos (budgets)',
                        goals: 'Metas de Ahorro (goals)'
                      };
                      const actionNames = {
                        upsert: 'Guardar / Actualizar',
                        delete: 'Eliminar'
                      };

                      return (
                        <div
                          key={item.id || item.timestamp || idx}
                          style={{
                            background: '#232c3d',
                            border: '1px solid #2a3447',
                            borderRadius: '8px',
                            padding: '0.65rem 0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                            fontSize: '0.78rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                              Tabla: <span style={{ color: '#38bdf8' }}>{tableNames[item.table] || item.table}</span>
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              background: item.action === 'delete' ? '#7f1d1d' : '#1e3a8a',
                              color: item.action === 'delete' ? '#fca5a5' : '#93c5fd'
                            }}>
                              {actionNames[item.action] || item.action}
                            </span>
                          </div>

                          <div style={{ color: '#94a3b8' }}>
                            Intentos: <strong style={{ color: '#e2e8f0' }}>{item.attempts || 0}</strong>
                          </div>

                          <div style={{
                            background: '#161d2a',
                            border: '1px solid #451a1a',
                            borderRadius: '6px',
                            padding: '0.4rem 0.5rem',
                            color: '#fca5a5',
                            fontSize: '0.72rem',
                            wordBreak: 'break-word',
                            lineHeight: 1.35
                          }}>
                            <strong>Error:</strong> {item.lastError || 'Pendiente por sincronizar'}
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={async () => {
                                if (onSyncNow) await onSyncNow();
                                setQueueItems(syncService.getQueue());
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                background: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Reintentar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const doDiscard = () => {
                                  syncService.discardQueueItem(item.id || item.timestamp);
                                  const updated = syncService.getQueue();
                                  setQueueItems(updated);
                                  if (updated.length === 0) {
                                    setShowErrorPanel(false);
                                  }
                                  if (showToast) showToast('Cambio descartado');
                                };

                                if (onRequestConfirm) {
                                  onRequestConfirm({
                                    title: 'Descartar cambio pendiente',
                                    message: '¿Estás seguro de que quieres descartar este cambio? No se sincronizará con la nube.',
                                    confirmText: 'Descartar',
                                    variant: 'danger',
                                    onConfirm: doDiscard
                                  });
                                } else if (window.confirm('¿Estás seguro de que quieres descartar este cambio?')) {
                                  doDiscard();
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                background: 'transparent',
                                color: '#f87171',
                                border: '1px solid #ef444466',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Descartar este cambio
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
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

            {/* AJUSTE GLOBAL: TASA DE REFERENCIA */}
            <div
              style={{
                background: '#17202f',
                border: '1px solid #233148',
                borderRadius: '14px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>💱</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f1f5f9' }}>Tasa de referencia global</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
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
            <NotificationSettingsSection
              obligations={localState?.obligations || []}
              showToast={showToast}
            />

            {onOpenSecurityModal && (
              <div
                onClick={() => {
                  onClose();
                  onOpenSecurityModal();
                }}
                style={{
                  background: '#17202f',
                  border: '1px solid #233148',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🔒</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Seguridad y Bloqueo</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {hasPin ? 'PIN y biometría activados' : 'Configurar PIN de 4 a 6 dígitos'}
                    </div>
                  </div>
                </div>
                <span style={{ color: '#60a5fa', fontSize: '0.82rem', fontWeight: 600 }}>
                  {hasPin ? 'Ajustar →' : 'Activar →'}
                </span>
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

              {/* AJUSTE GLOBAL: TASA DE REFERENCIA */}
            <div
              style={{
                background: '#17202f',
                border: '1px solid #233148',
                borderRadius: '14px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>💱</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f1f5f9' }}>Tasa de referencia global</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
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
            <NotificationSettingsSection
              obligations={localState?.obligations || []}
              showToast={showToast}
            />

            {onOpenSecurityModal && (
              <div
                onClick={() => {
                  onClose();
                  onOpenSecurityModal();
                }}
                style={{
                  background: '#17202f',
                  border: '1px solid #233148',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🔒</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Seguridad y Bloqueo</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {hasPin ? 'PIN y biometría activados' : 'Configurar PIN de 4 a 6 dígitos'}
                    </div>
                  </div>
                </div>
                <span style={{ color: '#60a5fa', fontSize: '0.82rem', fontWeight: 600 }}>
                  {hasPin ? 'Ajustar →' : 'Activar →'}
                </span>
              </div>
            )}

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
