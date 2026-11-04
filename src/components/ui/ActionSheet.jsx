import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DRAG_CLOSE_PX = 80;

/**
 * Hoja de acciones anclada abajo (patrón estándar en móvil).
 * - title / subtitle: qué elemento se está tocando
 * - children: detalles opcionales (tasa, comisión, nota…)
 * - actions: [{ label, icon, onClick, variant: 'default' | 'danger', ariaLabel, disabled }]
 * Se cierra al tocar fuera, con "Cancelar", con Escape o deslizando hacia abajo.
 * El botón atrás de Android se maneja en useAppGesturesAndBack.
 */
export default function ActionSheet({ isOpen, onClose, title, subtitle, actions = [], children }) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => { if (!isOpen) setDragY(0); }, [isOpen]);

  if (!isOpen) return null;

  const onTouchStart = (e) => { startY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    setDragY(dy > 0 ? dy : 0);
  };
  const onTouchEnd = () => {
    if (dragY > DRAG_CLOSE_PX) onClose?.();
    else setDragY(0);
    startY.current = null;
  };

  const sheet = (
    <div className="action-sheet-overlay" onClick={onClose}>
      <div
        className="action-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Acciones'}
        onClick={(e) => e.stopPropagation()}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        <div
          className="action-sheet-grip-area"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="action-sheet-grip" aria-hidden="true" />
          {(title || subtitle) && (
            <div className="action-sheet-head">
              {title && <div className="action-sheet-title">{title}</div>}
              {subtitle && <div className="action-sheet-subtitle">{subtitle}</div>}
            </div>
          )}
        </div>

        {children && <div className="action-sheet-details">{children}</div>}

        <div className="action-sheet-actions">
          {actions.filter(Boolean).map((action) => (
            <button
              key={action.label}
              type="button"
              className={`action-sheet-btn${action.variant === 'danger' ? ' danger' : ''}`}
              aria-label={action.ariaLabel || action.label}
              disabled={action.disabled}
              onClick={() => { action.onClick?.(); }}
            >
              {action.icon && <span className="action-sheet-icon" aria-hidden="true">{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        <button type="button" className="action-sheet-cancel" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );

  // Portal al body: evita que un contenedor con transform/animación lo recorte o lo deje bajo el botón +.
  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
}
