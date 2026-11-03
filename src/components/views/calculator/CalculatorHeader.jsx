import React from 'react';
import { getIsoDateOffset, formatShortDate } from './calculatorUtils';

export default function CalculatorHeader({
  rateMode,
  setRateMode,
  selectedDate,
  setSelectedDate,
  isFetchingRates,
  isLoadingHistory,
  veRates,
  fetchVeRates,
  fetchRateHistory,
  activeRates,
  resolvedHistoricalEntry,
  minHistoryDate,
  maxHistoryDate,
  onOpenSettings
}) {
  return (
    <>
      {/* ENCABEZADO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="section-title" style={{ padding: 0, color: '#fff', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>
            Tasas y Calculadora
          </h2>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
            {isFetchingRates
              ? 'Actualizando tasas...'
              : ((veRates?.fechaConsulta || veRates?.lastUpdated)
                  ? (() => {
                      const checkDate = veRates.fechaConsulta || veRates.lastUpdated;
                      const msDiff = Date.now() - new Date(checkDate).getTime();
                      if (msDiff > 24 * 60 * 60 * 1000) {
                        return (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                            Consultado: {new Date(checkDate).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        );
                      }
                      return `Consultado: ${new Date(checkDate).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
                    })()
                  : (!activeRates.bcvUsd ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>Sin conexión a tasas</span> : 'Tasas listas'))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              if (fetchVeRates) fetchVeRates(false);
              if (fetchRateHistory) fetchRateHistory();
            }}
            disabled={isFetchingRates || isLoadingHistory}
            title="Actualizar tasas de cambio"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.42rem 0.85rem',
              borderRadius: '12px',
              background: '#14332b',
              border: '1px solid #1f5143',
              color: '#10b981',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: isFetchingRates ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animation: (isFetchingRates || isLoadingHistory) ? 'spin 1s linear infinite' : 'none'
              }}
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>{isFetchingRates ? 'Actualizando' : 'Actualizar'}</span>
          </button>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Ajustes"
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* SELECTOR DE MODO: TASA DE HOY VS TASA DE DÍAS ANTERIORES */}
      <div
        className="segmented-control"
        style={{ marginBottom: '0.85rem' }}
      >
        <button
          type="button"
          className={`segmented-btn ${rateMode === 'current' ? 'active-success' : ''}`}
          onClick={() => setRateMode('current')}
          style={{ fontSize: '0.8rem', padding: '0.5rem 0.65rem', gap: '0.35rem' }}
        >
          <span>⚡</span>
          <span>Tasa de Hoy</span>
        </button>
        <button
          type="button"
          className={`segmented-btn ${rateMode === 'historical' ? 'active-success' : ''}`}
          onClick={() => setRateMode('historical')}
          style={{ fontSize: '0.8rem', padding: '0.5rem 0.65rem', gap: '0.35rem' }}
        >
          <span>📅</span>
          <span>Días Anteriores</span>
        </button>
      </div>

      {/* PANEL DE SELECCIÓN DE FECHA HISTÓRICA */}
      {rateMode === 'historical' && (
        <div
          className="glass-card"
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '14px',
            marginBottom: '0.85rem',
            backgroundColor: '#1b2230',
            border: '1px solid #1f5143'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#10b981' }}>
              📅 Fecha de tasa para el cálculo
            </span>
            {resolvedHistoricalEntry && resolvedHistoricalEntry.date !== selectedDate && (
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                Vigente del {formatShortDate(resolvedHistoricalEntry.date)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.6rem' }}>
            <button
              type="button"
              onClick={() => setSelectedDate(prev => getIsoDateOffset(-1, prev))}
              style={{
                width: '36px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #2a3447',
                background: '#232c3d',
                color: '#f1f5f9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="Día anterior"
              aria-label="Día anterior"
            >
              ‹
            </button>

            <input
              type="date"
              className="input-field"
              value={selectedDate}
              min={minHistoryDate}
              max={maxHistoryDate}
              onChange={e => e.target.value && setSelectedDate(e.target.value)}
              style={{
                height: '38px',
                fontSize: '0.85rem',
                textAlign: 'center',
                fontWeight: 600,
                padding: '0 0.6rem'
              }}
            />

            <button
              type="button"
              onClick={() => {
                const next = getIsoDateOffset(1, selectedDate);
                if (next <= maxHistoryDate) setSelectedDate(next);
              }}
              aria-label="Día siguiente"
              style={{
                width: '36px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #2a3447',
                background: '#232c3d',
                color: '#f1f5f9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title="Día siguiente"
            >
              ›
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Ayer', offset: -1 },
              { label: 'Hace 7 días', offset: -7 },
              { label: 'Hace 15 días', offset: -15 },
              { label: 'Hace 30 días', offset: -30 }
            ].map(shortcut => {
              const targetDate = getIsoDateOffset(shortcut.offset);
              const isSelected = selectedDate === targetDate;
              return (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => setSelectedDate(targetDate)}
                  style={{
                    flex: '1 0 auto',
                    padding: '0.28rem 0.55rem',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: isSelected ? '1px solid #10b981' : '1px solid #2a3447',
                    background: isSelected ? '#14332b' : '#232c3d',
                    color: isSelected ? '#10b981' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {shortcut.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
