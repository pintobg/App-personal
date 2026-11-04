import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RateNotice from './RateNotice';

describe('RateNotice', () => {
  it('muestra un solo aviso aunque haya varias cuentas afectadas', () => {
    const assets = [
      { id: '1', name: 'VES', location: 'Banesco' },
      { id: '2', name: 'VES', location: 'Mercantil' },
      { id: '3', name: 'VES', location: 'Efectivo' }
    ];
    render(<RateNotice assets={assets} rates={{ USD: 1 }} onGoToRates={vi.fn()} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByText(/No hay tasa del dólar/)).toBeDefined();
  });

  it('lista las cripto sin precio y ofrece Revisar', () => {
    const onReviewAsset = vi.fn();
    render(<RateNotice assets={[{ id: 'a', name: 'XYZ' }, { id: 'b', name: 'ABC' }]} rates={{ VES: 40 }} onReviewAsset={onReviewAsset} />);
    expect(screen.getByText(/ABC, XYZ/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));
    expect(onReviewAsset).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  });

  it('se puede ocultar', () => {
    render(<RateNotice assets={[{ id: '1', name: 'VES' }]} rates={{}} onGoToRates={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar aviso' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
