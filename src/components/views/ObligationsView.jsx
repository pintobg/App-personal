import { useMemo, useState } from 'react';
import { formatDueLabel } from '../../utils/dates';
import EmptyState from '../common/EmptyState';
import { ActionSheet, Icon } from '../ui';
import { translateCategory, translateFrequency, formatAmount } from '../../utils/formatters';
import { isObligationCompleted, getIndexedBsInfo as getIndexedInfoUtil, getObligationBreakdown, summarizeObligations } from '../../domain/obligations';

function dueClass(label) {
  if (label.startsWith('Vencido')) return ' danger';
  if (label === 'Vence hoy') return ' warning';
  return '';
}

function money(amount, currency) {
  const curr = (currency || 'USD').toUpperCase();
  return `${formatAmount(amount, curr)} ${curr}`;
}

function ObligationRow({ ob, kind, indexedInfo, onOpen }) {
  const due = ob.dueDate ? formatDueLabel(ob.dueDate) : '';
  const b = getObligationBreakdown(ob);
  const subParts = [];
  if (kind !== 'done' && due) subParts.push(due);
  if (!subParts.length) subParts.push(translateCategory(ob.category) || translateFrequency(ob.frequency));
  const sign = kind === 'receive' ? '+' : '−';
  const amountClass = kind === 'done' ? 'neutral' : (kind === 'receive' ? 'income' : 'expense');
  const hasPlan = kind !== 'done' && b.totalInstallments && b.totalInstallments > 1;
  // Monto principal: lo que falta por pagar. Si es en cuotas, debajo va el valor de cada cuota.
  const mainAmount = kind === 'done' ? (b.totalAmount ?? b.perPayment) : b.remainingAmount;
  const mainLabel = kind === 'done' ? 'Total' : (hasPlan ? 'Falta' : (b.isOpenEnded ? 'Próximo pago' : 'Total'));

  return (
    <button type="button" className="list-row obligation-row" onClick={() => onOpen(ob.id)} aria-label={`${ob.title}, ${mainLabel} ${money(mainAmount, ob.currency)}, ${subParts.join(', ')}`}>
      <span className="list-row-main">
        <span className="list-row-title">{ob.title}</span>
        <span className={`list-row-sub${kind !== 'done' ? dueClass(due) : ''}`}>{subParts.join(' · ')}</span>
        {hasPlan && (
          <span className="debt-plan">
            <span className="debt-progress" aria-hidden="true">
              <span className={`debt-progress-fill ${kind}`} style={{ width: `${Math.round((b.progress || 0) * 100)}%` }} />
            </span>
            <span className="debt-plan-text">{b.paidInstallments} de {b.totalInstallments} cuotas</span>
          </span>
        )}
        {kind !== 'done' && b.isOpenEnded && (
          <span className="debt-plan-text">{translateFrequency(ob.frequency)}, sin fecha de fin</span>
        )}
      </span>
      <span className="list-row-value">
        <span className="amount-label">{mainLabel}</span>
        <span className={`amount ${amountClass}`}>{sign}{money(mainAmount, ob.currency)}</span>
        {hasPlan && <span className="amount-sub">Cuota {money(b.perPayment, ob.currency)}</span>}
        {indexedInfo && <span className="amount-sub">{indexedInfo.text}</span>}
      </span>
    </button>
  );
}

