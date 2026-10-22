export default function BottomNav({ currentPage, onSelectPage }) {
  return (
    <nav className="floating-nav bottom-nav">
      <button
        className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
        onClick={() => onSelectPage('dashboard')}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
        Inicio
      </button>

      <button
        className={`nav-item ${currentPage === 'balances' ? 'active' : ''}`}
        onClick={() => onSelectPage('balances')}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          <rect x="14" y="9" width="7" height="6" rx="1.5" />
          <circle cx="17" cy="12" r="0.8" fill="currentColor" />
        </svg>
        Cuentas
      </button>

      <button
        className={`nav-item ${currentPage === 'transactions' ? 'active' : ''}`}
        onClick={() => onSelectPage('transactions')}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 20V4m0 0L3 8m4-4 4 4" />
          <path d="M17 4v16m0 0 4-4m-4 4-4-4" />
        </svg>
        Movimientos
      </button>

      <button
        className={`nav-item ${currentPage === 'obligations' ? 'active' : ''}`}
        onClick={() => onSelectPage('obligations')}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2h12a2 2 0 0 1 2 2v17l-3-2-3 2-3-2-3 2-3-2V4a2 2 0 0 1 2-2z" />
          <path d="M12 6.5v8" />
          <path d="M14.2 8.5a1.8 1.3 0 0 0-2.2-1.2h-.8a1.3 1.3 0 0 0 0 2.6h1.6a1.3 1.3 0 0 1 0 2.6H12a1.8 1.3 0 0 1-2.2-1.2" />
        </svg>
        Deudas
      </button>

      <button
        className={`nav-item ${currentPage === 'calculator' ? 'active' : ''}`}
        onClick={() => onSelectPage('calculator')}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 2.1l4 4-4 4" />
          <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
          <path d="M7 21.9l-4-4 4-4" />
          <path d="M21 13v1a4 4 0 0 1-4 4H3" />
          <path d="M12 8.5v7" />
          <path d="M13.8 10.2a1.5 1.1 0 0 0-1.8-.9h-.7a1.1 1.1 0 0 0 0 2.2h1.4a1.1 1.1 0 0 1 0 2.2H12a1.5 1.1 0 0 1-1.8-.9" />
        </svg>
        Cambio
      </button>
    </nav>
  );
}
