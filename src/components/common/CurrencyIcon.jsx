import { useState } from 'react';

const CURRENCY_META = {
  // Fiat currencies
  VES: { bg: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)', border: '#2563eb', color: '#f8fafc', label: 'Bs.' },
  USD: { bg: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)', border: '#10b981', color: '#34d399', label: '$' },
  EUR: { bg: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)', border: '#3b82f6', color: '#fbbf24', label: '€' },
  GBP: { bg: 'linear-gradient(135deg, #4c1d95 0%, #2e1065 100%)', border: '#8b5cf6', color: '#ddd6fe', label: '£' },
  COP: { bg: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)', border: '#f59e0b', color: '#fcd34d', label: 'Col$' },
  ARS: { bg: 'linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)', border: '#38bdf8', color: '#7dd3fc', label: 'Ar$' },
  BRL: { bg: 'linear-gradient(135deg, #14532d 0%, #052e16 100%)', border: '#22c55e', color: '#fde047', label: 'R$' },
  MXN: { bg: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', border: '#10b981', color: '#6ee7b7', label: 'Mex$' },
  CLP: { bg: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)', border: '#ef4444', color: '#fca5a5', label: 'CLP$' },
  PEN: { bg: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)', border: '#f43f5e', color: '#fda4af', label: 'S/' },
  CAD: { bg: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)', border: '#f87171', color: '#fecaca', label: 'C$' },
  CHF: { bg: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)', border: '#ef4444', color: '#ffffff', label: 'CHF' },
  JPY: { bg: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)', border: '#6366f1', color: '#c7d2fe', label: '¥' },
  CNY: { bg: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)', border: '#f59e0b', color: '#fde047', label: '¥' },

  // Crypto currencies
  USDT: { bg: '#26A17B', border: 'none', color: '#ffffff' },
  USDC: { bg: '#2775CA', border: 'none', color: '#ffffff' },
  BTC: { bg: '#F7931A', border: 'none', color: '#ffffff' },
  ETH: { bg: '#627EEA', border: 'none', color: '#ffffff' },
  BNB: { bg: '#F0B90B', border: 'none', color: '#ffffff' },
  SOL: { bg: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)', border: 'none', color: '#ffffff' },
  XRP: { bg: '#23292F', border: '1px solid #38444d', color: '#ffffff' },
  LTC: { bg: '#345D9D', border: 'none', color: '#ffffff' },
  ZEC: { bg: '#F4B728', border: 'none', color: '#111827' },
  DASH: { bg: '#008CE7', border: 'none', color: '#ffffff' },
  DOGE: { bg: '#C2A633', border: 'none', color: '#ffffff' },
  ADA: { bg: '#0033AD', border: 'none', color: '#ffffff' },
  TRX: { bg: '#EF0027', border: 'none', color: '#ffffff' },
  TON: { bg: '#0098EA', border: 'none', color: '#ffffff' },
  AVAX: { bg: '#E84142', border: 'none', color: '#ffffff' },
  DOT: { bg: '#E6007A', border: 'none', color: '#ffffff' },
  LINK: { bg: '#2A5ADA', border: 'none', color: '#ffffff' },
  MATIC: { bg: '#8247E5', border: 'none', color: '#ffffff' },
  POL: { bg: '#8247E5', border: 'none', color: '#ffffff' },
  DAI: { bg: '#F5AC37', border: 'none', color: '#ffffff' },
  FDUSD: { bg: '#00E3A5', border: 'none', color: '#0b141a' }
};

function renderOfficialSvg(sym, iconSize) {
  switch (sym) {
    case 'VES':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#f8fafc"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="800"
            fontSize="13.5"
            letterSpacing="-0.5"
          >
            Bs.
          </text>
          <path d="M7 25.5C10.5 23.5 21.5 23.5 25 25.5" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'USD':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="2" x2="12" y2="22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );

    case 'EUR':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.5 5.5A7.5 7.5 0 0 0 6 12a7.5 7.5 0 0 0 12.5 6.5" />
          <line x1="4" y1="10" x2="14" y2="10" />
          <line x1="4" y1="14" x2="13" y2="14" />
        </svg>
      );

    case 'GBP':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#ddd6fe" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 19H7l1.5-5.5V9a4.5 4.5 0 0 1 9 0" />
          <line x1="6" y1="13" x2="14" y2="13" />
        </svg>
      );

    case 'USDT':
      // Official Tether (₮) logo
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path
            fill="#ffffff"
            d="M17.92 14.33v-2.42h5.48V8.27H8.6v3.64h5.48v2.42c-4.46.2-7.82 1.07-7.82 2.11s3.36 1.91 7.82 2.11v7.55h3.84v-7.55c4.46-.2 7.82-1.07 7.82-2.11s-3.36-1.91-7.82-2.11zm0 3.57v-.01c-.59.04-1.24.06-1.92.06-.68 0-1.33-.02-1.92-.06v.01c-3.82-.17-6.67-.84-6.67-1.64 0-.8 2.85-1.47 6.67-1.64v2.62c.6.04 1.25.07 1.92.07.67 0 1.32-.03 1.92-.07v-2.62c3.82.17 6.67.84 6.67 1.64 0 .8-2.85 1.47-6.67 1.64z"
          />
        </svg>
      );

    case 'USDC':
      // Official Circle USD Coin (USDC) logo: outer brackets + inner $
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path
            d="M12.2 6.8C8.6 8.3 6 11.8 6 16s2.6 7.7 6.2 9.2"
            stroke="#ffffff"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path
            d="M19.8 6.8C23.4 8.3 26 11.8 26 16s-2.6 7.7-6.2 9.2"
            stroke="#ffffff"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path
            d="M16 9.2v13.6"
            stroke="#ffffff"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M18.8 12.2c0-1.2-1.25-2-2.8-2s-2.8.8-2.8 2c0 1.25 1.15 1.75 2.8 2.15 1.65.4 2.8.95 2.8 2.25 0 1.3-1.25 2.1-2.8 2.1s-2.8-.8-2.8-2.1"
            stroke="#ffffff"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'BTC':
      // Official Bitcoin (₿) logo
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path
            fill="#ffffff"
            d="M22.4 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.6 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.6-1.7-.4-.7 2.7c-.4-.1-.7-.2-1.1-.3l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c.1 0 .2.1.3.1l-.3-.1-1.1 4.5c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.2 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4.1 1-5.2.7l.9-3.7c1.1.3 4.8.8 4.3 3zm.5-5.4c-.5 1.9-3.4.9-4.4.7l.8-3.4c1 .2 4.1.7 3.6 2.7z"
          />
        </svg>
      );

    case 'ETH':
      // Official Ethereum diamond logo
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <polygon fill="#ffffff" fillOpacity="0.65" points="16,5 16,13.2 22.8,16.2" />
          <polygon fill="#ffffff" points="16,5 9.2,16.2 16,13.2" />
          <polygon fill="#ffffff" fillOpacity="0.65" points="16,21.5 16,27 22.8,17.5" />
          <polygon fill="#ffffff" points="16,27 16,21.5 9.2,17.5" />
          <polygon fill="#ffffff" fillOpacity="0.45" points="16,20.2 22.8,16.2 16,13.2" />
          <polygon fill="#ffffff" fillOpacity="0.8" points="9.2,16.2 16,20.2 16,13.2" />
        </svg>
      );

    case 'BNB':
      // Official Binance BNB diamond star logo
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path
            fill="#ffffff"
            d="M12.12 13.5l3.88-3.88 3.88 3.88 2.26-2.26L16 5.1l-6.14 6.14 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.12 2.5L16 22.38l3.88-3.88 2.26 2.26L16 26.9l-6.14-6.14 2.26-2.26zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zM18.3 16L16 13.7 13.7 16 16 18.3 18.3 16z"
          />
        </svg>
      );

    case 'SOL':
      // Official Solana 3 bars logo
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path fill="#ffffff" d="M8.5 20.8c.2-.2.5-.3.8-.3h15.2c.7 0 1 .8.5 1.3l-2.5 2.5c-.2.2-.5.3-.8.3H6.5c-.7 0-1-.8-.5-1.3l2.5-2.5z" />
          <path fill="#ffffff" d="M8.5 7.7c.2-.2.5-.3.8-.3h15.2c.7 0 1 .8.5 1.3l-2.5 2.5c-.2.2-.5.3-.8.3H6.5c-.7 0-1-.8-.5-1.3l2.5-2.5z" />
          <path fill="#ffffff" d="M23.5 14.2c-.2-.2-.5-.3-.8-.3H7.5c-.7 0-1 .8-.5 1.3l2.5 2.5c.2.2.5.3.8.3h15.2c.7 0 1-.8.5-1.3l-2.5-2.5z" />
        </svg>
      );

    case 'LTC':
      // Official Litecoin (Ł) logo
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path
            fill="#ffffff"
            d="M11.6 19.3l-1.4.5.6-2.3 1.4-.5 2.1-8h4.2l-1.5 5.8 1.4-.5-.6 2.3-1.4.5-.8 3.2h7.6l-.8 3.2H9.8l1.8-4.2z"
          />
        </svg>
      );

    case 'ZEC':
      // Official Zcash (ⓩ) logo
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path
            fill="#111827"
            d="M14.5 6h3v2.8h4.7v2.7l-7.1 9h7.1v3.2h-4.7V26h-3v-2.3H9.8V21l7.1-9H9.8V8.8h4.7V6z"
          />
        </svg>
      );

    case 'XRP':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path
            fill="#ffffff"
            d="M22.7 8h2.8l-5.8 5.7c-2.1 2-5.3 2-7.4 0L6.5 8h2.8l4.4 4.3c1.3 1.3 3.3 1.3 4.6 0L22.7 8zM9.3 24H6.5l5.8-5.7c2.1-2 5.3-2 7.4 0l5.8 5.7h-2.8l-4.4-4.3c-1.3-1.3-3.3-1.3-4.6 0L9.3 24z"
          />
        </svg>
      );

    case 'DOGE':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path
            fill="#ffffff"
            d="M10 8h6.5c4.5 0 7.5 3.1 7.5 8s-3 8-7.5 8H10V17.2H8v-2.4h2V8zm3.4 3v3.8h3.4v2.4h-3.4V21h3c2.7 0 4.2-1.8 4.2-5s-1.5-5-4.2-5h-3z"
          />
        </svg>
      );

    case 'TRX':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path
            stroke="#ffffff"
            strokeWidth="1.9"
            strokeLinejoin="round"
            d="M7 7.5l17.5 3.2L15.2 26 7 7.5zm0 0l9.6 8.3m7.9-5.1l-7.9 5.1m0 0L15.2 26"
          />
        </svg>
      );

    case 'TON':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
          <path
            stroke="#ffffff"
            strokeWidth="2.1"
            strokeLinejoin="round"
            d="M9.5 9h13c1.4 0 2.2 1.5 1.5 2.7L16 25 8 11.7C7.3 10.5 8.1 9 9.5 9zm6.5 0v15.5"
          />
        </svg>
      );

    default:
      return null;
  }
}

