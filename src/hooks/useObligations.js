import { useState, useEffect, useRef } from 'react';
import { syncService } from '../services/syncService';

export const useObligations = (user = null) => {
  const [obligations, setObligations] = useState(() => {
    const saved = localStorage.getItem('obligations');
    try {
      return saved ? JSON.parse(saved) : [];
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

  const addObligation = (obligation) => {
    const nowIso = new Date().toISOString();
    const newOb = {
      id: obligation.id || crypto.randomUUID(),
      dateCreated: obligation.dateCreated || nowIso,
      updated_at: nowIso,
      ...obligation
    };
    const nextList = [newOb, ...obligationsRef.current];
    obligationsRef.current = nextList;
    setObligations(nextList);

    if (user?.id) {
      syncService.queueChange('obligations', 'upsert', newOb, user.id);
    }
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
    return updatedOb;
  };

  return { obligations, setObligations, addObligation, deleteObligation, updateObligation };
};
