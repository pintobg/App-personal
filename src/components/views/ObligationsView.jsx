import EmptyState from '../common/EmptyState';
import { translateCategory, translateFrequency, getCurrencySymbol, formatAmount } from '../../utils/formatters';

export default function ObligationsView({
  obligations,
  flippedObId,
  setFlippedObId,
  onEdit,
  onPay,
  onDelete
}) {
  const pendingPay = obligations.filter(ob => ob.type === 'pay' && (!ob.totalInstallments || Number(ob.paidInstallments) < Number(ob.totalInstallments)));
  const pendingReceive = obligations.filter(ob => ob.type === 'receive' && (!ob.totalInstallments || Number(ob.paidInstallments) < Number(ob.totalInstallments)));
  const completedHistory = obligations.filter(ob => ob.totalInstallments && Number(ob.paidInstallments) >= Number(ob.totalInstallments));

  return (
    <div className="view-container" style={{ padding: '0 1rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ padding: 0, color: '#fff', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>Por Pagar</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {pendingPay.length === 0 && <EmptyState icon="📝" message="No hay obligaciones pendientes" />}
        {pendingPay.map(ob => (
          <div
            key={ob.id}
            className={`tx-flip-container ${flippedObId === ob.id ? 'flipped' : ''}`}
          >
            <div className="tx-flip-inner" onClick={() => setFlippedObId(flippedObId === ob.id ? null : ob.id)}>
              <div className="tx-flip-front glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ob.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#98989d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {translateCategory(ob.category)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>
                    -{getCurrencySymbol(ob.currency)}{formatAmount(ob.amount, ob.currency)} {ob.currency.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      title="Editar"
                      style={{ background: '#f59e0b', border: 'none', color: '#fff', fontSize: '0.75rem', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); onEdit(ob); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button
                      title="Pagar"
                      style={{ background: '#3b82f6', border: 'none', color: '#fff', fontSize: '0.75rem', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); onPay(ob); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </button>
                    <button
                      title="Eliminar"
                      style={{ background: '#311b22', border: '1px solid #4d2631', color: '#ef4444', fontSize: '0.75rem', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); onDelete(ob.id, '¿Eliminar esta obligación?'); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                </div>
              </div>
              <div className="tx-flip-back glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px', gap: '0.5rem' }}>
                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>Detalles de la Deuda</div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Frecuencia: {translateFrequency(ob.frequency)}</div>
                {ob.totalInstallments && (
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Progreso: {ob.paidInstallments || 0} de {ob.totalInstallments} pagos</div>
                )}
                {ob.dueDate && (
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const due = new Date(ob.dueDate);
                      due.setHours(0, 0, 0, 0);
                      const diffTime = due - today;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) return <span style={{ color: '#ef4444' }}>Vencido hace {Math.abs(diffDays)} día(s)</span>;
                      if (diffDays === 0) return <span style={{ color: '#f59e0b' }}>Vence HOY</span>;
                      return `Vence en ${diffDays} día(s)`;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ width: '50%', margin: '0 auto 2rem', borderBottom: '1px solid #2a3447' }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ padding: 0, color: '#f1f5f9', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>Por Cobrar</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {pendingReceive.length === 0 && <EmptyState icon="🤝" message="No hay créditos pendientes" />}
        {pendingReceive.map(ob => (
          <div
            key={ob.id}
            className={`tx-flip-container ${flippedObId === ob.id ? 'flipped' : ''}`}
          >
            <div className="tx-flip-inner" onClick={() => setFlippedObId(flippedObId === ob.id ? null : ob.id)}>
              <div className="tx-flip-front glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ob.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {translateCategory(ob.category)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>
                    +{getCurrencySymbol(ob.currency)}{formatAmount(ob.amount, ob.currency)} {ob.currency.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      title="Editar"
                      style={{ background: '#f59e0b', border: 'none', color: '#fff', fontSize: '0.75rem', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); onEdit(ob); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button
                      title="Recibir"
                      style={{ background: '#3b82f6', border: 'none', color: '#fff', fontSize: '0.75rem', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); onPay(ob); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </button>
                    <button
                      title="Eliminar"
                      style={{ background: '#311b22', border: '1px solid #4d2631', color: '#ef4444', fontSize: '0.75rem', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); onDelete(ob.id, '¿Eliminar esta obligación?'); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                </div>
              </div>
              <div className="tx-flip-back glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px', gap: '0.5rem' }}>
                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>Detalles de Crédito</div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Frecuencia: {translateFrequency(ob.frequency)}</div>
                {ob.totalInstallments && (
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Progreso: {ob.paidInstallments || 0} de {ob.totalInstallments} pagos</div>
                )}
                {ob.dueDate && (
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const due = new Date(ob.dueDate);
                      due.setHours(0, 0, 0, 0);
                      const diffTime = due - today;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) return <span style={{ color: '#ef4444' }}>Vencido hace {Math.abs(diffDays)} día(s)</span>;
                      if (diffDays === 0) return <span style={{ color: '#f59e0b' }}>Vence HOY</span>;
                      return `Vence en ${diffDays} día(s)`;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ width: '50%', margin: '0 auto 2rem', borderBottom: '1px solid #2a3447' }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ padding: 0, color: '#f1f5f9', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>Historial (Pagado)</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {completedHistory.length === 0 && <EmptyState icon="✅" message="Sin historial de pagos completados" />}
        {completedHistory.map(ob => (
          <div
            key={ob.id}
            className={`tx-flip-container ${flippedObId === ob.id ? 'flipped' : ''}`}
          >
            <div className="tx-flip-inner" onClick={() => setFlippedObId(flippedObId === ob.id ? null : ob.id)}>
              <div className="tx-flip-front glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px', opacity: 0.65 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                      {ob.title}
                      <span style={{ marginLeft: '0.5rem', background: '#10b981', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Pagado</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {translateCategory(ob.category)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: ob.type === 'pay' ? '#ef4444' : '#10b981' }}>
                    {ob.type === 'pay' ? '-' : '+'}{getCurrencySymbol(ob.currency)}{formatAmount(ob.amount, ob.currency)} {ob.currency.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      title="Editar"
                      style={{ background: '#f59e0b', border: 'none', color: '#fff', fontSize: '0.75rem', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); onEdit(ob); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button
                      title="Eliminar"
                      style={{ background: '#311b22', border: '1px solid #4d2631', color: '#ef4444', fontSize: '0.75rem', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={(e) => { e.stopPropagation(); onDelete(ob.id, '¿Eliminar esto del historial?'); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                </div>
              </div>
              <div className="tx-flip-back glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem 1.15rem', borderRadius: '16px', gap: '0.5rem', opacity: 0.8 }}>
                <div style={{ fontWeight: 600, color: '#fff' }}>Detalles de Historial</div>
                <div style={{ fontSize: '0.875rem', color: '#98989d' }}>Frecuencia: {translateFrequency(ob.frequency)}</div>
                <div style={{ fontSize: '0.875rem', color: '#10b981' }}>Completado: {ob.totalInstallments} pagos</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
