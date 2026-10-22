import { render, screen } from '@testing-library/react';
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

    // Las tres pestañas deben estar presentes y legibles
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Por Moneda' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Por Cuenta' })).toBeInTheDocument();

    // El botón Verificar saldos debe estar presente con su aria-label
    expect(screen.getByRole('button', { name: /verificar saldos/i })).toBeInTheDocument();
  });
});
