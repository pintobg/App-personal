/**
 * Migración de Categorías y Subcategorías Heredadas (Legacy)
 * Convierte strings antiguos de category y subcategory a identificadores estables
 * (category_id, subcategory_id).
 *
 * Principios:
 * 1. Idempotente: si ya tiene category_id no lo sobreescribe ni daña.
 * 2. No destructivo: mantiene los campos viejos category y subcategory.
 * 3. Ingresos sin categoría se asignan a inc.other / inc.other.unclassified.
 * 4. Transferencias y ajustes no llevan categoría.
 */

export const LEGACY_MAPPING_TABLE = {
  // Vivienda (servicios dentro -> Vivienda o Servicios según la subcategoría)
  'Vivienda': {
    default: { categoryId: 'exp.housing', subcategoryId: null },
    subcategories: {
      'Alquiler/Hipoteca': { categoryId: 'exp.housing', subcategoryId: 'exp.housing.rent' },
      'Alquiler': { categoryId: 'exp.housing', subcategoryId: 'exp.housing.rent' },
      'Condominio': { categoryId: 'exp.housing', subcategoryId: 'exp.housing.condo' },
      'Mantenimiento/Reparaciones': { categoryId: 'exp.housing', subcategoryId: 'exp.housing.maintenance' },
      'Mantenimiento': { categoryId: 'exp.housing', subcategoryId: 'exp.housing.maintenance' },
      'Reparaciones': { categoryId: 'exp.housing', subcategoryId: 'exp.housing.repairs' },
      'Artículos del hogar': { categoryId: 'exp.housing', subcategoryId: 'exp.housing.household_items' },
      'Limpieza': { categoryId: 'exp.housing', subcategoryId: 'exp.housing.cleaning' },
      'Servicios': { categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.electricity' }
    }
  },

  // Servicios
  'Servicios': {
    default: { categoryId: 'exp.utilities', subcategoryId: null },
    subcategories: {
      'Electricidad': { categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.electricity' },
      'Agua': { categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.water' },
      'Gas': { categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.gas' },
      'Internet': { categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.internet' },
      'Telefonía móvil': { categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.mobile' },
      'TV y streaming': { categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.tv_streaming' },
      'Aseo urbano': { categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.waste' }
    }
  },

  // Alimentación
  'Alimentación': {
    default: { categoryId: 'exp.food', subcategoryId: null },
    subcategories: {
      'Supermercado': { categoryId: 'exp.food', subcategoryId: 'exp.food.supermarket' },
      'Mercado o feria': { categoryId: 'exp.food', subcategoryId: 'exp.food.farmers_market' },
      'Carnicería': { categoryId: 'exp.food', subcategoryId: 'exp.food.butcher' },
      'Panadería': { categoryId: 'exp.food', subcategoryId: 'exp.food.bakery' },
      'Abasto o bodegón': { categoryId: 'exp.food', subcategoryId: 'exp.food.grocery_store' },
      'Delivery': { categoryId: 'exp.food', subcategoryId: 'exp.food.delivery' },
      'Restaurantes': { categoryId: 'exp.food', subcategoryId: 'exp.food.restaurants' },
      'Restaurante': { categoryId: 'exp.food', subcategoryId: 'exp.food.restaurants' },
      'Café/Snacks': { categoryId: 'exp.food', subcategoryId: 'exp.food.cafe_snacks' },
      'Café y snacks': { categoryId: 'exp.food', subcategoryId: 'exp.food.cafe_snacks' },
      'Almuerzo': { categoryId: 'exp.food', subcategoryId: 'exp.food.restaurants' },
      'Comida': { categoryId: 'exp.food', subcategoryId: 'exp.food.supermarket' }
    }
  },

  // Transporte
  'Transporte': {
    default: { categoryId: 'exp.transport', subcategoryId: null },
    subcategories: {
      'Gasolina': { categoryId: 'exp.transport', subcategoryId: 'exp.transport.fuel' },
      'Transporte Público': { categoryId: 'exp.transport', subcategoryId: 'exp.transport.public' },
      'Transporte público': { categoryId: 'exp.transport', subcategoryId: 'exp.transport.public' },
      'Taxi/Uber': { categoryId: 'exp.transport', subcategoryId: 'exp.transport.taxi_apps' },
      'Taxi o apps': { categoryId: 'exp.transport', subcategoryId: 'exp.transport.taxi_apps' },
      'Estacionamiento': { categoryId: 'exp.transport', subcategoryId: 'exp.transport.parking' },
      'Mantenimiento del Coche': { categoryId: 'exp.transport', subcategoryId: 'exp.transport.maintenance' },
      'Mantenimiento del vehículo': { categoryId: 'exp.transport', subcategoryId: 'exp.transport.maintenance' },
      'Repuestos': { categoryId: 'exp.transport', subcategoryId: 'exp.transport.spare_parts' },
      'Seguro del vehículo': { categoryId: 'exp.transport', subcategoryId: 'exp.transport.insurance' }
    }
  },

  // Salud
  'Salud': {
    default: { categoryId: 'exp.health', subcategoryId: null },
    subcategories: {
      'Médico': { categoryId: 'exp.health', subcategoryId: 'exp.health.consultations' },
      'Consultas': { categoryId: 'exp.health', subcategoryId: 'exp.health.consultations' },
      'Farmacia': { categoryId: 'exp.health', subcategoryId: 'exp.health.pharmacy' },
      'Exámenes': { categoryId: 'exp.health', subcategoryId: 'exp.health.tests' },
      'HCM o seguro': { categoryId: 'exp.health', subcategoryId: 'exp.health.insurance' },
      'Odontología': { categoryId: 'exp.health', subcategoryId: 'exp.health.dental' },
      'Óptica': { categoryId: 'exp.health', subcategoryId: 'exp.health.vision' },
      'Gimnasio': { categoryId: 'exp.personal_care', subcategoryId: 'exp.personal_care.gym' }
    }
  },

  // Cuidado Personal
  'Cuidado Personal': {
    default: { categoryId: 'exp.personal_care', subcategoryId: null },
    subcategories: {
      'Peluquería': { categoryId: 'exp.personal_care', subcategoryId: 'exp.personal_care.haircut' },
      'Peluquería o barbería': { categoryId: 'exp.personal_care', subcategoryId: 'exp.personal_care.haircut' },
      'Cosméticos': { categoryId: 'exp.personal_care', subcategoryId: 'exp.personal_care.cosmetics' },
      'Higiene': { categoryId: 'exp.personal_care', subcategoryId: 'exp.personal_care.hygiene' },
      'Spa': { categoryId: 'exp.personal_care', subcategoryId: 'exp.personal_care.hygiene' },
      'Gimnasio': { categoryId: 'exp.personal_care', subcategoryId: 'exp.personal_care.gym' }
    }
  },

  // Entretenimiento -> Ocio (o Suscripciones si streaming)
  'Entretenimiento': {
    default: { categoryId: 'exp.leisure', subcategoryId: null },
    subcategories: {
      'Cine/Eventos': { categoryId: 'exp.leisure', subcategoryId: 'exp.leisure.cinema_events' },
      'Cine y eventos': { categoryId: 'exp.leisure', subcategoryId: 'exp.leisure.cinema_events' },
      'Hobbies': { categoryId: 'exp.leisure', subcategoryId: 'exp.leisure.hobbies' },
      'Juegos': { categoryId: 'exp.leisure', subcategoryId: 'exp.leisure.games' },
      'Salidas': { categoryId: 'exp.leisure', subcategoryId: 'exp.leisure.outings' },
      'Suscripciones': { categoryId: 'exp.subscriptions', subcategoryId: 'exp.subscriptions.streaming' },
      'Streaming': { categoryId: 'exp.subscriptions', subcategoryId: 'exp.subscriptions.streaming' }
    }
  },

  // Compras -> Ropa y calzado, Tecnología o Vivienda > Artículos del hogar
  'Compras': {
    default: { categoryId: 'exp.other', subcategoryId: 'exp.other.unclassified' },
    subcategories: {
      'Ropa': { categoryId: 'exp.clothing', subcategoryId: 'exp.clothing.clothes' },
      'Calzado': { categoryId: 'exp.clothing', subcategoryId: 'exp.clothing.shoes' },
      'Electrónica': { categoryId: 'exp.tech', subcategoryId: 'exp.tech.devices' },
      'Hogar': { categoryId: 'exp.housing', subcategoryId: 'exp.housing.household_items' },
      'Artículos del hogar': { categoryId: 'exp.housing', subcategoryId: 'exp.housing.household_items' }
    }
  },

  // Educación
  'Educación': {
    default: { categoryId: 'exp.education', subcategoryId: null },
    subcategories: {
      'Matrícula': { categoryId: 'exp.education', subcategoryId: 'exp.education.enrollment' },
      'Mensualidad': { categoryId: 'exp.education', subcategoryId: 'exp.education.tuition' },
      'Útiles': { categoryId: 'exp.education', subcategoryId: 'exp.education.supplies' },
      'Cursos': { categoryId: 'exp.education', subcategoryId: 'exp.education.courses' },
      'Libros': { categoryId: 'exp.education', subcategoryId: 'exp.education.books' }
    }
  },

  // Deudas/Préstamos -> Finanzas
  'Deudas/Préstamos': {
    default: { categoryId: 'exp.finance', subcategoryId: null },
    subcategories: {
      'Tarjeta de Crédito': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.credit_card' },
      'Tarjeta de crédito': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.credit_card' },
      'Préstamo Estudiantil': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.loan_installments' },
      'Préstamo Personal': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.loan_installments' },
      'Cuotas de préstamos': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.loan_installments' },
      'Cuotas Cashea': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.cashea' },
      'Intereses': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.interest' }
    }
  },

  // Otros
  'Otros': {
    default: { categoryId: 'exp.other', subcategoryId: 'exp.other.unclassified' },
    subcategories: {
      'Varios': { categoryId: 'exp.other', subcategoryId: 'exp.other.unclassified' },
      'Sin clasificar': { categoryId: 'exp.other', subcategoryId: 'exp.other.unclassified' },
      'Regalos': { categoryId: 'exp.gifts', subcategoryId: 'exp.gifts.gifts' },
      'Donaciones': { categoryId: 'exp.gifts', subcategoryId: 'exp.gifts.donations' }
    }
  },

  // Categorías complementarias encontradas en operaciones existentes
  'Impuestos': {
    default: { categoryId: 'exp.finance', subcategoryId: 'exp.finance.igtf' },
    subcategories: {
      'IGTF (3%)': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.igtf' },
      'IGTF': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.igtf' },
      'Impuestos': { categoryId: 'exp.taxes', subcategoryId: 'exp.taxes.taxes' }
    }
  },
  'Comisiones': {
    default: { categoryId: 'exp.finance', subcategoryId: 'exp.finance.bank_fees' },
    subcategories: {
      'Comisión bancaria': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.bank_fees' },
      'Comisiones bancarias': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.bank_fees' }
    }
  },
  'Cashea': {
    default: { categoryId: 'exp.finance', subcategoryId: 'exp.finance.cashea' },
    subcategories: {
      'Cuota Cashea': { categoryId: 'exp.finance', subcategoryId: 'exp.finance.cashea' }
    }
  }
};

/**
 * Resuelve una categoría y subcategoría heredada a sus IDs estables correspondientes.
 */
export function resolveLegacyCategory(oldCategory, oldSubcategory, txType = 'spent') {
  if (txType === 'transfer' || txType === 'adjustment') {
    return { categoryId: null, subcategoryId: null };
  }

  if (txType === 'income') {
    // Si es ingreso sin categoría
    if (!oldCategory) {
      return { categoryId: 'inc.other', subcategoryId: 'inc.other.unclassified' };
    }
    // Mapeo básico si traía categoría de ingreso común
    const lower = String(oldCategory).toLowerCase();
    if (lower.includes('salario') || lower.includes('sueldo')) {
      return { categoryId: 'inc.salary', subcategoryId: 'inc.salary.base' };
    }
    if (lower.includes('freelance') || lower.includes('independiente')) {
      return { categoryId: 'inc.freelance', subcategoryId: 'inc.freelance.freelance' };
    }
    if (lower.includes('remesa') || lower.includes('familia')) {
      return { categoryId: 'inc.remittance', subcategoryId: 'inc.remittance.abroad' };
    }
    if (lower.includes('reembolso')) {
      return { categoryId: 'inc.refunds', subcategoryId: 'inc.refunds.returns' };
    }
    return { categoryId: 'inc.other', subcategoryId: 'inc.other.unclassified' };
  }

  // Si es gasto (spent)
  if (!oldCategory) {
    return { categoryId: 'exp.other', subcategoryId: 'exp.other.unclassified' };
  }

  const categoryConfig = LEGACY_MAPPING_TABLE[oldCategory];
  if (!categoryConfig) {
    return { categoryId: 'exp.other', subcategoryId: 'exp.other.unclassified' };
  }

  if (oldSubcategory && categoryConfig.subcategories && categoryConfig.subcategories[oldSubcategory]) {
    return categoryConfig.subcategories[oldSubcategory];
  }

  return categoryConfig.default || { categoryId: 'exp.other', subcategoryId: 'exp.other.unclassified' };
}

/**
 * Migra una lista de transacciones legacy asignando category_id y subcategory_id
 * de manera idempotente y sin eliminar los campos viejos.
 */
export function migrateLegacyTransactions(transactions = []) {
  if (!Array.isArray(transactions)) return [];

  return transactions.map(tx => {
    // Si es transferencia o ajuste, aseguramos null
    if (tx.type === 'transfer' || tx.type === 'adjustment') {
      return {
        ...tx,
        category_id: null,
        subcategory_id: null
      };
    }

    // Si ya fue migrado, conservamos lo asignado
    if (tx.category_id) {
      return tx;
    }

    const { categoryId, subcategoryId } = resolveLegacyCategory(tx.category, tx.subcategory, tx.type);

    return {
      ...tx,
      category_id: categoryId,
      subcategory_id: subcategoryId
    };
  });
}

/**
 * Migra presupuestos legacy asignando category_id
 */
export function migrateLegacyBudgets(budgets = {}) {
  const result = {};
  Object.entries(budgets || {}).forEach(([catKey, budgetVal]) => {
    // budgetVal puede ser número o un objeto { amount, category_id }
    const amount = typeof budgetVal === 'object' && budgetVal !== null ? budgetVal.amount : budgetVal;
    const existingId = typeof budgetVal === 'object' && budgetVal !== null ? budgetVal.category_id : null;

    const { categoryId } = resolveLegacyCategory(catKey, null, 'spent');
    result[catKey] = {
      amount: Number(amount) || 0,
      category: catKey,
      category_id: existingId || categoryId
    };
  });
  return result;
}

/**
 * Migra obligaciones legacy asignando category_id y subcategory_id
 */
export function migrateLegacyObligations(obligations = []) {
  if (!Array.isArray(obligations)) return [];

  return obligations.map(ob => {
    if (ob.category_id) return ob;

    const { categoryId, subcategoryId } = resolveLegacyCategory(ob.category, ob.subcategory, 'spent');
    return {
      ...ob,
      category_id: categoryId,
      subcategory_id: subcategoryId
    };
  });
}
