import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';

const STORAGE_KEY = 'personal_budgets';

export function useBudgets(user = null) {
  const [budgets, setBudgets] = useState(() => {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
    } catch (e) {
      console.error('Error guardando presupuestos en localStorage:', e);
    }
  }, [budgets]);

  const setCategoryBudget = (category, amount) => {
    const num = Number(amount);
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
        syncService.queueChange('budgets', 'delete', { category }, user.id);
      } else {
        syncService.queueChange('budgets', 'upsert', { category, amount: num }, user.id);
      }
    }
  };

  const removeCategoryBudget = (category) => {
    setBudgets(prev => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });

    if (user?.id) {
      syncService.queueChange('budgets', 'delete', { category }, user.id);
    }
  };

  const updateAllBudgets = (newBudgets) => {
    setBudgets(newBudgets);

    if (user?.id) {
      Object.entries(newBudgets).forEach(([category, amount]) => {
        syncService.queueChange('budgets', 'upsert', { category, amount }, user.id);
      });
    }
  };

  return {
    budgets,
    setBudgets,
    setCategoryBudget,
    removeCategoryBudget,
    updateAllBudgets
  };
}
