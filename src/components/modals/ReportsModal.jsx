import { useState, useMemo } from 'react';
import {
  exportTransactionsCsvFile,
  calculateMonthlyReportData,
  exportMonthlyReportPdf
} from '../../services/reportService';
import { formatAmount } from '../../utils/formatters';
import { toLocalDateString, parseLocalDate } from '../../utils/dates';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function ReportsModal({
  isOpen,
  onClose,
  transactions = [],
  assets = [],
  budgets = {},
  rates = {},
  showToast
}) {
  const [activeTab, setActiveTab] = useState('csv'); // 'csv' | 'monthly_pdf'

  // Estados para CSV
  const today = new Date();
  const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [csvStartDate, setCsvStartDate] = useState(toLocalDateString(firstDayThisMonth));
  const [csvEndDate, setCsvEndDate] = useState(toLocalDateString(today));
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Estados para Resumen Mensual PDF
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Conteo de transacciones filtradas para el CSV
  const filteredTxsCount = useMemo(() => {
    let list = [...transactions];
    if (csvStartDate) {
      const s = parseLocalDate(csvStartDate);
      s.setHours(0, 0, 0, 0);
      list = list.filter(t => parseLocalDate(toLocalDateString(t.date)) >= s);
    }
    if (csvEndDate) {
      const e = parseLocalDate(csvEndDate);
      e.setHours(23, 59, 59, 999);
      list = list.filter(t => parseLocalDate(toLocalDateString(t.date)) <= e);
    }
    return list.length;
  }, [transactions, csvStartDate, csvEndDate]);

  // Datos calculados para el resumen mensual
  const monthlyData = useMemo(() => {
    return calculateMonthlyReportData({
      transactions,
      assets,
      budgets,
      rates,
      year: selectedYear,
      month: selectedMonth
    });
  }, [transactions, assets, budgets, rates, selectedYear, selectedMonth]);

  if (!isOpen) return null;

  const handleQuickDateFilter = (type) => {
    const now = new Date();
    if (type === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setCsvStartDate(toLocalDateString(start));
      setCsvEndDate(toLocalDateString(now));
    } else if (type === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setCsvStartDate(toLocalDateString(start));
      setCsvEndDate(toLocalDateString(end));
    } else if (type === 'last_90') {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      setCsvStartDate(toLocalDateString(start));
      setCsvEndDate(toLocalDateString(now));
    } else if (type === 'all') {
      setCsvStartDate('');
      setCsvEndDate('');
    }
  };

  const handleDownloadCsv = async () => {
    try {
      setIsExportingCsv(true);
      await exportTransactionsCsvFile({
        transactions,
        startDate: csvStartDate,
        endDate: csvEndDate
      });
      if (showToast) showToast('Reporte CSV exportado');
      onClose();
    } catch (e) {
      console.error('Error al exportar CSV:', e);
      if (showToast) showToast('Error al exportar el archivo CSV', 'error');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportMonthlyReportPdf(monthlyData);
      if (showToast) showToast('Reporte mensual generado');
      onClose();
    } catch (e) {
      console.error('Error al exportar PDF:', e);
      if (showToast) showToast('Error al generar el reporte mensual', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Atrás</span>
          </button>
          <h2>Exportar Reportes</h2>
          <div style={{ width: '64px' }} />
        </div>

        {/* Selector de pestañas */}
        <div className="segmented-control" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`segmented-btn ${activeTab === 'csv' ? 'active' : ''}`}
            onClick={() => setActiveTab('csv')}
          >
            📊 Movimientos (CSV)
          </button>
          <button
            type="button"
            className={`segmented-btn ${activeTab === 'monthly_pdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('monthly_pdf')}
          >
            📑 Resumen Mensual (PDF)
          </button>
        </div>

        {/* PESTAÑA 1: CSV DE MOVIMIENTOS */}
        {activeTab === 'csv' && (
          <div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem', lineHeight: '1.4' }}>
              Exporta tus movimientos con formato optimizado para <strong>Excel en español</strong> (delimitador punto y coma <code>;</code> y coma decimal <code>,</code>).
            </div>

            {/* Accesos rápidos de fechas */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('this_month')}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.74rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Este mes
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('last_month')}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.74rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Mes anterior
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('last_90')}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.74rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Últimos 90 días
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('all')}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.74rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Historial completo
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Desde</label>
                <input
                  type="date"
                  className="input-field"
                  value={csvStartDate}
                  onChange={e => setCsvStartDate(e.target.value)}
                />
              </div>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Hasta</label>
                <input
                  type="date"
                  className="input-field"
                  value={csvEndDate}
                  onChange={e => setCsvEndDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid #2a3447',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Movimientos a exportar:</span>
              <strong style={{ fontSize: '0.95rem', color: '#10b981' }}>{filteredTxsCount}</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadCsv}
                disabled={isExportingCsv || filteredTxsCount === 0}
                style={{ flex: 2 }}
              >
                {isExportingCsv ? 'Exportando...' : '📥 Descargar CSV'}
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: RESUMEN MENSUAL EN PDF */}
        {activeTab === 'monthly_pdf' && (
          <div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem', lineHeight: '1.4' }}>
              Genera una vista imprimible y descargable en PDF con ingresos, gastos por categoría, presupuestos y saldos al cierre.
            </div>

            {/* Selector de Mes y Año */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="input-group" style={{ flex: 2, margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Mes</label>
                <select
                  className="input-field"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                  style={{ cursor: 'pointer' }}
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Año</label>
                <select
                  className="input-field"
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                  style={{ cursor: 'pointer' }}
                >
                  {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tarjeta de vista previa rápida */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid #2a3447',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>
                Resumen de {MONTH_NAMES[selectedMonth]} {selectedYear}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.78rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Ingresos: </span>
                  <strong style={{ color: '#10b981' }}>${formatAmount(monthlyData.totalIncomeUsd, 'USD')}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Gastos: </span>
                  <strong style={{ color: '#ef4444' }}>${formatAmount(monthlyData.totalSpentUsd, 'USD')}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Ahorro: </span>
                  <strong style={{ color: monthlyData.netSavingsUsd >= 0 ? '#10b981' : '#ef4444' }}>
                    ${formatAmount(monthlyData.netSavingsUsd, 'USD')}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Saldos Cierre: </span>
                  <strong style={{ color: '#0284c7' }}>${formatAmount(monthlyData.totalBalancesUsd, 'USD')}</strong>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                {monthlyData.transactionsCount} movimientos en el período • {monthlyData.expensesByCategory.length} categorías de gasto
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                style={{ flex: 2 }}
              >
                {isExportingPdf ? 'Generando...' : '📄 Ver / Imprimir Reporte'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
