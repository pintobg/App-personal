export default function ReferenceRateSelector({ referenceRate = 'bcv', setReferenceRate }) {
  const options = [
    { id: 'bcv', label: 'BCV' },
    { id: 'paralelo', label: 'Paralelo' },
    { id: 'custom', label: 'Personalizada' }
  ];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#131b26',
        border: '1px solid #253146',
        borderRadius: '8px',
        padding: '2px',
        gap: '2px'
      }}
      role="group"
      aria-label="Tasa de referencia"
    >
      {options.map((opt) => {
        const isActive = (referenceRate || 'bcv') === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (setReferenceRate) setReferenceRate(opt.id);
            }}
            style={{
              background: isActive ? '#10b981' : 'transparent',
              color: isActive ? '#09241b' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              lineHeight: 1.2
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
