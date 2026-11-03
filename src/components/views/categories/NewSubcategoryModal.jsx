import React from 'react';
import { Modal, Button } from '../../ui';

export default function NewSubcategoryModal({
  isOpen,
  onClose,
  parentCategory,
  newSubcatName,
  setNewSubcatName,
  handleCreateSubcategorySubmit
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={parentCategory ? `Nueva Subcategoría en ${parentCategory.name}` : 'Nueva Subcategoría'}
    >
      <form onSubmit={handleCreateSubcategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="input-group">
          <label>Nombre de la subcategoría</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej. Supermercado, Almuerzos, Gasolina..."
            value={newSubcatName}
            onChange={(e) => setNewSubcatName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!newSubcatName.trim()}
            style={{ flex: 1 }}
          >
            Agregar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
