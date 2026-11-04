/**
 * Control segmentado: 2 a 4 opciones del mismo grupo, una activa.
 * options: [{ value, label }]; role 'tab' para pestañas o 'radio' para elegir un valor.
 */
export default function SegmentedControl({ options = [], value, onChange, ariaLabel, role = 'tab', className = '' }) {
  const groupRole = role === 'radio' ? 'radiogroup' : 'tablist';
  return (
    <div className={`segmented-control ${className}`.trim()} role={groupRole} aria-label={ariaLabel}>
      {options.map(opt => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role={role}
            {...(role === 'radio' ? { 'aria-checked': isActive } : { 'aria-selected': isActive })}
            className={`segmented-btn${isActive ? ' active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onChange?.(opt.value, opt); }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
