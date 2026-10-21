export default function BottomNav({ currentPage, onSelectPage }) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
        onClick={() => onSelectPage('dashboard')}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
        Inicio
      </button>

      <button
        className={`nav-btn ${currentPage === 'balances' ? 'active' : ''}`}
        onClick={() => onSelectPage('balances')}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        Cuentas
      </button>

      <button
        className={`nav-btn ${currentPage === 'transactions' ? 'active' : ''}`}
        onClick={() => onSelectPage('transactions')}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        Movimientos
      </button>

      <button
        className={`nav-btn ${currentPage === 'obligations' ? 'active' : ''}`}
        onClick={() => onSelectPage('obligations')}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        Deudas
      </button>

      <button
        className={`nav-btn ${currentPage === 'calculator' ? 'active' : ''}`}
        onClick={() => onSelectPage('calculator')}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <path d="M21 13v1a4 4 0 0 1-4 4H3" />
          <path d="M12 8.5v7" />
          <path d="M13.8 10.2a1.5 1.1 0 0 0-1.8-.9h-.7a1.1 1.1 0 0 0 0 2.2h1.4a1.1 1.1 0 0 1 0 2.2H12a1.5 1.1 0 0 1-1.8-.9" />
        </svg>
        Cambio
      </button>
    </nav>
  );
}
