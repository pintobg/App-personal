export const SPENT_CATEGORIES = {
  'Vivienda': ['Alquiler/Hipoteca', 'Servicios', 'Mantenimiento/Reparaciones'],
  'Alimentación': ['Supermercado', 'Restaurantes', 'Café/Snacks'],
  'Transporte': ['Gasolina', 'Transporte Público', 'Mantenimiento del Coche', 'Taxi/Uber'],
  'Salud': ['Médico', 'Farmacia', 'Gimnasio'],
  'Entretenimiento': ['Cine/Eventos', 'Suscripciones', 'Hobbies'],
  'Compras': ['Ropa', 'Electrónica', 'Hogar'],
  'Cuidado Personal': ['Peluquería', 'Cosméticos', 'Spa'],
  'Educación': ['Matrícula', 'Libros', 'Cursos'],
  'Deudas/Préstamos': ['Tarjeta de Crédito', 'Préstamo Estudiantil', 'Préstamo Personal'],
  'Otros': ['Varios', 'Regalos', 'Donaciones']
};

export const VENEZUELAN_BANKS = [
  'Banesco', 'Banco de Venezuela', 'Mercantil', 'BBVA Provincial', 
  'Bancamiga', 'BNC (Banco Nacional de Crédito)', 'Banco del Tesoro', 
  'Bancaribe', 'Banco Bicentenario', 'Banco Exterior', 'Banplus', 
  'Banco Fondo Común (BFC)', 'Banco Plaza', '100% Banco', 'Banco Activo', 
  'Mi Banco', 'DELSUR', 'Banco Caroní', 'Efectivo en Bs'
];

export const INTERNATIONAL_WALLETS_BANKS = [
  'Efectivo (Cash)', 'Zelle', 'Banesco Panamá', 'Facebank', 
  'Mercantil Panamá', 'Zinli', 'Wally Tech', 'PayPal', 
  'Wise', 'Revolut', 'Bank of America', 'Wells Fargo', 
  'Chase', 'Payoneer'
];

export const CRYPTO_WALLETS = [
  'Binance', 'Bybit', 'MetaMask', 'Trust Wallet', 
  'OKX', 'Bitget', 'Phantom', 'Ledger', 
  'KuCoin', 'Coinbase', 'Billetera Fría / Externa'
];

export const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#64748b'];

export const getCryptoIcon = (symbol) => {
  const map = {
    'BTC': '₿', 'ETH': 'Ξ', 'USDT': '₮', 'BNB': 'B', 'SOL': 'S', 
    'XRP': '✕', 'USDC': 'U', 'ADA': 'A', 'DOGE': 'Ð', 'LTC': 'Ł', 'ZEC': 'ⓩ'
  };
  return map[symbol] || symbol.charAt(0);
};

export const getCryptoColor = (symbol) => {
  const map = {
    'BTC': '#f59e0b', 'ETH': '#627eea', 'USDT': '#26a17b', 'BNB': '#f3ba2f', 
    'SOL': '#14f195', 'XRP': '#23292f', 'USDC': '#2775ca', 'ADA': '#0033ad', 
    'DOGE': '#c2a633', 'LTC': '#345d9d', 'ZEC': '#f4b728'
  };
  return map[symbol] || '#8b5cf6';
};
