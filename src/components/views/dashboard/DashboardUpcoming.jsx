import React from 'react';
import { formatAmount, translateCategory, formatPercent } from '../../../utils/formatters';
import { formatDueLabel } from '../../../utils/dates';

const PREVIEW_COUNT = 3;

/**
 * Próximos vencimientos: pagos, cobros y presupuestos en alerta en un solo bloque.
 * Muestra máximo 3; "Ver todos" lleva a Planificar → Deudas.
 */
export default function DashboardUpcoming({ items = [], isBalanceHidden, onSeeAll }) {
  const visible = items.slice(0, PREVIEW_COUNT);

  return (
    <section className="home-block" aria-label="Próximos vencimientos">
      <div className="home-block-header">
        <span className="form-section-label" style={{ margin: 0 }}>Próximos vencimientos</span>
        {onSeeAll && items.length > 0 && (
          <button type="button" className="link-btn" onClick={onSeeAll}>
            {items.length > PREVIEW_COUNT ? `Ver todos (${items.length})` : 'Ver todos'}
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="home-empty">Todo al día: no tienes pagos ni cobros pendientes.</div>
      ) : (
        <ul className="home-list">
          {visible.map(item => {
            if (item.kind === 'budget') {
              return (
                <li key={item.id} className="home-list-row">
                  <div className="home-list-main">
                    <div className="home-list-title">{item.isCap ? item.title : `Presupuesto: ${translateCategory(item.title)}`}</div>
                    <div className={`home-list-sub${item.overdue ? ' danger' : ''}`}>
                      {item.overdue ? 'Superaste el límite' : 'Cerca del límite'}
                    </div>
                  </div>
                  <div className={`home-list-amount ${item.overdue ? 'danger' : 'warning'}`}>
                    {formatPercent(item.percent, 0)}
                  </div>
                </li>
              );
            }
            const isPay = item.kind === 'pay';
            return (
              <li key={item.id} className="home-list-row">
                <div className="home-list-main">
                  <div className="home-list-title">{item.title}</div>
                  <div className={`home-list-sub${item.overdue ? ' danger' : ''}`}>
                    {isPay ? '' : 'Cobro · '}{formatDueLabel(item.dueDate)}
                  </div>
                </div>
                <div className={`home-list-amount ${isPay ? 'expense' : 'income'}`}>
                  {isPay ? '−' : '+'}{isBalanceHidden ? '***' : formatAmount(item.amount, item.currency)} {item.currency}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
