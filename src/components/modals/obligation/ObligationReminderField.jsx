import React from 'react';

export default function ObligationReminderField({ newOb, setNewOb }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem'
      }}
    >
      <input
        type="checkbox"
        id="reminderEnabledCheck"
        checked={newOb.reminderEnabled !== false}
        onChange={e => setNewOb({ ...newOb, reminderEnabled: e.target.checked })}
        style={{ accentColor: 'var(--color-accent)', width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
      />
      <label htmlFor="reminderEnabledCheck" style={{ cursor: 'pointer', margin: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          🔔 Recordatorios de vencimiento
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Aviso a las 9:00 a.m. del día anterior y el mismo día del vencimiento.
        </div>
      </label>
    </div>
  );
}
