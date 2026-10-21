import { useState, useEffect, useRef } from 'react';
import { syncService } from '../services/syncService';
import { db } from '../services/db';

export function useGoals(user = null) {
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('personal_goals');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const goalsRef = useRef(goals);
  useEffect(() => {
    goalsRef.current = goals;
  }, [goals]);

  // Sincronizar en localStorage e IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem('personal_goals', JSON.stringify(goals));
      if (db?.goals) {
        db.goals.bulkPut(goals).catch(() => {});
      }
    } catch {
      // Ignorar fallos de cuota o entorno sin ventana
    }
  }, [goals]);

  const addGoal = (goal) => {
    const nowIso = new Date().toISOString();
    const newGoal = {
      id: goal.id || crypto.randomUUID(),
      name: (goal.name || '').trim(),
      targetAmount: Number(goal.targetAmount) || 0,
      currency: (goal.currency || 'USD').toUpperCase(),
      deadline: goal.deadline || null,
      accountIds: Array.isArray(goal.accountIds) ? goal.accountIds : [],
      updated_at: nowIso,
      created_at: nowIso,
      ...goal
    };

    const nextList = [newGoal, ...goalsRef.current];
    goalsRef.current = nextList;
    setGoals(nextList);

    if (user?.id) {
      syncService.queueChange('goals', 'upsert', newGoal, user.id);
    }
    return newGoal;
  };

  const updateGoal = (id, updates) => {
    const nowIso = new Date().toISOString();
    let updatedItem = null;

    const nextList = goalsRef.current.map(g => {
      if (g.id === id) {
        updatedItem = {
          ...g,
          ...updates,
          updated_at: nowIso
        };
        return updatedItem;
      }
      return g;
    });

    if (!updatedItem) return null;

    goalsRef.current = nextList;
    setGoals(nextList);

    if (user?.id) {
      syncService.queueChange('goals', 'upsert', updatedItem, user.id);
    }
    return updatedItem;
  };

  const deleteGoal = (id) => {
    const existing = goalsRef.current.find(g => g.id === id);
    const nowIso = new Date().toISOString();
    const nextList = goalsRef.current.filter(g => g.id !== id);
    goalsRef.current = nextList;
    setGoals(nextList);

    if (user?.id) {
      syncService.queueChange('goals', 'delete', { id, deleted_at: nowIso, updated_at: nowIso, ...existing }, user.id);
    }
  };

  return { goals, setGoals, addGoal, updateGoal, deleteGoal };
}
