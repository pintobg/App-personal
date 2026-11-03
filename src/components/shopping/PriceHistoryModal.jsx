import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatAmount } from '../../utils/formatters';
import { toLocalDateString } from '../../utils/dates';
import { getSectionMeta } from '../../domain/shopping';

export default function PriceHistoryModal({
  isOpen,
  onClose,
  product
}) {
  if (!product) return null;

  const sectionMeta = getSectionMeta(product.section);
  const history = Array.isArray(product.price_history) ? product.price_history : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de precios"
      maxWidth="480px"
      footer={
        <Button variant="secondary" onClick={onClose} style={{ width: '100%' }}>
          Cerrar
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Encabezado del producto */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem',
          background: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            fontSize: '1.6rem',
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {sectionMeta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>{sectionMeta.label}</span>
              <span>•</span>
              <span>Unidad: {product.default_unit || 'und'}</span>
            </div>
          </div>
          {product.last_price > 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Último</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                ${formatAmount(product.last_price, product.last_price_currency || 'USD')} {product.last_price_currency || 'USD'}
              </div>
            </div>
          )}
        </div>

        {/* Historial cronológico */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Registro de compras pasadas ({history.length})
          </div>

          {history.length === 0 ? (
            <div style={{
              padding: '1.5rem',
              textAlign: 'center',
              background: 'var(--bg-surface)',
              borderRadius: '12px',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}>
              No hay compras previas registradas para este producto.
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {history.map((entry, index) => {
                const dateStr = entry.date ? toLocalDateString(entry.date) : 'Sin fecha';
                const priceFormatted = formatAmount(entry.price, entry.currency || 'USD');
                return (
                  <div
                    key={`${entry.date}_${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--bg-surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>📅</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{dateStr}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      ${priceFormatted} {entry.currency || 'USD'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
