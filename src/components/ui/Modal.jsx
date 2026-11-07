import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import IconButton from './IconButton';

/**
 * Componente Modal Base del Sistema de Diseño
 * Provee estructura estándar, manejo de tecla Escape, accesibilidad y tokens de estilo.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  showCloseButton = true,
  maxWidth = '540px',
  ariaLabel,
  className = '',
  style = {},
  contentStyle = {},
  ...rest
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Se monta en <body> para que ningún contenedor con transform/animación
  // (las vistas lo tienen) recorte el fondo o mueva la ventana.
  const content = (
    <div
      className={`ui-modal-overlay modal-overlay ${className}`.trim()}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || (typeof title === 'string' ? title : 'Ventana emergente')}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-overlay)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        boxSizing: 'border-box',
        overflowY: 'auto',
        ...style
      }}
      {...rest}
    >
      <div
        className="ui-modal-content modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90dvh',
          minHeight: 'auto',
          boxSizing: 'border-box',
          position: 'relative',
          ...contentStyle
        }}
      >
        {(title || showCloseButton) && (
          <div
            className="ui-modal-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 'var(--space-3)',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: 'var(--space-4)'
            }}
          >
            {title ? (
              <h2
                style={{
                  margin: 0,
                  fontSize: 'var(--font-lg)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.015em'
                }}
              >
                {title}
              </h2>
            ) : <div />}

            {showCloseButton && onClose && (
              <IconButton
                aria-label="Cerrar modal"
                icon={<span style={{ fontSize: '1.2rem', lineHeight: 1 }}>✕</span>}
                onClick={onClose}
                variant="ghost"
                size="sm"
              />
            )}
          </div>
        )}

        <div
          className="ui-modal-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            className="ui-modal-footer"
            style={{
              marginTop: 'var(--space-4)',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: 'var(--space-3)',
              justifyContent: 'flex-end'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
