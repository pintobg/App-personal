import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { exportBackup, validateBackupData } from '../../utils/backup';

const HISTORY_CACHE_KEY = 'veRates_history_v1';

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const m = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} ${months[m] || parts[1]}`;
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const m = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} ${months[m] || parts[1]} ${parts[0]}`;
}

function getIsoDateOffset(daysOffset, baseDateStr) {
  const d = baseDateStr ? new Date(`${baseDateStr}T12:00:00`) : new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

export default function CalculatorView({
  calcBaseCurrency,
  setCalcBaseCurrency,
  calcBaseAmount,
  setCalcBaseAmount,
  veRates,
  setVeRates,
  fetchVeRates,
  isFetchingRates,
  assets,
  transactions,
  obligations,
  budgets = {},
  showToast,
  onInjectTestData,
  auth,
  onOpenAuthModal,
  onSyncNow,
  onRequestConfirm,
  onRestoreBackup
}) {
  const fileInputRef = useRef(null);
  const hasAutoFetchedRef = useRef(false);
  const calculatorTopRef = useRef(null);

  // Modo de tasa en la calculadora: 'current' (Hoy) | 'historical' (Fecha anterior)
  const [rateMode, setRateMode] = useState('current');
  const [selectedDate, setSelectedDate] = useState(() => getIsoDateOffset(-1));

  // Estado del Historial de Tasas
  const [rateHistory, setRateHistory] = useState(() => {
    try {
      const cached = localStorage.getItem(HISTORY_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
          return parsed.items;
        }
      }
    } catch {
      // Ignore cache read errors
    }
    return [];
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyCurrency, setHistoryCurrency] = useState('bcvUsd'); // 'bcvUsd' | 'bcvEur' | 'paralelo'
  const [historyRange, setHistoryRange] = useState(30); // 7 | 15 | 30 | 90

  const fetchRateHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const [resUsd, resEur, resPar] = await Promise.allSettled([
        fetch('https://ve.dolarapi.com/v1/historicos/dolares/oficial'),
        fetch('https://ve.dolarapi.com/v1/historicos/euros/oficial'),
        fetch('https://ve.dolarapi.com/v1/historicos/dolares/paralelo')
      ]);

      const byDate = new Map();

      const ensureDate = (fecha) => {
        if (!byDate.has(fecha)) {
          byDate.set(fecha, { date: fecha, bcvUsd: null, bcvEur: null, paralelo: null });
        }
        return byDate.get(fecha);
      };

      if (resUsd.status === 'fulfilled' && resUsd.value.ok) {
        const list = await resUsd.value.json();
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item?.fecha && Number(item?.promedio) > 0) {
              ensureDate(item.fecha).bcvUsd = Number(Number(item.promedio).toFixed(4));
            }
          });
        }
      }

      if (resEur.status === 'fulfilled' && resEur.value.ok) {
        const list = await resEur.value.json();
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item?.fecha && Number(item?.promedio) > 0) {
              ensureDate(item.fecha).bcvEur = Number(Number(item.promedio).toFixed(4));
            }
          });
        }
      }

      if (resPar.status === 'fulfilled' && resPar.value.ok) {
        const list = await resPar.value.json();
        if (Array.isArray(list)) {
          list.forEach(item => {
            if (item?.fecha && Number(item?.promedio) > 0) {
              ensureDate(item.fecha).paralelo = Number(Number(item.promedio).toFixed(4));
            }
          });
        }
      }

      const sortedDates = Array.from(byDate.keys()).sort();
      if (sortedDates.length > 0) {
        let lastUsd = veRates?.bcvUsd || 0;
        let lastEur = veRates?.bcvEur || 0;
        let lastPar = veRates?.paralelo || 0;

        // Forward-fill para que cada fecha tenga las 3 referencias disponibles
        const merged = sortedDates.map(d => {
          const row = byDate.get(d);
          if (row.bcvUsd) lastUsd = row.bcvUsd;
          if (row.bcvEur) lastEur = row.bcvEur;
          if (row.paralelo) lastPar = row.paralelo;
          return {
            date: d,
            bcvUsd: row.bcvUsd || lastUsd,
            bcvEur: row.bcvEur || lastEur,
            paralelo: row.paralelo || lastPar
          };
        });

        // Guardar los últimos 180 registros para mantener ligereza en localStorage
        const recent = merged.slice(-180);
        setRateHistory(recent);
        try {
          localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify({
            updatedAt: new Date().toISOString(),
            items: recent
          }));
        } catch {
          // Ignore quota errors
        }
      }
    } catch (err) {
      console.error('Error fetching historical VE rates:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [veRates?.bcvUsd, veRates?.bcvEur, veRates?.paralelo]);

  // Actualización Automática Inteligente al montar (sin bucles)
  useEffect(() => {
    if (hasAutoFetchedRef.current) return;

    const tenMinutesMs = 10 * 60 * 1000;
    const shouldFetch =
      !veRates?.lastUpdated ||
      (Date.now() - new Date(veRates.lastUpdated).getTime() > tenMinutesMs);

    hasAutoFetchedRef.current = true;
    if (shouldFetch && typeof fetchVeRates === 'function') {
      fetchVeRates(true);
    }
    fetchRateHistory();
  }, [veRates?.lastUpdated, fetchVeRates, fetchRateHistory]);

  // Resolver la tasa histórica correspondiente a la fecha elegida (o la inmediata anterior si fue fin de semana/feriado)
  const resolvedHistoricalEntry = useMemo(() => {
    if (!rateHistory || rateHistory.length === 0) return null;
    let candidate = rateHistory[0];
    for (let i = 0; i < rateHistory.length; i++) {
      if (rateHistory[i].date <= selectedDate) {
        candidate = rateHistory[i];
      } else {
        break;
      }
    }
    return candidate;
  }, [rateHistory, selectedDate]);

  // Tasas activas en la calculadora (Hoy vs Fecha anterior)
  const activeRates = useMemo(() => {
    if (rateMode === 'historical' && resolvedHistoricalEntry) {
      return {
        bcvUsd: resolvedHistoricalEntry.bcvUsd || veRates.bcvUsd || 0,
        bcvEur: resolvedHistoricalEntry.bcvEur || veRates.bcvEur || 0,
        paralelo: resolvedHistoricalEntry.paralelo || veRates.paralelo || 0,
        custom: veRates.custom || 0
      };
    }
    return {
      bcvUsd: veRates.bcvUsd || 0,
      bcvEur: veRates.bcvEur || 0,
      paralelo: veRates.paralelo || 0,
      custom: veRates.custom || 0
    };
  }, [rateMode, resolvedHistoricalEntry, veRates]);

  // Cálculo reactivo en Bs según la tasa activa (actual o histórica)
  const activeAmountBs = useMemo(() => {
    if (!calcBaseAmount) return '';
    const num = Number(calcBaseAmount);
    if (isNaN(num)) return '';
    switch (calcBaseCurrency) {
      case 'BS': return num;
      case 'BCV_USD': return num * activeRates.bcvUsd;
      case 'PARALELO': return num * activeRates.paralelo;
      case 'EUR': return num * activeRates.bcvEur;
      case 'CUSTOM': return num * (activeRates.custom || 0);
      default: return '';
    }
  }, [calcBaseAmount, calcBaseCurrency, activeRates]);

  // Datos filtrados para el gráfico y tabla de historial
  const historySeries = useMemo(() => {
    if (!rateHistory || rateHistory.length === 0) return [];
    const sliced = rateHistory.slice(-historyRange);
    return sliced.map((item, idx) => {
      const val = Number(item[historyCurrency]) || 0;
      const prevItem = idx > 0 ? sliced[idx - 1] : null;
      const prevVal = prevItem ? (Number(prevItem[historyCurrency]) || 0) : val;
      const diff = val - prevVal;
      const diffPct = prevVal > 0 ? (diff / prevVal) * 100 : 0;
      return {
        ...item,
        label: formatShortDate(item.date),
        value: Number(val.toFixed(2)),
        rawValue: val,
        diff,
        diffPct
      };
    });
  }, [rateHistory, historyRange, historyCurrency]);

  const historyStats = useMemo(() => {
    const valid = historySeries.filter(p => p.rawValue > 0);
    if (valid.length === 0) return { min: 0, max: 0, changePct: 0, changeBs: 0, latest: 0 };
    const values = valid.map(p => p.rawValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const first = valid[0].rawValue;
    const latest = valid[valid.length - 1].rawValue;
    const changeBs = latest - first;
    const changePct = first > 0 ? (changeBs / first) * 100 : 0;
    return { min, max, changeBs, changePct, latest };
  }, [historySeries]);

  const minHistoryDate = rateHistory.length > 0 ? rateHistory[0].date : '2024-01-01';
  const maxHistoryDate = rateHistory.length > 0
    ? rateHistory[rateHistory.length - 1].date
    : new Date().toISOString().split('T')[0];

  const handleSelectDateFromHistory = (dateStr) => {
    setSelectedDate(dateStr);
    setRateMode('historical');
    if (!calcBaseAmount) {
      setCalcBaseCurrency('BCV_USD');
      setCalcBaseAmount('100');
    }
    if (showToast) {
      showToast(`Tasa del ${formatFullDate(dateStr)} cargada en la calculadora`);
    }
    calculatorTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleExport = async () => {
    try {
      const filename = await exportBackup({ assets, transactions, obligations, veRates, budgets });
      if (showToast) {
        showToast(`Copia de seguridad exportada con éxito (${filename})`);
      }
    } catch (err) {
      if (err?.message && String(err.message).toLowerCase().includes('cancel')) {
        return;
      }
      if (showToast) {
        showToast('Error al exportar copia de seguridad', 'error');
      }
      console.error(err);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('El archivo seleccionado no tiene un formato JSON válido.');
      }

      const validation = validateBackupData(data);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const totalAssets = data.assets.length;
      const totalTxs = data.transactions.length;
      const totalObs = data.obligations.length;

      const applyRestore = () => {
        localStorage.setItem('personal_assets', JSON.stringify(data.assets));
        localStorage.setItem('personal_transactions', JSON.stringify(data.transactions));
        localStorage.setItem('obligations', JSON.stringify(data.obligations));
        if (data.veRates) {
          localStorage.setItem('veRates', JSON.stringify(data.veRates));
        }
        if (data.budgets) {
          localStorage.setItem('personal_budgets', JSON.stringify(data.budgets));
        }

        if (onRestoreBackup) {
          onRestoreBackup(data);
        }
        if (showToast) {
          showToast('Copia de seguridad restaurada con éxito');
        }
      };

      if (onRequestConfirm) {
        onRequestConfirm({
          title: 'Restaurar copia de seguridad',
          message: `Se reemplazarán tus datos actuales con:\n• ${totalAssets} cuentas\n• ${totalTxs} movimientos\n• ${totalObs} deudas/créditos\n\nEsta acción no se puede deshacer.`,
          confirmText: 'Restaurar datos',
          variant: 'danger',
          onConfirm: applyRestore
        });
      } else {
        applyRestore();
      }
    } catch (err) {
      const errorMsg = err?.message || 'Archivo de copia de seguridad inválido o corrupto.';
      if (showToast) {
        showToast(errorMsg, 'error');
      }
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const historyCurrencyMeta = {
    bcvUsd: { label: 'USD BCV', subtitle: 'Tasa Oficial BCV', color: '#10b981', fill: '#173332' },
    bcvEur: { label: 'EUR BCV', subtitle: 'Euro Oficial BCV', color: '#3b82f6', fill: '#172742' },
    paralelo: { label: 'Paralelo', subtitle: 'Monitor / Paralelo', color: '#f59e0b', fill: '#312615' }
  }[historyCurrency];

  return (
    <div
      ref={calculatorTopRef}
      className="view-container"
      style={{ padding: '0 1rem calc(90px + env(safe-area-inset-bottom))', marginTop: '1.25rem' }}
    >
      {/* ENCABEZADO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="section-title" style={{ padding: 0, color: '#fff', fontSize: 'clamp(1rem, 4vw, 1.2rem)', margin: 0 }}>
            Calculadora de Cambio
          </h2>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
            {isFetchingRates
              ? 'Actualizando tasas...'
              : (veRates?.lastUpdated
                  ? `Actualizado: ${new Date(veRates.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Tasas listas')}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (fetchVeRates) fetchVeRates(false);
            fetchRateHistory();
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

          {/* Atajos rápidos de fecha */}
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

      {/* MONTO EN BOLÍVARES */}
      <div className="glass-card" style={{ padding: '0.95rem 1.15rem', borderRadius: '16px', marginBottom: '1rem', textAlign: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.35rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}>
          <span>Monto en Bolívares (Bs)</span>
          {rateMode === 'historical' && (
            <span style={{ fontSize: '0.68rem', padding: '1px 7px', borderRadius: '999px', background: '#14332b', color: '#10b981', fontWeight: 600 }}>
              {formatShortDate(selectedDate)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 600, color: '#f1f5f9' }}>Bs.</span>
          <input
            type="number"
            value={calcBaseCurrency === 'BS' ? calcBaseAmount : (activeAmountBs !== '' ? Number(activeAmountBs).toFixed(2) : '')}
            onChange={e => { setCalcBaseCurrency('BS'); setCalcBaseAmount(e.target.value); }}
            style={{ background: 'transparent', border: 'none', borderBottom: '2px solid #10b981', color: '#f1f5f9', fontSize: '1.85rem', fontWeight: 700, width: '160px', textAlign: 'center', outline: 'none' }}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* TARJETAS DE CONVERSIÓN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '0.9rem 1.1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>USD BCV</span>
              {rateMode === 'historical' && (
                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '6px', background: '#14332b', color: '#10b981' }}>
                  Histórico
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Oficial</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', color: '#10b981' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>$</span>
              <input
                type="number"
                value={calcBaseCurrency === 'BCV_USD' ? calcBaseAmount : (activeAmountBs && activeRates.bcvUsd ? (activeAmountBs / activeRates.bcvUsd).toFixed(2) : '')}
                onChange={e => { setCalcBaseCurrency('BCV_USD'); setCalcBaseAmount(e.target.value); }}
                style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '1.2rem', fontWeight: 700, width: '95px', textAlign: 'right', outline: 'none' }}
                placeholder="0.00"
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Tasa: Bs. {activeRates.bcvUsd ? Number(activeRates.bcvUsd).toFixed(2) : '---'}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.9rem 1.1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>USD Paralelo</span>
              {rateMode === 'historical' && (
                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '6px', background: '#312615', color: '#f59e0b' }}>
                  Histórico
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Monitor / EnParalelo</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', color: '#10b981' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>$</span>
              <input
                type="number"
                value={calcBaseCurrency === 'PARALELO' ? calcBaseAmount : (activeAmountBs && activeRates.paralelo ? (activeAmountBs / activeRates.paralelo).toFixed(2) : '')}
                onChange={e => { setCalcBaseCurrency('PARALELO'); setCalcBaseAmount(e.target.value); }}
                style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '1.2rem', fontWeight: 700, width: '95px', textAlign: 'right', outline: 'none' }}
                placeholder="0.00"
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Tasa: Bs. {activeRates.paralelo ? Number(activeRates.paralelo).toFixed(2) : '---'}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.9rem 1.1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>EUR BCV</span>
              {rateMode === 'historical' && (
                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '6px', background: '#172742', color: '#3b82f6' }}>
                  Histórico
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Oficial</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', color: '#3b82f6' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>€</span>
              <input
                type="number"
                value={calcBaseCurrency === 'EUR' ? calcBaseAmount : (activeAmountBs && activeRates.bcvEur ? (activeAmountBs / activeRates.bcvEur).toFixed(2) : '')}
                onChange={e => { setCalcBaseCurrency('EUR'); setCalcBaseAmount(e.target.value); }}
                style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '1.2rem', fontWeight: 700, width: '95px', textAlign: 'right', outline: 'none' }}
                placeholder="0.00"
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Tasa: Bs. {activeRates.bcvEur ? Number(activeRates.bcvEur).toFixed(2) : '---'}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.9rem 1.1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #2a3447' }}>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>Personalizada</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ej. Binance P2P</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', color: '#f59e0b' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>$</span>
              <input
                type="number"
                value={calcBaseCurrency === 'CUSTOM' ? calcBaseAmount : (activeAmountBs && activeRates.custom ? (activeAmountBs / activeRates.custom).toFixed(2) : '')}
                onChange={e => { setCalcBaseCurrency('CUSTOM'); setCalcBaseAmount(e.target.value); }}
                style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '1.2rem', fontWeight: 700, width: '95px', textAlign: 'right', outline: 'none' }}
                placeholder="0.00"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', marginBottom: '0.15rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Tasa:</span>
              <input
                type="number"
                value={veRates.custom || ''}
                onChange={e => setVeRates({ ...veRates, custom: Number(e.target.value) })}
                style={{ background: '#232c3d', border: '1px solid #2a3447', color: '#f1f5f9', width: '68px', padding: '2px 6px', borderRadius: '6px', fontSize: '0.75rem', textAlign: 'right' }}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN HISTORIAL DE TASAS DE CAMBIO */}
      <div className="glass-card" style={{ padding: '1rem 1.1rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#f1f5f9' }}>
              📈 Historial de Tasas de Cambio
            </h3>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
              Evolución diaria en Bolívares (Bs) • Toca una fecha para usarla
            </div>
          </div>
        </div>

        {/* Selector de Moneda del Historial */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }}>
          {[
            { id: 'bcvUsd', label: 'USD BCV', activeBg: '#14332b', activeColor: '#10b981', border: '#1f5143' },
            { id: 'bcvEur', label: 'EUR BCV', activeBg: '#172742', activeColor: '#3b82f6', border: '#203960' },
            { id: 'paralelo', label: 'Paralelo', activeBg: '#312615', activeColor: '#f59e0b', border: '#4d3819' }
          ].map(tab => {
            const active = historyCurrency === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHistoryCurrency(tab.id)}
                style={{
                  flex: 1,
                  padding: '0.42rem 0.5rem',
                  borderRadius: '10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  border: active ? `1px solid ${tab.border}` : '1px solid #2a3447',
                  background: active ? tab.activeBg : '#232c3d',
                  color: active ? tab.activeColor : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Selector de Rango de Días */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {[
              { days: 7, label: '7D' },
              { days: 15, label: '15D' },
              { days: 30, label: '30D' },
              { days: 90, label: '90D' }
            ].map(r => (
              <button
                key={r.days}
                type="button"
                onClick={() => setHistoryRange(r.days)}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  border: historyRange === r.days ? `1px solid ${historyCurrencyMeta.color}` : '1px solid #2a3447',
                  background: historyRange === r.days ? '#232c3d' : 'transparent',
                  color: historyRange === r.days ? '#f1f5f9' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {historySeries.length > 0 && (
            <div style={{ textAlign: 'right', fontSize: '0.72rem' }}>
              <span style={{ color: '#94a3b8' }}>Var. {historyRange}d: </span>
              <span style={{ fontWeight: 700, color: historyStats.changePct >= 0 ? '#f59e0b' : '#10b981' }}>
                {historyStats.changePct >= 0 ? '+' : ''}{historyStats.changePct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Resumen Mínimo / Máximo / Actual */}
        {historySeries.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              marginBottom: '0.75rem',
              padding: '0.55rem 0.65rem',
              borderRadius: '12px',
              background: '#232c3d',
              border: '1px solid #2a3447',
              textAlign: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Mínimo</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>
                Bs. {historyStats.min.toFixed(2)}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #2a3447', borderRight: '1px solid #2a3447' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Máximo</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>
                Bs. {historyStats.max.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Diferencia</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: historyCurrencyMeta.color }}>
                {historyStats.changeBs >= 0 ? '+' : ''}{historyStats.changeBs.toFixed(2)} Bs
              </div>
            </div>
          </div>
        )}

        {/* Gráfico de Evolución de la Tasa */}
        {historySeries.length === 0 ? (
          <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
            {isLoadingHistory ? 'Cargando historial de tasas...' : 'Sin datos históricos disponibles'}
          </div>
        ) : (
          <div style={{ height: '175px', width: '100%', marginBottom: '0.85rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historySeries} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263042" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#2a3447' }}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(v) => Math.round(v)}
                />
                <Tooltip
                  formatter={(value) => [`Bs. ${Number(value).toFixed(2)}`, historyCurrencyMeta.label]}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #2a3447',
                    background: '#171d29',
                    color: '#f1f5f9',
                    fontSize: '0.78rem'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={historyCurrencyMeta.color}
                  strokeWidth={2.2}
                  fillOpacity={1}
                  fill={historyCurrencyMeta.fill}
                  dot={false}
                  activeDot={{ r: 4.5, fill: historyCurrencyMeta.color, stroke: '#f1f5f9', strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabla / Lista Diaria Reciente */}
        {historySeries.length > 0 && (
          <div
            style={{
              maxHeight: '215px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              paddingRight: '2px'
            }}
          >
            {[...historySeries].reverse().map(row => {
              const isSelectedRow = rateMode === 'historical' && selectedDate === row.date;
              return (
                <div
                  key={row.date}
                  onClick={() => handleSelectDateFromHistory(row.date)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.7rem',
                    borderRadius: '10px',
                    background: isSelectedRow ? '#14332b' : '#232c3d',
                    border: isSelectedRow ? '1px solid #10b981' : '1px solid #2a3447',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>
                      {formatFullDate(row.date)}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      {row.diff === 0
                        ? 'Sin variación diaria'
                        : `${row.diff > 0 ? '+' : ''}${row.diff.toFixed(2)} Bs (${row.diffPct > 0 ? '+' : ''}${row.diffPct.toFixed(2)}%)`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: historyCurrencyMeta.color }}>
                        Bs. {row.rawValue.toFixed(2)}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: isSelectedRow ? '#10b981' : '#1b2230',
                        color: isSelectedRow ? '#ffffff' : '#94a3b8',
                        border: '1px solid #2a3447'
                      }}
                    >
                      {isSelectedRow ? 'En uso' : 'Usar'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN SINCRONIZACIÓN EN LA NUBE */}
      <div className="glass-card" style={{ padding: '1rem 1.15rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>☁️</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9' }}>Sincronización en la Nube</h3>
          </div>
          <span style={{
            fontSize: '0.72rem',
            padding: '3px 8px',
            borderRadius: '8px',
            background: auth?.user ? '#14332b' : '#232c3d',
            color: auth?.user ? '#10b981' : '#94a3b8',
            fontWeight: 600
          }}>
            {auth?.user ? 'Multidispositivo' : 'Modo Local'}
          </span>
        </div>

        <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>
          {auth?.user
            ? `Conectado como ${auth.user.email}. Tus datos se respaldan y sincronizan automáticamente.`
            : 'Usa la app en modo local o inicia sesión para sincronizar tus finanzas en todos tus dispositivos.'}
        </p>

        {auth?.user ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 0.85rem',
              borderRadius: '12px',
              background: '#232c3d',
              border: '1px solid #2a3447',
              fontSize: '0.82rem'
            }}>
              <span style={{ color: '#94a3b8' }}>Estado de sincronización:</span>
              <span style={{
                fontWeight: 600,
                color: auth.syncStatus === 'synced' ? '#10b981' : auth.syncStatus === 'syncing' ? '#3b82f6' : auth.syncStatus === 'offline' ? '#f59e0b' : '#ef4444'
              }}>
                {auth.syncStatus === 'synced' && '● Al día'}
                {auth.syncStatus === 'syncing' && '🔄 Sincronizando...'}
                {auth.syncStatus === 'offline' && '⚠️ Sin conexión'}
                {auth.syncStatus === 'error' && '✕ Error'}
                {auth.syncStatus === 'guest' && '👤 Local'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onSyncNow}
                style={{
                  flex: 1,
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #1f5143',
                  background: '#14332b',
                  color: '#10b981',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                Sincronizar
              </button>
              <button
                type="button"
                onClick={onOpenAuthModal}
                style={{
                  flex: 1,
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #2a3447',
                  background: '#232c3d',
                  color: '#f1f5f9',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Mi Cuenta
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuthModal}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              border: '1px solid #1f5143',
              background: '#14332b',
              color: '#10b981',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
            </svg>
            Iniciar Sesión / Activar Sincronización
          </button>
        )}
      </div>

      {/* SECCIÓN RESPALDO Y DATOS */}
      <div className="glass-card" style={{ padding: '1rem 1.15rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>💾</span>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9' }}>Respaldo y Datos</h3>
        </div>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>
          Guarda o recupera localmente tus cuentas, transacciones y deudas en formato JSON.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn"
            onClick={handleExport}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              border: '1px solid #1f5143',
              background: '#14332b',
              color: '#10b981',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Exportar Copia de Seguridad
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              border: '1px solid #203960',
              background: '#172742',
              color: '#3b82f6',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Restaurar Copia de Seguridad
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => window.dispatchEvent(new CustomEvent('finanzas:check-update'))}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              border: '1px solid #2a3447',
              background: '#232c3d',
              color: '#f1f5f9',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            🔄 Buscar Actualización de la App
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={onInjectTestData}
          style={{ background: '#311b22', color: '#ef4444', border: '1px solid #4d2631', padding: '10px 20px', borderRadius: '12px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          🛠 Reemplazar por Datos de Prueba
        </button>
      </div>
    </div>
  );
}
