import { useId, useState } from 'react';

/**
 * Botón "?" que muestra una explicación corta debajo, en palabras simples.
 * Úsalo junto a términos que no todos conocen (tasa, diferencia, comisión).
 */
export default function InfoHint({ label = 'Qué significa', children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="info-hint">
      <button
        type="button"
        className="info-hint-btn"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
      >
        ?
      </button>
      {open && (
        <span id={id} role="note" className="info-hint-text">{children}</span>
      )}
    </span>
  );
}
