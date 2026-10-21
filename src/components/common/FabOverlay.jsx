import FabAction from './FabAction';
import { todayLocal } from '../../utils/dates';

export default function FabOverlay({
  currentPage,
  deleteMode,
  selectedTxs,
  handleBulkDelete,
  setDeleteMode,
  setSelectedTxs,
  isFabExpanded,
  setIsFabExpanded,
  setTxModalMode,
  setNewTx,
  setIsTransferModalOpen,
  setNewOb,
  setIsObModalOpen,
  setAssetInitialType,
  setIsAssetModalOpen
}) {
  if (currentPage === 'dashboard' || currentPage === 'calculator') {
    return null;
  }

  if (deleteMode) {
    return (
      <div className="bulk-delete-bar">
        <button
          type="button"
          className="bulk-delete-btn confirm"
          onClick={handleBulkDelete}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {selectedTxs.length > 0 && (
            <span className="bulk-delete-badge">
              {selectedTxs.length}
            </span>
          )}
        </button>
        <button
          type="button"
          className="bulk-delete-btn cancel"
          onClick={() => { setDeleteMode(false); setSelectedTxs([]); }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    );
  }

  return (
    <>
      {isFabExpanded && (
        <div
          className="fab-backdrop"
          onClick={() => setIsFabExpanded(false)}
        />
      )}

      {currentPage === 'transactions' && isFabExpanded && (
        <div className="fab-menu">
          <FabAction
            variant="success"
            label="Ingreso"
            onClick={() => {
              setTxModalMode('form');
              setNewTx({ id: '', assetId: '', type: 'income', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal() });
              setIsFabExpanded(false);
            }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            }
          />

          <FabAction
            variant="info"
            label="Transferencia / Cambio"
            onClick={() => {
              setIsTransferModalOpen(true);
              setIsFabExpanded(false);
            }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
            }
          />

          <FabAction
            variant="danger"
            label="Gasto"
            onClick={() => {
              setTxModalMode('form');
              setNewTx({ id: '', assetId: '', type: 'spent', currency: '', amount: '', origin: '', category: '', subcategory: '', date: todayLocal() });
              setIsFabExpanded(false);
            }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            }
          />
        </div>
      )}

      {currentPage === 'obligations' && isFabExpanded && (
        <div className="fab-menu">
          <FabAction
            variant="danger"
            label="Deuda por pagar"
            onClick={() => {
              setNewOb({ id: '', type: 'pay', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0 });
              setIsObModalOpen(true);
              setIsFabExpanded(false);
            }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />

          <FabAction
            variant="success"
            label="Cobro pendiente"
            onClick={() => {
              setNewOb({ id: '', type: 'receive', title: '', amount: '', currency: 'USD', frequency: 'monthly', category: 'Otros', dueDate: todayLocal(), totalInstallments: '', paidInstallments: 0 });
              setIsObModalOpen(true);
              setIsFabExpanded(false);
            }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          />
        </div>
      )}

      {currentPage === 'balances' && isFabExpanded && (
        <div className="fab-menu">
          <FabAction
            variant="success"
            label="Cuenta Bancaria / Efectivo"
            onClick={() => {
              setAssetInitialType('fiat');
              setIsAssetModalOpen(true);
              setIsFabExpanded(false);
            }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="2" x2="12" y2="22"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            }
          />

          <FabAction
            variant="info"
            label="Criptomoneda / Token"
            onClick={() => {
              setAssetInitialType('crypto');
              setIsAssetModalOpen(true);
              setIsFabExpanded(false);
            }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2-5.155-.909m5.155.91-.348 1.97M7.076 11.153l-3.94-.694m3.94.694 1.216-6.894m-1.216 6.894L5.86 18.047m1.216-6.894L4.86 6.279"></path>
              </svg>
            }
          />
        </div>
      )}

      <button
        className={`fab-btn ${isFabExpanded ? 'expanded' : ''}`}
        onClick={() => setIsFabExpanded(!isFabExpanded)}
        aria-label="Acciones rápidas"
        style={{
          position: 'fixed',
          bottom: 'calc(60px + env(safe-area-inset-bottom))',
          right: '1.25rem',
          zIndex: 80
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.25s ease', transform: isFabExpanded ? 'rotate(45deg)' : 'none' }}>
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </>
  );
}
