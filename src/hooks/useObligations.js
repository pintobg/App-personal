import { useState, useEffect, useRef } from 'react';
import { syncService } from '../services/syncService';
import {
  scheduleObligationReminders,
  cancelObligationReminders,
  syncAllObligationReminders
} from '../services/notificationService';

export const useObligations = (user = null) => {
  const [obligations, setObligations] = useState(() => {
    const saved = localStorage.getItem('obligations');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) {
        let changed = false;
        const sanitized = parsed.map(ob => {
          if (!ob || typeof ob !== 'object') return ob;
          if (!ob.id || String(ob.id).trim() === '') {
            changed = true;
            return { ...ob, id: crypto.randomUUID() };
          }
          return ob;
        });
        if (changed) {
          localStorage.setItem('obligations', JSON.stringify(sanitized));
        }
        return sanitized;
      }
      return [];
    } catch {
      return [];
    }
  });

  const obligationsRef = useRef(obligations);
  useEffect(() => {
    obligationsRef.current = obligations;
  }, [obligations]);

  useEffect(() => {
    localStorage.setItem('obligations', JSON.stringify(obligations));
  }, [obligations]);

  // Programar recordatorios locales al montar
  useEffect(() => {
    if (obligations.length > 0) {
      syncAllObligationReminders(obligations);
    }
  }, []);

  const addObligation = (obligation) => {
    const nowIso = new Date().toISOString();
    const cleanId = (obligation.id && String(obligation.id).trim() !== '')
      ? obligation.id
      : crypto.randomUUID();

    const newOb = {
      ...obligation,
      id: cleanId,
      dateCreated: obligation.dateCreated || nowIso,
      updated_at: nowIso,
      reminderEnabled: obligation.reminderEnabled !== false
    };
    const nextList = [newOb, ...obligationsRef.current];
    obligationsRef.current = nextList;
    setObligations(nextList);

    if (user?.id) {
      syncService.queueChange('obligations', 'upsert', newOb, user.id);
    }

    scheduleObligationReminders(newOb);
    return newOb;
  };

  const deleteObligation = (id) => {
    const existing = obligationsRef.current.find(ob => ob.id === id);
    const nowIso = new Date().toISOString();
    const nextList = obligationsRef.current.filter(ob => ob.id !== id);
    obligationsRef.current = nextList;
    setObligations(nextList);

    if (user?.id) {
      syncService.queueChange('obligations', 'delete', { id, deleted_at: nowIso, updated_at: nowIso, ...existing }, user.id);
    }

    cancelObligationReminders(id);
  };

  const updateObligation = (id, updates) => {
    const currentList = obligationsRef.current;
    const targetIdx = currentList.findIndex(ob => ob.id === id);
    if (targetIdx < 0) return null;

    const nowIso = new Date().toISOString();
    const updatedOb = { ...currentList[targetIdx], ...updates, updated_at: nowIso };
    const nextList = [...currentList];
    nextList[targetIdx] = updatedOb;

    obligationsRef.current = nextList;
    setObligations(nextList);

    if (user?.id) {
      syncService.queueChange('obligations', 'upsert', updatedOb, user.id);
    }

    scheduleObligationReminders(updatedOb);
    return updatedOb;
  };

  return { obligations, setObligations, addObligation, deleteObligation, updateObligation };
};
