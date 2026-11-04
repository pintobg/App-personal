import React from 'react';
import { ListRow, Icon } from '../ui';
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
  onOpenSecurityModal,
  onOpenRates
}) {
  return (
    <div className="view-container settings-view">
      <div className="settings-header">
        {onBack && (
          <button type="button" className="icon-hit" onClick={onBack} aria-label="Volver">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
        )}
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Ajustes</h1>
          <p className="page-subtitle">Preferencias, seguridad y respaldos</p>
        </div>
      </div>

      <h2 className="settings-group-title">Tu cuenta</h2>
      {/* 1. SECCIÓN: CUENTA Y SINCRONIZACIÓN */}
      <CloudSyncSection
        auth={auth}
        onSyncNow={onSyncNow}
        onOpenAuthModal={onOpenAuthModal}
      />

      <h2 className="settings-group-title">Preferencias</h2>
      <div className="list-card" style={{ marginBottom: 'var(--space-5)' }}>
        <ListRow
          icon={<span className="section-icon"><Icon name="tag" /></span>}
          title="Categorías"
          sub="Crea, renombra u oculta categorías"
          chevron
          onClick={onOpenCategories}
        />
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
        onOpenRates={onOpenRates}
      />

      {/* 5. SECCIÓN: NOTIFICACIONES */}
      <div style={{ marginBottom: '1.25rem' }}>
        <NotificationSettingsSection />
      </div>

      <h2 className="settings-group-title">Seguridad y datos</h2>
      <SecuritySettingsSection
        appLock={appLock}
        onOpenSecurityModal={onOpenSecurityModal}
      />

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

      <h2 className="settings-group-title">Acerca de</h2>
      <div className="glass-card" style={{ padding: '1rem 1.15rem', borderRadius: '16px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
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
