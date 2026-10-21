import { useMemo } from 'react';
import { verifyAllAssetsBalances } from '../../domain/balances';
import { formatAmount } from '../../utils/formatters';

export default function VerifyBalancesModal({
  isOpen,
  onClose,
  assets = [],
  transactions = [],
  onAdjustBalance
}) {
  const verificationResults = useMemo(() => {
    if (!isOpen) return [];
    return verifyAllAssetsBalances(assets, transactions);
  }, [isOpen, assets, transactions]);

  if (!isOpen) return null;

  const mismatchesCount = verificationResults.filter(r => !r.isMatch).length;
  const allMatched = mismatchesCount === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Atrás</span>
          </button>
          <h2>Verificación de Saldos</h2>
          <div style={{ width: '64px' }} />
        </div>

        {/* SUMMARY BANNER */}
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          backgroundColor: allMatched ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${allMatched ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>{allMatched ? '✅' : '⚠️'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: allMatched ? '#10b981' : '#ef4444' }}>
              {allMatched ? 'Todos los saldos coinciden' : `${mismatchesCount} cuenta(s) con diferencias`}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {allMatched
                ? 'El saldo actual de cada cuenta concuerda exactamente con su saldo inicial y movimientos.'
                : 'El saldo registrado difiere del total calculado a partir de los movimientos.'}
            </div>
          </div>
        </div>

        {/* LIST OF ACCOUNTS */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
          {verificationResults.map(result => {
            const assetObj = assets.find(a => a.id === result.assetId);
            return (
              <div
                key={result.assetId}
                style={{
                  background: '#1b2230',
                  border: `1px solid ${result.isMatch ? '#2a3447' : 'rgba(239, 68, 68, 0.4)'}`,
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem' }}>
                    {result.location} <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>({result.name})</span>
                  </div>
                  {result.isMatch ? (
                    <span style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px'
                    }}>
                      ✓ Correcto
                    </span>
                  ) : (
                    <span style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px'
                    }}>
                      Diferencia: {result.difference > 0 ? '+' : ''}{formatAmount(result.difference, result.name)}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  <div>
                    Saldo actual: <strong style={{ color: '#f1f5f9' }}>{formatAmount(result.currentAmount, result.name)} {result.name}</strong>
                  </div>
                  <div>
                    Saldo calculado: <strong style={{ color: result.isMatch ? '#10b981' : '#ef4444' }}>{formatAmount(result.calculatedAmount, result.name)} {result.name}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Base: Inicial {formatAmount(result.initialAmount, result.name)} + {result.movementsCount} movimientos registrados
                </div>

                {!result.isMatch && onAdjustBalance && assetObj && (
                  <div style={{ marginTop: '0.35rem', paddingTop: '0.45rem', borderTop: '1px solid #2a3447', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        // Aplica un ajuste para llevar el saldo al saldo calculado
                        onAdjustBalance(assetObj, -result.difference, result.calculatedAmount);
                      }}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        borderRadius: '8px',
                        background: '#312615',
                        border: '1px solid #f59e0b',
                        color: '#f59e0b',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Ajustar al saldo calculado
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
