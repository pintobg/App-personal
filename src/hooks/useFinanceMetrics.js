import { useMemo } from 'react';
import { add, convert } from '../domain/money';
import { getTxUsdEquivalent, translateCategory } from '../utils/formatters';
import { parseLocalDate, toLocalDateString } from '../utils/dates';

export function useFinanceMetrics({ assets, transactions, obligations, rates, timeFrame, activeFilter, selectedFilters }) {
  const grandTotalUsd = useMemo(() => {
    return assets.reduce((total, asset) => {
      const sym = (asset.name || 'USD').toUpperCase();
      return add(total, convert(asset.amount, sym, 'USD', rates));
    }, 0);
  }, [assets, rates]);

  const alternateGrandTotalUsd = useMemo(() => {
    const isParalelo = rates?.referenceType === 'paralelo';
    const altRates = {
      ...rates,
      referenceType: isParalelo ? 'bcv' : 'paralelo',
      VES: isParalelo ? (rates?.bcvUsd || rates?.VES) : (rates?.paralelo || rates?.bcvUsd || rates?.VES)
    };
    return assets.reduce((total, asset) => {
      const sym = (asset.name || 'USD').toUpperCase();
      return add(total, convert(asset.amount, sym, 'USD', altRates));
    }, 0);
  }, [assets, rates]);

  const accountTotalsUsd = useMemo(() => {
    return assets.reduce((acc, asset) => {
      if (!acc[asset.location]) acc[asset.location] = 0;
      const sym = (asset.name || 'USD').toUpperCase();
      const usdVal = convert(asset.amount, sym, 'USD', rates);
      acc[asset.location] = add(acc[asset.location], usdVal);
      return acc;
    }, {});
  }, [assets, rates]);

  const assetsByLocation = useMemo(() => {
    return assets.reduce((acc, asset) => {
      if (activeFilter === 'asset' && selectedFilters.length > 0 && !selectedFilters.includes(asset.name)) {
        return acc;
      }
      if (activeFilter === 'account' && selectedFilters.length > 0 && !selectedFilters.includes(asset.location)) {
        return acc;
      }
      if (!acc[asset.location]) acc[asset.location] = [];
      acc[asset.location].push(asset);
      return acc;
    }, {});
  }, [assets, activeFilter, selectedFilters]);

  const uniqueAssetNames = useMemo(() => {
    return Array.from(new Set(assets.map(a => a.name)));
  }, [assets]);

  const nextPayments = useMemo(() => {
    return obligations.filter(ob => ob.type === 'pay' && (!ob.totalInstallments || Number(ob.paidInstallments) < Number(ob.totalInstallments))).slice(0, 3);
  }, [obligations]);

  const nextCollections = useMemo(() => {
    return obligations.filter(ob => ob.type === 'receive' && (!ob.totalInstallments || Number(ob.paidInstallments) < Number(ob.totalInstallments))).slice(0, 3);
  }, [obligations]);

  const { filteredSpents, filteredIncomes, totalSpentUsd, totalIncomeUsd, pieData } = useMemo(() => {
    const now = new Date();
    let filterStart = null;
    let filterEnd = null;

    if (timeFrame === 'daily') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (timeFrame === 'weekly') {
      filterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeFrame === 'monthly') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeFrame === 'last30') {
      filterStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const matchesDate = (txDate) => {
      if (!filterStart) return true;
      const d = parseLocalDate(toLocalDateString(txDate));
      if (filterEnd) return d >= filterStart && d <= filterEnd;
      return d >= filterStart;
    };

    const spents = transactions.filter(t => t.type === 'spent' && matchesDate(t.date));
    const incomes = transactions.filter(t => t.type === 'income' && matchesDate(t.date));
    const spentUsd = spents.reduce((acc, t) => add(acc, getTxUsdEquivalent(t, rates)), 0);
    const incomeUsd = incomes.reduce((acc, t) => add(acc, getTxUsdEquivalent(t, rates)), 0);

    const aggregatedData = {};
    spents.forEach(t => {
      const usdAmount = getTxUsdEquivalent(t, rates);
      const cat = translateCategory(t.category) || 'Sin categoría';
      aggregatedData[cat] = (aggregatedData[cat] || 0) + usdAmount;
    });

    const pie = Object.entries(aggregatedData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      filteredSpents: spents,
      filteredIncomes: incomes,
      totalSpentUsd: spentUsd,
      totalIncomeUsd: incomeUsd,
      pieData: pie
    };
  }, [transactions, timeFrame, rates]);

  return {
    grandTotalUsd,
    alternateGrandTotalUsd,
    accountTotalsUsd,
    assetsByLocation,
    uniqueAssetNames,
    nextPayments,
    nextCollections,
    filteredSpents,
    filteredIncomes,
    totalSpentUsd,
    totalIncomeUsd,
    pieData
  };
}
