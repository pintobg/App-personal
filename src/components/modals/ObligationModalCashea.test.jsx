import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ObligationModal from './ObligationModal';

describe('ObligationModal - Compra en cuotas estilo Cashea', () => {
  const dummyAssets = [
    { id: 'acc-1', name: 'USD', location: 'Efectivo', amount: 200 }
  ];

  it('permite activar "Compra en cuotas" y calcula 4 cuotas de $20,00 para una compra de $120 con inicial de $40', () => {
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

    const checkbox = screen.getByLabelText(/Compra en cuotas \(estilo Cashea\)/i);
    expect(checkbox).toBeInTheDocument();

    fireEvent.click(checkbox);
    expect(setNewOb).toHaveBeenCalled();

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

    expect(screen.getByText(/4 cuotas de/i)).toBeInTheDocument();
    expect(screen.getByText(/Restan:/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Guardar/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalled();
    const passedOb = onSubmit.mock.calls[0][1];
    expect(passedOb.amount).toBe('20');
    expect(passedOb.totalInstallments).toBe('4');
    expect(passedOb.downPayment).toBe('40');
    expect(passedOb.downPaymentAssetId).toBe('acc-1');
  });

  it('calcula correctamente con montos escritos con coma ("120,00" e inicial "40,00") y usa símbolo de moneda VES (Bs.)', () => {
    const obligationState = {
      type: 'pay',
      title: 'Traki',
      amount: '',
      currency: 'VES',
      frequency: 'semi-monthly',
      category: 'Ropa',
      dueDate: '2026-11-01',
      totalInstallments: '',
      paidInstallments: 0,
      isInstallmentPurchase: true,
      totalPurchaseAmount: '120,00',
      downPayment: '40,00',
      installmentsCount: '4',
      downPaymentAssetId: 'acc-1'
    };

    render(
      <ObligationModal
        isOpen={true}
        onClose={vi.fn()}
        newOb={obligationState}
        setNewOb={vi.fn()}
        assets={dummyAssets}
        onSubmit={vi.fn()}
      />
    );

    // Debe mostrar símbolos de Bs. en lugar de $
    expect(screen.getByText(/Total:/i)).toHaveTextContent('Bs. 120,00');
    expect(screen.getByText(/Total:/i)).toHaveTextContent('Inicial: Bs. 40,00');
    expect(screen.getByText(/Restan:/i)).toHaveTextContent('Bs. 80,00');
    expect(screen.getByText(/Restan:/i)).toHaveTextContent('4 cuotas de Bs. 20,00');
  });

  it('cambiar de 4 a 6 cuotas recalcula el resumen dinámicamente', () => {
    let obligationState = {
      type: 'pay',
      title: 'Celular Daka',
      amount: '',
      currency: 'USD',
      frequency: 'monthly',
      category: 'Tecnología',
      dueDate: '2026-11-01',
      totalInstallments: '',
      paidInstallments: 0,
      isInstallmentPurchase: true,
      totalPurchaseAmount: '120,00',
      downPayment: '0,00',
      installmentsCount: '4'
    };

    const { rerender } = render(
      <ObligationModal
        isOpen={true}
        onClose={vi.fn()}
        newOb={obligationState}
        setNewOb={vi.fn()}
        assets={dummyAssets}
        onSubmit={vi.fn()}
      />
    );

    // 120 en 4 cuotas = 4 cuotas de $30,00
    expect(screen.getByText(/4 cuotas de \$30,00/i)).toBeInTheDocument();

    // Cambiar a 6 cuotas
    obligationState = {
      ...obligationState,
      installmentsCount: '6'
    };

    rerender(
      <ObligationModal
        isOpen={true}
        onClose={vi.fn()}
        newOb={obligationState}
        setNewOb={vi.fn()}
        assets={dummyAssets}
        onSubmit={vi.fn()}
      />
    );

    // 120 en 6 cuotas = 6 cuotas de $20,00
    expect(screen.getByText(/6 cuotas de \$20,00/i)).toBeInTheDocument();
  });

  it('permite vaciar el campo de cuotas, muestra "Indica el número de cuotas" y deshabilita guardar', () => {
    const obligationState = {
      type: 'pay',
      title: 'Nevera',
      amount: '',
      currency: 'USD',
      frequency: 'monthly',
      category: 'Hogar',
      dueDate: '2026-11-01',
      totalInstallments: '',
      paidInstallments: 0,
      isInstallmentPurchase: true,
      totalPurchaseAmount: '500,00',
      downPayment: '100,00',
      installmentsCount: '' // Vacío al borrar
    };

    render(
      <ObligationModal
        isOpen={true}
        onClose={vi.fn()}
        newOb={obligationState}
        setNewOb={vi.fn()}
        assets={dummyAssets}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText(/Indica el número de cuotas/i)).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Guardar/i });
    expect(submitBtn).toBeDisabled();
  });

  it('muestra ajuste de centavos en la última cuota si hay redondeo', () => {
    const obligationState = {
      type: 'pay',
      title: 'Colchón',
      amount: '',
      currency: 'USD',
      frequency: 'monthly',
      category: 'Hogar',
      dueDate: '2026-11-01',
      totalInstallments: '',
      paidInstallments: 0,
      isInstallmentPurchase: true,
      totalPurchaseAmount: '100,00',
      downPayment: '30,00',
      installmentsCount: '3' // 70 / 3 = 23.33 x 2 + 23.34
    };

    render(
      <ObligationModal
        isOpen={true}
        onClose={vi.fn()}
        newOb={obligationState}
        setNewOb={vi.fn()}
        assets={dummyAssets}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText(/2 cuotas de \$23,33/i)).toBeInTheDocument();
    expect(screen.getByText(/1 cuota final de \$23,34/i)).toBeInTheDocument();
  });

  it('muestra error si la inicial es mayor que el monto total y no permite guardar', () => {
    const obligationState = {
      type: 'pay',
      title: 'Televisor',
      amount: '',
      currency: 'USD',
      frequency: 'monthly',
      category: 'Hogar',
      dueDate: '2026-11-01',
      totalInstallments: '',
      paidInstallments: 0,
      isInstallmentPurchase: true,
      totalPurchaseAmount: '100,00',
      downPayment: '150,00',
      installmentsCount: '4'
    };

    render(
      <ObligationModal
        isOpen={true}
        onClose={vi.fn()}
        newOb={obligationState}
        setNewOb={vi.fn()}
        assets={dummyAssets}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText(/La inicial no puede ser mayor que el total/i)).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Guardar/i });
    expect(submitBtn).toBeDisabled();
  });
});
