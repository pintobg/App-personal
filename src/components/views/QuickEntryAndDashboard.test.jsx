import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FabOverlay from '../common/FabOverlay';
import TransactionModal from '../modals/TransactionModal';
import TransactionsView from './TransactionsView';
import DashboardView from './DashboardView';

describe('Acciones rápidas de transacción y reordenamiento de Inicio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. FabOverlay global con 4 acciones unificadas', () => {
    it('muestra siempre las 4 opciones unificadas: Gasto, Ingreso, Transferencia o cambio y Artículo a lista de compras', () => {
      const setTxModalMode = vi.fn();
      const setIsTransferModalOpen = vi.fn();
      const onAddShoppingItem = vi.fn();
      const setIsFabExpanded = vi.fn();
      const setNewTx = vi.fn();

      render(
        <FabOverlay
          isFabExpanded={true}
          setIsFabExpanded={setIsFabExpanded}
          setTxModalMode={setTxModalMode}
          setNewTx={setNewTx}
          setIsTransferModalOpen={setIsTransferModalOpen}
          onAddShoppingItem={onAddShoppingItem}
        />
      );

      expect(screen.getByText('Gasto')).toBeDefined();
      expect(screen.getByText('Ingreso')).toBeDefined();
      expect(screen.getByText('Transferencia o cambio')).toBeDefined();
      expect(screen.getByText('Artículo a lista de compras')).toBeDefined();

      fireEvent.click(screen.getByText('Gasto'));
      expect(setTxModalMode).toHaveBeenCalledWith('form');
      expect(setNewTx).toHaveBeenCalledWith(expect.objectContaining({ type: 'spent' }));

      fireEvent.click(screen.getByText('Ingreso'));
      expect(setTxModalMode).toHaveBeenCalledWith('form');
      expect(setNewTx).toHaveBeenCalledWith(expect.objectContaining({ type: 'income' }));

      fireEvent.click(screen.getByText('Transferencia o cambio'));
      expect(setIsTransferModalOpen).toHaveBeenCalledWith(true);

      fireEvent.click(screen.getByText('Artículo a lista de compras'));
      expect(onAddShoppingItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. TransactionModal: Orden, precarga y "Guardar y agregar otro"', () => {
    const assets = [
      { id: 'a1', name: 'USD', location: 'Efectivo', amount: 150 },
      { id: 'a2', name: 'VES', location: 'Banesco', amount: 5000 }
    ];
    const transactions = [
      {
        id: 'tx-prev',
        type: 'spent',
        assetId: 'a2',
        amount: 200,
        date: '2026-11-01',
        category_id: 'exp.food'
      }
    ];

    it('incluye botón "Guardar y agregar otro" en modo creación que invoca onSaveAndAddAnother', () => {
      const onSaveAndAddAnother = vi.fn();
      const onSubmit = vi.fn();

      const newTx = {
        type: 'spent',
        amount: '35',
        assetId: 'a1',
        currency: 'USD',
        date: '2026-11-03',
        category_id: 'exp.food',
        notes: 'Almuerzo'
      };

      render(
        <TransactionModal
          mode="form"
          onClose={vi.fn()}
          newTx={newTx}
          setNewTx={vi.fn()}
          onSubmit={onSubmit}
          onSaveAndAddAnother={onSaveAndAddAnother}
          assets={assets}
          transactions={transactions}
        />
      );

      const addAnotherBtn = screen.getByRole('button', { name: /Guardar y agregar otro/i });
      expect(addAnotherBtn).toBeDefined();

      fireEvent.click(addAnotherBtn);
      expect(onSaveAndAddAnother).toHaveBeenCalledTimes(1);
    });

    it('contiene chips de fecha rápida (Hoy, Ayer, Otra)', () => {
      const setNewTx = vi.fn();
      const newTx = {
        type: 'spent',
        amount: '10',
        assetId: 'a1',
        currency: 'USD',
        date: '2026-11-03',
        category_id: 'exp.food'
      };

      render(
        <TransactionModal
          mode="form"
          onClose={vi.fn()}
          newTx={newTx}
          setNewTx={setNewTx}
          onSubmit={vi.fn()}
          assets={assets}
          transactions={transactions}
        />
      );

      expect(screen.getByRole('button', { name: 'Hoy' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Ayer' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Otra' })).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Ayer' }));
      expect(setNewTx).toHaveBeenCalled();
    });

    it('solo muestra como origen las cuentas que manejan la moneda elegida', () => {
      let txState = {
        type: 'spent',
        amount: '100',
        assetId: 'a2',
        currency: 'VES',
        date: '2026-11-03'
      };

      const { rerender } = render(
        <TransactionModal
          mode="form"
          onClose={vi.fn()}
          newTx={txState}
          setNewTx={(updater) => {
            txState = typeof updater === 'function' ? updater(txState) : updater;
          }}
          onSubmit={vi.fn()}
          assets={assets}
          transactions={transactions}
        />
      );

      // El selector de Moneda está presente y muestra VES
      expect(screen.getByText('Moneda')).toBeDefined();
      expect(screen.getByText('VES')).toBeDefined();

      // La cuenta seleccionada (Banesco, VES) se muestra y las cuentas en otra moneda no se ofrecen
      expect(screen.getByText(/Banesco/i)).toBeDefined();
      expect(screen.queryByText(/Efectivo ·/i)).toBeNull();
      expect(screen.getByText(/Banesco · Saldo/i)).toBeDefined();
    });
  });

  describe('3. TransactionsView: Buscador y filtros combinables con chips', () => {
    const assets = [
      { id: 'a1', name: 'USD', location: 'Efectivo', amount: 200 },
      { id: 'a2', name: 'VES', location: 'Banesco', amount: 8000 }
    ];

    const transactions = [
      {
        id: 'tx-1',
        type: 'spent',
        assetId: 'a1',
        currency: 'USD',
        amount: 25,
        category: 'Alimentación',
        category_id: 'exp.food',
        notes: 'Mercado semanal',
        date: '2026-11-02'
      },
      {
        id: 'tx-2',
        type: 'income',
        assetId: 'a1',
        currency: 'USD',
        amount: 150,
        category: 'Salario',
        category_id: 'inc.salary',
        notes: 'Pago quincena',
        date: '2026-11-01'
      }
    ];

    it('muestra buscador por notas o monto y totales filtrados arriba', () => {
      render(
        <TransactionsView
          transactions={transactions}
          assets={assets}
          rates={{ USD: 1, VES: 45 }}
          onEdit={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Buscar nota, monto/i);
      expect(searchInput).toBeDefined();

      expect(screen.getByText(/Totales del período/i)).toBeDefined();
      expect(screen.getAllByText(/Ingresos/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Gastos/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Saldo Neto')).toBeDefined();

      fireEvent.change(searchInput, { target: { value: 'Mercado' } });
      expect(screen.getByText('Mercado semanal')).toBeDefined();
      expect(screen.queryByText('Pago quincena')).toBeNull();

      fireEvent.change(searchInput, { target: { value: '150' } });
      expect(screen.getByText('Pago quincena')).toBeDefined();
      expect(screen.queryByText('Mercado semanal')).toBeNull();
    });

    it('permite eliminar un movimiento con botón directo que activa borrado suave con deshacer', () => {
      const deleteWithUndo = vi.fn();

      render(
        <TransactionsView
          transactions={transactions}
          assets={assets}
          rates={{ USD: 1, VES: 45 }}
          deleteTransactionWithUndo={deleteWithUndo}
        />
      );

      const deleteBtns = screen.getAllByLabelText('Eliminar transacción');
      expect(deleteBtns.length).toBeGreaterThan(0);

      fireEvent.click(deleteBtns[0]);
      expect(deleteWithUndo).toHaveBeenCalledWith(transactions[0]);
    });
  });

  describe('4. DashboardView: Orden de secciones accionables', () => {
    const assets = [
      { id: 'a1', name: 'USD', location: 'Efectivo', amount: 500 }
    ];

    const transactions = [
      {
        id: 'tx-inc',
        type: 'income',
        assetId: 'a1',
        currency: 'USD',
        amount: 800,
        date: '2026-11-01',
        category_id: 'inc.salary'
      },
      {
        id: 'tx-exp',
        type: 'spent',
        assetId: 'a1',
        currency: 'USD',
        amount: 250,
        date: '2026-11-02',
        category_id: 'exp.food'
      }
    ];

    const obligations = [
      {
        id: 'ob-1',
        type: 'pay',
        title: 'Servicio de Internet',
        amount: 30,
        currency: 'USD',
        dueDate: '2026-11-05' // Vence en 2 días (< 7 días)
      }
    ];

    it('muestra primero el patrimonio, el resumen mensual con comparación y las alertas accionables', () => {
      render(
        <DashboardView
          assets={assets}
          transactions={transactions}
          obligations={obligations}
          rates={{ USD: 1, VES: 50, paralelo: 55 }}
          ratesDetails={{
            bcvUsd: { valor: 50, fechaActualizacion: '2026-11-03' },
            paralelo: { valor: 55, fechaActualizacion: '2026-11-03' }
          }}
          grandTotalUsd={500}
        />
      );

      // 1. Patrimonio total visible
      expect(screen.getByText('Mi balance')).toBeDefined();

      // 2. Resumen del mes
      expect(screen.getByText('Resumen del mes')).toBeDefined();
      expect(screen.getByText('Saldo')).toBeDefined();

      // 3. Alertas accionables (pago próximo en 7 días)
      expect(screen.getByText('Alertas y Vencimientos')).toBeDefined();
      expect(screen.getByText('Servicio de Internet')).toBeDefined();

      // 4. Brecha cambiaria visible
      expect(screen.getByText('Brecha:')).toBeDefined();

      // 5. Gráficos plegados por defecto
      expect(screen.getByText(/Ver gráficos/i)).toBeDefined();
    });
  });
});
