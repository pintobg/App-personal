import { getDecimals, convert } from '../domain/money';

export const formatAmount = (amount, currency) => {
  const num = Number(amount) || 0;
  const decimals = getDecimals(currency);
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

export const getCurrencySymbol = (name) => {
  if (!name) return '';
  switch (name.toUpperCase()) {
    case 'VES': return 'Bs. ';
    case 'USD':
    case 'USDT':
    case 'USDC': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'BRL': return 'R$ ';
    case 'PEN': return 'S/ ';
    case 'JPY':
    case 'CNY': return '¥';
    default: return '';
  }
};

export const getRateString = (name, rate) => {
  if (!name || name.toUpperCase() === 'USD' || !rate || Number(rate) <= 0) return null;
  const upper = name.toUpperCase();
  let r = Number(rate);
  if (upper === 'VES') {
    if (r < 1) r = 1 / r;
    return `1 USD = Bs. ${formatAmount(r, 'VES')}`;
  }
  if (['COP', 'ARS', 'CLP', 'PYG', 'JPY', 'MXN', 'BRL', 'PEN', 'DOP', 'CRC', 'UYU', 'BOB'].includes(upper) && r < 1) {
    return `1 USD = ${formatAmount(1 / r, upper)} ${upper}`;
  }
  const maxDecimals = r < 0.01 ? 6 : r < 1 ? 4 : 2;
  return `1 ${upper} = $${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals }).format(r)}`;
};

export const translateFrequency = (freq) => {
  const map = {
    'one-time': 'Pago Único',
    'weekly': 'Semanal',
    'bi-weekly': 'Cada 15 días',
    'semi-monthly': 'Quincenal (15 y último)',
    'monthly': 'Mensual'
  };
  return map[freq] || freq;
};

export const translateCategory = (cat) => {
  if (!cat) return 'Sin categoría';
  const map = {
    'Food': 'Alimentación',
    'Credit Card': 'Deudas/Préstamos',
    'Subscription': 'Entretenimiento',
    'Transport': 'Transporte',
    'Health': 'Salud',
    'Housing': 'Vivienda',
    'Shopping': 'Compras',
    'Personal Care': 'Cuidado Personal',
    'Education': 'Educación',
    'Other': 'Otros',
    'Uncategorized': 'Sin categoría',
    'Transfer': 'Transferencia'
  };
  return map[cat] || cat;
};

export const translateSubcategory = (subcat) => {
  const map = {
    'Rent/Mortgage': 'Alquiler/Hipoteca', 'Utilities': 'Servicios', 'Maintenance/Repairs': 'Mantenimiento/Reparaciones',
    'Groceries': 'Supermercado', 'Dining Out': 'Restaurantes', 'Coffee/Snacks': 'Café/Snacks',
    'Gas': 'Gasolina', 'Public Transit': 'Transporte Público', 'Car Maintenance': 'Mantenimiento del Coche', 'Taxi/Uber': 'Taxi/Uber',
    'Medical': 'Médico', 'Pharmacy': 'Farmacia', 'Gym': 'Gimnasio',
    'Movies/Events': 'Cine/Eventos', 'Subscriptions': 'Suscripciones', 'Hobbies': 'Hobbies',
    'Clothing': 'Ropa', 'Electronics': 'Electrónica', 'Home': 'Hogar',
    'Haircut': 'Peluquería', 'Cosmetics': 'Cosméticos', 'Spa': 'Spa',
    'Tuition': 'Matrícula', 'Books': 'Libros', 'Courses': 'Cursos',
    'Student Loan': 'Préstamo Estudiantil', 'Personal Loan': 'Préstamo Personal',
    'Miscellaneous': 'Varios', 'Gifts': 'Regalos', 'Donations': 'Donaciones'
  };
  return map[subcat] || subcat;
};

export const getTxRateSnapshot = (tx, rates = {}) => {
  if (tx && tx.rateSnapshot != null && !isNaN(Number(tx.rateSnapshot)) && Number(tx.rateSnapshot) > 0) {
    let r = Number(tx.rateSnapshot);
    if ((tx?.currency || '').toUpperCase() === 'VES' && r < 1) {
      r = 1 / r;
    }
    return r;
  }
  const curr = (tx?.currency || '').toUpperCase();
  if (rates && rates[curr] != null && !isNaN(Number(rates[curr])) && Number(rates[curr]) > 0) {
    let r = Number(rates[curr]);
    if (curr === 'VES' && r < 1) {
      r = 1 / r;
    }
    return r;
  }
  if (curr === 'USD' || curr === 'USDT' || curr === 'USDC') return 1;
  return 0;
};

export const getTxUsdEquivalent = (tx, rates = {}) => {
  if (tx && tx.usdEquivalent != null && !isNaN(Number(tx.usdEquivalent)) && Number(tx.usdEquivalent) > 0) {
    return Number(tx.usdEquivalent);
  }
  const curr = (tx?.currency || '').toUpperCase();
  const amount = Number(tx?.amount) || 0;
  return convert(amount, curr, 'USD', rates);
};

export const formatTxRate = (currency, rate) => {
  const curr = (currency || '').toUpperCase();
  let numRate = Number(rate) || 0;
  if (!numRate) return '---';
  if (curr === 'USD') {
    return '1 USD = $1,00';
  }
  if (curr === 'VES') {
    if (numRate < 1) numRate = 1 / numRate;
    return `1 USD = Bs. ${formatAmount(numRate, 'VES')}`;
  }
  const maxDecimals = numRate < 0.01 ? 6 : numRate < 1 ? 4 : 2;
  return `1 ${curr} = $${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals }).format(numRate)}`;
};

export const getBudgetColor = (percent) => {
  if (percent < 70) return '#10b981'; // Verde (<70%)
  if (percent <= 90) return '#f59e0b'; // Amarillo (70%-90%)
  return '#ef4444'; // Rojo (>90% o superado)
};
