import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

vi.mock('@capacitor/app', () => {
  let backListener = null;
  return {
    App: {
      addListener: vi.fn((eventName, cb) => {
        if (eventName === 'backButton') {
          backListener = cb;
        }
        return Promise.resolve({
          remove: vi.fn()
        });
      }),
      exitApp: vi.fn(),
      __triggerBackButton: () => {
        if (backListener) backListener();
      }
    }
  };
});

describe('App - Pantalla por defecto y gestos de navegación', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  it('Abre por defecto en la pantalla de Inicio (dashboard)', () => {
    render(<App />);

    // El botón de navegación "Inicio" debe estar activo
    const inicioBtn = screen.getByRole('button', { name: /Inicio/i });
    expect(inicioBtn.className).toContain('active');
  });

  it('Gesto swipe a la izquierda cambia al siguiente tab (Movimientos) y swipe a la derecha vuelve al anterior (Inicio)', () => {
    const { container } = render(<App />);
    const appContainer = container.querySelector('.app-container');
    expect(appContainer).toBeDefined();

    // 1. Estamos en dashboard. Hacemos swipe a la izquierda (startX: 200, endX: 50 -> deltaX = -150)
    fireEvent.touchStart(appContainer, {
      touches: [{ clientX: 200, clientY: 100 }]
    });
    fireEvent.touchEnd(appContainer, {
      changedTouches: [{ clientX: 50, clientY: 100 }]
    });

    // En el nuevo orden (Inicio, Movimientos, Cuentas, Planificar, Tasas), debe cambiar a 'Movimientos'
    const movimientosBtn = screen.getByRole('button', { name: /Movimientos/i });
    expect(movimientosBtn.className).toContain('active');

    // 2. Hacemos swipe a la derecha (startX: 50, endX: 200 -> deltaX = +150)
    fireEvent.touchStart(appContainer, {
      touches: [{ clientX: 50, clientY: 100 }]
    });
    fireEvent.touchEnd(appContainer, {
      changedTouches: [{ clientX: 200, clientY: 100 }]
    });

    // Debe volver a 'Inicio'
    const inicioBtn = screen.getByRole('button', { name: /Inicio/i });
    expect(inicioBtn.className).toContain('active');
  });

  it('Gesto de volver del teléfono regresa al dashboard si está en otra pantalla y sale si ya está en inicio', async () => {
    const { App: CapApp } = await import('@capacitor/app');
    render(<App />);

    // Navegar a Cuentas
    const cuentasBtn = screen.getByRole('button', { name: /Cuentas/i });
    fireEvent.click(cuentasBtn);
    expect(cuentasBtn.className).toContain('active');

    // Disparar evento de back button del teléfono
    act(() => {
      CapApp.__triggerBackButton();
    });

    // Debe haber regresado a Inicio
    const inicioBtn = screen.getByRole('button', { name: /Inicio/i });
    expect(inicioBtn.className).toContain('active');

    // Disparar de nuevo desde Inicio: debe llamar a exitApp
    act(() => {
      CapApp.__triggerBackButton();
    });

    expect(CapApp.exitApp).toHaveBeenCalled();
  });

  it('Mapea valores viejos guardados ("debts", "calculator") a los nuevos tabs', () => {
    localStorage.setItem('active_page', 'calculator');
    const { unmount } = render(<App />);

    const tasasBtn = screen.getByRole('button', { name: /Tasas/i });
    expect(tasasBtn.className).toContain('active');

    unmount();
    localStorage.setItem('active_page', 'debts');
    render(<App />);

    const planificarBtn = screen.getByRole('button', { name: /Planificar/i });
    expect(planificarBtn.className).toContain('active');
  });

  it('Botón atrás desde Ajustes regresa a la pantalla anterior sin cerrar la app', async () => {
    const { App: CapApp } = await import('@capacitor/app');
    render(<App />);

    // Pasar por Cuentas y volver a Inicio (Ajustes se abre desde Inicio)
    fireEvent.click(screen.getByRole('button', { name: /Cuentas/i }));
    const cuentasBtn = screen.getByRole('button', { name: /Inicio/i });
    fireEvent.click(cuentasBtn);
    expect(cuentasBtn.className).toContain('active');

    // Abrir Ajustes mediante el botón con aria-label "Ajustes"
    const settingsBtns = screen.getAllByRole('button', { name: /Ajustes/i });
    fireEvent.click(settingsBtns[0]);

    // Verificar que estamos en Ajustes
    expect(await screen.findByText('Preferencias, seguridad y respaldos')).toBeDefined();

    // Disparar botón atrás de Android: debe regresar a Inicio
    act(() => {
      CapApp.__triggerBackButton();
    });

    expect(cuentasBtn.className).toContain('active');
    expect(CapApp.exitApp).not.toHaveBeenCalled();
  });
});
