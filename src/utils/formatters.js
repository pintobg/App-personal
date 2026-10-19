export const formatAmount = (amount, currency) => {
  const num = Number(amount) || 0;
  const curr = (currency || '').toUpperCase();
  let decimals = 2;
  if (curr === 'ZEC') decimals = 3;
  else if (['BTC', 'ETH'].includes(curr)) decimals = 6;
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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
  if (!name || name.toUpperCase() === 'USD' || !rate || rate <= 0) return null;
  const upper = name.toUpperCase();
  if (upper === 'VES') {
    return `1 USD = Bs. ${(1 / rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (['COP', 'ARS', 'CLP', 'PYG', 'JPY', 'MXN', 'BRL', 'PEN', 'DOP', 'CRC', 'UYU', 'BOB'].includes(upper) && rate < 1) {
    return `1 USD = ${(1 / rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${upper}`;
  }
  const maxDecimals = rate < 0.01 ? 6 : rate < 1 ? 4 : 2;
  return `1 ${upper} = $${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals })}`;
};

export const translateFrequency = (freq) => {
  const map = {
    'one-time': 'Pago Único',
    'weekly': 'Semanal',
    'bi-weekly': 'Quincenal',
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
    return Number(tx.rateSnapshot);
  }
  const curr = (tx?.currency || '').toUpperCase();
  if (rates && rates[curr] != null && !isNaN(Number(rates[curr])) && Number(rates[curr]) > 0) {
    return Number(rates[curr]);
  }
  if (curr === 'USD' || curr === 'USDT' || curr === 'USDC') return 1;
  return 0;
};

export const getTxUsdEquivalent = (tx, rates = {}) => {
  if (tx && tx.usdEquivalent != null && !isNaN(Number(tx.usdEquivalent)) && Number(tx.usdEquivalent) > 0) {
    return Number(tx.usdEquivalent);
  }
  const rate = getTxRateSnapshot(tx, rates);
  return (Number(tx?.amount) || 0) * rate;
};

export const formatTxRate = (currency, rate) => {
  const curr = (currency || '').toUpperCase();
  const numRate = Number(rate) || 0;
  if (!numRate) return '---';
  if (curr === 'USD') {
    return '1 USD = $1.00';
  }
  if (curr === 'VES') {
    return `1 USD = Bs. ${(1 / numRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const maxDecimals = numRate < 0.01 ? 6 : numRate < 1 ? 4 : 2;
  return `1 ${curr} = $${numRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals })}`;
};

export const getBudgetColor = (percent) => {
  if (percent < 70) return '#10b981'; // Verde (<70%)
  if (percent <= 90) return '#f59e0b'; // Amarillo (70%-90%)
  return '#ef4444'; // Rojo (>90% o superado)
};

