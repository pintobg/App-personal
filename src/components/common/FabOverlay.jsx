import FabAction from './FabAction';
import { todayLocal } from '../../utils/dates';

export default function FabOverlay({
  currentPage,
  deleteMode,
  selectedTxs = [],
  handleBulkDelete,
  setDeleteMode,
  setSelectedTxs,
  isFabExpanded,
  setIsFabExpanded,
  setTxModalMode,
  setNewTx,
  setIsTransferModalOpen,
  setAssetInitialType,
  setIsAssetModalOpen,
  onAddShoppingItem
}) {
  if (deleteMode) {
    return (
      <div className="bulk-delete-bar">
        <button
          type="button"
          aria-label="Confirmar eliminación múltiple"
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
          aria-label="Cancelar eliminación múltiple"
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

      {isFabExpanded && (
        <div className="fab-menu">
          {/* 1. Gasto */}
          <FabAction
            variant="danger"
            label="Gasto"
            onClick={() => {
              setTxModalMode?.('form');
              setNewTx?.({
                id: '',
                assetId: '',
                type: 'spent',
                currency: '',
                amount: '',
                origin: '',
                category: '',
                subcategory: '',
                date: todayLocal()
              });
              setIsFabExpanded?.(false);
            }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            }
          />

          {/* 2. Ingreso */}
          <FabAction
            variant="success"
            label="Ingreso"
            onClick={() => {
              setTxModalMode?.('form');
              setNewTx?.({
                id: '',
                assetId: '',
                type: 'income',
                currency: '',
                amount: '',
                origin: '',
                category: '',
                subcategory: '',
                date: todayLocal()
              });
              setIsFabExpanded?.(false);
            }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            }
          />

          {/* 3. Transferencia o cambio */}
          <FabAction
            variant="info"
            label="Transferencia o cambio"
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

          {/* 4. Cuenta o activo nuevo */}
          {setIsAssetModalOpen && (
            <FabAction
              variant="accent"
              label="Cuenta o activo"
              onClick={() => {
                setAssetInitialType?.('fiat');
                setIsAssetModalOpen(true);
                setIsFabExpanded(false);
              }}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
              }
            />
          )}

          {/* 5. Artículo a lista de compras */}
          <FabAction
            variant="warning"
            label="Artículo a lista de compras"
            onClick={() => {
              setIsFabExpanded(false);
              if (onAddShoppingItem) {
                onAddShoppingItem();
              }
            }}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
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
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: 'transform 0.25s ease',
            transform: isFabExpanded ? 'rotate(45deg)' : 'none'
          }}
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </>
  );
}
