import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlanningView from './PlanningView';
import BalancesView from './BalancesView';

describe('PlanningView y BalancesView - Metas de Ahorro y Cuentas', () => {
  const dummyAssets = [
    { id: 'acc-usd', name: 'USD', location: 'Efectivo', amount: 200, type: 'fiat' },
    { id: 'acc-usdt', name: 'USDT', location: 'Binance', amount: 300, type: 'crypto' },
    { id: 'acc-ves', name: 'VES', location: 'Banesco', amount: 10000, type: 'fiat' }
  ];

  const dummyRates = {
    USD: 1,
    USDT: 1,
    VES: 50 // 50 Bs/$ hoy
  };

  const goals = [
    {
      id: 'goal-1',
      name: 'Fondo de emergencia',
      targetAmount: 500,
      currency: 'USD',
      deadline: '2027-12-31',
      accountIds: ['acc-usd', 'acc-usdt']
    }
  ];

  it('muestra la meta de $500 y calcula el progreso acumulado en la pestaña Metas de ahorro de Planificar', () => {
    render(
      <PlanningView
        activeSubTab="metas"
        setActiveSubTab={vi.fn()}
        goals={goals}
        assets={dummyAssets}
        rates={dummyRates}
      />
    );

    // Debe mostrar el nombre de la meta
    expect(screen.getByText('Fondo de emergencia')).toBeInTheDocument();
    // 200 USD + 300 USDT = 500 USD de 500 USD (100%)
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/Ahorrado:/i)).toHaveTextContent('500,00 USD de 500,00 USD');
    expect(screen.getByText(/¡Meta alcanzada!/i)).toBeInTheDocument();
  });

  it('BalancesView muestra primero las cuentas y no contiene las metas de ahorro', () => {
    render(
      <BalancesView
        grandTotalUsd={700}
        referenceRate="bcv"
        setReferenceRate={vi.fn()}
        rates={dummyRates}
        assets={dummyAssets}
        transactions={[]}
        goals={goals}
        activeFilter="all"
        setActiveFilter={vi.fn()}
        assetsByLocation={{ Efectivo: [dummyAssets[0]], Binance: [dummyAssets[1]], Banesco: [dummyAssets[2]] }}
        accountTotalsUsd={{ Efectivo: 200, Binance: 300, Banesco: 200 }}
      />
    );

    // En Cuentas lo primero que se ve es el portafolio de cuentas
    expect(screen.getByText(/Por Moneda/i)).toBeInTheDocument();
    expect(screen.getByText(/Por Cuenta/i)).toBeInTheDocument();
    // Las metas ya no están en BalancesView
    expect(screen.queryByText('Fondo de emergencia')).toBeNull();
  });
});