function TotalsCard({ summary }) {
  const { pay, receive } = summary;
  if (pay.count === 0 && receive.count === 0) return null;
  const currencyLines = (bucket) => Object.entries(bucket.byCurrency)
    .filter(([, v]) => v > 0)
    .map(([curr, v]) => money(v, curr));
  const payLines = currencyLines(pay);
  const receiveLines = currencyLines(receive);
  const net = receive.usd - pay.usd;

  return (
    <section className="debt-summary" aria-label="Total de deudas y cobros">
      <div className="debt-summary-grid">
        <div className="debt-summary-cell">
          <span className="debt-summary-label">Debes en total</span>
          <span className="debt-summary-value expense">${formatAmount(pay.usd, 'USD')}</span>
          <span className="debt-summary-sub">
            {pay.count === 0 ? 'Sin deudas' : `${pay.count} ${pay.count === 1 ? 'deuda' : 'deudas'}`}
            {payLines.length > 1 ? ` · ${payLines.join(' + ')}` : ''}
          </span>
        </div>
        <div className="debt-summary-cell">
          <span className="debt-summary-label">Te deben</span>
          <span className="debt-summary-value income">${formatAmount(receive.usd, 'USD')}</span>
          <span className="debt-summary-sub">
            {receive.count === 0 ? 'Nadie' : `${receive.count} ${receive.count === 1 ? 'cobro' : 'cobros'}`}
            {receiveLines.length > 1 ? ` · ${receiveLines.join(' + ')}` : ''}
          </span>
        </div>
      </div>
      <div className="debt-summary-foot">
        <span>Balance neto</span>
        <span className={net < 0 ? 'expense' : 'income'}>{net < 0 ? '−' : '+'}${formatAmount(Math.abs(net), 'USD')}</span>
      </div>
      {(pay.openEnded > 0 || receive.openEnded > 0) && (
        <p className="debt-summary-note">
          Los pagos recurrentes sin número de cuotas solo suman su próximo pago. Montos en otras monedas convertidos a USD con la tasa de hoy.
        </p>
      )}
    </section>
  );
}

function Section({ title, empty, children, count }) {
  return (
    <section className="list-section">
      <div className="list-section-header">
        <span className="form-section-label" style={{ margin: 0 }}>{title}</span>
        {count > 0 && <span className="list-section-count">{count}</span>}
      </div>
      {count === 0 ? empty : <div className="list-card">{children}</div>}
    </section>
  );
}

