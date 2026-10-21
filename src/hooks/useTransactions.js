import { useState, useEffect, useRef } from 'react';
import { getTxRateSnapshot } from '../utils/formatters';
import { syncService } from '../services/syncService';

export function useTransactions(currentRates = {}, user = null) {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('personal_transactions');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        parsed = parsed.filter(t => !(t.type === 'spent' && !t.category));
        return parsed;
      } catch {
        return [];
      }
    }
    return [];
  });

  const transactionsRef = useRef(transactions);
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

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

    const nowIso = new Date().toISOString();
    const newTxItem = {
      ...transaction,
      id: transaction.id || Date.now().toString(),
      date: transaction.date || nowIso,
      rateSnapshot,
      usdEquivalent,
      updated_at: nowIso
    };

    const nextList = [newTxItem, ...transactionsRef.current];
    transactionsRef.current = nextList;
    setTransactions(nextList);

    if (user?.id) {
      syncService.queueChange('transactions', 'upsert', newTxItem, user.id);
    }

    return newTxItem;
  };

  const deleteTransaction = (id) => {
    const existing = transactionsRef.current.find(t => t.id === id);
    const nowIso = new Date().toISOString();
    const nextList = transactionsRef.current.filter(t => t.id !== id);
    transactionsRef.current = nextList;
    setTransactions(nextList);

    if (user?.id) {
      syncService.queueChange('transactions', 'delete', { id, deleted_at: nowIso, updated_at: nowIso, ...existing }, user.id);
    }
  };

  const updateTransaction = (id, updatedFields) => {
    const currentList = transactionsRef.current;
    const targetIdx = currentList.findIndex(t => t.id === id);
    if (targetIdx < 0) return null;

    const nowIso = new Date().toISOString();
    const updatedTx = { ...currentList[targetIdx], ...updatedFields, updated_at: nowIso };
    const nextList = [...currentList];
    nextList[targetIdx] = updatedTx;

    transactionsRef.current = nextList;
    setTransactions(nextList);

    if (user?.id) {
      syncService.queueChange('transactions', 'upsert', updatedTx, user.id);
    }
    return updatedTx;
  };

  return { transactions, setTransactions, addTransaction, deleteTransaction, updateTransaction };
}
