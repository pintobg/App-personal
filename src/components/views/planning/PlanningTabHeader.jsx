import React from 'react';

/**
 * Encabezado de cada pestaña de Planificar: una frase de ayuda y, como máximo, dos acciones.
 * actions: [{ label, onClick, primary, ariaLabel }]
 */
export default function PlanningTabHeader({ hint, actions = [] }) {
  const visible = actions.filter(Boolean);
  return (
    <div className="tab-header">
      <p className="tab-header-hint">{hint}</p>
      {visible.length > 0 && (
        <div className="tab-header-actions">
          {visible.map(action => (
            <button
              key={action.label}
              type="button"
              className={`tab-action-btn${action.primary ? ' primary' : ''}`}
              onClick={action.onClick}
              aria-label={action.ariaLabel || action.label}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
