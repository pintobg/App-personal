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

  it('executeTransfer: registra transferencia entre cuentas con fecha pasada y mantiene created_at como ahora', () => {
    const pastDate = '2026-10-15T14:30:00.000Z';
    const state = { assets: initialAssets, transactions: [], rates: { USD: 1, USDT: 1 } };
    const payload = {
      sourceAssetId: 'ast-3',
      destAssetId: 'ast-1',
      amountDeducted: '50',
      amountReceived: '50',
      hasCommission: true,
      commissionAmount: '1',
      date: pastDate
    };

    const result = executeTransfer(state, payload);
    expect(result.success).toBe(true);

    const transferTx = result.nextTransactions.find((t) => t.type === 'transfer');
    expect(transferTx.date).toBe(pastDate);
    expect(new Date(transferTx.created_at).getTime()).toBeGreaterThan(new Date(pastDate).getTime());

    const commTx = result.nextTransactions.find((t) => t.parentTransferId === transferTx.id);
    expect(commTx.date).toBe(pastDate);
  });

  it('executeTransfer: registra cambio de divisas con fecha pasada y ordena cronológicamente la lista', () => {
    const pastDate = '2026-10-12T10:00:00.000Z';
    const recentTx = {
      id: 'tx-recent',
      type: 'spent',
      amount: 10,
      currency: 'USD',
      date: '2026-10-20T12:00:00.000Z'
    };

    const state = {
      assets: initialAssets,
      transactions: [recentTx],
      rates: { USDT: 1, VES: 50, bcvUsd: 50 }
    };

    const payload = {
      sourceAssetId: 'ast-3',
      destAssetId: 'ast-2',
      amountDeducted: '20',
      amountReceived: '1000',
      date: pastDate
    };

    const result = executeTransfer(state, payload);
    expect(result.success).toBe(true);

    // Debe ordenarse descendente: primero recentTx (oct 20), luego el cambio (oct 12)
    expect(result.nextTransactions[0].id).toBe('tx-recent');
    expect(result.nextTransactions[1].date).toBe(pastDate);
    expect(result.nextTransactions[1].type).toBe('transfer');
  });

  it('executeTransfer: edita una transferencia existente actualizando ambas patas, fecha y comisiones', () => {
    // Escenario inicial: Transferencia existente de 100 USDT de ast-3 a ast-1 con 2 USDT de comisión
    // ast-3 (USDT) tenía 300 -> quedó en 198
    // ast-1 (USD) tenía 500 -> quedó en 600
    const assetsBeforeEdit = [
      { id: 'ast-1', name: 'USD', location: 'Efectivo', amount: 600 },
      { id: 'ast-2', name: 'VES', location: 'Banesco', amount: 20000 },
      { id: 'ast-3', name: 'USDT', location: 'Binance', amount: 198 }
    ];

    const initialTransferTx = {
      id: 'tx-trans-1',
      type: 'transfer',
      assetId: 'ast-3',
      destAssetId: 'ast-1',
      amount: 100,
      destAmount: 100,
      currency: 'USDT',
      destCurrency: 'USD',
      origin: 'Binance',
      destOrigin: 'Efectivo',
      commission: 2,
      date: '2026-10-10T12:00:00.000Z',
      created_at: '2026-10-10T12:00:00.000Z'
    };

    const initialCommTx = {
      id: 'tx-comm-1',
      parentTransferId: 'tx-trans-1',
      type: 'spent',
      assetId: 'ast-3',
      amount: 2,
      currency: 'USDT',
      origin: 'Binance',
      category: 'Comisiones',
      date: '2026-10-10T12:00:00.000Z',
      created_at: '2026-10-10T12:00:00.000Z'
    };

    const state = {
      assets: assetsBeforeEdit,
      transactions: [initialTransferTx, initialCommTx],
      rates: { USDT: 1, USD: 1 }
    };

    // Editamos la transferencia: ahora se transfieren 50 USDT (en vez de 100) y sin comisión,
    // y con fecha modificada al 11 de octubre
    const editPayload = {
      id: 'tx-trans-1',
      sourceAssetId: 'ast-3',
      destAssetId: 'ast-1',
      amountDeducted: '50',
      amountReceived: '50',
      hasCommission: false,
      commissionAmount: '0',
      date: '2026-10-11T16:00:00.000Z'
    };

    const result = executeTransfer(state, editPayload);
    expect(result.success).toBe(true);

    // Saldos esperados:
    // Reversión: ast-3 recupera 100 + 2 = 300; ast-1 pierde 100 = 500
    // Aplicación: ast-3 descuenta 50 = 250; ast-1 recibe 50 = 550
    expect(result.nextAssets.find((a) => a.id === 'ast-3').amount).toBe(250);
    expect(result.nextAssets.find((a) => a.id === 'ast-1').amount).toBe(550);

    // Transacción actualizada
    const updatedTx = result.nextTransactions.find((t) => t.id === 'tx-trans-1');
    expect(updatedTx.amount).toBe(50);
    expect(updatedTx.destAmount).toBe(50);
    expect(updatedTx.date).toBe('2026-10-11T16:00:00.000Z');
    expect(updatedTx.commission).toBe(0);

    // La comisión vieja debe haberse eliminado
    expect(result.nextTransactions.find((t) => t.id === 'tx-comm-1')).toBeUndefined();
    expect(result.syncChanges.some((c) => c.type === 'delete' && c.record.id === 'tx-comm-1')).toBe(true);
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
