import { useEffect, useRef } from 'react';
import FabAction from './FabAction';
import BulkActionBar from './BulkActionBar';
import { todayLocal } from '../../utils/dates';

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;

const emptyTx = (type) => ({
  id: '',
  assetId: '',
  type,
  currency: '',
  amount: '',
  origin: '',
  category: '',
  subcategory: '',
  date: todayLocal()
});

export default function FabOverlay({
  currentPage: _currentPage,
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
  onAddShoppingItem,
  showToast
}) {
  const pressTimer = useRef(null);
  const pressStart = useRef(null);
  const longPressFired = useRef(false);

  useEffect(() => () => clearTimeout(pressTimer.current), []);

  // Aviso único: explica el nuevo comportamiento del botón +
  useEffect(() => {
    if (deleteMode || !showToast) return;
    try {
      if (localStorage.getItem('fab_hint_seen')) return;
      localStorage.setItem('fab_hint_seen', '1');
    } catch { return; }
    const t = setTimeout(() => showToast('Toca + para un gasto. Mantén pulsado para más opciones.'), 1200);
    return () => clearTimeout(t);
  }, [deleteMode, showToast]);

  const openExpense = () => {
    setTxModalMode?.('form');
    setNewTx?.(emptyTx('spent'));
    setIsFabExpanded?.(false);
  };

  const handlePointerDown = (e) => {
    longPressFired.current = false;
    pressStart.current = { x: e.clientX, y: e.clientY };
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setIsFabExpanded?.(true);
      if (navigator.vibrate) { try { navigator.vibrate(15); } catch { /* sin vibración */ } }
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e) => {
    if (!pressStart.current) return;
    const dx = Math.abs(e.clientX - pressStart.current.x);
    const dy = Math.abs(e.clientY - pressStart.current.y);
    if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) clearTimeout(pressTimer.current);
  };

  const cancelPress = () => {
    clearTimeout(pressTimer.current);
    pressStart.current = null;
  };

  const handleFabClick = () => {
    cancelPress();
    if (longPressFired.current) { longPressFired.current = false; return; }
    if (isFabExpanded) { setIsFabExpanded(false); return; }
    openExpense();
  };

  if (deleteMode) {
    return (
      <BulkActionBar
        selectedTxs={selectedTxs}
        onDelete={handleBulkDelete}
        onExit={() => { setDeleteMode(false); setSelectedTxs([]); }}
      />
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
          {/* 2. Ingreso */}
          <FabAction
            variant="success"
            label="Ingreso"
            onClick={() => {
              setTxModalMode?.('form');
              setNewTx?.(emptyTx('income'));
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
        type="button"
        className={`fab-more-btn ${isFabExpanded ? 'expanded' : ''}`}
        onClick={() => setIsFabExpanded(!isFabExpanded)}
        aria-label="Más acciones"
        aria-expanded={isFabExpanded}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFabExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>

      <button
        type="button"
        className={`fab-btn ${isFabExpanded ? 'expanded' : ''}`}
        onClick={handleFabClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => clearTimeout(pressTimer.current)}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={e => e.preventDefault()}
        aria-label={isFabExpanded ? 'Cerrar acciones' : 'Nuevo gasto'}
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