export default function ObligationsView({
  obligations,
  actionObId,
  setActionObId,
  rates = {},
  veRates = {},
  onEdit,
  onPay,
  onDelete
}) {
  const isCompleted = isObligationCompleted;
  const pendingPay = obligations.filter(ob => ob.type === 'pay' && !isCompleted(ob));
  const pendingReceive = obligations.filter(ob => ob.type === 'receive' && !isCompleted(ob));
  const completedHistory = obligations.filter(isCompleted);
  const [showHistory, setShowHistory] = useState(false);

  const getIndexedBsInfo = (ob) => getIndexedInfoUtil(ob, rates, veRates);
  const summary = useMemo(() => summarizeObligations(obligations, { ...veRates, ...rates }), [obligations, rates, veRates]);
  const actionOb = useMemo(() => obligations.find(o => o.id === actionObId) || null, [obligations, actionObId]);
  const closeSheet = () => setActionObId(null);
  const openSheet = (id) => setActionObId(id);

  let sheet = null;
  if (actionOb) {
    const done = isCompleted(actionOb);
    const isReceive = actionOb.type === 'receive';
    const info = getIndexedBsInfo(actionOb);
    const breakdown = getObligationBreakdown(actionOb);
    const actions = [
      !done && {
        label: isReceive ? 'Registrar cobro' : 'Registrar pago',
        icon: <Icon name="checkCircle" />,
        onClick: () => { closeSheet(); onPay(actionOb); }
      },
      {
        label: 'Editar',
        ariaLabel: isReceive ? 'Editar obligación por cobrar' : 'Editar obligación',
        icon: <Icon name="edit" />,
        onClick: () => { closeSheet(); onEdit(actionOb); }
      },
      {
        label: 'Eliminar',
        ariaLabel: isReceive ? 'Eliminar obligación por cobrar' : 'Eliminar obligación',
        icon: <Icon name="trash" />,
        variant: 'danger',
        onClick: () => { closeSheet(); onDelete(actionOb.id, done ? '¿Eliminar esto del historial?' : '¿Eliminar esta obligación?'); }
      }
    ].filter(Boolean);

    sheet = (
      <ActionSheet
        isOpen
        onClose={closeSheet}
        title={actionOb.title}
        subtitle={[actionOb.dueDate && !done ? formatDueLabel(actionOb.dueDate) : null, translateCategory(actionOb.category)].filter(Boolean).join(' · ')}
        actions={actions}
      >
        <div className="detail-row"><span>Frecuencia</span><span>{translateFrequency(actionOb.frequency)}</span></div>
        {breakdown && breakdown.totalInstallments > 1 && (
          <>
            <div className="detail-row"><span>Valor de cada cuota</span><span>{money(breakdown.perPayment, actionOb.currency)}</span></div>
            <div className="detail-row"><span>Cuotas pagadas</span><span>{breakdown.paidInstallments} de {breakdown.totalInstallments}</span></div>
            <div className="detail-row"><span>Ya {isReceive ? 'cobrado' : 'pagado'}</span><span>{money(breakdown.paidAmount, actionOb.currency)}</span></div>
            <div className="detail-row"><span>Falta {isReceive ? 'por cobrar' : 'por pagar'}</span><span><strong>{money(breakdown.remainingAmount, actionOb.currency)}</strong> ({breakdown.remainingInstallments} {breakdown.remainingInstallments === 1 ? 'cuota' : 'cuotas'})</span></div>
            <div className="detail-row"><span>Total de la deuda</span><span>{money(breakdown.totalAmount, actionOb.currency)}</span></div>
          </>
        )}
        {breakdown && breakdown.totalInstallments === 1 && (
          <div className="detail-row"><span>{done ? 'Monto' : (isReceive ? 'Por cobrar' : 'Por pagar')}</span><span><strong>{money(breakdown.totalAmount, actionOb.currency)}</strong></span></div>
        )}
        {breakdown && breakdown.isOpenEnded && (
          <>
            <div className="detail-row"><span>Cada pago</span><span>{money(breakdown.perPayment, actionOb.currency)}</span></div>
            <div className="detail-row"><span>Pagos hechos</span><span>{breakdown.paidInstallments} ({money(breakdown.paidAmount, actionOb.currency)})</span></div>
            <div className="detail-row"><span>Total</span><span>Sin fin definido. Edítala y pon el número de cuotas para ver el total.</span></div>
          </>
        )}
        {breakdown && breakdown.purchaseTotal != null && (
          <div className="detail-row"><span>Compra original</span><span>{money(breakdown.purchaseTotal, actionOb.currency)}{breakdown.downPayment > 0 ? ` (inicial ${money(breakdown.downPayment, actionOb.currency)})` : ''}</span></div>
        )}
        {actionOb.payInBs && (
          <div className="detail-row"><span>Se paga en Bs.</span><span>a tasa {actionOb.indexRateType || 'BCV'}</span></div>
        )}
        {info && <div className="detail-row"><span>Equivale hoy</span><span>{info.text}</span></div>}
        {!done && (
          <div className="detail-row"><span>Recordatorio</span><span>{actionOb.reminderEnabled !== false ? 'Activo, 9:00 a. m.' : 'Desactivado'}</span></div>
        )}
      </ActionSheet>
    );
  }

  return (
    <div className="obligations-view">
      <TotalsCard summary={summary} />

      <Section
        title="Por pagar"
        count={pendingPay.length}
        empty={<EmptyState icon="📝" message="No tienes pagos pendientes" />}
      >
        {pendingPay.map(ob => (
          <ObligationRow key={ob.id} ob={ob} kind="pay" indexedInfo={getIndexedBsInfo(ob)} onOpen={openSheet} />
        ))}
      </Section>

      <Section
        title="Por cobrar"
        count={pendingReceive.length}
        empty={<EmptyState icon="🤝" message="Nadie te debe por ahora" />}
      >
        {pendingReceive.map(ob => (
          <ObligationRow key={ob.id} ob={ob} kind="receive" indexedInfo={getIndexedBsInfo(ob)} onOpen={openSheet} />
        ))}
      </Section>

      {completedHistory.length > 0 && (
        <section className="list-section">
          <button type="button" className="link-btn" onClick={() => setShowHistory(v => !v)} aria-expanded={showHistory}>
            {showHistory ? 'Ocultar pagados ▴' : `Ver pagados (${completedHistory.length}) ▾`}
          </button>
          {showHistory && (
            <div className="list-card">
              {completedHistory.map(ob => (
                <ObligationRow key={ob.id} ob={ob} kind="done" indexedInfo={null} onOpen={openSheet} />
              ))}
            </div>
          )}
        </section>
      )}

      {sheet}
    </div>
  );
}
