import { useMemo } from 'react';
import { summarizeExchanges } from '../../../domain/exchanges';
import { formatAmount, formatNumber } from '../../../utils/formatters';
import { formatFriendlyDate } from '../../../utils/dates';
import { EmptyState, ListRow } from '../../ui';

function SummaryCard({ title, data, verb }) {
  if (!data.count) return null;
  return (
    <div className="exchange-summary-card">
      <span className="exchange-summary-title">{title}</span>
      <span className="exchange-summary-rate">{formatNumber(data.avgRate, 2)} Bs.</span>
      <span className="exchange-summary-sub">
        promedio por divisa · {verb} {formatAmount(data.foreignTotal, 'USD')} en {data.count} {data.count === 1 ? 'cambio' : 'cambios'}
      </span>
    </div>
  );
}

/**
 * "Mis cambios": a qué tasa cambiaste tus divisas, comparado con el BCV.
 */
export default function MyExchangesView({ transactions = [] }) {
  const summary = useMemo(() => summarizeExchanges(transactions, { days: 30 }), [transactions]);

  if (summary.items.length === 0) {
    return (
      <EmptyState
        icon="💱"
        message="Aún no tienes cambios. Cuando registres una transferencia de dólares a bolívares (o al revés), aquí verás a qué tasa cambiaste."
      />
    );
  }

  return (
    <div className="my-exchanges">
      <div className="exchange-summary">
        <SummaryCard title="Vendiste a" data={summary.sold} verb="vendiste" />
        <SummaryCard title="Compraste a" data={summary.bought} verb="compraste" />
        {!summary.sold.count && !summary.bought.count && (
          <p className="page-subtitle">No hiciste cambios en los últimos {summary.days} días.</p>
        )}
      </div>
      <p className="page-subtitle" style={{ margin: 'var(--space-1) 0 var(--space-3)' }}>Promedios de los últimos {summary.days} días.</p>

      <div className="list-card">
        {summary.items.slice(0, 30).map(item => {
          const sold = item.direction === 'sell';
          const diff = item.bcvDiffPct;
          return (
            <ListRow
              key={item.id}
              title={sold
                ? `Vendiste ${formatAmount(item.foreignAmount, item.foreign)} ${item.foreign}`
                : `Compraste ${formatAmount(item.foreignAmount, item.foreign)} ${item.foreign}`}
              sub={[
                `${formatAmount(item.vesAmount, 'VES')} Bs.`,
                formatFriendlyDate(item.date),
                item.from && item.to ? `${item.from} → ${item.to}` : null
              ].filter(Boolean).join(' · ')}
              value={`${formatNumber(item.rate, 2)} Bs.`}
              valueSub={diff != null ? `${diff >= 0 ? '+' : ''}${formatNumber(diff, 1)}% vs BCV` : (sold ? 'Venta' : 'Compra')}
            />
          );
        })}
      </div>
    </div>
  );
}
