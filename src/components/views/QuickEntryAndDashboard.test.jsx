import { describe, it, expect, vi, beforeEach } from 'vitest';
import { todayLocal } from '../../utils/dates';
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

  describe('1. FabOverlay: toque abre un gasto, pulsación larga muestra el menú', () => {
    it('un toque al + abre directamente "Nuevo gasto"', () => {
      const setTxModalMode = vi.fn();
      const setNewTx = vi.fn();
      render(
        <FabOverlay
          isFabExpanded={false}
          setIsFabExpanded={vi.fn()}
          setTxModalMode={setTxModalMode}
          setNewTx={setNewTx}
          setIsTransferModalOpen={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Nuevo gasto' }));
      expect(setTxModalMode).toHaveBeenCalledWith('form');
      expect(setNewTx).toHaveBeenCalledWith(expect.objectContaining({ type: 'spent' }));
    });

    it('la pulsación larga abre el menú', () => {
      vi.useFakeTimers();
      const setIsFabExpanded = vi.fn();
      const setTxModalMode = vi.fn();
      render(
        <FabOverlay
          isFabExpanded={false}
          setIsFabExpanded={setIsFabExpanded}
          setTxModalMode={setTxModalMode}
          setNewTx={vi.fn()}
          setIsTransferModalOpen={vi.fn()}
        />
      );
      const fab = screen.getByRole('button', { name: 'Nuevo gasto' });
      fireEvent.pointerDown(fab, { clientX: 10, clientY: 10 });
      vi.advanceTimersByTime(500);
      fireEvent.pointerUp(fab);
      fireEvent.click(fab);
      expect(setIsFabExpanded).toHaveBeenCalledWith(true);
      expect(setTxModalMode).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('el menú tiene Ingreso, Transferencia o cambio, Cuenta o activo y Artículo a lista de compras', () => {
      const setTxModalMode = vi.fn();
      const setIsTransferModalOpen = vi.fn();
      const onAddShoppingItem = vi.fn();
      const setNewTx = vi.fn();
      const setIsAssetModalOpen = vi.fn();

      render(
        <FabOverlay
          isFabExpanded={true}
          setIsFabExpanded={vi.fn()}
          setTxModalMode={setTxModalMode}
          setNewTx={setNewTx}
          setIsTransferModalOpen={setIsTransferModalOpen}
          setIsAssetModalOpen={setIsAssetModalOpen}
          onAddShoppingItem={onAddShoppingItem}
        />
      );

      expect(screen.queryByText('Gasto')).toBeNull();
      fireEvent.click(screen.getByText('Ingreso'));
      expect(setTxModalMode).toHaveBeenCalledWith('form');
      expect(setNewTx).toHaveBeenCalledWith(expect.objectContaining({ type: 'income' }));

      fireEvent.click(screen.getByText('Transferencia o cambio'));
      expect(setIsTransferModalOpen).toHaveBeenCalledWith(true);

      fireEvent.click(screen.getByText('Cuenta o activo'));
      expect(setIsAssetModalOpen).toHaveBeenCalledWith(true);

      fireEvent.click(screen.getByText('Artículo a lista de compras'));
      expect(onAddShoppingItem).toHaveBeenCalledTimes(1);
    });
  });

  it('el formulario de gasto ofrece pasar a Transferencia', () => {
    const onSwitchToTransfer = vi.fn();
    render(
      <TransactionModal
        mode="form"
        onClose={vi.fn()}
        newTx={{ type: 'spent', amount: '20', assetId: 'a1', currency: 'USD', date: new Date().toISOString().slice(0, 10) }}
        setNewTx={vi.fn()}
        onSubmit={vi.fn()}
        onSwitchToTransfer={onSwitchToTransfer}
        assets={[{ id: 'a1', name: 'USD', location: 'Efectivo', amount: 100 }]}
        transactions={[]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Transferencia' }));
    expect(onSwitchToTransfer).toHaveBeenCalledWith(expect.objectContaining({ amount: '20', assetId: 'a1' }));
  });

  it('muestra gastos frecuentes y al tocar uno llena monto, categoría y cuenta', () => {
    const setNewTx = vi.fn();
    const today = new Date();
    const d = (n) => { const x = new Date(today); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
    const cafe = { type: 'spent', amount: 2, currency: 'USD', category: 'Comida', subcategory: 'Café', assetId: 'a1', origin: 'Efectivo' };
    render(
      <TransactionModal
        mode="form"
        onClose={vi.fn()}
        newTx={{ type: 'spent', amount: '', assetId: '', currency: 'USD', date: d(0) }}
        setNewTx={setNewTx}
        onSubmit={vi.fn()}
        assets={[{ id: 'a1', name: 'USD', location: 'Efectivo', amount: 100 }]}
        transactions={[{ ...cafe, id: 't1', date: d(1) }, { ...cafe, id: 't2', date: d(3) }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Usar gasto frecuente: Café/ }));
    const updater = setNewTx.mock.calls.at(-1)[0];
    const next = typeof updater === 'function' ? updater({ type: 'spent' }) : updater;
    expect(next).toEqual(expect.objectContaining({ amount: '2', assetId: 'a1', subcategory: 'Café', category: 'Comida' }));
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
        date: todayLocal(),
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

      // La fecha vive dentro de "Más detalles", plegado por defecto
      expect(screen.queryByRole('button', { name: 'Hoy' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /Más detalles/i }));
      expect(screen.getByRole('button', { name: 'Hoy' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Ayer' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Otra' })).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Ayer' }));
      expect(setNewTx).toHaveBeenCalled();
    });

    it('abre "Más detalles" automáticamente al editar un gasto con nota', () => {
      render(
        <TransactionModal
          mode="form"
          onClose={vi.fn()}
          newTx={{ id: 'tx-prev', type: 'spent', amount: '200', assetId: 'a2', currency: 'VES', date: new Date().toISOString().slice(0, 10), notes: 'Mercado' }}
          setNewTx={vi.fn()}
          onSubmit={vi.fn()}
          assets={assets}
          transactions={transactions}
        />
      );
      expect(screen.getByRole('button', { name: /Más detalles/i }).getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByDisplayValue('Mercado')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDefined();
    });

    it('muestra una línea de saldo antes → después en lugar del bloque grande', () => {
      render(
        <TransactionModal
          mode="form"
          onClose={vi.fn()}
          newTx={{ type: 'spent', amount: '50', assetId: 'a1', currency: 'USD', origin: 'Efectivo', date: new Date().toISOString().slice(0, 10) }}
          setNewTx={vi.fn()}
          onSubmit={vi.fn()}
          assets={assets}
          transactions={transactions}
        />
      );
      const line = screen.getByTestId('tx-balance-line');
      expect(line.textContent).toMatch(/Saldo: 150,00 USD → 100,00 USD/);
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

      // El monto y el selector de moneda (VES) están presentes
      expect(screen.getByLabelText('Monto')).toBeDefined();
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

      // Tocar la fila abre la hoja de acciones con Editar, Repetir y Eliminar
      fireEvent.click(screen.getAllByRole('button', { name: /Mercado semanal/i })[0]);
      expect(screen.getByRole('dialog')).toBeDefined();
      const deleteBtns = screen.getAllByLabelText('Eliminar transacción');
      expect(deleteBtns.length).toBe(1);

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

      // 1. Saldo total visible
      expect(screen.getByText('Tienes en total')).toBeDefined();

      // 2. Este mes
      expect(screen.getByText('Este mes')).toBeDefined();
      expect(screen.getByText('Diferencia')).toBeDefined();

      // 3. Próximos vencimientos (pagos y alertas fusionados, sin duplicados)
      expect(screen.getByText('Próximos vencimientos')).toBeDefined();
      expect(screen.getAllByText('Servicio de Internet')).toHaveLength(1);

      // 4. La brecha ya no está en Inicio (vive en Tasas)
      expect(screen.queryByText('Brecha:')).toBeNull();

      // 5. Gráficos plegados por defecto
      expect(screen.getByText(/Ver gráficos/i)).toBeDefined();

      // 6. Sin presupuestos no se muestra bloque de presupuestos
      expect(screen.queryByText(/Presupuestos del mes/i)).toBeNull();
    });
  });
});
