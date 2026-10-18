import { useState, useEffect } from 'react';
import { getTxRateSnapshot } from '../utils/formatters';
import { syncService } from '../services/syncService';
import { generateTestData } from '../utils/testData';

export function useTransactions(currentRates = {}, user = null) {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('personal_transactions');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        parsed = parsed.filter(t => !(t.type === 'spent' && !t.category));
        return parsed;
      } catch {
        return generateTestData(currentRates).transactions;
      }
    }
    return generateTestData(currentRates).transactions;
  });

  useEffect(() => {
    localStorage.setItem('personal_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (transaction, customRates) => {
    const activeRates = customRates || currentRates || {};
    const rateSnapshot = transaction.rateSnapshot != null && !isNaN(Number(transaction.rateSnapshot))
      ? Number(transaction.rateSnapshot)
      : getTxRateSnapshot(transaction, activeRates);

    const amountNum = Number(transaction.amount) || 0;
    const usdEquivalent = transaction.usdEquivalent != null && !isNaN(Number(transaction.usdEquivalent))
      ? Number(transaction.usdEquivalent)
      : amountNum * rateSnapshot;

    const newTxItem = {
      ...transaction,
      id: transaction.id || Date.now().toString(),
      date: transaction.date || new Date().toISOString(),
      rateSnapshot,
      usdEquivalent
    };

    setTransactions(prev => [newTxItem, ...prev]);

    if (user?.id) {
      syncService.queueChange('transactions', 'upsert', newTxItem, user.id);
    }

    return newTxItem;
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (user?.id) {
      syncService.queueChange('transactions', 'delete', { id }, user.id);
    }
  };

  const updateTransaction = (id, updatedFields) => {
    let updatedTx = null;
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        updatedTx = { ...t, ...updatedFields };
        return updatedTx;
      }
      return t;
    }));

    if (updatedTx && user?.id) {
      syncService.queueChange('transactions', 'upsert', updatedTx, user.id);
    }
  };

  return { transactions, setTransactions, addTransaction, deleteTransaction, updateTransaction };
}
