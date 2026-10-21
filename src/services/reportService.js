import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { convert, add, sub, round } from '../domain/money';
import { toLocalDateString, parseLocalDate } from '../utils/dates';
import { formatAmount } from '../utils/formatters';

/**
 * Formatea un número para Excel en español:
 * Separador decimal con coma ',' y sin puntos de miles para evitar confusión en fórmulas.
 */
function formatNumberForCsv(num, decimals = 2) {
  if (num == null || isNaN(Number(num))) return '';
  return Number(num).toFixed(decimals).replace('.', ',');
}

/**
 * Escapa valores para CSV: si contiene comillas, punto y coma o saltos de línea,
 * los envuelve en comillas y duplica comillas internas.
 */
function escapeCsvValue(val) {
  if (val == null) return '';
  const str = String(val).trim();
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Traduce el tipo técnico de transacción a un nombre legible en español.
 */
function getDisplayType(tx) {
  switch (tx.type) {
    case 'income':
      return 'Ingreso';
    case 'spent':
      return 'Gasto';
    case 'transfer':
      return 'Transferencia';
    case 'adjustment':
      return 'Ajuste';
    default:
      return tx.type || 'Movimiento';
  }
}

/**
 * Genera el string CSV de movimientos filtrado por fechas.
 * Criterio: separador ';' y decimales con ',' para abrir directo en Excel en español.
 *
 * @param {Array} transactions - Lista de movimientos
 * @param {Object} [options]
 * @param {string} [options.startDate] - YYYY-MM-DD
 * @param {string} [options.endDate] - YYYY-MM-DD
 * @returns {string} Contenido CSV con BOM UTF-8
 */
export function generateTransactionsCsv(transactions = [], { startDate, endDate } = {}) {
  let filtered = [...transactions];

  if (startDate) {
    const start = parseLocalDate(startDate);
    start.setHours(0, 0, 0, 0);
    filtered = filtered.filter(tx => {
      const d = parseLocalDate(toLocalDateString(tx.date));
      return d >= start;
    });
  }

  if (endDate) {
    const end = parseLocalDate(endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(tx => {
      const d = parseLocalDate(toLocalDateString(tx.date));
      return d <= end;
    });
  }

  // Ordenar por fecha descendente
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Encabezados requeridos:
  // fecha, tipo, cuenta, moneda, monto, tasa, equivalente en $, categoría, notas
  const headers = [
    'Fecha',
    'Tipo',
    'Cuenta',
    'Moneda',
    'Monto',
    'Tasa',
    'Equivalente en $',
    'Categoría',
    'Notas'
  ];

  const rows = filtered.map(tx => {
    const dateStr = toLocalDateString(tx.date);
    const typeStr = getDisplayType(tx);

    let accountStr = tx.origin || '';
    if (tx.type === 'transfer' && tx.destOrigin) {
      accountStr = `${tx.origin || 'Origen'} -> ${tx.destOrigin}`;
    }

    const currencyStr = tx.currency || '';
    const amountStr = formatNumberForCsv(tx.amount, 2);
    const rateStr = tx.rateSnapshot != null ? formatNumberForCsv(tx.rateSnapshot, 4) : '';
    const usdEquivStr = tx.usdEquivalent != null ? formatNumberForCsv(tx.usdEquivalent, 2) : '';

    let categoryStr = tx.category || '';
    if (tx.subcategory) {
      categoryStr = `${categoryStr} - ${tx.subcategory}`;
    }

    const notesStr = tx.notes || tx.description || tx.title || '';

    return [
      escapeCsvValue(dateStr),
      escapeCsvValue(typeStr),
      escapeCsvValue(accountStr),
      escapeCsvValue(currencyStr),
      amountStr,
      rateStr,
      usdEquivStr,
      escapeCsvValue(categoryStr),
      escapeCsvValue(notesStr)
    ].join(';');
  });

  // \uFEFF es el BOM (Byte Order Mark) para UTF-8 que hace que Excel abra acentos y caracteres especiales correctamente
  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

/**
 * Descarga o comparte el archivo CSV según la plataforma (Web o Capacitor Nativo).
 */
export async function exportTransactionsCsvFile({ transactions = [], startDate, endDate }) {
  const csvContent = generateTransactionsCsv(transactions, { startDate, endDate });

  const now = new Date();
  const dateSuffix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `movimientos_${dateSuffix}.csv`;

  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: csvContent,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });

    await Share.share({
      title: 'Reporte de Movimientos',
      text: `Exportación de movimientos al ${dateSuffix}`,
      url: written.uri,
      dialogTitle: 'Compartir reporte CSV'
    });

    return filename;
  }

  // Web Browser
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Calcula los datos para el resumen mensual:
 * ingresos, gastos por categoría, presupuestos y saldos al cierre.
 */
export function calculateMonthlyReportData({
  transactions = [],
  assets = [],
  budgets = {},
  rates = {},
  year = new Date().getFullYear(),
  month = new Date().getMonth() // 0-indexado
}) {
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  // Filtrar transacciones del mes
  const monthTxs = transactions.filter(tx => {
    const d = parseLocalDate(toLocalDateString(tx.date));
    return d >= startOfMonth && d <= endOfMonth;
  });

  let totalIncomeUsd = 0;
  let totalSpentUsd = 0;
  const categorySpentMap = {};

  monthTxs.forEach(tx => {
    let usdVal = 0;
    if (tx.usdEquivalent != null && Number(tx.usdEquivalent) > 0) {
      usdVal = Number(tx.usdEquivalent);
    } else {
      usdVal = convert(Number(tx.amount) || 0, tx.currency, 'USD', rates);
    }

    if (tx.type === 'income') {
      totalIncomeUsd = add(totalIncomeUsd, usdVal);
    } else if (tx.type === 'spent') {
      totalSpentUsd = add(totalSpentUsd, usdVal);
      const cat = tx.category || 'Otros';
      categorySpentMap[cat] = add(categorySpentMap[cat] || 0, usdVal);
    }
  });

  totalIncomeUsd = round(totalIncomeUsd, 'USD');
  totalSpentUsd = round(totalSpentUsd, 'USD');
  const netSavingsUsd = round(sub(totalIncomeUsd, totalSpentUsd), 'USD');
  const savingsRate = totalIncomeUsd > 0
    ? round(((totalIncomeUsd - totalSpentUsd) / totalIncomeUsd) * 100, 'USD')
    : 0;

  // Desglose de gastos por categoría
  const expensesByCategory = Object.entries(categorySpentMap)
    .map(([category, amountUsd]) => ({
      category,
      amountUsd: round(amountUsd, 'USD'),
      percentage: totalSpentUsd > 0 ? Number(((amountUsd / totalSpentUsd) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.amountUsd - a.amountUsd);

  // Comparativa de Presupuestos vs Real
  const budgetsComparison = Object.entries(budgets || {}).map(([category, budgetAmount]) => {
    const budgetUsd = Number(budgetAmount) || 0;
    const spentUsd = round(categorySpentMap[category] || 0, 'USD');
    const diffUsd = round(sub(budgetUsd, spentUsd), 'USD');
    const percentUsed = budgetUsd > 0 ? Number(((spentUsd / budgetUsd) * 100).toFixed(1)) : 0;
    return {
      category,
      budgetUsd,
      spentUsd,
      diffUsd,
      percentUsed,
      isOver: spentUsd > budgetUsd
    };
  }).sort((a, b) => b.budgetUsd - a.budgetUsd);

  // Saldos al cierre
  let totalBalancesUsd = 0;
  const closingBalances = (assets || []).map(asset => {
    const amountNum = Number(asset.amount) || 0;
    const usdVal = convert(amountNum, asset.name, 'USD', rates);
    totalBalancesUsd = add(totalBalancesUsd, usdVal);
    return {
      id: asset.id,
      name: asset.name,
      location: asset.location,
      amount: amountNum,
      usdVal: round(usdVal, 'USD')
    };
  }).sort((a, b) => b.usdVal - a.usdVal);

  totalBalancesUsd = round(totalBalancesUsd, 'USD');

  return {
    year,
    month,
    totalIncomeUsd,
    totalSpentUsd,
    netSavingsUsd,
    savingsRate,
    expensesByCategory,
    budgetsComparison,
    closingBalances,
    totalBalancesUsd,
    transactionsCount: monthTxs.length
  };
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Genera el documento HTML profesional optimizado para impresión (window.print)
 * y exportación a PDF.
 */
export function generateMonthlyReportHtml(reportData) {
  const monthName = MONTH_NAMES[reportData.month] || 'Mes';
  const {
    year,
    totalIncomeUsd,
    totalSpentUsd,
    netSavingsUsd,
    savingsRate,
    expensesByCategory,
    budgetsComparison,
    closingBalances,
    totalBalancesUsd
  } = reportData;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen Financiero - ${monthName} ${year}</title>
  <style>
    @page {
      size: A4;
      margin: 1.5cm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      color: #0f172a;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-top: 4px;
    }
    .date-badge {
      font-size: 13px;
      font-weight: 600;
      color: #0284c7;
      background: #f0f9ff;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }
    .kpi-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 700;
    }
    .kpi-income { color: #16a34a; }
    .kpi-spent { color: #dc2626; }
    .kpi-net { color: ${netSavingsUsd >= 0 ? '#16a34a' : '#dc2626'}; }
    .kpi-balances { color: #0284c7; }
    
    h2 {
      font-size: 16px;
      color: #0f172a;
      margin: 20px 0 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 20px;
    }
    th {
      text-align: left;
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      padding: 8px 10px;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .text-right { text-align: right; }
    .badge-over {
      color: #dc2626;
      font-weight: 600;
    }
    .badge-ok {
      color: #16a34a;
      font-weight: 600;
    }
    .footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Resumen Financiero Mensual</h1>
      <div class="subtitle">Reporte consolidado de ingresos, gastos y saldos</div>
    </div>
    <div class="date-badge">${monthName} ${year}</div>
  </div>

  <div class="summary-grid">
    <div class="kpi-card">
      <div class="kpi-title">Ingresos Totales</div>
      <div class="kpi-value kpi-income">$${formatAmount(totalIncomeUsd, 'USD')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Gastos Totales</div>
      <div class="kpi-value kpi-spent">$${formatAmount(totalSpentUsd, 'USD')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Ahorro Neto (${savingsRate}%)</div>
      <div class="kpi-value kpi-net">$${formatAmount(netSavingsUsd, 'USD')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Saldos al Cierre</div>
      <div class="kpi-value kpi-balances">$${formatAmount(totalBalancesUsd, 'USD')}</div>
    </div>
  </div>

  <h2>Gastos por Categoría</h2>
  ${expensesByCategory.length === 0 ? '<p style="color:#64748b;font-style:italic;font-size:13px;">No hay gastos registrados en este mes.</p>' : `
  <table>
    <thead>
      <tr>
        <th>Categoría</th>
        <th class="text-right">Monto (USD)</th>
        <th class="text-right">% del Gasto</th>
      </tr>
    </thead>
    <tbody>
      ${expensesByCategory.map(item => `
      <tr>
        <td>${item.category}</td>
        <td class="text-right">$${formatAmount(item.amountUsd, 'USD')}</td>
        <td class="text-right">${item.percentage}%</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  `}

  ${budgetsComparison.length > 0 ? `
  <h2>Ejecución de Presupuestos</h2>
  <table>
    <thead>
      <tr>
        <th>Categoría</th>
        <th class="text-right">Presupuesto</th>
        <th class="text-right">Gastado</th>
        <th class="text-right">Disponible</th>
        <th class="text-right">% Utilizado</th>
      </tr>
    </thead>
    <tbody>
      ${budgetsComparison.map(b => `
      <tr>
        <td>${b.category}</td>
        <td class="text-right">$${formatAmount(b.budgetUsd, 'USD')}</td>
        <td class="text-right">$${formatAmount(b.spentUsd, 'USD')}</td>
        <td class="text-right ${b.diffUsd < 0 ? 'badge-over' : 'badge-ok'}">$${formatAmount(b.diffUsd, 'USD')}</td>
        <td class="text-right ${b.isOver ? 'badge-over' : ''}">${b.percentUsed}%</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <h2>Saldos al Cierre</h2>
  <table>
    <thead>
      <tr>
        <th>Cuenta / Ubicación</th>
        <th>Moneda</th>
        <th class="text-right">Saldo Original</th>
        <th class="text-right">Equivalente USD</th>
      </tr>
    </thead>
    <tbody>
      ${closingBalances.map(a => `
      <tr>
        <td><strong>${a.location}</strong></td>
        <td>${a.name}</td>
        <td class="text-right">${formatAmount(a.amount, a.name)} ${a.name}</td>
        <td class="text-right"><strong>$${formatAmount(a.usdVal, 'USD')}</strong></td>
      </tr>
      `).join('')}
      <tr style="font-weight:700; background:#f8fafc;">
        <td colspan="3">Total Portafolio al Cierre</td>
        <td class="text-right" style="color:#0284c7;">$${formatAmount(totalBalancesUsd, 'USD')}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Generado automáticamente por Finanzas Personales</span>
    <span>Fecha de emisión: ${new Date().toLocaleDateString('es-VE')}</span>
  </div>
</body>
</html>`;
}

/**
 * Imprime o comparte el resumen mensual en PDF.
 */
export async function exportMonthlyReportPdf(reportData) {
  const htmlContent = generateMonthlyReportHtml(reportData);
  const monthName = MONTH_NAMES[reportData.month] || 'Mes';
  const filename = `resumen_financiero_${monthName}_${reportData.year}.html`;

  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: htmlContent,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });

    await Share.share({
      title: `Resumen Financiero - ${monthName} ${reportData.year}`,
      text: `Resumen Financiero de ${monthName} ${reportData.year}`,
      url: written.uri,
      dialogTitle: 'Compartir o imprimir resumen'
    });

    return filename;
  }

  // En Web: abre una ventana con el reporte y ejecuta window.print()
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  } else {
    // Si el bloqueador de popups impide abrir la ventana, descargar como archivo HTML imprimible
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return filename;
}
