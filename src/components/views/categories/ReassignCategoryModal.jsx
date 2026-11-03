import React from 'react';
import { Modal, Button } from '../../ui';

export default function ReassignCategoryModal({
  isOpen,
  onClose,
  categoryToDelete,
  otherCategories = [],
  targetCategoryId,
  setTargetCategoryId,
  handleConfirmReassignAndDelete
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reasignar movimientos antes de borrar"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          La categoría <strong>"{categoryToDelete?.name}"</strong> tiene movimientos registrados en tu historial.
          Elige a qué categoría deseas reasignarlos antes de continuar:
        </p>

        <div className="input-group">
          <label>Mover movimientos a:</label>
          <select
            className="input-field"
            value={targetCategoryId}
            onChange={(e) => setTargetCategoryId(e.target.value)}
          >
            {otherCategories.map(c => (
              <option key={c.id} value={c.id}>
                {c.icon || '🏷️'} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button
            variant="secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmReassignAndDelete}
            disabled={!targetCategoryId}
            style={{ flex: 1.2 }}
          >
            Reasignar y eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
