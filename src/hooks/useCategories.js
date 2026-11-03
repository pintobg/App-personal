import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { syncService } from '../services/syncService';
import { loadCategoriesFromDB, persistCategoriesToDB } from '../services/db';
import { buildInitialUserCategories } from '../domain/categories/catalog';

export const CATEGORIES_STORAGE_KEY = 'personal_user_categories';

/**
 * Hook de gestión de categorías y subcategorías configurables por usuario
 */
export function useCategories(user = null) {
  const [categories, setCategories] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter(c => !c.deleted_at);
          }
        }
      }
    } catch {
      // fallback
    }
    // Siembra catálogo inicial con ★ activas y el resto inactivas
    return buildInitialUserCategories(user?.id);
  });

  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  // Carga inicial asíncrona desde Dexie
  useEffect(() => {
    let isMounted = true;
    loadCategoriesFromDB().then(dbCats => {
      if (isMounted && Array.isArray(dbCats) && dbCats.length > 0) {
        categoriesRef.current = dbCats;
        setCategories(dbCats);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Persistir en localStorage e IndexedDB ante cambios
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      }
      persistCategoriesToDB(categories);
    } catch {
      // Ignorar fallos de cuota
    }
  }, [categories]);

  // Mapa por ID para resoluciones O(1)
  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach(c => {
      if (c && c.id) map.set(c.id, c);
    });
    return map;
  }, [categories]);

  // Categorías padre (parent_id === null) activas y ordenadas
  const activeExpenseCategories = useMemo(() => {
    return categories
      .filter(c => c.kind === 'expense' && !c.parent_id && c.is_active && !c.deleted_at)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories]);

  const activeIncomeCategories = useMemo(() => {
    return categories
      .filter(c => c.kind === 'income' && !c.parent_id && c.is_active && !c.deleted_at)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories]);

  const allExpenseCategories = useMemo(() => {
    return categories
      .filter(c => c.kind === 'expense' && !c.parent_id && !c.deleted_at)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories]);

  const allIncomeCategories = useMemo(() => {
    return categories
      .filter(c => c.kind === 'income' && !c.parent_id && !c.deleted_at)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories]);

  // Subcategorías de un padre determinado
  const getSubcategories = useCallback((parentId, onlyActive = true) => {
    if (!parentId) return [];
    return categories
      .filter(c => c.parent_id === parentId && (!onlyActive || c.is_active) && !c.deleted_at)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories]);

  const getCategoryById = useCallback((id) => {
    if (!id) return null;
    return categoryMap.get(id) || null;
  }, [categoryMap]);

  // Resuelve dinámicamente el nombre de la categoría (garantiza renombrado en movimientos pasados)
  const getCategoryName = useCallback((id, fallback = '') => {
    if (!id) return fallback;
    const cat = categoryMap.get(id);
    return cat ? cat.name : fallback;
  }, [categoryMap]);

  const getSubcategoryName = useCallback((id, fallback = '') => {
    if (!id) return fallback;
    const sub = categoryMap.get(id);
    return sub ? sub.name : fallback;
  }, [categoryMap]);

  // Operaciones: Crear categoría o subcategoría personalizada
  const createCategory = useCallback(({ name, kind = 'expense', icon = '🏷️', color = '#10b981', parent_id = null }) => {
    const nowIso = new Date().toISOString();
    const cleanName = (name || '').trim();
    if (!cleanName) return null;

    const prefix = kind === 'income' ? 'inc' : 'exp';
    const cleanId = parent_id
      ? `${parent_id}.custom_${Date.now()}`
      : `${prefix}.custom_${Date.now()}`;

    const siblings = categoriesRef.current.filter(c => c.parent_id === parent_id && c.kind === kind);
    const maxOrder = siblings.reduce((max, s) => Math.max(max, s.sort_order ?? 0), 0);

    const newRecord = {
      id: cleanId,
      user_id: user?.id || null,
      kind,
      parent_id: parent_id || null,
      name: cleanName,
      icon,
      color,
      sort_order: maxOrder + 1,
      is_active: true,
      is_custom: true,
      base_id: null,
      deleted_at: null,
      created_at: nowIso,
      updated_at: nowIso
    };

    const nextList = [...categoriesRef.current, newRecord];
    categoriesRef.current = nextList;
    setCategories(nextList);

    if (user?.id) {
      syncService.queueChange('user_categories', 'upsert', newRecord, user.id);
    }
    return newRecord;
  }, [user?.id]);

  // Renombrar categoría (actualiza el catálogo y propaga a movimientos automáticamente)
  const renameCategory = useCallback((id, newName) => {
    const cleanName = (newName || '').trim();
    if (!cleanName) return null;
    const nowIso = new Date().toISOString();
    let updated = null;

    const nextList = categoriesRef.current.map(c => {
      if (c.id === id) {
        updated = {
          ...c,
          name: cleanName,
          updated_at: nowIso
        };
        return updated;
      }
      return c;
    });

    if (!updated) return null;
    categoriesRef.current = nextList;
    setCategories(nextList);

    if (user?.id) {
      syncService.queueChange('user_categories', 'upsert', updated, user.id);
    }
    return updated;
  }, [user?.id]);

  // Ocultar / Desactivar categoría sin borrar movimientos
  const hideCategory = useCallback((id, active = false) => {
    const nowIso = new Date().toISOString();
    let updated = null;

    const nextList = categoriesRef.current.map(c => {
      if (c.id === id) {
        updated = {
          ...c,
          is_active: Boolean(active),
          updated_at: nowIso
        };
        return updated;
      }
      return c;
    });

    if (!updated) return null;
    categoriesRef.current = nextList;
    setCategories(nextList);

    if (user?.id) {
      syncService.queueChange('user_categories', 'upsert', updated, user.id);
    }
    return updated;
  }, [user?.id]);

  const toggleActiveCategory = useCallback((id) => {
    const existing = categoriesRef.current.find(c => c.id === id);
    if (!existing) return null;
    return hideCategory(id, !existing.is_active);
  }, [hideCategory]);

  const updateCategory = useCallback((id, updates) => {
    const nowIso = new Date().toISOString();
    let updated = null;

    const nextList = categoriesRef.current.map(c => {
      if (c.id === id) {
        updated = {
          ...c,
          ...updates,
          updated_at: nowIso
        };
        return updated;
      }
      return c;
    });

    if (!updated) return null;
    categoriesRef.current = nextList;
    setCategories(nextList);

    if (user?.id) {
      syncService.queueChange('user_categories', 'upsert', updated, user.id);
    }
    return updated;
  }, [user?.id]);

  const reorderCategories = useCallback((kind, orderedIds = []) => {
    const nowIso = new Date().toISOString();
    const orderMap = new Map();
    orderedIds.forEach((id, idx) => orderMap.set(id, idx + 1));

    const nextList = categoriesRef.current.map(c => {
      if (orderMap.has(c.id)) {
        return {
          ...c,
          sort_order: orderMap.get(c.id),
          updated_at: nowIso
        };
      }
      return c;
    });

    categoriesRef.current = nextList;
    setCategories(nextList);

    if (user?.id) {
      orderedIds.forEach(id => {
        const item = nextList.find(c => c.id === id);
        if (item) {
          syncService.queueChange('user_categories', 'upsert', item, user.id);
        }
      });
    }
  }, [user?.id]);

  const deleteCategory = useCallback((id) => {
    const nowIso = new Date().toISOString();
    const existing = categoriesRef.current.find(c => c.id === id);
    if (!existing) return;

    // Borrado suave
    const nextList = categoriesRef.current.filter(c => c.id !== id && c.parent_id !== id);
    categoriesRef.current = nextList;
    setCategories(nextList);

    if (user?.id) {
      syncService.queueChange('user_categories', 'delete', {
        id,
        deleted_at: nowIso,
        updated_at: nowIso
      }, user.id);
    }
  }, [user?.id]);

  const seedInitialCategories = useCallback((force = false) => {
    if (!force && categoriesRef.current.length > 0) return;
    const initial = buildInitialUserCategories(user?.id);
    categoriesRef.current = initial;
    setCategories(initial);
    if (user?.id) {
      initial.forEach(c => {
        syncService.queueChange('user_categories', 'upsert', c, user.id);
      });
    }
  }, [user?.id]);

  const activeCategoriesByKind = useMemo(() => ({
    expense: activeExpenseCategories,
    income: activeIncomeCategories
  }), [activeExpenseCategories, activeIncomeCategories]);

  const categoriesByKind = useMemo(() => ({
    expense: allExpenseCategories,
    income: allIncomeCategories
  }), [allExpenseCategories, allIncomeCategories]);

  return {
    categories,
    categoryMap,
    categoriesMap: categoryMap,
    categoriesByKind,
    activeCategoriesByKind,
    setCategories,
    activeExpenseCategories,
    activeIncomeCategories,
    allExpenseCategories,
    allIncomeCategories,
    getSubcategories,
    getCategoryById,
    getCategoryName,
    getSubcategoryName,
    createCategory,
    renameCategory,
    hideCategory,
    toggleActiveCategory,
    updateCategory,
    reorderCategories,
    deleteCategory,
    seedInitialCategories
  };
}
