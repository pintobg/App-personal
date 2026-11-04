import RateNotice from '../common/RateNotice';
import { useState, useMemo, useCallback } from 'react';
import { EmptyState, ActionSheet, Icon } from '../ui';
import VerifyBalancesModal from '../modals/VerifyBalancesModal';
import BalancesSummary from './balances/BalancesSummary';
import BalancesNavigationTabs from './balances/BalancesNavigationTabs';
import AccountRow from './balances/AccountRow';
import { formatAmount, getRateString } from '../../utils/formatters';
import { convert, add } from '../../domain/money';

const displaySymbol = (sym) => (sym === 'VES' ? 'Bs.' : sym);

export default function BalancesView({
  grandTotalUsd,
  alternateGrandTotalUsd,
  referenceRate,
  rates = {},
  ratesDetails,
  assets = [],
  transactions = [],
  activeFilter = 'all',
  setActiveFilter = () => {},
  setSelectedFilters,
  onAdjustAsset,
  onDeleteAsset,
  onAdjustBalance,
  auth,
  onExportBackup,
  onNavigateToCalculator,
  onAddAsset,
  onViewMovements
}) {
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [actionAssetId, setActionAssetId] = useState(null);
  const byCurrency = activeFilter === 'asset';

  const getRateForSymbol = useCallback((sym) => {
    const clean = (sym || '').trim().toUpperCase();
    return rates[clean] ?? (clean === 'USD' || clean === 'USDT' || clean === 'USDC' ? 1 : 0);
  }, [rates]);

  // Cada cuenta con su símbolo, valor en USD y si tiene precio conocido.
  const rows = useMemo(() => assets.map(asset => {
    const symbol = (asset.name || '').trim().toUpperCase();
    const rateVal = getRateForSymbol(symbol);
    return {
      ...asset,
      symbol,
      rateVal,
      isUnrecognized: !rateVal || rateVal <= 0,
      usdVal: convert(Number(asset.amount) || 0, symbol, 'USD', rates)
    };
  }), [assets, rates, getRateForSymbol]);

  // Grupos: por banco (ubicación) o por moneda, con subtotal en USD.
  const groups = useMemo(() => {
    const map = {};
    rows.forEach(row => {
      const key = byCurrency ? (row.symbol || '?') : (row.location || 'Sin ubicación');
      if (!map[key]) map[key] = { key, totalUsd: 0, totalAmount: 0, items: [] };
      map[key].totalUsd = add(map[key].totalUsd, row.usdVal);
      map[key].totalAmount = add(map[key].totalAmount, Number(row.amount) || 0);
      map[key].items.push(row);
    });
    return Object.values(map)
      .map(g => ({ ...g, items: [...g.items].sort((a, b) => b.usdVal - a.usdVal) }))
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [rows, byCurrency]);

  const actionAsset = rows.find(r => r.id === actionAssetId) || null;
  const closeSheet = () => setActionAssetId(null);

  let sheet = null;
  if (actionAsset) {
    const sym = actionAsset.symbol;
    const rateStr = getRateString(sym, actionAsset.rateVal);
    sheet = (
      <ActionSheet
        isOpen
        onClose={closeSheet}
        title={`${actionAsset.location || 'Cuenta'} · ${displaySymbol(sym)}`}
        subtitle={`${formatAmount(actionAsset.amount, sym)} ${displaySymbol(sym)}${sym !== 'USD' && !actionAsset.isUnrecognized ? ` · ≈ $${formatAmount(actionAsset.usdVal, 'USD')}` : ''}`}
        actions={[
          onViewMovements && {
            label: 'Ver movimientos',
            icon: <Icon name="list" />,
            onClick: () => { closeSheet(); onViewMovements(actionAsset.location); }
          },
          {
            label: 'Ajustar saldo y cuenta',
            ariaLabel: 'Ajustar saldo',
            icon: <Icon name="edit" />,
            onClick: () => { closeSheet(); onAdjustAsset?.(actionAsset); }
          },
          {
            label: 'Comparar con mi banco',
            icon: <Icon name="checkCircle" />,
            onClick: () => { closeSheet(); setIsVerifyModalOpen(true); }
          },
          {
            label: 'Eliminar',
            ariaLabel: 'Eliminar activo',
            icon: <Icon name="trash" />,
            variant: 'danger',
            onClick: () => { closeSheet(); onDeleteAsset?.(actionAsset.id, actionAsset.name, actionAsset.location); }
          }
        ].filter(Boolean)}
      >
        {rateStr && sym !== 'USD' && <div className="detail-row"><span>Precio</span><span>{rateStr}</span></div>}
        {actionAsset.isUnrecognized && (
          <div className="detail-row"><span>Precio</span><span>No lo encontramos. Ajusta la cuenta o revisa Tasas.</span></div>
        )}
      </ActionSheet>
    );
  }

  return (
    <div className="balances-view">
      <BalancesSummary
        grandTotalUsd={grandTotalUsd}
        alternateGrandTotalUsd={alternateGrandTotalUsd}
        referenceRate={referenceRate}
        rates={rates}
        ratesDetails={ratesDetails}
        auth={auth}
        onExportBackup={onExportBackup}
        onNavigateToCalculator={onNavigateToCalculator}
      />

      {/* Aviso único de tasa (reemplaza los avisos de cada tarjeta) */}
      <RateNotice
        assets={assets}
        rates={rates}
        onGoToRates={onNavigateToCalculator}
        onReviewAsset={onAdjustAsset}
        style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}
      />

      <BalancesNavigationTabs
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        setSelectedFilters={setSelectedFilters}
        onAddAsset={onAddAsset}
      />

      {assets.length === 0 && (
        <EmptyState icon="🏦" message="Aún no tienes cuentas. Toca «+ Cuenta» para crear la primera." />
      )}

      {groups.map(group => (
        <section key={group.key} className="list-section">
          <div className="list-section-header">
            <span className="list-section-title">{byCurrency ? displaySymbol(group.key) : group.key}</span>
            <span className="list-section-total">
              {byCurrency && group.key !== 'USD'
                ? `${formatAmount(group.totalAmount, group.key)} · ≈ $${formatAmount(group.totalUsd, 'USD')}`
                : `$${formatAmount(group.totalUsd, 'USD')}`}
            </span>
          </div>
          <div className="list-card">
            {group.items.map(row => (
              <AccountRow
                key={row.id}
                row={row}
                showLocation={byCurrency}
                onOpen={() => setActionAssetId(row.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {assets.length > 0 && (
        <div className="balances-footer">
          <button type="button" className="link-btn" onClick={() => setIsVerifyModalOpen(true)}>
            Comparar con mi banco
          </button>
        </div>
      )}

      {sheet}

      <VerifyBalancesModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        assets={assets}
        transactions={transactions}
        onAdjustBalance={onAdjustBalance}
      />
    </div>
  );
}
