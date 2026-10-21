import { describe, it, expect } from 'vitest';
import {
  executeAddOrEditTransaction,
  executeTransfer,
  executePayObligation,
  executeBulkDelete
} from './operations';

describe('Domain: operations.js (Funciones puras de negocio)', () => {
  const initialAssets = [
    { id: 'ast-1', name: 'USD', location: 'Efectivo', amount: 500 },
    { id: 'ast-2', name: 'VES', location: 'Banesco', amount: 20000 },
    { id: 'ast-3', name: 'USDT', location: 'Binance', amount: 300 }
  ];

  it('executeAddOrEditTransaction: agrega un gasto y reduce el saldo del activo', () => {
    const state = { assets: initialAssets, transactions: [], rates: { USD: 1 } };
    const payload = {
      type: 'spent',
      assetId: 'ast-1',
      currency: 'USD',
      origin: 'Efectivo',
      amount: '50',
      category: 'Comida',
      subcategory: 'Almuerzo'
    };

    const result = executeAddOrEditTransaction(state, payload);
    expect(result.success).toBe(true);
    expect(result.nextAssets.find((a) => a.id === 'ast-1').amount).toBe(450);
    expect(result.nextTransactions).toHaveLength(1);
    expect(result.nextTransactions[0].amount).toBe(50);
    expect(result.syncChanges).toHaveLength(2);
  });

  it('executeAddOrEditTransaction: rechaza gasto si el saldo es insuficiente', () => {
    const state = { assets: initialAssets, transactions: [], rates: { USD: 1 } };
    const payload = {
      type: 'spent',
      assetId: 'ast-1',
      currency: 'USD',
      origin: 'Efectivo',
      amount: '1000'
    };

    const result = executeAddOrEditTransaction(state, payload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Saldo insuficiente');
  });

  it('executeTransfer: transfiere fondos entre dos cuentas con comisión', () => {
    const state = { assets: initialAssets, transactions: [], rates: { USDT: 1, USD: 1 } };
    const payload = {
      sourceAssetId: 'ast-3', // 300 USDT
      destAssetId: 'ast-1',   // 500 USD
      amountDeducted: '100',
      amountReceived: '100',
      hasCommission: true,
      commissionAmount: '2'
    };

    const result = executeTransfer(state, payload);
    expect(result.success).toBe(true);

    const source = result.nextAssets.find((a) => a.id === 'ast-3');
    const dest = result.nextAssets.find((a) => a.id === 'ast-1');

    // Origen: 300 - 100 - 2 = 198
    expect(source.amount).toBe(198);
    // Destino: 500 + 100 = 600
    expect(dest.amount).toBe(600);

    // Crea 2 transacciones: la transferencia y la comisión
    expect(result.nextTransactions).toHaveLength(2);
  });

  it('executePayObligation: registra pago de deuda, genera movimiento y avanza cuotas', () => {
    const obligations = [
      {
        id: 'ob-1',
        title: 'Préstamo',
        type: 'pay',
        amount: 50,
        currency: 'USD',
        category: 'Deudas',
        paidInstallments: 0,
        totalInstallments: 3,
        dueDate: '2026-05-15',
        frequency: 'monthly',
        status: 'pending'
      }
    ];

    const state = {
      assets: initialAssets,
      transactions: [],
      obligations,
      rates: { USD: 1 },
      veRates: { bcvUsd: 40 }
    };

    const payload = {
      payingOb: obligations[0],
      payData: {
        assetId: 'ast-1',
        actualAmount: '50',
        rateType: 'BCV_USD'
      }
    };

    const result = executePayObligation(state, payload);
    expect(result.success).toBe(true);

    // Saldo cuenta origen: 500 - 50 = 450
    expect(result.nextAssets.find((a) => a.id === 'ast-1').amount).toBe(450);
    expect(result.nextTransactions).toHaveLength(1);

    // Obligación: 1 cuota pagada
    const updatedOb = result.nextObligations.find((o) => o.id === 'ob-1');
    expect(updatedOb.paidInstallments).toBe(1);
    expect(updatedOb.status).toBe('pending');
    expect(updatedOb.dueDate).toBe('2026-06-15');
  });

  it('executeBulkDelete: elimina transacciones y revierte saldos correspondientes', () => {
    const assets = [
      { id: 'ast-1', name: 'USD', location: 'Efectivo', amount: 450 }
    ];
    const tx1 = {
      id: 'tx-1',
      assetId: 'ast-1',
      type: 'spent',
      amount: 50,
      currency: 'USD',
      origin: 'Efectivo'
    };

    const result = executeBulkDelete({ assets, transactions: [tx1] }, [tx1]);
    expect(result.success).toBe(true);
    // Al revertir el gasto de 50, el activo vuelve a 500
    expect(result.nextAssets.find((a) => a.id === 'ast-1').amount).toBe(500);
    expect(result.nextTransactions).toHaveLength(0);
  });
});
