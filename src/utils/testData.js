import { toLocalDateString } from './dates';

export const TEST_DATA_SEED_KEY = 'finanzas_test_seed_v2';

export function generateTestData(rates = {}) {
  const now = new Date();
  const vesRate = rates.VES || (1 / 742);
  const btcRate = rates.BTC || 64000;
  const eurRate = rates.EUR || 1.08;

  const daysAgo = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  const daysFromNowDateOnly = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return toLocalDateString(d);
  };

  // IDs dinámicos para activos
  const banescoId = crypto.randomUUID();
  const mercantilId = crypto.randomUUID();
  const efectivoId = crypto.randomUUID();
  const zelleId = crypto.randomUUID();
  const zinliId = crypto.randomUUID();
  const usdtBinanceId = crypto.randomUUID();
  const btcBinanceId = crypto.randomUUID();

  // 1. Balances / Cuentas de prueba (Fiat y Cripto)
  const assets = [
    { id: banescoId, name: 'VES', type: 'fiat', amount: 18500, initialAmount: 18500, location: 'Banesco' },
    { id: mercantilId, name: 'VES', type: 'fiat', amount: 6420, initialAmount: 6420, location: 'Mercantil' },
    { id: efectivoId, name: 'USD', type: 'fiat', amount: 280, initialAmount: 280, location: 'Efectivo (Cash)' },
    { id: zelleId, name: 'USD', type: 'fiat', amount: 640, initialAmount: 640, location: 'Zelle' },
    { id: zinliId, name: 'EUR', type: 'fiat', amount: 95, initialAmount: 95, location: 'Zinli' },
    { id: usdtBinanceId, name: 'USDT', type: 'crypto', amount: 1150.50, initialAmount: 1150.50, location: 'Binance' },
    { id: btcBinanceId, name: 'BTC', type: 'crypto', amount: 0.0125, initialAmount: 0.0125, location: 'Binance' }
  ];

  // 2. Movimientos de prueba (Ingresos, Gastos en varias categorías, Pagos de deuda y Transferencias)
  const transactions = [
    {
      id: crypto.randomUUID(),
      assetId: zelleId,
      type: 'spent',
      currency: 'USD',
      amount: 42.50,
      origin: 'Zelle',
      category: 'Alimentación',
      subcategory: 'Supermercado',
      date: daysAgo(0),
      rateSnapshot: 1,
      usdEquivalent: 42.50
    },
    {
      id: crypto.randomUUID(),
      assetId: banescoId,
      type: 'spent',
      currency: 'VES',
      amount: 1484,
      origin: 'Banesco',
      category: 'Transporte',
      subcategory: 'Taxi/Uber',
      date: daysAgo(0),
      rateSnapshot: vesRate,
      usdEquivalent: Number((1484 * vesRate).toFixed(2))
    },
    {
      id: crypto.randomUUID(),
      assetId: usdtBinanceId,
      type: 'income',
      currency: 'USDT',
      amount: 850,
      origin: 'Binance',
      category: 'Otros',
      subcategory: 'Honorarios Profesionales',
      date: daysAgo(2),
      rateSnapshot: 1,
      usdEquivalent: 850
    },
    {
      id: crypto.randomUUID(),
      assetId: usdtBinanceId,
      destAssetId: banescoId,
      type: 'transfer',
      currency: 'USDT',
      amount: 50,
      origin: 'Binance',
      destCurrency: 'VES',
      destAmount: 37100,
      destOrigin: 'Banesco',
      category: 'Transfer',
      subcategory: 'Hacia Banesco',
      date: daysAgo(3),
      rateSnapshot: 1,
      usdEquivalent: 50
    },
    {
      id: crypto.randomUUID(),
      assetId: efectivoId,
      type: 'spent',
      currency: 'USD',
      amount: 65,
      origin: 'Efectivo (Cash)',
      category: 'Alimentación',
      subcategory: 'Restaurantes',
      date: daysAgo(4),
      rateSnapshot: 1,
      usdEquivalent: 65
    },
    {
      id: crypto.randomUUID(),
      assetId: usdtBinanceId,
      type: 'spent',
      currency: 'USDT',
      amount: 120,
      origin: 'Binance',
      category: 'Deudas/Préstamos',
      subcategory: 'Cuota Laptop Trabajo',
      date: daysAgo(5),
      rateSnapshot: 1,
      usdEquivalent: 120
    },
    {
      id: crypto.randomUUID(),
      assetId: zelleId,
      type: 'spent',
      currency: 'USD',
      amount: 55,
      origin: 'Zelle',
      category: 'Salud',
      subcategory: 'Gimnasio',
      date: daysAgo(8),
      rateSnapshot: 1,
      usdEquivalent: 55
    },
    {
      id: crypto.randomUUID(),
      assetId: zinliId,
      type: 'spent',
      currency: 'EUR',
      amount: 25,
      origin: 'Zinli',
      category: 'Entretenimiento',
      subcategory: 'Suscripciones',
      date: daysAgo(11),
      rateSnapshot: eurRate,
      usdEquivalent: Number((25 * eurRate).toFixed(2))
    },
    {
      id: crypto.randomUUID(),
      assetId: zelleId,
      type: 'income',
      currency: 'USD',
      amount: 420,
      origin: 'Zelle',
      category: 'Otros',
      subcategory: 'Proyecto Freelance',
      date: daysAgo(14),
      rateSnapshot: 1,
      usdEquivalent: 420
    },
    {
      id: crypto.randomUUID(),
      assetId: zelleId,
      type: 'spent',
      currency: 'USD',
      amount: 220,
      origin: 'Zelle',
      category: 'Vivienda',
      subcategory: 'Alquiler/Hipoteca',
      date: daysAgo(18),
      rateSnapshot: 1,
      usdEquivalent: 220
    },
    {
      id: crypto.randomUUID(),
      assetId: mercantilId,
      type: 'spent',
      currency: 'VES',
      amount: 8900,
      origin: 'Mercantil',
      category: 'Transporte',
      subcategory: 'Gasolina',
      date: daysAgo(21),
      rateSnapshot: vesRate,
      usdEquivalent: Number((8900 * vesRate).toFixed(2))
    },
    {
      id: crypto.randomUUID(),
      assetId: usdtBinanceId,
      type: 'income',
      currency: 'USDT',
      amount: 950,
      origin: 'Binance',
      category: 'Otros',
      subcategory: 'Ingreso Mensual',
      date: daysAgo(35),
      rateSnapshot: 1,
      usdEquivalent: 950
    },
    {
      id: crypto.randomUUID(),
      assetId: zelleId,
      type: 'spent',
      currency: 'USD',
      amount: 310,
      origin: 'Zelle',
      category: 'Vivienda',
      subcategory: 'Servicios',
      date: daysAgo(38),
      rateSnapshot: 1,
      usdEquivalent: 310
    },
    {
      id: crypto.randomUUID(),
      assetId: btcBinanceId,
      type: 'income',
      currency: 'BTC',
      amount: 0.005,
      origin: 'Binance',
      category: 'Otros',
      subcategory: 'Ahorro Cripto',
      date: daysAgo(65),
      rateSnapshot: btcRate,
      usdEquivalent: Number((0.005 * btcRate).toFixed(2))
    }
  ];

  // Ajustar initialAmount de cada cuenta para que coincida exactamente con la suma de movimientos
  assets.forEach(asset => {
    let deltaSum = 0;
    transactions.forEach(t => {
      if (t.type === 'income' && t.assetId === asset.id) deltaSum += t.amount;
      if (t.type === 'spent' && t.assetId === asset.id) deltaSum -= t.amount;
      if (t.type === 'adjustment' && t.assetId === asset.id) deltaSum += (t.delta != null ? t.delta : t.amount);
      if (t.type === 'transfer') {
        if (t.assetId === asset.id) deltaSum -= t.amount;
        if (t.destAssetId === asset.id) deltaSum += t.destAmount;
      }
    });
    asset.initialAmount = Number((asset.amount - deltaSum).toFixed(6));
  });

  // 3. Deudas, Cobros y Pagos completados de prueba
  const obligations = [
    {
      id: crypto.randomUUID(),
      type: 'pay',
      title: 'Cuota Laptop Trabajo',
      amount: 120,
      currency: 'USDT',
      frequency: 'monthly',
      category: 'Deudas/Préstamos',
      dueDate: daysFromNowDateOnly(5),
      totalInstallments: '6',
      paidInstallments: 2,
      dateCreated: daysAgo(60)
    },
    {
      id: crypto.randomUUID(),
      type: 'pay',
      title: 'Internet Fibra Óptica',
      amount: 35,
      currency: 'USD',
      frequency: 'monthly',
      category: 'Vivienda',
      dueDate: daysFromNowDateOnly(2),
      totalInstallments: '',
      paidInstallments: 4,
      dateCreated: daysAgo(120)
    },
    {
      id: crypto.randomUUID(),
      type: 'pay',
      title: 'Condominio Residencial',
      amount: 2200,
      currency: 'VES',
      frequency: 'monthly',
      category: 'Vivienda',
      dueDate: daysFromNowDateOnly(0),
      totalInstallments: '12',
      paidInstallments: 9,
      dateCreated: daysAgo(270)
    },
    {
      id: crypto.randomUUID(),
      type: 'receive',
      title: 'Préstamo a Carlos M.',
      amount: 80,
      currency: 'USD',
      frequency: 'bi-weekly',
      category: 'Otros',
      dueDate: daysFromNowDateOnly(3),
      totalInstallments: '2',
      paidInstallments: 1,
      dateCreated: daysAgo(15)
    },
    {
      id: crypto.randomUUID(),
      type: 'receive',
      title: 'Adelanto Diseño Web',
      amount: 150,
      currency: 'USDT',
      frequency: 'one-time',
      category: 'Otros',
      dueDate: daysFromNowDateOnly(7),
      totalInstallments: '1',
      paidInstallments: 0,
      dateCreated: daysAgo(4)
    },
    {
      id: crypto.randomUUID(),
      type: 'pay',
      title: 'Seguro Médico Trimestral',
      amount: 90,
      currency: 'USD',
      frequency: 'monthly',
      category: 'Salud',
      dueDate: daysFromNowDateOnly(-10),
      totalInstallments: '3',
      paidInstallments: 3,
      dateCreated: daysAgo(90)
    },
    {
      id: crypto.randomUUID(),
      type: 'receive',
      title: 'Reembolso Cena Grupal',
      amount: 45,
      currency: 'USDT',
      frequency: 'one-time',
      category: 'Alimentación',
      dueDate: daysFromNowDateOnly(-5),
      totalInstallments: '1',
      paidInstallments: 1,
      dateCreated: daysAgo(12)
    }
  ];

  // 4. Presupuestos Mensuales de prueba (Verde, Ámbar y Excedido)
  const budgets = {
    'Vivienda': 300,
    'Alimentación': 130,
    'Transporte': 20,
    'Salud': 50,
    'Entretenimiento': 60
  };

  return { assets, transactions, obligations, budgets };
}
