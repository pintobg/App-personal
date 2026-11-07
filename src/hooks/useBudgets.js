import { useState, useEffect, useMemo, useCallback } from 'react';
import { syncService } from '../services/syncService';
import { MONTHLY_LIMIT_KEY, budgetAmount } from '../domain/dashboard';

const STORAGE_KEY = 'personal_budgets';

export function useBudgets(user = null) {
  // Mapa completo tal como se guarda y sincroniza. Incluye la clave reservada
  // MONTHLY_LIMIT_KEY con el tope total del mes (viaja en la tabla budgets).
  const [allBudgets, setBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error cargando presupuestos de localStorage:', e);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allBudgets));
    } catch (e) {
      console.error('Error guardando presupuestos en localStorage:', e);
    }
  }, [allBudgets]);

  // Lo que ve el resto de la app: solo presupuestos por categoría.
  const budgets = useMemo(() => {
    if (!allBudgets || !(MONTHLY_LIMIT_KEY in allBudgets)) return allBudgets;
    const copy = { ...allBudgets };
    delete copy[MONTHLY_LIMIT_KEY];
    return copy;
  }, [allBudgets]);

  const monthlyLimit = budgetAmount(allBudgets?.[MONTHLY_LIMIT_KEY]);

  const setMonthlyLimit = useCallback((amount) => {
    const num = Number(amount);
    const nowIso = new Date().toISOString();
    const valid = !isNaN(num) && num > 0;
    setBudgets(prev => {
      const updated = { ...prev };
      if (valid) updated[MONTHLY_LIMIT_KEY] = Math.round(num * 100) / 100;
      else delete updated[MONTHLY_LIMIT_KEY];
      return updated;
    });
    if (user?.id) {
      if (valid) {
        syncService.queueChange('budgets', 'upsert', { category: MONTHLY_LIMIT_KEY, amount: Math.round(num * 100) / 100, updated_at: nowIso }, user.id);
      } else {
        syncService.queueChange('budgets', 'delete', { category: MONTHLY_LIMIT_KEY, deleted_at: nowIso, updated_at: nowIso }, user.id);
      }
    }
  }, [user?.id]);

  const setCategoryBudget = (category, amount) => {
    const num = Number(amount);
    const nowIso = new Date().toISOString();
    setBudgets(prev => {
      const updated = { ...prev };
      if (isNaN(num) || num <= 0) {
        delete updated[category];
      } else {
        updated[category] = num;
      }
      return updated;
    });

    if (user?.id) {
      if (isNaN(num) || num <= 0) {
        syncService.queueChange('budgets', 'delete', { category, deleted_at: nowIso, updated_at: nowIso }, user.id);
      } else {
        syncService.queueChange('budgets', 'upsert', { category, amount: num, updated_at: nowIso }, user.id);
      }
    }
  };

  const removeCategoryBudget = (category) => {
    const nowIso = new Date().toISOString();
    setBudgets(prev => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });

    if (user?.id) {
      syncService.queueChange('budgets', 'delete', { category, deleted_at: nowIso, updated_at: nowIso }, user.id);
    }
  };

  const updateAllBudgets = (newBudgets) => {
    const nowIso = new Date().toISOString();
    const previous = budgets || {};
    // Conservar el tope mensual, que no forma parte del formulario por categoría
    setBudgets(prev => {
      const next = { ...newBudgets };
      if (prev && MONTHLY_LIMIT_KEY in prev) next[MONTHLY_LIMIT_KEY] = prev[MONTHLY_LIMIT_KEY];
      return next;
    });

    if (user?.id) {
      Object.entries(newBudgets).forEach(([category, amount]) => {
        syncService.queueChange('budgets', 'upsert', { category, amount: budgetAmount(amount), updated_at: nowIso }, user.id);
      });
      // Las categorías que se quitaron también se borran en la nube
      Object.keys(previous).forEach(category => {
        if (!(category in newBudgets)) {
          syncService.queueChange('budgets', 'delete', { category, deleted_at: nowIso, updated_at: nowIso }, user.id);
        }
      });
    }
  };

  return {
    budgets,
    allBudgets,
    monthlyLimit,
    setMonthlyLimit,
    setBudgets,
    setCategoryBudget,
    removeCategoryBudget,
    updateAllBudgets
  };
}
