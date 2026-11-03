import React, { useState, useMemo, useContext } from 'react';
import { Button, Modal } from '../ui';
import { FinanceContext } from '../../context/FinanceContext';
import { useCategories } from '../../hooks/useCategories';
import { SOFT_PRESET_COLORS, tint } from '../../utils/colors';

const PRESET_ICONS = [
  '🍔', '🛒', '🚗', '🏠', '💊', '📚', '👕', '💡',
  '🎬', '💼', '💵', '💰', '📈', '🎁', '🔄', '⭐',
  '📦', '✈️', '🐶', '⚽', '📱', '⛽', '🔧', '🍕'
];

const PRESET_COLORS = SOFT_PRESET_COLORS;

/**
 * Componente CategoryPicker:
 * - Cuadrícula de chips con icono y color
 * - Arriba las 6 categorías más usadas en los últimos 60 días
 * - Al tocar una categoría con subcategorías, una segunda fila con ellas
 * - Buscador en tiempo real
 * - Botón "Crear nueva"
 */
export default function CategoryPicker({
  kind = 'expense', // 'expense' | 'income'
  selectedCategoryId = null,
  selectedSubcategoryId = null,
  onChange,
  transactions: customTransactions = null,
  categories: customCategories = null,
  showCreate = true
}) {
  const finance = useContext(FinanceContext);
  const fallbackCategories = useCategories();
  const transactions = customTransactions || finance?.transactions || [];

  const activeExpenseCategories = customCategories
    ? customCategories.filter(c => c.kind === 'expense' && c.is_active && !c.parent_id)
    : (finance?.activeCategoriesByKind?.expense || fallbackCategories.activeExpenseCategories || []);

  const activeIncomeCategories = customCategories
    ? customCategories.filter(c => c.kind === 'income' && c.is_active && !c.parent_id)
    : (finance?.activeCategoriesByKind?.income || fallbackCategories.activeIncomeCategories || []);

  const getSubcategories = customCategories
    ? ((parentId) => customCategories.filter(c => c.parent_id === parentId && c.is_active))
    : (finance?.getSubcategories || fallbackCategories.getSubcategories || (() => []));

  const createCategory = finance?.createCategory || fallbackCategories.createCategory || (() => {});
  const showToast = finance?.showToast || (() => {});

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');
  const [newCatColor, setNewCatColor] = useState(SOFT_PRESET_COLORS[5]);

  // Categorías activas según el tipo ('expense' o 'income')
  const activeCategories = kind === 'income' ? activeIncomeCategories : activeExpenseCategories;

  // 1. Las 6 categorías más usadas en los últimos 60 días
  const topFrequentCategories = useMemo(() => {
    if (!Array.isArray(transactions) || transactions.length === 0) return [];

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const targetType = kind === 'income' ? 'income' : 'spent';

    const usageCount = new Map();
    transactions.forEach(tx => {
      if (tx.type !== targetType) return false;
      const txDate = tx.date ? new Date(tx.date) : null;
      if (!txDate || txDate < sixtyDaysAgo) return false;

      const catId = tx.category_id || activeCategories.find(c => c.name === tx.category)?.id;
      if (catId) {
        usageCount.set(catId, (usageCount.get(catId) || 0) + 1);
      }
    });

    return activeCategories
      .filter(cat => usageCount.has(cat.id))
      .sort((a, b) => (usageCount.get(b.id) || 0) - (usageCount.get(a.id) || 0))
      .slice(0, 6);
  }, [transactions, activeCategories, kind]);

  // Categorías filtradas por buscador
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeCategories;

    return activeCategories.filter(cat => {
      if (cat.name.toLowerCase().includes(q)) return true;
      const subcats = getSubcategories(cat.id);
      return subcats.some(s => s.name.toLowerCase().includes(q));
    });
  }, [activeCategories, searchQuery, getSubcategories]);

  // Categoría seleccionada actualmente
  const currentCategory = useMemo(() => {
    return activeCategories.find(c => c.id === selectedCategoryId) || null;
  }, [activeCategories, selectedCategoryId]);

  // Subcategorías de la categoría seleccionada
  const availableSubcategories = useMemo(() => {
    if (!currentCategory) return [];
    return getSubcategories(currentCategory.id);
  }, [currentCategory, getSubcategories]);

  const handleSelectCategory = (cat) => {
    if (selectedCategoryId === cat.id) {
      // Si toca la misma, mantiene la categoría pero no altera subcategoría a menos que no tuviera
      return;
    }
    if (onChange) {
      onChange({
        categoryId: cat.id,
        categoryName: cat.name,
        subcategoryId: null,
        subcategoryName: null
      });
    }
  };

  const handleSelectSubcategory = (subcat) => {
    if (!currentCategory) return;
    const isAlreadySelected = selectedSubcategoryId === subcat?.id;

    if (onChange) {
      onChange({
        categoryId: currentCategory.id,
        categoryName: currentCategory.name,
        subcategoryId: isAlreadySelected ? null : (subcat ? subcat.id : null),
        subcategoryName: isAlreadySelected ? null : (subcat ? subcat.name : null)
      });
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName) return;

    try {
      const created = createCategory({
        kind,
        name: cleanName,
        icon: newCatIcon || '📦',
        color: newCatColor || SOFT_PRESET_COLORS[5]
      });

      if (created) {
        showToast(`Categoría "${created.name}" creada`);
        if (onChange) {
          onChange({
            categoryId: created.id,
            categoryName: created.name,
            subcategoryId: null,
            subcategoryName: null
          });
        }
      }
      setIsCreateModalOpen(false);
      setNewCatName('');
    } catch {
      showToast('Error al crear categoría', 'error');
    }
  };

  return (
    <div className="category-picker" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%' }}>
      {/* Barra superior: Buscador + Botón Nueva */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Buscar categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '2rem',
              fontSize: '0.85rem',
              height: '38px',
              borderRadius: '10px'
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              pointerEvents: 'none'
            }}
          >
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                padding: 0
              }}
            >
              ✕
            </button>
          )}
        </div>

        {showCreate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              fontSize: '0.8rem',
              height: '38px',
              whiteSpace: 'nowrap',
              padding: '0 0.75rem',
              borderRadius: '10px'
            }}
          >
            + Nueva
          </Button>
        )}
      </div>

      {/* Sección 1: Frecuentes (Las 6 más usadas en los últimos 60 días) */}
      {!searchQuery && topFrequentCategories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Más usadas recientemente
          </span>
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none'
            }}
          >
            {topFrequentCategories.map(cat => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={`freq-${cat.id}`}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 700 : 500,
                    color: 'var(--text-primary)',
                    backgroundColor: isSelected ? tint(cat.color || 'var(--color-accent)', 0.25) : 'var(--bg-surface)',
                    border: `1px solid ${isSelected ? (cat.color || 'var(--color-accent)') : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{cat.icon || '📦'}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sección 2: Cuadrícula principal de categorías */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {searchQuery ? `Resultados (${filteredCategories.length})` : 'Categorías'}
        </span>

        {filteredCategories.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', borderRadius: '10px' }}>
            No se encontraron categorías.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '0.45rem',
              maxHeight: '190px',
              overflowY: 'auto',
              paddingRight: '2px'
            }}
          >
            {filteredCategories.map(cat => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    border: `1.5px solid ${isSelected ? (cat.color || 'var(--color-accent)') : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.95rem',
                      backgroundColor: tint(cat.color || 'var(--text-muted)', 0.15),
                      flexShrink: 0
                    }}
                  >
                    {cat.icon || '📦'}
                  </span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                  >
                    {cat.name}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        position: 'absolute',
                        right: '6px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: cat.color || 'var(--color-accent-strong)'
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sección 3: Subcategorías (aparecen si la categoría seleccionada tiene subcategorías) */}
      {currentCategory && availableSubcategories.length > 0 && (
        <div
          style={{
            marginTop: '0.35rem',
            padding: '0.65rem 0.75rem',
            background: 'var(--bg-surface-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Subcategorías de <strong style={{ color: 'var(--text-primary)' }}>{currentCategory.name}</strong>
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              (opcional)
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.35rem'
            }}
          >
            {/* Opción General (sin subcategoría) */}
            <button
              type="button"
              onClick={() => handleSelectSubcategory(null)}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: !selectedSubcategoryId ? 700 : 500,
                color: !selectedSubcategoryId ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: !selectedSubcategoryId ? tint(currentCategory.color || 'var(--color-accent)', 0.25) : 'var(--bg-surface)',
                border: `1px solid ${!selectedSubcategoryId ? (currentCategory.color || 'var(--color-accent)') : 'var(--border-color)'}`,
                cursor: 'pointer'
              }}
            >
              General
            </button>

            {availableSubcategories.map(sub => {
              const isSubSelected = selectedSubcategoryId === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelectSubcategory(sub)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: isSubSelected ? 700 : 500,
                    color: 'var(--text-primary)',
                    backgroundColor: isSubSelected ? tint(currentCategory.color || 'var(--color-accent)', 0.25) : 'var(--bg-surface)',
                    border: `1px solid ${isSubSelected ? (currentCategory.color || 'var(--color-accent)') : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Crear Nueva Categoría */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={`Nueva Categoría de ${kind === 'income' ? 'Ingreso' : 'Gasto'}`}
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label>Nombre de la categoría</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej. Mascotas, Cafetería, Cripto..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Icono</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {PRESET_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewCatIcon(icon)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: newCatIcon === icon ? '2px solid var(--color-accent)' : '1px solid var(--border-color)',
                    background: newCatIcon === icon ? 'var(--color-accent-soft)' : 'var(--bg-surface)',
                    fontSize: '1.2rem',
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
              placeholder="O escribe un emoji..."
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              maxLength={4}
              style={{ width: '100px', textAlign: 'center', fontSize: '1.2rem' }}
            />
          </div>

          <div className="input-group">
            <label>Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCatColor(color)}
                  style={{
                    width: '32px',
                    height: '32px',
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
              onClick={() => setIsCreateModalOpen(false)}
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
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