export default function CurrencyIcon({ symbol, type = 'fiat', size = 36 }) {
  const sym = (symbol || '').trim().toUpperCase();
  const [imgStage, setImgStage] = useState(0); // 0: primary CDN, 1: secondary CDN, 2: fallback text

  const meta = CURRENCY_META[sym];
  const iconSize = Math.round(size * 0.64);
  const inlineSvg = renderOfficialSvg(sym, iconSize);

  const isCrypto = type === 'crypto' || (!['VES', 'USD', 'EUR', 'GBP', 'COP', 'ARS', 'BRL', 'MXN', 'CLP', 'PEN', 'CAD', 'CHF', 'JPY', 'CNY'].includes(sym) && type !== 'fiat');

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: `${Math.round(size * 0.28)}px`,
    background: meta?.bg || (isCrypto ? '#1e293b' : '#14332b'),
    border: meta?.border ? (meta.border === 'none' ? 'none' : `1px solid ${meta.border}`) : '1px solid #2a3447',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: meta?.color || '#ffffff',
    fontWeight: 800,
    fontSize: `${Math.max(10, Math.round(size * 0.34))}px`,
    flexShrink: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    userSelect: 'none'
  };

  if (inlineSvg) {
    return (
      <div style={containerStyle} title={sym}>
        {inlineSvg}
      </div>
    );
  }

  if (meta?.label) {
    return (
      <div style={containerStyle} title={sym}>
        <span style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>{meta.label}</span>
      </div>
    );
  }

  // Dynamic official crypto icon from public CDNs for any Binance token
  if (sym && imgStage < 2) {
    const lower = sym.toLowerCase();
    const src = imgStage === 0
      ? `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${lower}.svg`
      : `https://assets.coincap.io/assets/icons/${lower}@2x.png`;

    return (
      <div
        style={{
          ...containerStyle,
          background: '#1b2230',
          border: '1px solid #2a3447'
        }}
        title={sym}
      >
        <img
          src={src}
          alt={sym}
          width={Math.round(size * 0.72)}
          height={Math.round(size * 0.72)}
          style={{ objectFit: 'contain', borderRadius: '50%' }}
          onError={() => setImgStage(prev => prev + 1)}
        />
      </div>
    );
  }

  // Fallback badge with up to 4 characters of symbol
  return (
    <div style={containerStyle} title={sym}>
      <span style={{ fontSize: sym.length > 3 ? `${Math.max(9, Math.round(size * 0.27))}px` : undefined }}>
        {sym.slice(0, 4) || '?'}
      </span>
    </div>
  );
}
