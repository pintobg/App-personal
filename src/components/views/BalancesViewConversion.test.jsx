import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BalancesView from './BalancesView';

describe('BalancesView - Conversión en vista Todos', () => {
  it('una cuenta de 1.238,74 VES con tasa 884,75 muestra $1,40 en la vista Todos', () => {
    const assets = [
      { id: 'acc-banesco', name: 'VES', location: 'Banesco', amount: 1238.74, type: 'fiat' }
    ];

    const rates = {
      USD: 1,
      VES: 884.75
    };

    render(
      <BalancesView
        grandTotalUsd={1.40}
        referenceRate="bcv"
        setReferenceRate={vi.fn()}
        rates={rates}
        assets={assets}
        transactions={[]}
        goals={[]}
        activeFilter="all"
        setActiveFilter={vi.fn()}
        assetsByLocation={{ Banesco: assets }}
        accountTotalsUsd={{ Banesco: 1.40 }}
      />
    );

    // Tanto el total del banco como la tarjeta de la cuenta deben mostrar $1,40
    const matches = screen.getAllByText('$1,40');
    expect(matches.length).toBeGreaterThanOrEqual(1);

    // No debe mostrar el cálculo erróneo multiplicado
    expect(screen.queryByText('$1.095.974,72')).not.toBeInTheDocument();

    // Las dos pestañas deben estar presentes y legibles
    expect(screen.getByRole('tab', { name: 'Por banco' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Por moneda' })).toBeInTheDocument();

    // "Comparar con mi banco" queda como enlace al final
    expect(screen.getByRole('button', { name: /comparar con mi banco/i })).toBeInTheDocument();
  });

  it('tocar una cuenta abre sus acciones y "Ver movimientos" avisa la cuenta', () => {
    const onViewMovements = vi.fn();
    const onAdjustAsset = vi.fn();
    const assets = [{ id: 'a1', name: 'USD', location: 'Zelle', amount: 120, type: 'fiat' }];
    render(
      <BalancesView
        grandTotalUsd={120}
        rates={{ USD: 1 }}
        assets={assets}
        onViewMovements={onViewMovements}
        onAdjustAsset={onAdjustAsset}
        onAddAsset={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Agregar cuenta o activo' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Zelle|USD, 120/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver movimientos' }));
    expect(onViewMovements).toHaveBeenCalledWith('Zelle');
  });
});
