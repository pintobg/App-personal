import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';
import { generateTestData } from '../utils/testData';

export const useObligations = (user = null) => {
  const [obligations, setObligations] = useState(() => {
    const saved = localStorage.getItem('obligations');
    try {
      return saved ? JSON.parse(saved) : generateTestData().obligations;
    } catch {
      return generateTestData().obligations;
    }
  });

  useEffect(() => {
    localStorage.setItem('obligations', JSON.stringify(obligations));
  }, [obligations]);

  const addObligation = (obligation) => {
    const newOb = {
      id: obligation.id || crypto.randomUUID(),
      dateCreated: obligation.dateCreated || new Date().toISOString(),
      ...obligation
    };
    setObligations(prev => [newOb, ...prev]);

    if (user?.id) {
      syncService.queueChange('obligations', 'upsert', newOb, user.id);
    }
    return newOb;
  };

  const deleteObligation = (id) => {
    setObligations(prev => prev.filter(ob => ob.id !== id));
    if (user?.id) {
      syncService.queueChange('obligations', 'delete', { id }, user.id);
    }
  };

  const updateObligation = (id, updates) => {
    let updatedOb = null;
    setObligations(prev => prev.map(ob => {
      if (ob.id === id) {
        updatedOb = { ...ob, ...updates };
        return updatedOb;
      }
      return ob;
    }));

    if (updatedOb && user?.id) {
      syncService.queueChange('obligations', 'upsert', updatedOb, user.id);
    }
  };

  return { obligations, setObligations, addObligation, deleteObligation, updateObligation };
};
