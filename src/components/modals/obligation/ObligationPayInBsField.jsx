import React from 'react';
import CustomSelect from '../../common/CustomSelect';

export default function ObligationPayInBsField({
  newOb,
  setNewOb
}) {
  if ((newOb.currency || '').toUpperCase() === 'VES') return null;

  return (
    <div
      style={{
        background: '#1b2230',
        border: '1px solid #2a3447',
        borderRadius: '12px',
        padding: '0.85rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem'
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
        <input
          type="checkbox"
          checked={Boolean(newOb.payInBs)}
          onChange={e => {
            const checked = e.target.checked;
            setNewOb({
              ...newOb,
              payInBs: checked,
              indexRateType: checked ? (newOb.indexRateType || ((newOb.currency || '').toUpperCase() === 'EUR' ? 'BCV_EUR' : 'BCV_USD')) : ''
            });
          }}
          style={{ accentColor: '#10b981', width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <span>Se paga en bolívares a tasa del día</span>
      </label>

      {newOb.payInBs && (
        <div style={{ marginTop: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
            Tasa de referencia para el pago en Bs.
          </label>
          <CustomSelect
            placeholder="Seleccionar tasa"
            title="Tasa para pago en Bs."
            value={newOb.indexRateType || ((newOb.currency || '').toUpperCase() === 'EUR' ? 'BCV_EUR' : 'BCV_USD')}
            onChange={e => setNewOb({ ...newOb, indexRateType: e.target.value })}
            options={[
              { value: 'BCV_USD', label: 'BCV USD' },
              { value: 'BCV_EUR', label: 'BCV EUR' },
              { value: 'PARALELO', label: 'Paralelo' }
            ]}
          />
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
            El monto en Bs. se recalculará automáticamente según la cotización oficial o paralela de cada día.
          </div>
        </div>
      )}
    </div>
  );
}
