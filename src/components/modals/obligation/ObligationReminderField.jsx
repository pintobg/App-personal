import React from 'react';

export default function ObligationReminderField({ newOb, setNewOb }) {
  return (
    <div
      style={{
        background: '#1b2230',
        border: '1px solid #2a3447',
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
        style={{ accentColor: '#10b981', width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
      />
      <label htmlFor="reminderEnabledCheck" style={{ cursor: 'pointer', margin: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
          🔔 Recordatorios de vencimiento
        </div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
          Aviso a las 9:00 a.m. del día anterior y el mismo día del vencimiento.
        </div>
      </label>
    </div>
  );
}
