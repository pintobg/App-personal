/**
 * Componente Card del Sistema de Diseño
 * Proporciona un contenedor de superficie consistente con bordes, radios y sombras basadas en tokens.
 */
export default function Card({
  children,
  className = '',
  variant = 'default', // 'default' | 'elevated' | 'outlined' | 'interactive'
  onClick,
  style = {},
  as: Component = 'div',
  ...rest
}) {
  const isInteractive = Boolean(onClick) || variant === 'interactive';

  const baseStyle = {
    backgroundColor: variant === 'elevated'
      ? 'var(--bg-surface-elevated)'
      : variant === 'outlined'
        ? 'transparent'
        : 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: variant === 'elevated' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
    padding: 'var(--space-4)',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
    cursor: isInteractive ? 'pointer' : undefined,
    boxSizing: 'border-box',
    ...style
  };

  return (
    <Component
      className={`ui-card ${isInteractive ? 'ui-card-interactive' : ''} ${className}`.trim()}
      style={baseStyle}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Component>
  );
}
