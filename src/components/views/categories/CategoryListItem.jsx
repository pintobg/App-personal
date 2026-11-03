import React from 'react';
import { IconButton } from '../../ui';
import { tint } from '../../../utils/colors';

export default function CategoryListItem({
  category,
  index,
  totalCount,
  subcategoriesCount,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  onMoveUp,
  onMoveDown,
  onHide
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1rem',
        borderRadius: '14px',
        background: 'var(--bg-surface)',
        border: isDragging ? '2px dashed var(--color-accent)' : '1px solid var(--border-color)',
        opacity: isDragging ? 0.4 : 1,
        cursor: 'pointer',
        transition: 'background 0.15s ease, border 0.15s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: tint(category.color || 'var(--color-info)', 0.13),
            border: `1.5px solid ${tint(category.color || 'var(--color-info)', 0.27)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            flexShrink: 0
          }}
        >
          {category.icon || '🏷️'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {category.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {subcategoriesCount === 0 ? 'Sin subcategorías' : `${subcategoriesCount} subcategoría(s)`}
            {category.is_custom && ' • Personalizada'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={(e) => e.stopPropagation()}>
        <IconButton
          icon={<span style={{ fontSize: '0.85rem' }}>▲</span>}
          aria-label={`Mover ${category.name} hacia arriba`}
          size="sm"
          disabled={index === 0}
          onClick={onMoveUp}
        />
        <IconButton
          icon={<span style={{ fontSize: '0.85rem' }}>▼</span>}
          aria-label={`Mover ${category.name} hacia abajo`}
          size="sm"
          disabled={index === totalCount - 1}
          onClick={onMoveDown}
        />
        <IconButton
          icon={<span style={{ fontSize: '0.95rem' }}>👁️</span>}
          aria-label={`Ocultar ${category.name}`}
          title="Ocultar del selector"
          size="sm"
          onClick={onHide}
        />
      </div>
    </div>
  );
}
