import React from 'react';
import { todayLocal } from '../../../utils/dates';

export default function TransactionTypeSelector({
  onClose,
  setNewTx,
  setMode
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>Tipo de Transacción</h2>
          <div style={{ width: '64px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '1.15rem',
              fontSize: '1.05rem',
              borderRadius: '14px',
              border: '1px solid var(--color-success-border)',
              color: 'var(--color-success)',
              background: 'var(--color-success-soft)',
              fontWeight: 700
            }}
            onClick={() => {
              setNewTx({
                id: '',
                assetId: '',
                type: 'income',
                currency: '',
                amount: '',
                origin: '',
                category: '',
                subcategory: '',
                date: todayLocal(),
                includeIgtf: false,
                igtfAmount: '',
                includeCommission: false,
                commissionAmount: '',
                paymentMethod: '',
                referenceNumber: '',
                bank: '',
                recipientId: ''
              });
              setMode('form');
            }}
          >
            Ingreso (+)
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '1.15rem',
              fontSize: '1.05rem',
              borderRadius: '14px',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              background: 'var(--color-danger-soft)',
              fontWeight: 700
            }}
            onClick={() => {
              setNewTx({
                id: '',
                assetId: '',
                type: 'spent',
                currency: '',
                amount: '',
                origin: '',
                category: '',
                subcategory: '',
                date: todayLocal(),
                includeIgtf: false,
                igtfAmount: '',
                includeCommission: false,
                commissionAmount: '',
                paymentMethod: '',
                referenceNumber: '',
                bank: '',
                recipientId: ''
              });
              setMode('form');
            }}
          >
            Gasto (-)
          </button>
        </div>
      </div>
    </div>
  );
}
