import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function CustomSelect({ value, onChange, options = [], placeholder, required: _required, title }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Close on Escape and prevent body scrolling while picker sheet is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find(opt => String(opt.value) === String(value));

  // Filter options based on search query
  const filteredOptions = searchQuery.trim()
    ? safeOptions.filter(opt => {
        const text = `${opt.label || ''} ${opt.value || ''}`.toLowerCase();
        return text.includes(searchQuery.toLowerCase().trim());
      })
    : safeOptions;

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${isOpen ? 'is-open' : ''}`}
      style={{
        position: 'relative',
        width: '100%'
      }}
    >
      <div
        className={`input-field custom-select-trigger ${isOpen ? 'open' : ''}`}
        style={{
          height: '48px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          borderColor: isOpen ? '#10b981' : '#2a3447',
          boxShadow: 'none',
          backgroundColor: isOpen ? '#1b2230' : '#232c3d',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-secondary)',
          transition: 'border-color 0.2s ease, background-color 0.2s ease',
          userSelect: 'none'
        }}
        onClick={() => setIsOpen(true)}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '0.5rem' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isOpen ? '#10b981' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.2s ease',
            flexShrink: 0
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="custom-select-portal-overlay"
          onClick={() => { setIsOpen(false); setSearchQuery(''); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(9, 13, 20, 0.85)',
            zIndex: 2500,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            animation: 'customSelectFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div
            className="custom-select-portal-sheet"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '82dvh',
              backgroundColor: '#1b2230',
              borderTop: '1px solid #2a3447',
              borderLeft: '1px solid #2a3447',
              borderRight: '1px solid #2a3447',
              borderRadius: '24px 24px 0 0',
              padding: '0.75rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom)) 1.25rem',
              boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'customSelectSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
              boxSizing: 'border-box'
            }}
          >
            {/* Drag handle pill */}
            <div
              style={{
                width: '38px',
                height: '4px',
                backgroundColor: '#334155',
                borderRadius: '9999px',
                margin: '0 auto 0.75rem auto',
                flexShrink: 0
              }}
            />

            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.85rem',
                flexShrink: 0
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#f1f5f9',
                  letterSpacing: '-0.015em'
                }}
              >
                {title || placeholder || 'Seleccionar opción'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsOpen(false); setSearchQuery(''); }}
                style={{
                  background: '#232c3d',
                  border: '1px solid #2a3447',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#94a3b8',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>

            {/* Search bar for > 5 options */}
            {safeOptions.length > 5 && (
              <div style={{ marginBottom: '0.85rem', position: 'relative', flexShrink: 0 }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    height: '42px',
                    fontSize: '0.95rem',
                    paddingLeft: '2.5rem',
                    paddingRight: searchQuery ? '2.2rem' : '1rem',
                    borderRadius: '12px',
                    backgroundColor: '#232c3d',
                    border: '1px solid #2a3447'
                  }}
                  autoFocus
                />
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    pointerEvents: 'none'
                  }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Options list */}
            <div
              className="custom-select-options-list"
              style={{
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                paddingRight: '2px',
                maxHeight: safeOptions.length > 5 ? '55dvh' : '65dvh'
              }}
            >
              {filteredOptions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#98989d', fontSize: '0.95rem' }}>
                  No se encontraron opciones para "{searchQuery}"
                </div>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = String(value) === String(opt.value);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        onChange({ target: { value: opt.value } });
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      style={{
                        minHeight: '50px',
                        padding: '0.75rem 1rem',
                        borderRadius: '14px',
                        border: isSelected
                          ? '1.5px solid #10b981'
                          : '1px solid #2a3447',
                        backgroundColor: isSelected
                          ? '#14332b'
                          : '#232c3d',
                        color: isSelected ? '#10b981' : 'var(--text-primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
                        fontSize: '0.98rem',
                        fontWeight: isSelected ? 600 : 400
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            flexShrink: 0
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
