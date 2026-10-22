import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAppModalsState } from './useAppModalsState';
import * as FinanceContext from '../context/FinanceContext';

describe('useAppModalsState - Guardar compra en cuotas con inicial', () => {
  it('registra la inicial como gasto usando parseAmount (incluso con coma "40,00")', () => {
    const saveTransaction = vi.fn();
    const addObligation = vi.fn();
    const showToast = vi.fn();
    const requestConfirm = vi.fn();

    vi.spyOn(FinanceContext, 'useFinance').mockReturnValue({
      assets: [{ id: 'acc-1', name: 'USD', location: 'Efectivo', amount: 200 }],
      saveTransaction,
      addObligation,
      updateObligation: vi.fn(),
      deleteObligation: vi.fn(),
      addAsset: vi.fn(),
      adjustAssetBalance: vi.fn(),
      deleteAsset: vi.fn(),
      payObligation: vi.fn(),
      transferFunds: vi.fn(),
      bulkDeleteTransactions: vi.fn(),
      addGoal: vi.fn(),
      updateGoal: vi.fn(),
      deleteGoal: vi.fn()
    });

    const { result } = renderHook(() => useAppModalsState(requestConfirm, showToast));

    act(() => {
      result.current.handleAddObligation(null, {
        id: '',
        type: 'pay',
        title: 'Zapatos Traki',
        amount: '20,00',
        currency: 'USD',
        frequency: 'semi-monthly',
        category: 'Ropa',
        dueDate: '2026-11-01',
        totalInstallments: '4',
        paidInstallments: 0,
        isInstallmentPurchase: true,
        totalPurchaseAmount: '120,00',
        downPayment: '40,00',
        downPaymentAssetId: 'acc-1'
      });
    });

    // Se debe haber registrado la transacción de gasto por la inicial de 40
    expect(saveTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'spent',
        amount: '40',
        assetId: 'acc-1',
        category: 'Ropa',
        subcategory: 'Inicial Zapatos Traki'
      })
    );

    // Se debe haber creado la obligación con 4 cuotas de $20
    expect(addObligation).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Zapatos Traki',
        amount: 20,
        totalInstallments: '4'
      })
    );

    // Toast de confirmación
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('Compra en cuotas creada (4 cuotas de $20) e inicial registrada')
    );
  });

  it('no permite guardar si la inicial es mayor que el monto total', () => {
    const saveTransaction = vi.fn();
    const addObligation = vi.fn();
    const showToast = vi.fn();

    vi.spyOn(FinanceContext, 'useFinance').mockReturnValue({
      assets: [],
      saveTransaction,
      addObligation,
      updateObligation: vi.fn(),
      deleteObligation: vi.fn(),
      addAsset: vi.fn(),
      adjustAssetBalance: vi.fn(),
      deleteAsset: vi.fn(),
      payObligation: vi.fn(),
      transferFunds: vi.fn(),
      bulkDeleteTransactions: vi.fn(),
      addGoal: vi.fn(),
      updateGoal: vi.fn(),
      deleteGoal: vi.fn()
    });

    const { result } = renderHook(() => useAppModalsState(vi.fn(), showToast));

    act(() => {
      result.current.handleAddObligation(null, {
        id: '',
        type: 'pay',
        title: 'Nevera',
        amount: '50,00',
        currency: 'USD',
        frequency: 'monthly',
        category: 'Hogar',
        dueDate: '2026-11-01',
        totalInstallments: '4',
        paidInstallments: 0,
        isInstallmentPurchase: true,
        totalPurchaseAmount: '100,00',
        downPayment: '120,00',
        downPaymentAssetId: 'acc-1'
      });
    });

    expect(showToast).toHaveBeenCalledWith('La inicial no puede ser mayor que el total', 'error');
    expect(saveTransaction).not.toHaveBeenCalled();
    expect(addObligation).not.toHaveBeenCalled();
  });
});
