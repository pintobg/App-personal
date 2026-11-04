import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import InfoHint from './InfoHint';

describe('InfoHint', () => {
  it('muestra y oculta la explicación al tocar "?"', () => {
    render(<InfoHint label="Qué es la tasa">Explicación corta</InfoHint>);
    const btn = screen.getByRole('button', { name: 'Qué es la tasa' });
    expect(screen.queryByText('Explicación corta')).toBeNull();
    fireEvent.click(btn);
    expect(screen.getByText('Explicación corta')).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(btn);
    expect(screen.queryByText('Explicación corta')).toBeNull();
  });
});
