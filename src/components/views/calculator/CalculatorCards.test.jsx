import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CalculatorCards from './CalculatorCards';

describe('CalculatorCards Component', () => {
  const defaultRates = {
    bcvUsd: 80,
    bcvEur: 100,
    eur: 100,
    avgBcv: 90,
    paralelo: 95,
    custom: 0
  };

  const defaultDetails = {
    bcvUsd: { valor: 80, fechaValor: '2026-11-05' },
    bcvEur: { valor: 100, fechaValor: '2026-11-05' },
    paralelo: { valor: 95, fechaValor: '2026-11-05' }
  };

  it('muestra la tasa oficial de EUR BCV correctamente y no "Sin tasa todavía"', () => {
    render(
      <CalculatorCards
        calcBaseCurrency="BS"
        setCalcBaseCurrency={vi.fn()}
        calcBaseAmount=""
        setCalcBaseAmount={vi.fn()}
        activeAmountBs=""
        activeRates={defaultRates}
        rateMode="current"
        ratesDetails={defaultDetails}
        veRates={{ bcvUsd: 80, bcvEur: 100, paralelo: 95, details: defaultDetails }}
      />
    );

    // Debe mostrar la tarjeta EUR BCV
    expect(screen.getByText('EUR BCV')).toBeDefined();
    expect(screen.getByText('Oficial Banco Central')).toBeDefined();

    // Debe mostrar la tasa: Bs. 100.00
    expect(screen.getByText(/Tasa: Bs\. 100\.00/i)).toBeDefined();
    // No debe decir "Sin tasa todavía" para EUR
    expect(screen.queryByText('Sin tasa todavía')).toBeNull();
  });

  it('muestra la ficha de Promedio BCV con el promedio entre Dólar BCV y Euro BCV', () => {
    render(
      <CalculatorCards
        calcBaseCurrency="BS"
        setCalcBaseCurrency={vi.fn()}
        calcBaseAmount=""
        setCalcBaseAmount={vi.fn()}
        activeAmountBs=""
        activeRates={defaultRates}
        rateMode="current"
        ratesDetails={defaultDetails}
        veRates={{ bcvUsd: 80, bcvEur: 100, avgBcv: 90, paralelo: 95, details: defaultDetails }}
      />
    );

    // Debe mostrar la ficha Promedio BCV con subtítulo limpio
    expect(screen.getByText('Promedio BCV')).toBeDefined();
    expect(screen.getByText('(USD + EUR) / 2')).toBeDefined();

    // La tasa promedio entre 80 y 100 es 90.00
    expect(screen.getByText(/Tasa: Bs\. 90\.00/i)).toBeDefined();
  });

  it('calcula conversiones bidireccionales con la ficha Promedio BCV y EUR BCV', () => {
    const setCalcBaseCurrency = vi.fn();
    const setCalcBaseAmount = vi.fn();

    render(
      <CalculatorCards
        calcBaseCurrency="BS"
        setCalcBaseCurrency={setCalcBaseCurrency}
        calcBaseAmount="900"
        setCalcBaseAmount={setCalcBaseAmount}
        activeAmountBs={900}
        activeRates={defaultRates}
        rateMode="current"
        ratesDetails={defaultDetails}
        veRates={{ bcvUsd: 80, bcvEur: 100, avgBcv: 90, paralelo: 95, details: defaultDetails }}
      />
    );

    // 900 Bs / 100 EUR = 9.00 €
    // 900 Bs / 90 Promedio = 10.00 $
    const inputs = screen.getAllByRole('textbox');
    const eurInput = inputs.find(i => i.value === '9.00');
    const avgInput = inputs.find(i => i.value === '10.00');

    expect(eurInput).toBeDefined();
    expect(avgInput).toBeDefined();

    // Escribir en el input de Promedio BCV cambia base currency y amount
    fireEvent.change(avgInput, { target: { value: '50' } });
    expect(setCalcBaseCurrency).toHaveBeenCalledWith('AVG_BCV');
    expect(setCalcBaseAmount).toHaveBeenCalledWith('50');
  });
});
