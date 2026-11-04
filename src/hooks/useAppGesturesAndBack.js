import { useRef, useCallback, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';

export function useAppGesturesAndBack({
  isAnyModalActive,
  confirmConfig,
  setConfirmConfig,
  modalState,
  currentPage,
  setCurrentPage,
  previousPageRef,
  planningSubTab,
  setPlanningSubTab,
  selectedShoppingListId,
  setSelectedShoppingListId,
  mainTabs = ['dashboard', 'transactions', 'balances', 'planning', 'rates']
}) {
  const closeModalIfOpen = useCallback(() => {
    if (confirmConfig?.isOpen) {
      if (confirmConfig.onCancel) confirmConfig.onCancel();
      else if (setConfirmConfig) setConfirmConfig(null);
      return true;
    }
    // Hojas de acciones abiertas (movimientos y obligaciones)
    if (modalState.actionTxId) {
      modalState.setActionTxId(null);
      return true;
    }
    if (modalState.actionObId) {
      modalState.setActionObId(null);
      return true;
    }
    if (modalState.isFabExpanded) {
      modalState.setIsFabExpanded(false);
      return true;
    }
    if (modalState.deleteMode) {
      modalState.setDeleteMode(false);
      modalState.setSelectedTxs([]);
      return true;
    }
    if (modalState.isReportsModalOpen) {
      modalState.setIsReportsModalOpen(false);
      return true;
    }
    if (modalState.isSecurityModalOpen) {
      modalState.setIsSecurityModalOpen(false);
      return true;
    }
    if (modalState.isAuthModalOpen) {
      modalState.setIsAuthModalOpen(false);
      return true;
    }
    if (modalState.isBudgetModalOpen) {
      modalState.setIsBudgetModalOpen(false);
      return true;
    }
    if (modalState.isGoalModalOpen || modalState.editingGoal) {
      modalState.setIsGoalModalOpen(false);
      modalState.setEditingGoal(null);
      return true;
    }
    if (modalState.payingOb) {
      modalState.setPayingOb(null);
      return true;
    }
    if (modalState.isObModalOpen) {
      modalState.setIsObModalOpen(false);
      return true;
    }
    if (modalState.isTransferModalOpen) {
      modalState.setIsTransferModalOpen(false);
      return true;
    }
    if (modalState.txModalMode) {
      modalState.setTxModalMode(null);
      return true;
    }
    if (modalState.adjustingAsset) {
      modalState.setAdjustingAsset(null);
      return true;
    }
    if (modalState.isAssetModalOpen) {
      modalState.setIsAssetModalOpen(false);
      return true;
    }
    return false;
  }, [confirmConfig, modalState, setConfirmConfig]);

  useEffect(() => {
    let listenerHandle = null;

    try {
      if (CapApp && typeof CapApp.addListener === 'function') {
        CapApp.addListener('backButton', () => {
          if (closeModalIfOpen()) return;
          if (currentPage === 'settings') {
            setCurrentPage(previousPageRef.current && previousPageRef.current !== 'settings' ? previousPageRef.current : 'dashboard');
            return;
          }
          if (currentPage === 'categories') {
            setCurrentPage('settings');
            return;
          }
          if (currentPage === 'planning' && planningSubTab === 'compras' && selectedShoppingListId) {
            setSelectedShoppingListId(null);
            return;
          }
          if (currentPage === 'planning' && planningSubTab !== 'presupuestos') {
            setPlanningSubTab('presupuestos');
            return;
          }
          if (currentPage !== 'dashboard') {
            setCurrentPage('dashboard');
            return;
          }
          if (typeof CapApp.exitApp === 'function') {
            CapApp.exitApp();
          }
        }).then(handle => {
          listenerHandle = handle;
        }).catch(() => {});
      }
    } catch {
      // Non-native environment
    }

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [currentPage, planningSubTab, isAnyModalActive, confirmConfig, modalState, closeModalIfOpen, setCurrentPage, previousPageRef, selectedShoppingListId, setSelectedShoppingListId, setPlanningSubTab]);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(0);

  const handleTouchStart = (e) => {
    if (isAnyModalActive) return;
    const target = e.target;
    if (target.closest('input, textarea, select, button, .recharts-wrapper, [data-no-swipe]')) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const elapsedTime = Date.now() - touchStartTime.current;

    touchStartX.current = null;
    touchStartY.current = null;

    if (elapsedTime < 500 && Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const currentIndex = mainTabs.indexOf(currentPage);
      if (currentIndex !== -1) {
        if (deltaX < 0 && currentIndex < mainTabs.length - 1) {
          setCurrentPage(mainTabs[currentIndex + 1]);
        } else if (deltaX > 0 && currentIndex > 0) {
          setCurrentPage(mainTabs[currentIndex - 1]);
        }
      }
    }
  };

  return {
    handleTouchStart,
    handleTouchEnd
  };
}
