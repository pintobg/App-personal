import { formatAmount } from '../../utils/formatters';

/**
 * Componente Amount del Sistema de Diseño
 * REGLA CLAVE: Muestra siempre como cifra principal el monto en la moneda de la cuenta,
 * y la conversión más pequeña debajo en prop secondary.
 */
export default function Amount({
  amount,
  currency = 'USD',
  secondary,
  secondaryCurrency = 'USD',
  secondaryPrefix = '~',
  size = 'base', // 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | 'hero'
  type = 'neutral', // 'neutral' | 'income' | 'expense'
  showSign = false,
  className = '',
  style = {},
  primaryStyle = {},
  secondaryStyle = {},
  ...rest
}) {
  const numAmount = Number(amount) || 0;
  const upperCurr = (currency || '').trim().toUpperCase();

  // Formato de cifra principal según moneda
  let formattedMain = '';
  if (upperCurr === 'VES') {
    formattedMain = `${formatAmount(numAmount, 'VES')} Bs.`;
  } else if (upperCurr === 'USD') {
    formattedMain = `$${formatAmount(numAmount, 'USD')}`;
  } else {
    formattedMain = `${formatAmount(numAmount, upperCurr)} ${upperCurr}`;
  }

  // Signo si aplica
  let sign = '';
  if (showSign) {
    if (type === 'income' || numAmount > 0) sign = '+';
    else if (type === 'expense' || numAmount < 0) sign = '-';
  }

  // Formato de cifra secundaria (conversión)
  let formattedSecondary = null;
  if (secondary != null) {
    if (typeof secondary === 'number') {
      const upperSec = (secondaryCurrency || 'USD').trim().toUpperCase();
      const secText = upperSec === 'USD'
        ? `$${formatAmount(secondary, 'USD')}`
        : upperSec === 'VES'
          ? `${formatAmount(secondary, 'VES')} Bs.`
          : `${formatAmount(secondary, upperSec)} ${upperSec}`;
      formattedSecondary = `${secondaryPrefix}${secText}`;
    } else if (typeof secondary === 'string') {
      formattedSecondary = secondary;
    }
  }

  const sizeMap = {
    xs: { main: 'var(--font-xs)', secondary: '10px' },
    sm: { main: 'var(--font-sm)', secondary: 'var(--font-xs)' },
    base: { main: 'var(--font-base)', secondary: 'var(--font-xs)' },
    lg: { main: 'var(--font-lg)', secondary: 'var(--font-xs)' },
    xl: { main: 'var(--font-xl)', secondary: 'var(--font-sm)' },
    '2xl': { main: 'var(--font-2xl)', secondary: 'var(--font-sm)' },
    hero: { main: 'var(--font-hero)', secondary: 'var(--font-sm)' }
  }[size] || { main: 'var(--font-base)', secondary: 'var(--font-xs)' };

  const colorMap = {
    income: 'var(--color-income)',
    expense: 'var(--color-expense)',
    neutral: 'var(--text-primary)'
  }[type] || 'var(--text-primary)';

  return (
    <div
      className={`ui-amount ${className}`.trim()}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        lineHeight: 1.25,
        ...style
      }}
      {...rest}
    >
      <span
        className="ui-amount-primary"
        style={{
          fontSize: sizeMap.main,
          fontWeight: 700,
          color: colorMap,
          letterSpacing: '-0.02em',
          ...primaryStyle
        }}
      >
        {sign}{formattedMain}
      </span>
      {formattedSecondary && (
        <span
          className="ui-amount-secondary"
          style={{
            fontSize: sizeMap.secondary,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginTop: '2px',
            ...secondaryStyle
          }}
        >
          {formattedSecondary}
        </span>
      )}
    </div>
  );
}
