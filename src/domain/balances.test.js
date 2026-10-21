import { describe, it, expect } from 'vitest';
import {
  calculateTransactionEditDelta,
  calculateTransferDeltas,
  calculateTransferReversalDeltas
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
});
