import React from 'react';

export default function TransactionVesDetails({
  newTx,
  setNewTx
}) {
  if (newTx.currency !== 'VES') return null;

  return (
    <div className="input-group">
      <span className="form-section-label">Pago en bolívares</span>

      <div style={{ marginBottom: '0.65rem' }}>
        <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Tipo de pago</label>
        <div className="segmented-control" style={{ flexWrap: 'wrap' }}>
          {['Pago Móvil', 'Transferencia', 'Punto de venta', 'Efectivo'].map(method => (
            <button
              key={method}
              type="button"
              className={`segmented-btn ${newTx.paymentMethod === method ? 'active' : ''}`}
              onClick={() => setNewTx(prev => ({
                ...prev,
                paymentMethod: prev.paymentMethod === method ? '' : method
              }))}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.65rem' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
            Nro. de Referencia
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej. 849201"
            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
            value={newTx.referenceNumber || ''}
            onChange={e => setNewTx(prev => ({ ...prev, referenceNumber: e.target.value }))}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
            Banco
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej. Banesco, BDV..."
            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
            value={newTx.bank || ''}
            onChange={e => setNewTx(prev => ({ ...prev, bank: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
          Teléfono o Cédula / RIF del destinatario
        </label>
        <input
          type="text"
          className="input-field"
          placeholder="Ej. V-12345678 o 0414-1234567"
          style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
          value={newTx.recipientId || ''}
          onChange={e => setNewTx(prev => ({ ...prev, recipientId: e.target.value }))}
        />
      </div>
    </div>
  );
}
