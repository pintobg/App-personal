import { useState, useMemo } from 'react';

export function useCategoryManagement({
  categories = [],
  transactions = [],
  createCategory,
  reorderCategories,
  deleteCategory,
  reassignCategoryTransactions,
  showToast,
  requestConfirm
}) {
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' | 'income'
  const [editingCategory, setEditingCategory] = useState(null);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [isNewSubcategoryModalOpen, setIsNewSubcategoryModalOpen] = useState(false);
  const [selectedParentForSubcat, setSelectedParentForSubcat] = useState(null);

  // Estados para creación de categoría
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [newCatColor, setNewCatColor] = useState('#0ea5e9');

  // Estados para creación de subcategoría
  const [newSubcatName, setNewSubcatName] = useState('');

  // Estados para reasignación antes de borrar
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [targetCategoryId, setTargetCategoryId] = useState('');

  // Drag and Drop
  const [draggedId, setDraggedId] = useState(null);

  // Categorías activas del tab actual (sin parent_id)
  const activeCategories = useMemo(() => {
    return categories
      .filter(c => c.kind === activeTab && c.is_active && !c.parent_id)
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  }, [categories, activeTab]);

  // Categorías inactivas del catálogo disponibles para activar
  const inactiveCatalogCategories = useMemo(() => {
    return categories
      .filter(c => c.kind === activeTab && !c.is_active && !c.parent_id)
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  }, [categories, activeTab]);

  // Manejo de Reordenamiento
  const moveCategory = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= activeCategories.length) return;

    const list = [...activeCategories];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const orderedIds = list.map(c => c.id);
    if (reorderCategories) {
      reorderCategories(activeTab, orderedIds);
    }
  };

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (!draggedId) return;

    const dragIndex = activeCategories.findIndex(c => c.id === draggedId);
    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDraggedId(null);
      return;
    }

    const list = [...activeCategories];
    const [moved] = list.splice(dragIndex, 1);
    list.splice(dropIndex, 0, moved);

    const orderedIds = list.map(c => c.id);
    if (reorderCategories) {
      reorderCategories(activeTab, orderedIds);
    }
    setDraggedId(null);
  };

  // Crear Categoría
  const handleCreateCategorySubmit = (e) => {
    e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;

    try {
      const created = createCategory({
        kind: activeTab,
        name: clean,
        icon: newCatIcon || '🏷️',
        color: newCatColor || '#0ea5e9'
      });
      if (showToast) showToast(`Categoría "${created.name}" creada exitosamente`);
      setIsNewCategoryModalOpen(false);
      setNewCatName('');
    } catch {
      if (showToast) showToast('No pudimos crear la categoría. Intenta de nuevo.', 'error');
    }
  };

  // Crear Subcategoría
  const handleCreateSubcategorySubmit = (e) => {
    e.preventDefault();
    const clean = newSubcatName.trim();
    if (!clean || !selectedParentForSubcat) return;

    try {
      const parent = categories.find(c => c.id === selectedParentForSubcat);
      if (!parent) return;

      createCategory({
        kind: parent.kind,
        parent_id: parent.id,
        name: clean,
        icon: parent.icon,
        color: parent.color
      });
      if (showToast) showToast(`Subcategoría "${clean}" añadida a ${parent.name}`);
      setIsNewSubcategoryModalOpen(false);
      setNewSubcatName('');
    } catch {
      if (showToast) showToast('No pudimos crear la subcategoría. Intenta de nuevo.', 'error');
    }
  };

  // Intentar Borrar Categoría
  const promptDeleteCategory = (category) => {
    const txCount = transactions.filter(t => t.category_id === category.id || t.category === category.name).length;

    if (txCount > 0) {
      setCategoryToDelete(category);
      const remainingActives = activeCategories.filter(c => c.id !== category.id);
      setTargetCategoryId(remainingActives[0]?.id || '');
      setReassignModalOpen(true);
    } else {
      if (requestConfirm) {
        requestConfirm({
          title: `¿Eliminar "${category.name}"?`,
          message: 'Esta categoría no tiene movimientos asociados y será eliminada.',
          confirmText: 'Eliminar',
          variant: 'danger',
          onConfirm: () => {
            deleteCategory(category.id);
            setEditingCategory(null);
            if (showToast) showToast(`Categoría "${category.name}" eliminada`);
          }
        });
      } else {
        deleteCategory(category.id);
        setEditingCategory(null);
      }
    }
  };

  const handleConfirmReassignAndDelete = () => {
    if (!categoryToDelete || !targetCategoryId) return;

    const count = reassignCategoryTransactions(categoryToDelete.id, targetCategoryId);
    deleteCategory(categoryToDelete.id);

    setReassignModalOpen(false);
    setCategoryToDelete(null);
    setEditingCategory(null);

    if (showToast) {
      showToast(`Se reasignaron ${count} movimiento(s) y se eliminó la categoría`);
    }
  };

  return {
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
  };
}
