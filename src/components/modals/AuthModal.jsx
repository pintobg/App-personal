import React, { useState, useEffect } from 'react';
import { syncService } from '../../services/syncService';
import ConfirmDialog from '../ui/ConfirmDialog';
import AuthLoggedInView from './auth/AuthLoggedInView';
import AuthGuestView from './auth/AuthGuestView';

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
  setReferenceRate,
  onNavigateCategories
}) {
  const [queueItems, setQueueItems] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

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

  const hasLocalData = Boolean(
    localState?.assets?.length > 0 ||
    localState?.transactions?.length > 0 ||
    localState?.obligations?.length > 0
  );

  const handleSubmitAuth = async ({ tab, email, password, syncLocalData }) => {
    if (tab === 'signin') {
      const res = await signIn(email, password, { syncLocalData, localState });
      if (res.success) {
        showToast(`¡Sesión iniciada como ${email}!`);
        if (onSyncNow) {
          await onSyncNow();
        }
        onClose();
      } else {
        throw new Error(res.error || 'Credenciales inválidas');
      }
    } else {
      const res = await signUp(email, password, { syncLocalData, localState });
      if (res.success) {
        if (res.needsEmailConfirmation) {
          showToast('Cuenta creada. Revisa tu correo para confirmar.');
        } else {
          showToast(`¡Cuenta creada y sincronizada!`);
          if (onSyncNow) {
            await onSyncNow();
          }
        }
        onClose();
      } else {
        throw new Error(res.error || 'Error al crear la cuenta');
      }
    }
  };

  const handleSignOut = () => {
    const askWipeOption = () => {
      const handleConfirmWipe = async () => {
        if (user?.id) {
          try {
            await syncService.flushQueue(user.id);
          } catch (e) {
            console.warn('Flush before signOut warning:', e);
          }
        }
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
      };

      const handleKeepData = async () => {
        await signOut();
        showToast('Sesión cerrada (datos locales conservados)');
        onClose();
      };

      if (onRequestConfirm) {
        onRequestConfirm({
          title: '¿Borrar los datos de este teléfono?',
          message: 'Tus datos ya están guardados en tu cuenta en la nube. Se recomienda borrarlos de este teléfono si el dispositivo es compartido o prestado.',
          confirmText: 'Sí, borrar del teléfono',
          cancelText: 'Mantener en este teléfono',
          variant: 'danger',
          onConfirm: handleConfirmWipe,
          onCancel: handleKeepData
        });
      } else {
        signOut();
        showToast('Sesión cerrada');
        onClose();
      }
    };

    if (pendingCount > 0 && onRequestConfirm) {
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
              background: 'var(--color-success-soft)',
              border: '1px solid var(--color-success-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-success)',
              flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>{user ? 'Cuenta y Nube' : 'Acceso en la Nube'}</h2>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Modo Cloud Activo'}
              </div>
            </div>
          </div>
          <div style={{ width: '64px' }} />
        </div>

        {user ? (
          <AuthLoggedInView
            user={user}
            syncStatus={syncStatus}
            pendingCount={pendingCount}
            isSupabaseConfigured={isSupabaseConfigured}
            queueItems={queueItems}
            setQueueItems={setQueueItems}
            onSyncNow={onSyncNow}
            onSignOut={handleSignOut}
            onExportBackup={onExportBackup}
            onNavigateCategories={onNavigateCategories}
            onOpenSecurityModal={onOpenSecurityModal}
            hasPin={hasPin}
            referenceRate={referenceRate}
            setReferenceRate={setReferenceRate}
            showToast={showToast}
            localState={localState}
            onRequestConfirm={onRequestConfirm}
            setConfirmDialog={setConfirmDialog}
            onClose={onClose}
          />
        ) : (
          <AuthGuestView
            isGuest={isGuest}
            isSupabaseConfigured={isSupabaseConfigured}
            hasLocalData={hasLocalData}
            onSubmitAuth={handleSubmitAuth}
            onGuestContinue={handleGuestContinue}
            onExportBackup={onExportBackup}
            onNavigateCategories={onNavigateCategories}
            onOpenSecurityModal={onOpenSecurityModal}
            hasPin={hasPin}
            referenceRate={referenceRate}
            setReferenceRate={setReferenceRate}
            showToast={showToast}
            localState={localState}
            onClose={onClose}
          />
        )}

        {confirmDialog && (
          <ConfirmDialog
            isOpen={Boolean(confirmDialog)}
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmText={confirmDialog.confirmText}
            variant={confirmDialog.variant}
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
          />
        )}
      </div>
    </div>
  );
}
