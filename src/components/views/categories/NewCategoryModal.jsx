import React from 'react';
import { Modal, Button } from '../../ui';
import { PRESET_ICONS, PRESET_COLORS } from './CategoryPresets';

export default function NewCategoryModal({
  isOpen,
  onClose,
  activeTab,
  newCatName,
  setNewCatName,
  newCatIcon,
  setNewCatIcon,
  newCatColor,
  setNewCatColor,
  handleCreateCategorySubmit
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Nueva Categoría de ${activeTab === 'expense' ? 'Gasto' : 'Ingreso'}`}
    >
      <form onSubmit={handleCreateCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="input-group">
          <label>Nombre de la categoría</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej. Gimnasio, Freelance, Mascotas..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label>Icono</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
            {PRESET_ICONS.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => setNewCatIcon(icon)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border: newCatIcon === icon ? '2px solid var(--color-accent)' : '1px solid var(--border-color)',
                  background: newCatIcon === icon ? 'var(--color-accent-soft)' : 'var(--bg-surface)',
                  fontSize: '1.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                {icon}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="input-field"
            placeholder="O escribe un emoji"
            value={newCatIcon}
            onChange={(e) => setNewCatIcon(e.target.value)}
            maxLength={4}
            style={{ width: '90px', textAlign: 'center', fontSize: '1.15rem' }}
          />
        </div>

        <div className="input-group">
          <label>Color</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setNewCatColor(color)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: newCatColor === color ? '3px solid #ffffff' : '2px solid transparent',
                  boxShadow: newCatColor === color ? '0 0 0 2px var(--color-accent)' : 'none',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
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
            disabled={!newCatName.trim()}
            style={{ flex: 1 }}
          >
            Crear
          </Button>
        </div>
      </form>
    </Modal>
  );
}
