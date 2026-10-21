import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ObligationModal from './ObligationModal';

describe('ObligationModal - Compra en cuotas estilo Cashea', () => {
  const dummyAssets = [
    { id: 'acc-1', name: 'USD', location: 'Efectivo', amount: 200 }
  ];

  it('permite activar "Compra en cuotas" y calcula 4 cuotas de $20 para una compra de $120 con inicial de $40', () => {
    let obligationState = {
      type: 'pay',
      title: 'Zapatos',
      amount: '',
      currency: 'USD',
      frequency: 'semi-monthly',
      category: 'Ropa',
      dueDate: '2026-11-01',
      totalInstallments: '',
      paidInstallments: 0
    };

    const setNewOb = vi.fn((updater) => {
      obligationState = typeof updater === 'function' ? updater(obligationState) : updater;
    });

    const onSubmit = vi.fn();

    const { rerender } = render(
      <ObligationModal
        isOpen={true}
        onClose={vi.fn()}
        newOb={obligationState}
        setNewOb={setNewOb}
        assets={dummyAssets}
        onSubmit={onSubmit}
      />
    );

    // Debe mostrar la opción de compra en cuotas
    const checkbox = screen.getByLabelText(/Compra en cuotas \(estilo Cashea\)/i);
    expect(checkbox).toBeInTheDocument();

    // Activar compra en cuotas
    fireEvent.click(checkbox);
    expect(setNewOb).toHaveBeenCalled();

    // Simular el estado actualizado con $120 total, $40 inicial y 4 cuotas
    obligationState = {
      ...obligationState,
      isInstallmentPurchase: true,
      totalPurchaseAmount: '120',
      downPayment: '40',
      installmentsCount: '4',
      downPaymentAssetId: 'acc-1'
    };

    rerender(
      <ObligationModal
        isOpen={true}
        onClose={vi.fn()}
        newOb={obligationState}
        setNewOb={setNewOb}
        assets={dummyAssets}
        onSubmit={onSubmit}
      />
    );

    // Debe mostrar el resumen dinámico con 4 cuotas de $20,00
    expect(screen.getByText(/4 cuotas de/i)).toBeInTheDocument();
    expect(screen.getByText(/Restan:/i)).toBeInTheDocument();

    // Enviar el formulario
    const submitBtn = screen.getByRole('button', { name: /Guardar/i });
    fireEvent.click(submitBtn);

    // Debe llamar a onSubmit pasando el monto calculado por cuota ($20) y las 4 cuotas
    expect(onSubmit).toHaveBeenCalled();
    const passedOb = onSubmit.mock.calls[0][1];
    expect(passedOb.amount).toBe('20');
    expect(passedOb.totalInstallments).toBe('4');
    expect(passedOb.downPayment).toBe('40');
    expect(passedOb.downPaymentAssetId).toBe('acc-1');
  });
});
