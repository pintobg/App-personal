import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TransactionsView from './TransactionsView';
import ObligationsView from './ObligationsView';
import TransactionModal from '../modals/TransactionModal';
import { executeAddOrEditTransaction, executePayObligation } from '../../domain/operations';
import { mapObToDb, mapDbToOb } from '../../services/syncService';

describe('Nuevas mejoras: Descripción de gastos, Comisiones, Deudas Cashea y Persistencia BCV', () => {
  it('1. Descripción de gastos: se guarda y se muestra de forma destacada en la tarjeta en lugar de "Gasto"', () => {
    const assets = [{ id: 'a1', name: 'USD', location: 'Efectivo', amount: 100 }];
    const txPayload = {
      type: 'spent',
      assetId: 'a1',
      amount: '25.00',
      category: 'Alimentación',
      subcategory: 'Restaurante',
      notes: 'Almuerzo con clientes',
      date: '2026-10-27'
    };

    const res = executeAddOrEditTransaction({ assets, transactions: [], rates: { USD: 1 } }, txPayload);
    expect(res.success).toBe(true);
    expect(res.nextTransactions[0].notes).toBe('Almuerzo con clientes');

    // Renderizado en TransactionsView
    render(
      <TransactionsView
        transactions={res.nextTransactions}
        assets={assets}
        txFilter="all"
        setTxFilter={vi.fn()}
        deleteMode={false}
        setDeleteMode={vi.fn()}
        selectedTxs={[]}
        toggleSelectTx={vi.fn()}
        flippedTxId={null}
        setFlippedTxId={vi.fn()}
        rates={{ USD: 1 }}
        onEdit={vi.fn()}
      />
    );

    // Debe mostrar "Almuerzo con clientes" como título principal
    expect(screen.getByText('Almuerzo con clientes')).toBeDefined();
    expect(screen.getByText(/Alimentación • Restaurante/i)).toBeDefined();
  });

  it('2. Pago de cuotas de deuda tipo Cashea: la transacción especifica el nombre de la deuda y número de cuota', () => {
    const assets = [{ id: 'a1', name: 'USD', location: 'Banesco', amount: 500 }];
    const payingOb = {
      id: 'ob-cashea-1',
      type: 'pay',
      title: 'Zapatos Traki',
      category: 'Compras',
      amount: 20,
      currency: 'USD',
      totalInstallments: '3',
      paidInstallments: 0,
      frequency: 'semi-monthly',
      dueDate: '2026-11-01'
    };

    const res = executePayObligation(
      { assets, transactions: [], obligations: [payingOb], rates: { USD: 1 }, veRates: {} },
      { payingOb, payData: { assetId: 'a1', actualAmount: '20' } }
    );

    expect(res.success).toBe(true);
    const generatedTx = res.nextTransactions[0];
    expect(generatedTx.notes).toBe('Pago deuda: Zapatos Traki (Cuota 1/3)');
    expect(generatedTx.subcategory).toBe('Zapatos Traki');

    // En TransactionsView se visualiza claramente el detalle de la cuota
    render(
      <TransactionsView
        transactions={[generatedTx]}
        assets={assets}
        txFilter="all"
        setTxFilter={vi.fn()}
        deleteMode={false}
        setDeleteMode={vi.fn()}
        selectedTxs={[]}
        toggleSelectTx={vi.fn()}
        flippedTxId={null}
        setFlippedTxId={vi.fn()}
        rates={{ USD: 1 }}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Pago deuda: Zapatos Traki (Cuota 1/3)')).toBeDefined();
  });

  it('3. Persistencia de deuda con pago en Bs. a tasa BCV: no se pierde al sincronizar o reiniciar la app', () => {
    const originalOb = {
      id: 'ob-bcv-1',
      type: 'pay',
      title: 'Nevera Daka',
      category: 'Hogar',
      amount: 150,
      currency: 'USD',
      payInBs: true,
      indexRateType: 'BCV_USD',
      isInstallmentPurchase: true,
      totalInstallments: '6',
      paidInstallments: 1
    };

    // Sincronizar a base de datos (mapObToDb)
    const dbRow = mapObToDb(originalOb, 'user-123');
    // Cargar de base de datos (mapDbToOb)
    const restoredOb = mapDbToOb(dbRow);

    expect(restoredOb.payInBs).toBe(true);
    expect(restoredOb.indexRateType).toBe('BCV_USD');
    expect(restoredOb.isInstallmentPurchase).toBe(true);
    expect(restoredOb.title).toBe('Nevera Daka');

    // En ObligationsView se muestra la equivalencia en Bs. a tasa BCV
    render(
      <ObligationsView
        obligations={[restoredOb]}
        flippedObId={null}
        setFlippedObId={vi.fn()}
        rates={{ VES: 50 }}
        veRates={{ bcvUsd: 50 }}
        onEdit={vi.fn()}
        onPay={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/Bs\.\s*7\.500,00\s*\(BCV hoy\)/i)).toBeDefined();
  });

  it('4. Casilla de comisiones disponible para cualquier gasto', () => {
    // Cuenta normal sin comisiones pre-configuradas
    const assetSinComisiones = {
      id: 'a-plain',
      name: 'VES',
      location: 'Banco de Venezuela',
      amount: 1000,
      hasTransferCommission: false,
      commissionPercent: 0,
      commissionFixed: 0,
      appliesIgtf: false
    };

    let txState = {
      id: '',
      assetId: 'a-plain',
      type: 'spent',
      currency: 'VES',
      amount: '100',
      origin: 'Banco de Venezuela',
      category: 'Servicios',
      notes: 'Recarga saldo',
      includeCommission: false,
      commissionAmount: ''
    };

    const { rerender } = render(
      <TransactionModal
        mode="form"
        onClose={vi.fn()}
        newTx={txState}
        setNewTx={(updater) => {
          txState = typeof updater === 'function' ? updater(txState) : updater;
        }}
        assets={[assetSinComisiones]}
        onSubmit={vi.fn()}
      />
    );

    // El checkbox de comisión bancaria debe estar disponible
    const commissionCheck = screen.getByLabelText(/Agregar comisión bancaria/i);
    expect(commissionCheck).toBeDefined();

    // Al marcarlo, permite ingresar el monto de la comisión
    fireEvent.click(commissionCheck);

    rerender(
      <TransactionModal
        mode="form"
        onClose={vi.fn()}
        newTx={{ ...txState, includeCommission: true, commissionAmount: '0.30' }}
        setNewTx={vi.fn()}
        assets={[assetSinComisiones]}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('0.30')).toBeDefined();

    // Verificamos que executeAddOrEditTransaction procese la comisión vinculada correctamente
    const addResult = executeAddOrEditTransaction(
      { assets: [assetSinComisiones], transactions: [], rates: { VES: 50 } },
      {
        ...txState,
        includeCommission: true,
        commissionAmount: '0.30'
      }
    );

    expect(addResult.success).toBe(true);
    // Saldo original 1000 - 100 (gasto) - 0.30 (comisión) = 899.70
    expect(addResult.nextAssets[0].amount).toBe(899.70);
    // Crea la transacción principal y la de comisión
    expect(addResult.nextTransactions.length).toBe(2);
    expect(addResult.nextTransactions[1].category).toBe('Comisiones');
    expect(addResult.nextTransactions[1].amount).toBe(0.30);
  });
});
