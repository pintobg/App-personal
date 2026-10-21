import { describe, it, expect } from 'vitest';
import {
  calculateTransactionEditDelta,
  calculateTransferDeltas,
  calculateTransferReversalDeltas,
  migrateTransactionsAssetIds,
  verifyAssetBalance,
  verifyAllAssetsBalances
} from './balances';

describe('Domain: balances.js', () => {
  describe('calculateTransactionEditDelta - 4 casos en la misma cuenta', () => {
    const baseTx = { currency: 'USD', origin: 'Banesco' };

    it('Caso 1: income -> income (monto aumenta o disminuye: amountNum - oldAmount)', () => {
      const oldTx = { ...baseTx, type: 'income', amount: 50 };
      const newTx = { ...baseTx, type: 'income', amount: 80 };
      const result = calculateTransactionEditDelta(oldTx, newTx);

      expect(result.isSameAccount).toBe(true);
      expect(result.delta).toBe(30); // 80 - 50 = +30
    });

    it('Caso 2: spent -> spent (monto aumenta o disminuye: oldAmount - amountNum)', () => {
      const oldTx = { ...baseTx, type: 'spent', amount: 40 };
      const newTx = { ...baseTx, type: 'spent', amount: 60 };
      const result = calculateTransactionEditDelta(oldTx, newTx);

      expect(result.isSameAccount).toBe(true);
      expect(result.delta).toBe(-20); // 40 - 60 = -20
    });

    it('Caso 3: income -> spent (-oldAmount - amountNum)', () => {
      const oldTx = { ...baseTx, type: 'income', amount: 100 };
      const newTx = { ...baseTx, type: 'spent', amount: 30 };
      const result = calculateTransactionEditDelta(oldTx, newTx);

      expect(result.isSameAccount).toBe(true);
      expect(result.delta).toBe(-130); // -100 - 30 = -130
    });

    it('Caso 4: spent -> income (oldAmount + amountNum)', () => {
      const oldTx = { ...baseTx, type: 'spent', amount: 25 };
      const newTx = { ...baseTx, type: 'income', amount: 75 };
      const result = calculateTransactionEditDelta(oldTx, newTx);

      expect(result.isSameAccount).toBe(true);
      expect(result.delta).toBe(100); // 25 + 75 = +100
    });

    it('Caso 5: Cuenta distinta (revertir anterior y aplicar a la nueva)', () => {
      const oldTx = { type: 'spent', amount: 50, currency: 'USD', origin: 'Banesco' };
      const newTx = { type: 'spent', amount: 50, currency: 'USD', origin: 'Mercantil' };
      const result = calculateTransactionEditDelta(oldTx, newTx);

      expect(result.isSameAccount).toBe(false);
      expect(result.revertAccount.delta).toBe(50); // Revierte el gasto viejo (+50 en Banesco)
      expect(result.newAccount.delta).toBe(-50); // Aplica el nuevo gasto (-50 en Mercantil)
    });

    it('Caso 6: Dos cuentas con la misma moneda en el mismo banco se manejan por separado usando assetId', () => {
      // Dos cuentas en Banesco con VES: cuenta personal vs negocio
      const account1Id = 'asset-banesco-personal';
      const account2Id = 'asset-banesco-negocio';

      const oldTx = { assetId: account1Id, currency: 'VES', origin: 'Banesco', type: 'spent', amount: 100 };
      const newTx = { assetId: account2Id, currency: 'VES', origin: 'Banesco', type: 'spent', amount: 100 };

      const result = calculateTransactionEditDelta(oldTx, newTx);

      // Deben ser identificadas como cuentas distintas gracias a assetId
      expect(result.isSameAccount).toBe(false);
      expect(result.revertAccount.assetId).toBe(account1Id);
      expect(result.revertAccount.delta).toBe(100); // Revierte en la cuenta 1 (+100)
      expect(result.newAccount.assetId).toBe(account2Id);
      expect(result.newAccount.delta).toBe(-100); // Aplica en la cuenta 2 (-100)
    });
  });

  describe('calculateTransferDeltas y calculateTransferReversalDeltas', () => {
    it('Transferencia: origen baja monto + comisión, destino sube monto recibido', () => {
      const deltas = calculateTransferDeltas({
        amountDeducted: 100,
        amountReceived: 98,
        commission: 2
      });

      expect(deltas.sourceDelta).toBe(-102); // -(100 + 2)
      expect(deltas.destDelta).toBe(98);
      expect(deltas.totalDeduction).toBe(102);
    });

    it('Reversión al borrar transferencia: revierte ambos y la comisión asociada', () => {
      const transferTx = { amount: 100, destAmount: 98 };
      const commissionTx = { amount: 2 };

      const reversal = calculateTransferReversalDeltas(transferTx, commissionTx);
      expect(reversal.sourceRevertDelta).toBe(100);
      expect(reversal.destRevertDelta).toBe(-98);
      expect(reversal.commissionRevertDelta).toBe(2);
    });
  });

  describe('migrateTransactionsAssetIds (migración local de assetId)', () => {
    it('Rellena assetId y destAssetId en transacciones antiguas según moneda y ubicación', () => {
      const assets = [
        { id: 'uuid-banesco-ves', name: 'VES', location: 'Banesco' },
        { id: 'uuid-binance-usdt', name: 'USDT', location: 'Binance' }
      ];

      const oldTransactions = [
        { id: 'tx-1', type: 'spent', currency: 'VES', origin: 'Banesco', amount: 500 },
        {
          id: 'tx-2',
          type: 'transfer',
          currency: 'USDT',
          origin: 'Binance',
          destCurrency: 'VES',
          destOrigin: 'Banesco',
          amount: 50,
          destAmount: 37000
        }
      ];

      const { migratedTransactions, hasChanges } = migrateTransactionsAssetIds(oldTransactions, assets);

      expect(hasChanges).toBe(true);
      expect(migratedTransactions[0].assetId).toBe('uuid-banesco-ves');
      expect(migratedTransactions[1].assetId).toBe('uuid-binance-usdt');
      expect(migratedTransactions[1].destAssetId).toBe('uuid-banesco-ves');
    });

    it('No realiza cambios si las transacciones ya tienen assetId asignado', () => {
      const assets = [{ id: 'uuid-1', name: 'USD', location: 'Zelle' }];
      const transactions = [{ id: 'tx-1', assetId: 'uuid-1', currency: 'USD', origin: 'Zelle', amount: 20 }];

      const { hasChanges } = migrateTransactionsAssetIds(transactions, assets);
      expect(hasChanges).toBe(false);
    });
  });

  describe('verifyAssetBalance y verifyAllAssetsBalances', () => {
    it('Calcula el saldo exacto desde saldo inicial + ingresos - gastos + transferencias + ajustes', () => {
      const asset = {
        id: 'acc-banesco',
        name: 'VES',
        location: 'Banesco',
        initialAmount: 1000,
        amount: 1450 // 1000 + 500 (income) - 100 (spent) + 50 (adjustment) = 1450
      };

      const transactions = [
        { id: '1', assetId: 'acc-banesco', type: 'income', amount: 500 },
        { id: '2', assetId: 'acc-banesco', type: 'spent', amount: 100 },
        { id: '3', assetId: 'acc-banesco', type: 'adjustment', amount: 50, delta: 50 }
      ];

      const verification = verifyAssetBalance(asset, transactions);
      expect(verification.calculatedAmount).toBe(1450);
      expect(verification.difference).toBe(0);
      expect(verification.isMatch).toBe(true);
      expect(verification.movementsCount).toBe(3);
    });

    it('Detecta diferencias cuando el saldo actual no coincide con los movimientos', () => {
      const asset = {
        id: 'acc-zelle',
        name: 'USD',
        location: 'Zelle',
        initialAmount: 200,
        amount: 250 // Diferencia: registrado 250, pero 200 - 30 = 170 esperado
      };

      const transactions = [
        { id: '1', assetId: 'acc-zelle', type: 'spent', amount: 30 }
      ];

      const verification = verifyAssetBalance(asset, transactions);
      expect(verification.calculatedAmount).toBe(170);
      expect(verification.difference).toBe(80); // 250 - 170 = +80
      expect(verification.isMatch).toBe(false);
    });

    it('verifyAllAssetsBalances verifica un arreglo de cuentas y reporta cada una', () => {
      const assets = [
        { id: 'a1', name: 'USD', location: 'Cash', initialAmount: 50, amount: 50 },
        { id: 'a2', name: 'USDT', location: 'Binance', initialAmount: 100, amount: 80 }
      ];
      const transactions = [
        { id: 't1', assetId: 'a2', type: 'spent', amount: 20 }
      ];

      const results = verifyAllAssetsBalances(assets, transactions);
      expect(results.length).toBe(2);
      expect(results[0].isMatch).toBe(true);
      expect(results[1].isMatch).toBe(true);
    });
  });
});
