import React from 'react';
import { Modal, Button, IconButton } from '../../ui';
import { PRESET_ICONS, PRESET_COLORS } from './CategoryPresets';

export default function CategoryEditModal({
  editingCategory,
  setEditingCategory,
  renameCategory,
  updateCategory,
  getSubcategories,
  deleteCategory,
  hideCategory,
  promptDeleteCategory,
  showToast,
  onOpenNewSubcategory
}) {
  if (!editingCategory) return null;

  return (
    <Modal
      isOpen={Boolean(editingCategory)}
      onClose={() => setEditingCategory(null)}
      title={`Editar categoría: ${editingCategory.name}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {/* Renombrar */}
        <div className="input-group">
          <label>Nombre</label>
          <input
            type="text"
            className="input-field"
            value={editingCategory.name}
            onChange={(e) => {
              const updatedName = e.target.value;
              setEditingCategory(prev => ({ ...prev, name: updatedName }));
            }}
            onBlur={() => {
              if (editingCategory.name.trim()) {
                renameCategory(editingCategory.id, editingCategory.name.trim());
              }
            }}
          />
        </div>

        {/* Icono */}
        <div className="input-group">
          <label>Icono</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
            {PRESET_ICONS.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => {
                  updateCategory(editingCategory.id, { icon });
                  setEditingCategory(prev => ({ ...prev, icon }));
                }}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border: editingCategory.icon === icon ? '2px solid var(--color-accent)' : '1px solid var(--border-color)',
                  background: editingCategory.icon === icon ? 'var(--color-accent-soft)' : 'var(--bg-surface)',
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
        </div>

        {/* Color */}
        <div className="input-group">
          <label>Color característico</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  updateCategory(editingCategory.id, { color });
                  setEditingCategory(prev => ({ ...prev, color }));
                }}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: editingCategory.color === color ? '3px solid #ffffff' : '2px solid transparent',
                  boxShadow: editingCategory.color === color ? '0 0 0 2px var(--color-accent)' : 'none',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </div>

        {/* Subcategorías de esta categoría */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ margin: 0, fontWeight: 600 }}>Subcategorías</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenNewSubcategory}
            >
              + Agregar
            </Button>
          </div>

          {getSubcategories(editingCategory.id).length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              No tiene subcategorías definidas.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '140px', overflowY: 'auto' }}>
              {getSubcategories(editingCategory.id).map(sub => (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.6rem',
                    background: 'var(--bg-surface)',
                    borderRadius: '8px',
                    fontSize: '0.82rem'
                  }}
                >
                  <span>{sub.name}</span>
                  <IconButton
                    icon={<span style={{ fontSize: '0.8rem' }}>🗑️</span>}
                    aria-label={`Eliminar subcategoría ${sub.name}`}
                    size="sm"
                    onClick={() => {
                      deleteCategory(sub.id);
                      if (showToast) showToast(`Subcategoría "${sub.name}" eliminada`);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones Inferiores (Ocultar / Eliminar) */}
        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
          <Button
            variant="secondary"
            onClick={() => {
              hideCategory(editingCategory.id, false);
              setEditingCategory(null);
              if (showToast) showToast(`Categoría "${editingCategory.name}" ocultada`);
            }}
            style={{ flex: 1 }}
          >
            Ocultar categoría
          </Button>

          {editingCategory.is_custom && (
            <Button
              variant="danger"
              onClick={() => promptDeleteCategory(editingCategory)}
              style={{ flex: 1 }}
            >
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
