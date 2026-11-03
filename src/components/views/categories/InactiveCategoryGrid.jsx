import React from 'react';

export default function InactiveCategoryGrid({
  categories,
  onActivate
}) {
  if (categories.length === 0) {
    return (
      <div style={{ padding: '1.25rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '14px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Todas las categorías del catálogo base están activadas.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '0.55rem'
      }}
    >
      {categories.map(cat => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onActivate(cat)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 0.75rem',
            borderRadius: '12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease'
          }}
        >
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{cat.icon || '📦'}</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cat.name}
          </span>
          <span style={{ fontSize: '0.95rem', color: 'var(--color-accent)', fontWeight: 700 }}>+</span>
        </button>
      ))}
    </div>
  );
}
