import { useMemo, useState } from 'react';
import { formatDueLabel } from '../../utils/dates';
import EmptyState from '../common/EmptyState';
import { ActionSheet, Icon } from '../ui';
import { translateCategory, translateFrequency, formatAmount } from '../../utils/formatters';
import { isObligationCompleted, getIndexedBsInfo as getIndexedInfoUtil } from '../../domain/obligations';

function dueClass(label) {
  if (label.startsWith('Vencido')) return ' danger';
  if (label === 'Vence hoy') return ' warning';
  return '';
}

function ObligationRow({ ob, kind, indexedInfo, onOpen }) {
  const due = ob.dueDate ? formatDueLabel(ob.dueDate) : '';
  const subParts = [];
  if (kind !== 'done' && due) subParts.push(due);
  if (ob.totalInstallments) subParts.push(`${ob.paidInstallments || 0} de ${ob.totalInstallments} cuotas`);
  if (!subParts.length) subParts.push(translateCategory(ob.category) || translateFrequency(ob.frequency));
  const sign = kind === 'receive' ? '+' : '−';
  const amountClass = kind === 'done' ? 'neutral' : (kind === 'receive' ? 'income' : 'expense');

  return (
    <button type="button" className="list-row" onClick={() => onOpen(ob.id)} aria-label={`${ob.title}, ${subParts.join(', ')}`}>
      <span className="list-row-main">
        <span className="list-row-title">{ob.title}</span>
        <span className={`list-row-sub${kind !== 'done' ? dueClass(due) : ''}`}>{subParts.join(' · ')}</span>
      </span>
      <span className="list-row-value">
        <span className={`amount ${amountClass}`}>{sign}{formatAmount(ob.amount, ob.currency)} {(ob.currency || '').toUpperCase()}</span>
        {indexedInfo && <span className="amount-sub">{indexedInfo.text}</span>}
      </span>
    </button>
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
  const actionOb = useMemo(() => obligations.find(o => o.id === actionObId) || null, [obligations, actionObId]);
  const closeSheet = () => setActionObId(null);
  const openSheet = (id) => setActionObId(id);

  let sheet = null;
  if (actionOb) {
    const done = isCompleted(actionOb);
    const isReceive = actionOb.type === 'receive';
    const info = getIndexedBsInfo(actionOb);
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
        title={`${actionOb.title} · ${formatAmount(actionOb.amount, actionOb.currency)} ${(actionOb.currency || '').toUpperCase()}`}
        subtitle={[actionOb.dueDate && !done ? formatDueLabel(actionOb.dueDate) : null, translateCategory(actionOb.category)].filter(Boolean).join(' · ')}
        actions={actions}
      >
        <div className="detail-row"><span>Frecuencia</span><span>{translateFrequency(actionOb.frequency)}</span></div>
        {actionOb.totalInstallments && (
          <div className="detail-row"><span>Cuotas</span><span>{actionOb.paidInstallments || 0} de {actionOb.totalInstallments}</span></div>
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
