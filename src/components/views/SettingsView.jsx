import React from 'react';
import CloudSyncSection from '../settings/CloudSyncSection';
import BackupDataSection from '../settings/BackupDataSection';
import NotificationSettingsSection from '../common/NotificationSettingsSection';
import RatesSettingsSection from '../settings/RatesSettingsSection';
import SecuritySettingsSection from '../settings/SecuritySettingsSection';

export default function SettingsView({
  onBack,
  auth,
  onSyncNow,
  onOpenAuthModal,
  assets,
  transactions,
  obligations,
  veRates,
  budgets,
  showToast,
  onRestoreBackup,
  onRequestConfirm,
  onClearAllData,
  onInjectTestData,
  onOpenCategories,
  referenceRate,
  setReferenceRate,
  setCustomRate,
  refreshRates,
  isFetchingRates,
  appLock,
  onOpenSecurityModal
}) {
  return (
    <div className="view-container" style={{ padding: '0 1rem 3rem', color: 'var(--text-primary)' }}>
      {/* HEADER DE AJUSTES */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Volver"
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 5vw, 1.5rem)', fontWeight: 700, color: 'var(--text-primary)' }}>
              Ajustes
            </h1>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Preferencias, seguridad y respaldos
            </p>
          </div>
        </div>
      </div>

      {/* 1. SECCIÓN: CUENTA Y SINCRONIZACIÓN */}
      <CloudSyncSection
        auth={auth}
        onSyncNow={onSyncNow}
        onOpenAuthModal={onOpenAuthModal}
      />

      {/* 2. SECCIÓN: CATEGORÍAS */}
      <div className="glass-card" style={{ padding: '1rem 1.15rem', borderRadius: '16px', marginBottom: '1.25rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🏷️</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>Categorías</h3>
          </div>
        </div>
        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Personaliza el catálogo de categorías y subcategorías para tus ingresos y gastos.
        </p>
        <button
          type="button"
          onClick={onOpenCategories}
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Gestionar catálogo de categorías</span>
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>&rsaquo;</span>
        </button>
      </div>

      {/* 3. SECCIÓN: MONEDAS Y TASAS */}
      <RatesSettingsSection
        referenceRate={referenceRate}
        setReferenceRate={setReferenceRate}
        setCustomRate={setCustomRate}
        refreshRates={refreshRates}
        isFetchingRates={isFetchingRates}
        veRates={veRates}
        showToast={showToast}
      />

      {/* 4. SECCIÓN: SEGURIDAD */}
      <SecuritySettingsSection
        appLock={appLock}
        onOpenSecurityModal={onOpenSecurityModal}
      />

      {/* 5. SECCIÓN: NOTIFICACIONES */}
      <div style={{ marginBottom: '1.25rem' }}>
        <NotificationSettingsSection />
      </div>

      {/* 6. SECCIÓN: RESPALDO Y EXPORTACIÓN */}
      <BackupDataSection
        assets={assets}
        transactions={transactions}
        obligations={obligations}
        veRates={veRates}
        budgets={budgets}
        showToast={showToast}
        onRestoreBackup={onRestoreBackup}
        onRequestConfirm={onRequestConfirm}
        onClearAllData={onClearAllData}
        onInjectTestData={onInjectTestData}
      />

      {/* 7. SECCIÓN: ACERCA DE */}
      <div className="glass-card" style={{ padding: '1rem 1.15rem', borderRadius: '16px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>Acerca de</h3>
        </div>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Gestor de Finanzas Personales con soporte multimoneda y actualización en tiempo real de tasas oficiales y paralelas de Venezuela.
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <span>Versión</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>v2.4.0 (PWA)</span>
        </div>
      </div>
    </div>
  );
}
