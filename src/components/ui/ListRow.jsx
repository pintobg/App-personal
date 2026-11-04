import Icon from './Icon';

/**
 * Fila de lista estándar (mínimo 56 px): ícono opcional, título, línea secundaria y valor a la derecha.
 * Si recibe onClick es un botón; con chevron muestra la flecha de "ir a".
 */
export default function ListRow({ icon, title, sub, subTone, value, valueSub, valueTone, chevron = false, onClick, ariaLabel, className = '' }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick, 'aria-label': ariaLabel } : {})}
      className={`list-row ${className}`.trim()}
    >
      {icon && <span className="list-row-icon">{icon}</span>}
      <span className="list-row-main">
        <span className="list-row-title">{title}</span>
        {sub && <span className={`list-row-sub${subTone ? ` ${subTone}` : ''}`}>{sub}</span>}
      </span>
      {(value != null || valueSub) && (
        <span className="list-row-value">
          {value != null && <span className={`amount${valueTone ? ` ${valueTone}` : ''}`}>{value}</span>}
          {valueSub && <span className="amount-sub">{valueSub}</span>}
        </span>
      )}
      {chevron && <span className="list-row-chevron"><Icon name="chevronRight" size={18} /></span>}
    </Tag>
  );
}
