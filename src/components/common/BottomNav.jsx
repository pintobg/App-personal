export default function BottomNav({ currentPage, onSelectPage }) {
  return (
    <nav className="floating-nav bottom-nav">
      {/* 1. INICIO */}
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

      {/* 2. MOVIMIENTOS */}
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

      {/* 3. CUENTAS */}
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

      {/* 4. PLANIFICAR */}
      <button
        className={`nav-item ${currentPage === 'planning' || currentPage === 'obligations' ? 'active' : ''}`}
        onClick={() => onSelectPage('planning')}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <path d="m9 16 2 2 4-4"></path>
        </svg>
        Planificar
      </button>

      {/* 5. TASAS */}
      <button
        className={`nav-item ${currentPage === 'rates' || currentPage === 'calculator' ? 'active' : ''}`}
        onClick={() => onSelectPage('rates')}
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
        Tasas
      </button>
    </nav>
  );
}
