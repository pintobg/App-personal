import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BalancesView from './BalancesView';

describe('BalancesView - Metas de Ahorro y Poder Adquisitivo', () => {
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

  it('muestra la meta de $500 y calcula el progreso acumulado con cuentas USD y USDT', () => {
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

    // Debe mostrar el nombre de la meta
    expect(screen.getByText('Fondo de emergencia')).toBeInTheDocument();
    // 200 USD + 300 USDT = 500 USD de 500 USD (100%)
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/500,00 \/ 500,00 USD/i)).toBeInTheDocument();
    expect(screen.getByText(/¡Meta alcanzada!/i)).toBeInTheDocument();
  });

  it('calcula el poder adquisitivo usando la tasa histórica de registro vs la actual', () => {
    // Ingreso en Bs. registrado este mes
    const currentMonth = new Date().toISOString().slice(0, 7);
    const transactions = [
      {
        id: 'tx-1',
        type: 'income',
        currency: 'VES',
        amount: 4000,
        date: `${currentMonth}-05T10:00:00Z`,
        rateSnapshot: 40, // Se registró a 40 Bs/$ -> valía $100
        usdEquivalent: 100
      }
    ];

    // Hoy la tasa es 50 Bs/$ -> los 4.000 Bs hoy valen $80 (pérdida del 20%)
    render(
      <BalancesView
        grandTotalUsd={700}
        referenceRate="bcv"
        setReferenceRate={vi.fn()}
        rates={dummyRates}
        assets={dummyAssets}
        transactions={transactions}
        goals={[]}
        activeFilter="all"
        setActiveFilter={vi.fn()}
        assetsByLocation={{}}
        accountTotalsUsd={{}}
      />
    );

    // Debe mostrar la tarjeta de poder adquisitivo
    expect(screen.getByText(/Poder Adquisitivo \(Bs\.\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Bs\. 4\.000,00/i)).toBeInTheDocument();
    expect(screen.getByText(/\$100,00/i)).toBeInTheDocument(); // cuando se recibió
    expect(screen.getByText(/\$80,00/i)).toBeInTheDocument(); // hoy

    // Como perdió 20% y el umbral por defecto es 5%, debe mostrar la advertencia
    expect(screen.getByText(/Tus Bs\. perdieron 20\.0% de valor este mes/i)).toBeInTheDocument();
  });
});
