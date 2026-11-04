import { useMemo, useState, useCallback } from 'react';
import {
  formatAmount,
  translateCategory,
  translateSubcategory,
  getTxUsdEquivalent
} from '../../../utils/formatters';
import { toLocalDateString, parseLocalDate } from '../../../utils/dates';
import { calculateEffectiveExchangeRate } from '../../../domain/rates';

export function useTransactionFiltering({
  transactions = [],
  assets = [],
  rates = {},
  txFilter,
  setTxFilter,
  getCategoryName,
  getSubcategoryName
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  // "Ver movimientos" desde Cuentas deja la cuenta elegida en sessionStorage.
  const [accountFilter, setAccountFilter] = useState(() => {
    try {
      const pending = sessionStorage.getItem('tx_account_filter');
      if (pending) {
        sessionStorage.removeItem('tx_account_filter');
        return pending;
      }
    } catch { /* sin almacenamiento */ }
    return 'all';
  });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  const uniqueAccounts = useMemo(() => {
    const accs = new Set();
    if (Array.isArray(assets)) {
      assets.forEach(a => {
        if (a && a.location) accs.add(a.location);
      });
    }
    if (Array.isArray(transactions)) {
      transactions.forEach(t => {
        if (t.origin) accs.add(t.origin);
        if (t.destOrigin) accs.add(t.destOrigin);
      });
    }
    return Array.from(accs).sort();
  }, [assets, transactions]);

  const uniqueCategories = useMemo(() => {
    const cats = new Map();
    if (Array.isArray(transactions)) {
      transactions.forEach(t => {
        if (t.category_id && getCategoryName) {
          const name = getCategoryName(t.category_id);
          if (name) cats.set(t.category_id, name);
        } else if (t.category) {
          cats.set(t.category, translateCategory(t.category));
        }
      });
    }
    return Array.from(cats.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [transactions, getCategoryName]);

  const uniqueCurrencies = useMemo(() => {
    const currs = new Set();
    if (Array.isArray(transactions)) {
      transactions.forEach(t => {
        if (t.currency) currs.add(t.currency.toUpperCase());
        if (t.destCurrency) currs.add(t.destCurrency.toUpperCase());
      });
    }
    return Array.from(currs).sort();
  }, [transactions]);

  const dateOptions = [
    { value: 'all', label: 'Cualquier fecha' },
    { value: 'today', label: 'Hoy' },
    { value: 'yesterday', label: 'Ayer' },
    { value: 'this_week', label: 'Esta semana' },
    { value: 'this_month', label: 'Este mes' },
    { value: 'last_month', label: 'Mes pasado' },
    { value: 'custom', label: 'Rango personalizado...' }
  ];

  const accountOptions = [
    { value: 'all', label: 'Todas las cuentas' },
    ...uniqueAccounts.map(acc => ({ value: acc, label: acc }))
  ];

  const categoryOptions = [
    { value: 'all', label: 'Todas las categorías' },
    ...uniqueCategories.map(c => ({ value: c.id, label: c.label }))
  ];

  const currencyOptions = [
    { value: 'all', label: 'Todas las monedas' },
    ...uniqueCurrencies.map(c => ({ value: c, label: c }))
  ];

  const exchangeMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalUsdSold = 0;
    let totalBsReceived = 0;
    let opsCount = 0;

    transactions.forEach(tx => {
      if (tx.type !== 'transfer') return;
      if ((tx.currency || '').toUpperCase() !== 'USD' || (tx.destCurrency || '').toUpperCase() !== 'VES') return;

      const txDate = tx.date ? new Date(tx.date) : null;
      if (!txDate || txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear) return;

      const sold = Number(tx.amount) || 0;
      const rcvd = Number(tx.destAmount) || 0;
      if (sold > 0 && rcvd > 0) {
        totalUsdSold += sold;
        totalBsReceived += rcvd;
        opsCount++;
      }
    });

    const effectiveRate = calculateEffectiveExchangeRate(totalUsdSold, totalBsReceived);

    return {
      totalUsdSold,
      totalBsReceived,
      opsCount,
      effectiveRate
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const today = toLocalDateString(now);

    const yesterdayObj = new Date(now);
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = toLocalDateString(yesterdayObj);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfCurrentMonth = toLocalDateString(new Date(currentYear, currentMonth, 1));
    const endOfCurrentMonth = toLocalDateString(new Date(currentYear, currentMonth + 1, 0));

    const startOfLastMonth = toLocalDateString(new Date(currentYear, currentMonth - 1, 1));
    const endOfLastMonth = toLocalDateString(new Date(currentYear, currentMonth, 0));

    const dayOfWeek = (now.getDay() + 6) % 7;
    const startOfWeekObj = new Date(now);
    startOfWeekObj.setDate(startOfWeekObj.getDate() - dayOfWeek);
    const startOfThisWeek = toLocalDateString(startOfWeekObj);

    const q = (searchQuery || '').trim().toLowerCase();

    return transactions.filter(tx => {
      if (txFilter === 'income' && tx.type !== 'income') return false;
      if (txFilter === 'spent' && tx.type !== 'spent') return false;
      if (txFilter === 'transfer' && tx.type !== 'transfer') return false;

      if (accountFilter !== 'all') {
        const matchesOrigin = tx.origin === accountFilter;
        const matchesDest = tx.destOrigin === accountFilter;
        if (!matchesOrigin && !matchesDest) return false;
      }

      if (categoryFilter !== 'all') {
        const matchId = tx.category_id === categoryFilter;
        const matchName = tx.category === categoryFilter;
        if (!matchId && !matchName) return false;
      }

      if (currencyFilter !== 'all') {
        const matchesCurr = (tx.currency || '').toUpperCase() === currencyFilter;
        const matchesDestCurr = (tx.destCurrency || '').toUpperCase() === currencyFilter;
        if (!matchesCurr && !matchesDestCurr) return false;
      }

      if (dateRangeFilter !== 'all') {
        const txDate = tx.date ? toLocalDateString(tx.date) : '';
        if (dateRangeFilter === 'today' && txDate !== today) return false;
        if (dateRangeFilter === 'yesterday' && txDate !== yesterday) return false;
        if (dateRangeFilter === 'this_week' && (!txDate || txDate < startOfThisWeek || txDate > today)) return false;
        if (dateRangeFilter === 'this_month' && (!txDate || txDate < startOfCurrentMonth || txDate > endOfCurrentMonth)) return false;
        if (dateRangeFilter === 'last_month' && (!txDate || txDate < startOfLastMonth || txDate > endOfLastMonth)) return false;
        if (dateRangeFilter === 'custom') {
          if (customStartDate && txDate < customStartDate) return false;
          if (customEndDate && txDate > customEndDate) return false;
        }
      }

      if (q) {
        const catResolved = (tx.category_id && getCategoryName ? getCategoryName(tx.category_id) : '') || translateCategory(tx.category) || tx.category || '';
        const subcatResolved = (tx.subcategory_id && getSubcategoryName ? getSubcategoryName(tx.subcategory_id) : '') || translateSubcategory(tx.subcategory) || tx.subcategory || '';
        const cat = catResolved.toLowerCase();
        const subcat = subcatResolved.toLowerCase();
        const origin = (tx.origin || '').toLowerCase();
        const destOrigin = (tx.destOrigin || '').toLowerCase();
        const notes = (tx.notes || tx.description || tx.title || '').toLowerCase();
        const currency = (tx.currency || '').toLowerCase();
        const ref = (tx.referenceNumber || '').toLowerCase();
        const bank = (tx.bank || '').toLowerCase();
        const recipient = (tx.recipientId || '').toLowerCase();
        const paymentMethod = (tx.paymentMethod || '').toLowerCase();
        const amountStr = tx.amount != null ? tx.amount.toString().toLowerCase() : '';
        const formattedAmt = tx.amount != null ? formatAmount(tx.amount, tx.currency).toLowerCase() : '';

        const matches =
          cat.includes(q) ||
          subcat.includes(q) ||
          origin.includes(q) ||
          destOrigin.includes(q) ||
          notes.includes(q) ||
          currency.includes(q) ||
          ref.includes(q) ||
          bank.includes(q) ||
          recipient.includes(q) ||
          paymentMethod.includes(q) ||
          amountStr.includes(q) ||
          formattedAmt.includes(q);

        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [transactions, txFilter, accountFilter, categoryFilter, currencyFilter, dateRangeFilter, customStartDate, customEndDate, searchQuery, getCategoryName, getSubcategoryName]);

  const filteredTotals = useMemo(() => {
    let incomeUsd = 0;
    let spentUsd = 0;
    filteredTransactions.forEach(tx => {
      const usd = getTxUsdEquivalent(tx, rates);
      if (tx.type === 'income') incomeUsd += usd;
      if (tx.type === 'spent') spentUsd += usd;
    });
    return {
      incomeUsd,
      spentUsd,
      netUsd: incomeUsd - spentUsd,
      count: filteredTransactions.length
    };
  }, [filteredTransactions, rates]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    dateRangeFilter !== 'all' ||
    accountFilter !== 'all' ||
    categoryFilter !== 'all' ||
    currencyFilter !== 'all' ||
    customStartDate ||
    customEndDate ||
    txFilter !== 'all'
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setDateRangeFilter('all');
    setAccountFilter('all');
    setCategoryFilter('all');
    setCurrencyFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setTxFilter('all');
  }, [setTxFilter]);

  return {
    searchQuery,
    setSearchQuery,
    dateRangeFilter,
    setDateRangeFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    accountFilter,
    setAccountFilter,
    categoryFilter,
    setCategoryFilter,
    currencyFilter,
    setCurrencyFilter,
    dateOptions,
    accountOptions,
    categoryOptions,
    currencyOptions,
    exchangeMonthStats,
    filteredTransactions,
    filteredTotals,
    hasActiveFilters,
    handleClearFilters
  };
}
