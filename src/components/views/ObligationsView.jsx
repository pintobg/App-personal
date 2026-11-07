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

    const curr = actionOb.currency;
    const hasPlan = breakdown.totalInstallments > 1;
    const remainingBs = !done && breakdown.remainingAmount > 0
      ? getIndexedBsInfo({ ...actionOb, amount: breakdown.remainingAmount })
      : null;
    const heroLabel = done
      ? (isReceive ? 'Cobrado' : 'Pagado')
      : breakdown.isOpenEnded
        ? 'Próximo pago'
        : (isReceive ? 'Falta por cobrar' : 'Falta por pagar');
    const heroAmount = done ? (breakdown.totalAmount ?? breakdown.paidAmount) : breakdown.remainingAmount;
    const rateName = { BCV_USD: 'BCV', BCV_EUR: 'BCV euro', EUR: 'BCV euro', PARALELO: 'paralelo' }[actionOb.indexRateType] || 'BCV';

    const extraRows = [
      hasPlan && { label: 'Total de la deuda', value: money(breakdown.totalAmount, curr) },
      breakdown.purchaseTotal != null && { label: 'Compra original', value: money(breakdown.purchaseTotal, curr) },
      breakdown.downPayment > 0 && { label: 'Inicial pagada', value: money(breakdown.downPayment, curr) },
      { label: 'Frecuencia', value: translateFrequency(actionOb.frequency) },
      actionOb.payInBs && { label: 'Se paga en Bs.', value: `Tasa ${rateName} del día` },
      !done && { label: 'Recordatorio', value: actionOb.reminderEnabled !== false ? 'Activo, 9:00 a. m.' : 'Desactivado' }
    ].filter(Boolean);

    sheet = (
      <ActionSheet
        isOpen
        onClose={closeSheet}
        title={actionOb.title}
        subtitle={translateCategory(actionOb.category) || undefined}
        actions={actions}
      >
        {/* 1. Lo más importante: cuánto falta */}
        <div className="ob-hero">
          <span className="ob-hero-label">{heroLabel}</span>
          <span className={`ob-hero-amount ${isReceive ? 'income' : 'expense'}`}>{money(heroAmount, curr)}</span>
          {remainingBs && !breakdown.isOpenEnded && (
            <span className="ob-hero-sub">≈ Bs. {formatAmount(remainingBs.bsAmount, 'VES')} con la tasa {rateName} de hoy</span>
          )}
          {hasPlan && (
            <>
              <span className="ob-hero-bar" aria-hidden="true">
                <span className={`ob-hero-bar-fill ${isReceive ? 'receive' : 'pay'}`} style={{ width: `${Math.round((breakdown.progress || 0) * 100)}%` }} />
              </span>
              <span className="ob-hero-sub">
                {breakdown.paidInstallments} de {breakdown.totalInstallments} cuotas {isReceive ? 'cobradas' : 'pagadas'} · {money(breakdown.paidAmount, curr)} {isReceive ? 'cobrado' : 'pagado'}
              </span>
            </>
          )}
          {breakdown.isOpenEnded && (
            <span className="ob-hero-sub">Se repite sin fecha de fin · {breakdown.paidInstallments} {breakdown.paidInstallments === 1 ? 'pago hecho' : 'pagos hechos'}</span>
          )}
        </div>

        {/* 2. Próximo pago con su fecha y equivalente en Bs. */}
        {!done && (hasPlan || breakdown.isOpenEnded || actionOb.dueDate) && (
          <div className="ob-next">
            <div className="ob-next-main">
              <span className="ob-next-label">{hasPlan ? 'Próxima cuota' : (isReceive ? 'Próximo cobro' : 'Próximo pago')}</span>
              {actionOb.dueDate && <span className={`ob-next-date${dueClass(formatDueLabel(actionOb.dueDate))}`}>{formatDueLabel(actionOb.dueDate)}</span>}
            </div>
            <div className="ob-next-value">
              <span className="ob-next-amount">{money(breakdown.perPayment, curr)}</span>
              {info && <span className="ob-next-sub">≈ Bs. {formatAmount(info.bsAmount, 'VES')}</span>}
            </div>
          </div>
        )}

        {/* 3. Detalles secundarios */}
        <dl className="ob-details">
          {extraRows.map(r => (
            <div key={r.label} className="ob-details-row">
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
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
