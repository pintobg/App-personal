import React from 'react';
import { SectionHeader, Button, IconButton, EmptyState } from '../ui';
import { useFinance } from '../../context/FinanceContext';
import CategoryListItem from './categories/CategoryListItem';
import InactiveCategoryGrid from './categories/InactiveCategoryGrid';
import CategoryEditModal from './categories/CategoryEditModal';
import NewCategoryModal from './categories/NewCategoryModal';
import NewSubcategoryModal from './categories/NewSubcategoryModal';
import ReassignCategoryModal from './categories/ReassignCategoryModal';
import { useCategoryManagement } from './categories/useCategoryManagement';
import { SOFT_PRESET_COLORS } from '../../utils/colors';

export default function CategoriesView({ onBack }) {
  const finance = useFinance();
  const {
    categories = [],
    transactions = [],
    createCategory,
    renameCategory,
    hideCategory,
    toggleActiveCategory,
    updateCategory,
    reorderCategories,
    deleteCategory,
    getSubcategories,
    reassignCategoryTransactions,
    showToast,
    requestConfirm
  } = finance || {};

  const {
    activeTab,
    setActiveTab,
    editingCategory,
    setEditingCategory,
    isNewCategoryModalOpen,
    setIsNewCategoryModalOpen,
    isNewSubcategoryModalOpen,
    setIsNewSubcategoryModalOpen,
    selectedParentForSubcat,
    setSelectedParentForSubcat,
    newCatName,
    setNewCatName,
    newCatIcon,
    setNewCatIcon,
    newCatColor,
    setNewCatColor,
    newSubcatName,
    setNewSubcatName,
    reassignModalOpen,
    setReassignModalOpen,
    categoryToDelete,
    targetCategoryId,
    setTargetCategoryId,
    draggedId,
    activeCategories,
    inactiveCatalogCategories,
    moveCategory,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleCreateCategorySubmit,
    handleCreateSubcategorySubmit,
    promptDeleteCategory,
    handleConfirmReassignAndDelete
  } = useCategoryManagement({
    categories,
    transactions,
    createCategory,
    reorderCategories,
    deleteCategory,
    reassignCategoryTransactions,
    showToast,
    requestConfirm
  });

  return (
    <div className="view-container categories-view" style={{ padding: '0 1rem 3rem', color: 'var(--text-primary)' }}>
      {/* Encabezado con botón de regreso */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', marginBottom: '1.25rem', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onBack && (
            <IconButton
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              }
              aria-label="Volver"
              onClick={onBack}
            />
          )}
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Categorías
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setNewCatName('');
              setNewCatIcon('🏷️');
              setNewCatColor(SOFT_PRESET_COLORS[5]);
              setIsNewCategoryModalOpen(true);
            }}
          >
            + Nueva Categoría
          </Button>
        </div>
      </div>

      {/* Pestañas: Gastos vs Ingresos */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('expense')}
          style={{
            flex: 1,
            padding: '0.65rem',
            borderRadius: '12px',
            border: activeTab === 'expense' ? '2px solid var(--color-spent)' : '1px solid var(--border-color)',
            background: activeTab === 'expense' ? 'var(--color-spent-soft, color-mix(in srgb, var(--color-danger) 12%, transparent))' : 'var(--bg-surface)',
            color: activeTab === 'expense' ? 'var(--color-spent)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease'
          }}
        >
          <span>📉</span>
          <span>Gastos ({categories.filter(c => c.kind === 'expense' && c.is_active && !c.parent_id).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('income')}
          style={{
            flex: 1,
            padding: '0.65rem',
            borderRadius: '12px',
            border: activeTab === 'income' ? '2px solid var(--color-income)' : '1px solid var(--border-color)',
            background: activeTab === 'income' ? 'var(--color-income-soft, color-mix(in srgb, var(--color-success) 12%, transparent))' : 'var(--bg-surface)',
            color: activeTab === 'income' ? 'var(--color-income)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease'
          }}
        >
          <span>📈</span>
          <span>Ingresos ({categories.filter(c => c.kind === 'income' && c.is_active && !c.parent_id).length})</span>
        </button>
      </div>

      {/* 1. Lista de Categorías Activas */}
      <SectionHeader
        title={`Categorías activas (${activeCategories.length})`}
        subtitle="Arrastra para reordenar o toca para editar nombre, icono, color y subcategorías"
      />

      {activeCategories.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="Sin categorías activas"
          description={`Activa categorías del catálogo base o crea tus propias categorías de ${activeTab === 'expense' ? 'gasto' : 'ingreso'}.`}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '2rem' }}>
          {activeCategories.map((cat, idx) => (
            <CategoryListItem
              key={cat.id}
              category={cat}
              index={idx}
              totalCount={activeCategories.length}
              subcategoriesCount={getSubcategories ? getSubcategories(cat.id).length : 0}
              isDragging={draggedId === cat.id}
              onDragStart={(e) => handleDragStart(e, cat.id)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onClick={() => setEditingCategory({ ...cat })}
              onMoveUp={() => moveCategory(idx, -1)}
              onMoveDown={() => moveCategory(idx, 1)}
              onHide={() => {
                hideCategory(cat.id, false);
                if (showToast) showToast(`Categoría "${cat.name}" ocultada`);
              }}
            />
          ))}
        </div>
      )}

      {/* 2. Sección Agregar del Catálogo */}
      <SectionHeader
        title={`Agregar del catálogo (${inactiveCatalogCategories.length})`}
        subtitle="Toca cualquier categoría para activarla inmediatamente en tu cuenta"
      />

      <InactiveCategoryGrid
        categories={inactiveCatalogCategories}
        onActivate={(cat) => {
          toggleActiveCategory(cat.id);
          if (showToast) showToast(`Categoría "${cat.name}" activada`);
        }}
      />

      <CategoryEditModal
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        renameCategory={renameCategory}
        updateCategory={updateCategory}
        getSubcategories={getSubcategories}
        deleteCategory={deleteCategory}
        hideCategory={hideCategory}
        promptDeleteCategory={promptDeleteCategory}
        showToast={showToast}
        onOpenNewSubcategory={() => {
          setSelectedParentForSubcat(editingCategory.id);
          setNewSubcatName('');
          setIsNewSubcategoryModalOpen(true);
        }}
      />

      <NewCategoryModal
        isOpen={isNewCategoryModalOpen}
        onClose={() => setIsNewCategoryModalOpen(false)}
        activeTab={activeTab}
        newCatName={newCatName}
        setNewCatName={setNewCatName}
        newCatIcon={newCatIcon}
        setNewCatIcon={setNewCatIcon}
        newCatColor={newCatColor}
        setNewCatColor={setNewCatColor}
        handleCreateCategorySubmit={handleCreateCategorySubmit}
      />

      <NewSubcategoryModal
        isOpen={isNewSubcategoryModalOpen}
        onClose={() => setIsNewSubcategoryModalOpen(false)}
        parentCategory={categories.find(c => c.id === selectedParentForSubcat)}
        newSubcatName={newSubcatName}
        setNewSubcatName={setNewSubcatName}
        handleCreateSubcategorySubmit={handleCreateSubcategorySubmit}
      />

      <ReassignCategoryModal
        isOpen={reassignModalOpen}
        onClose={() => {
          setReassignModalOpen(false);
          setCategoryToDelete(null);
        }}
        categoryToDelete={categoryToDelete}
        otherCategories={activeCategories.filter(c => c.id !== categoryToDelete?.id)}
        targetCategoryId={targetCategoryId}
        setTargetCategoryId={setTargetCategoryId}
        handleConfirmReassignAndDelete={handleConfirmReassignAndDelete}
      />
    </div>
  );
}
