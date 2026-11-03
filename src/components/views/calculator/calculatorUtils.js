import { parseLocalDate, toLocalDateString } from '../../../utils/dates';

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const m = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} ${months[m] || parts[1]}`;
}

export function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const m = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} ${months[m] || parts[1]} ${parts[0]}`;
}

export function getIsoDateOffset(daysOffset, baseDateStr) {
  const d = baseDateStr ? parseLocalDate(baseDateStr) : new Date();
  d.setDate(d.getDate() + daysOffset);
  return toLocalDateString(d);
}

export function formatCalcNumber(num, decimals = 2) {
  const n = Number(num);
  if (num === '' || num === null || num === undefined || isNaN(n)) return '';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatCalcLiveInput(rawStr) {
  if (rawStr === '' || rawStr === null || rawStr === undefined) return '';
  const str = String(rawStr);
  const [intPart, decPart] = str.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

export function sanitizeCalcInput(inputValue) {
  const cleaned = String(inputValue || '').replace(/,/g, '').replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join('')}`;
  }
  return cleaned;
}
