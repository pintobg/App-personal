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

  it('executeTransfer: calcula tasa efectiva y comparativa con BCV al cambiar monedas distintas (ej. USDT a VES)', () => {
    const state = {
      assets: initialAssets,
      transactions: [],
      rates: {
        USDT: 1,
        VES: 50,
        bcvUsd: 50,
        paralelo: 55
      }
    };
    const payload = {
      sourceAssetId: 'ast-3', // 300 USDT
      destAssetId: 'ast-2',   // 20000 VES
      amountDeducted: '100',
      amountReceived: '5200', // 52 Bs por USDT
      hasCommission: false,
      commissionAmount: '0'
    };

    const result = executeTransfer(state, payload);
    expect(result.success).toBe(true);
    const transferTx = result.nextTransactions[0];
    expect(transferTx.effectiveRate).toBe(52);
    expect(transferTx.effectiveRateData).toBeDefined();
    expect(transferTx.effectiveRateData.unitText).toBe('Bs./USDT');
    // Con BCV a 50, (52 - 50) / 50 = +4.00%
    expect(transferTx.effectiveRateData.bcvDiffPct).toBe(4);
    // Con Paralelo a 55, (52 - 55) / 55 = -5.45%
    expect(transferTx.effectiveRateData.paraleloDiffPct).toBe(-5.45);
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

  it('executeAddOrEditTransaction: un pago de $20 con IGTF (3%) genera el IGTF de $0,60 vinculado y debita $20,60', () => {
    const assets = [
      { id: 'ast-usd', name: 'USD', location: 'Zelle', amount: 100, appliesIgtf: true, igtfPercent: 3 }
    ];
    const state = { assets, transactions: [], rates: { USD: 1 } };
    const payload = {
      type: 'spent',
      assetId: 'ast-usd',
      currency: 'USD',
      origin: 'Zelle',
      amount: '20',
      category: 'Compras',
      subcategory: 'Supermercado',
      includeIgtf: true,
      igtfAmount: '0.60'
    };

    const result = executeAddOrEditTransaction(state, payload);
    expect(result.success).toBe(true);
    // Saldo: 100 - (20 + 0.60) = 79.40
    expect(result.nextAssets.find((a) => a.id === 'ast-usd').amount).toBe(79.4);
    expect(result.nextTransactions).toHaveLength(2);

    const mainTx = result.nextTransactions.find((t) => !t.parentTransactionId);
    const igtfTx = result.nextTransactions.find((t) => t.parentTransactionId === mainTx.id);

    expect(mainTx.amount).toBe(20);
    expect(igtfTx).toBeDefined();
    expect(igtfTx.amount).toBe(0.6);
    expect(igtfTx.category).toBe('Impuestos');
    expect(igtfTx.subcategory).toContain('IGTF');
    expect(igtfTx.parentTransactionId).toBe(mainTx.id);

    // Si luego se borra el gasto principal con executeBulkDelete, también se borra el IGTF y se repone 20.60
    const deleteResult = executeBulkDelete({ assets: result.nextAssets, transactions: result.nextTransactions }, [mainTx]);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.nextAssets.find((a) => a.id === 'ast-usd').amount).toBe(100);
    expect(deleteResult.nextTransactions).toHaveLength(0);
  });

  it('executeAddOrEditTransaction: guarda campos opcionales de Pago Móvil en VES', () => {
    const assets = [
      { id: 'ast-ves', name: 'VES', location: 'Banesco', amount: 5000 }
    ];
    const state = { assets, transactions: [], rates: { VES: 50 } };
    const payload = {
      type: 'spent',
      assetId: 'ast-ves',
      currency: 'VES',
      origin: 'Banesco',
      amount: '500',
      category: 'Servicios',
      subcategory: 'Luz',
      paymentMethod: 'Pago Móvil',
      referenceNumber: '849201',
      bank: 'Banesco',
      recipientId: 'V-19876543'
    };

    const result = executeAddOrEditTransaction(state, payload);
    expect(result.success).toBe(true);
    const tx = result.nextTransactions[0];
    expect(tx.paymentMethod).toBe('Pago Móvil');
    expect(tx.referenceNumber).toBe('849201');
    expect(tx.bank).toBe('Banesco');
    expect(tx.recipientId).toBe('V-19876543');
  });
});
