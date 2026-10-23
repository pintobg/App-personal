import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionsView from './TransactionsView';
import DashboardView from './DashboardView';

describe('Comisiones y Pago Móvil - Vistas', () => {
  it('TransactionsView: encuentra un Pago Móvil buscando por los últimos dígitos de la referencia', () => {
    const transactions = [
      {
        id: 'tx-1',
        type: 'spent',
        amount: 250,
        currency: 'VES',
        origin: 'Banesco',
        category: 'Comida',
        subcategory: 'Almuerzo',
        paymentMethod: 'Pago Móvil',
        referenceNumber: '9876543210',
        bank: 'Banesco',
        recipientId: 'V-12345678',
        date: new Date().toISOString()
      },
      {
        id: 'tx-2',
        type: 'spent',
        amount: 50,
        currency: 'USD',
        origin: 'Efectivo',
        category: 'Transporte',
        subcategory: 'Gasolina',
        date: new Date().toISOString()
      }
    ];

    render(
      <TransactionsView
        transactions={transactions}
        assets={[{ id: 'ast-1', name: 'VES', location: 'Banesco', amount: 5000 }]}
        txFilter="all"
        setTxFilter={() => {}}
        deleteMode={false}
        setDeleteMode={() => {}}
        selectedTxs={[]}
        toggleSelectTx={() => {}}
        flippedTxId={null}
        setFlippedTxId={() => {}}
        rates={{ VES: 50 }}
        onEdit={() => {}}
      />
    );

    // Ambos movimientos visibles inicialmente
    expect(screen.getByText(/Comida/i) || screen.getByText(/Gasto/i)).toBeDefined();

    // Escribir los últimos 4 dígitos de la referencia "3210"
    const searchInput = screen.getByPlaceholderText(/Buscar por categoría, cuenta, referencia/i);
    fireEvent.change(searchInput, { target: { value: '3210' } });

    // Coincide el Pago Móvil y muestra su badge/referencia
    expect(screen.getAllByText(/3210/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Gasolina/i)).toBeNull();
  });

  it('DashboardView: no muestra la tarjeta de comisiones al abrir la app (se manejan como gasto ordinario)', () => {
    const transactions = [
      {
        id: 'tx-comm-1',
        type: 'spent',
        amount: 0.60,
        currency: 'USD',
        origin: 'Zelle',
        category: 'Impuestos',
        subcategory: 'IGTF (3%)',
        usdEquivalent: 0.60,
        date: new Date().toISOString()
      },
      {
        id: 'tx-comm-2',
        type: 'spent',
        amount: 15,
        currency: 'VES',
        origin: 'Banesco',
        category: 'Comisiones',
        subcategory: 'Comisión bancaria',
        usdEquivalent: 0.30,
        date: new Date().toISOString()
      }
    ];

    render(
      <DashboardView
        isBalanceHidden={false}
        setIsBalanceHidden={() => {}}
        grandTotalUsd={100}
        alternateGrandTotalUsd={null}
        referenceRate="BCV"
        setReferenceRate={() => {}}
        rateHistory={[]}
        rates={{ USD: 1, VES: 50 }}
        ratesDetails={{}}
        totalIncomeUsd={0}
        totalSpentUsd={0.90}
        timeFrame="month"
        setTimeFrame={() => {}}
        pieData={[]}
        nextPayments={[]}
        nextCollections={[]}
        onNavigateTransactions={() => {}}
        budgets={{}}
        transactions={transactions}
        assets={[
          { id: 'ast-1', name: 'USD', location: 'Zelle', amount: 100 },
          { id: 'ast-2', name: 'VES', location: 'Banesco', amount: 5000 }
        ]}
        onOpenBudgetModal={() => {}}
        auth={{}}
        onOpenAuthModal={() => {}}
      />
    );

    // No debe mostrar la tarjeta destacada "Comisiones del mes" en la pantalla de inicio
    expect(screen.queryByText(/Comisiones del mes/i)).toBeNull();
  });
});
