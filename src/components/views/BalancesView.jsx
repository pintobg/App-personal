import { useState, useMemo, useCallback } from 'react';
import { EmptyState } from '../ui';
import VerifyBalancesModal from '../modals/VerifyBalancesModal';
import BalancesSummary from './balances/BalancesSummary';
import BalancesNavigationTabs from './balances/BalancesNavigationTabs';
import AccountCard from './balances/AccountCard';
import CurrencyGroupCard from './balances/CurrencyGroupCard';
import AccountGroupCard from './balances/AccountGroupCard';
import { formatAmount } from '../../utils/formatters';
import { convert, add } from '../../domain/money';

export default function BalancesView({
  grandTotalUsd,
  alternateGrandTotalUsd,
  referenceRate,
  setReferenceRate,
  rates = {},
  ratesDetails,
  assets = [],
  transactions = [],
  activeFilter = 'all',
  setActiveFilter = () => {},
  setSelectedFilters,
  assetsByLocation = {},
  accountTotalsUsd = {},
  deleteMode = false,
  onAdjustAsset,
  onDeleteAsset,
  onAdjustBalance,
  auth,
  onOpenAuthModal,
  onExportBackup,
  onNavigateToCalculator,
  onOpenSettings,
  onAddAsset
}) {
  const [expandedCurrencies, setExpandedCurrencies] = useState({});
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const toggleCurrencyExpand = useCallback((sym) => {
    setExpandedCurrencies(prev => ({ ...prev, [sym]: !prev[sym] }));
  }, []);

  const toggleAccountExpand = useCallback((loc) => {
    setExpandedAccounts(prev => ({ ...prev, [loc]: !prev[loc] }));
  }, []);

  const getRateForSymbol = useCallback((sym) => {
    const clean = (sym || '').trim().toUpperCase();
    return rates[clean] ?? (clean === 'USD' || clean === 'USDT' || clean === 'USDC' ? 1 : 0);
  }, [rates]);

  // Agrupación y sumatoria por Moneda (para pestaña "Por Moneda")
  const currencyGroups = useMemo(() => {
    const map = {};
    assets.forEach(asset => {
      const sym = (asset.name || '').trim().toUpperCase();
      if (!sym) return;
      const rateVal = getRateForSymbol(sym);
      const amount = Number(asset.amount) || 0;
      const usdVal = convert(amount, sym, 'USD', rates);

      if (!map[sym]) {
        map[sym] = {
          symbol: sym,
          displayName: sym === 'VES' ? 'Bs.' : sym,
          type: asset.type || 'fiat',
          totalAmount: 0,
          totalUsd: 0,
          rateVal,
          isUnrecognized: !rateVal || rateVal <= 0,
          items: []
        };
      }
      map[sym].totalAmount = add(map[sym].totalAmount, amount);
      map[sym].totalUsd = add(map[sym].totalUsd, usdVal);
      map[sym].items.push({
        ...asset,
        symbol: sym,
        amountNum: amount,
        usdVal
      });
    });

    return Object.values(map)
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => b.usdVal - a.usdVal)
      }))
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [assets, rates, getRateForSymbol]);

  // Agrupación y sumatoria por Cuenta (para pestaña "Por Cuenta")
  const accountGroups = useMemo(() => {
    const map = {};
    assets.forEach(asset => {
      const loc = asset.location || 'Sin ubicación';
      const sym = (asset.name || '').trim().toUpperCase();
      const rateVal = getRateForSymbol(sym);
      const amount = Number(asset.amount) || 0;
      const usdVal = convert(amount, sym, 'USD', rates);

      if (!map[loc]) {
        map[loc] = {
          location: loc,
          totalUsd: 0,
          items: []
        };
      }
      map[loc].totalUsd = add(map[loc].totalUsd, usdVal);
      map[loc].items.push({
        ...asset,
        symbol: sym,
        displayName: sym === 'VES' ? 'Bs.' : sym,
        amountNum: amount,
        rateVal,
        isUnrecognized: !rateVal || rateVal <= 0,
        usdVal
      });
    });

    return Object.values(map)
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => b.usdVal - a.usdVal)
      }))
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [assets, rates, getRateForSymbol]);

  return (
    <>
      {/* 1. Resumen y balance general */}
      <BalancesSummary
        grandTotalUsd={grandTotalUsd}
        alternateGrandTotalUsd={alternateGrandTotalUsd}
        referenceRate={referenceRate}
        setReferenceRate={setReferenceRate}
        rates={rates}
        ratesDetails={ratesDetails}
        auth={auth}
        onOpenAuthModal={onOpenAuthModal}
        onExportBackup={onExportBackup}
        onNavigateToCalculator={onNavigateToCalculator}
        onOpenSettings={onOpenSettings}
      />

      {/* 2. Pestañas de navegación y botón de verificación */}
      <BalancesNavigationTabs
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        setSelectedFilters={setSelectedFilters}
        onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
        onAddAsset={onAddAsset}
      />

      {/* 3. Listado de cuentas según filtro activo */}
      <div style={{ padding: '0 1rem', marginBottom: '2rem', width: '100%', boxSizing: 'border-box' }}>
        {assets.length === 0 && (
          <EmptyState icon="🏦" message="Aún no tienes cuentas. Toca «Agregar cuenta» para crear la primera." />
        )}

        {/* VISTA 1: TODOS (Agrupado por ubicación) */}
        {activeFilter === 'all' && Object.entries(assetsByLocation).map(([location, locAssets]) => (
          <div key={location} className="portfolio-section">
            <div className="portfolio-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', marginBottom: '0.5rem', gap: '0.75rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{location}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>${formatAmount(accountTotalsUsd[location], 'USD') || 0}</span>
            </div>

            <div className="capsule-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {locAssets.map(asset => {
                const assetSymbol = (asset.name || '').trim().toUpperCase();
                const rateVal = getRateForSymbol(assetSymbol);
                const isUnrecognized = !rateVal || rateVal <= 0;
                const valueUsd = convert(asset.amount, assetSymbol, 'USD', rates);

                return (
                  <AccountCard
                    key={asset.id}
                    asset={asset}
                    valueUsd={valueUsd}
                    rateVal={rateVal}
                    isUnrecognized={isUnrecognized}
                    deleteMode={deleteMode}
                    onAdjustAsset={onAdjustAsset}
                    onDeleteAsset={onDeleteAsset}
                  />
                );
              })}
            </div>
            <div style={{ width: '50%', margin: '2rem auto', borderBottom: '1px solid var(--border-color)' }}></div>
          </div>
        ))}

        {/* VISTA 2: POR MONEDA */}
        {activeFilter === 'asset' && currencyGroups.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {currencyGroups.map(group => (
              <CurrencyGroupCard
                key={group.symbol}
                group={group}
                isExpanded={Boolean(expandedCurrencies[group.symbol])}
                onToggleExpand={() => toggleCurrencyExpand(group.symbol)}
                grandTotalUsd={grandTotalUsd}
                onAdjustAsset={onAdjustAsset}
                onDeleteAsset={onDeleteAsset}
              />
            ))}
          </div>
        )}

        {/* VISTA 3: POR CUENTA */}
        {activeFilter === 'account' && accountGroups.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {accountGroups.map(group => (
              <AccountGroupCard
                key={group.location}
                group={group}
                isExpanded={Boolean(expandedAccounts[group.location])}
                onToggleExpand={() => toggleAccountExpand(group.location)}
                grandTotalUsd={grandTotalUsd}
                onAdjustAsset={onAdjustAsset}
                onDeleteAsset={onDeleteAsset}
              />
            ))}
          </div>
        )}
      </div>

      <VerifyBalancesModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        assets={assets}
        transactions={transactions}
        onAdjustBalance={onAdjustBalance}
      />
    </>
  );
}
