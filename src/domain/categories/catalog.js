/**
 * Catálogo Base de Categorías y Subcategorías
 * Define los identificadores estables, tipo (expense | income), icono, color,
 * orden y estado activo por defecto (★ = activa por defecto).
 */

export const BASE_CATEGORY_CATALOG = [
  // ==========================================
  // GASTOS (kind: 'expense')
  // ==========================================
  {
    id: 'exp.housing',
    kind: 'expense',
    name: 'Vivienda',
    icon: '🏠',
    color: '#3b82f6',
    sort_order: 1,
    is_active: true, // ★
    is_custom: false,
    base_id: 'exp.housing',
    subcategories: [
      { id: 'exp.housing.rent', name: 'Alquiler', sort_order: 1 },
      { id: 'exp.housing.condo', name: 'Condominio', sort_order: 2 },
      { id: 'exp.housing.maintenance', name: 'Mantenimiento', sort_order: 3 },
      { id: 'exp.housing.repairs', name: 'Reparaciones', sort_order: 4 },
      { id: 'exp.housing.household_items', name: 'Artículos del hogar', sort_order: 5 },
      { id: 'exp.housing.cleaning', name: 'Limpieza', sort_order: 6 }
    ]
  },
  {
    id: 'exp.utilities',
    kind: 'expense',
    name: 'Servicios',
    icon: '💡',
    color: '#06b6d4',
    sort_order: 2,
    is_active: true, // ★
    is_custom: false,
    base_id: 'exp.utilities',
    subcategories: [
      { id: 'exp.utilities.electricity', name: 'Electricidad', sort_order: 1 },
      { id: 'exp.utilities.water', name: 'Agua', sort_order: 2 },
      { id: 'exp.utilities.gas', name: 'Gas', sort_order: 3 },
      { id: 'exp.utilities.internet', name: 'Internet', sort_order: 4 },
      { id: 'exp.utilities.mobile', name: 'Telefonía móvil', sort_order: 5 },
      { id: 'exp.utilities.tv_streaming', name: 'TV y streaming', sort_order: 6 },
      { id: 'exp.utilities.waste', name: 'Aseo urbano', sort_order: 7 }
    ]
  },
  {
    id: 'exp.food',
    kind: 'expense',
    name: 'Alimentación',
    icon: '🍔',
    color: '#10b981',
    sort_order: 3,
    is_active: true, // ★
    is_custom: false,
    base_id: 'exp.food',
    subcategories: [
      { id: 'exp.food.supermarket', name: 'Supermercado', sort_order: 1 },
      { id: 'exp.food.farmers_market', name: 'Mercado o feria', sort_order: 2 },
      { id: 'exp.food.butcher', name: 'Carnicería', sort_order: 3 },
      { id: 'exp.food.bakery', name: 'Panadería', sort_order: 4 },
      { id: 'exp.food.grocery_store', name: 'Abasto o bodegón', sort_order: 5 },
      { id: 'exp.food.delivery', name: 'Delivery', sort_order: 6 },
      { id: 'exp.food.restaurants', name: 'Restaurantes', sort_order: 7 },
      { id: 'exp.food.cafe_snacks', name: 'Café y snacks', sort_order: 8 }
    ]
  },
  {
    id: 'exp.transport',
    kind: 'expense',
    name: 'Transporte',
    icon: '🚗',
    color: '#f59e0b',
    sort_order: 4,
    is_active: true, // ★
    is_custom: false,
    base_id: 'exp.transport',
    subcategories: [
      { id: 'exp.transport.fuel', name: 'Gasolina', sort_order: 1 },
      { id: 'exp.transport.public', name: 'Transporte público', sort_order: 2 },
      { id: 'exp.transport.taxi_apps', name: 'Taxi o apps', sort_order: 3 },
      { id: 'exp.transport.parking', name: 'Estacionamiento', sort_order: 4 },
      { id: 'exp.transport.maintenance', name: 'Mantenimiento del vehículo', sort_order: 5 },
      { id: 'exp.transport.spare_parts', name: 'Repuestos', sort_order: 6 },
      { id: 'exp.transport.insurance', name: 'Seguro del vehículo', sort_order: 7 }
    ]
  },
  {
    id: 'exp.health',
    kind: 'expense',
    name: 'Salud',
    icon: '💊',
    color: '#ec4899',
    sort_order: 5,
    is_active: true, // ★
    is_custom: false,
    base_id: 'exp.health',
    subcategories: [
      { id: 'exp.health.consultations', name: 'Consultas', sort_order: 1 },
      { id: 'exp.health.pharmacy', name: 'Farmacia', sort_order: 2 },
      { id: 'exp.health.tests', name: 'Exámenes', sort_order: 3 },
      { id: 'exp.health.insurance', name: 'HCM o seguro', sort_order: 4 },
      { id: 'exp.health.dental', name: 'Odontología', sort_order: 5 },
      { id: 'exp.health.vision', name: 'Óptica', sort_order: 6 }
    ]
  },
  {
    id: 'exp.personal_care',
    kind: 'expense',
    name: 'Cuidado personal',
    icon: '💈',
    color: '#8b5cf6',
    sort_order: 6,
    is_active: true, // ★
    is_custom: false,
    base_id: 'exp.personal_care',
    subcategories: [
      { id: 'exp.personal_care.haircut', name: 'Peluquería o barbería', sort_order: 1 },
      { id: 'exp.personal_care.hygiene', name: 'Higiene', sort_order: 2 },
      { id: 'exp.personal_care.cosmetics', name: 'Cosméticos', sort_order: 3 },
      { id: 'exp.personal_care.gym', name: 'Gimnasio', sort_order: 4 }
    ]
  },
  {
    id: 'exp.education',
    kind: 'expense',
    name: 'Educación',
    icon: '📚',
    color: '#6366f1',
    sort_order: 7,
    is_active: false,
    is_custom: false,
    base_id: 'exp.education',
    subcategories: [
      { id: 'exp.education.enrollment', name: 'Matrícula', sort_order: 1 },
      { id: 'exp.education.tuition', name: 'Mensualidad', sort_order: 2 },
      { id: 'exp.education.supplies', name: 'Útiles', sort_order: 3 },
      { id: 'exp.education.courses', name: 'Cursos', sort_order: 4 },
      { id: 'exp.education.books', name: 'Libros', sort_order: 5 }
    ]
  },
  {
    id: 'exp.kids',
    kind: 'expense',
    name: 'Hijos',
    icon: '👶',
    color: '#f43f5e',
    sort_order: 8,
    is_active: false,
    is_custom: false,
    base_id: 'exp.kids',
    subcategories: [
      { id: 'exp.kids.school', name: 'Colegio', sort_order: 1 },
      { id: 'exp.kids.clothes', name: 'Ropa', sort_order: 2 },
      { id: 'exp.kids.toys', name: 'Juguetes', sort_order: 3 },
      { id: 'exp.kids.babysitter', name: 'Niñera', sort_order: 4 },
      { id: 'exp.kids.activities', name: 'Actividades', sort_order: 5 }
    ]
  },
  {
    id: 'exp.pets',
    kind: 'expense',
    name: 'Mascotas',
    icon: '🐾',
    color: '#d97706',
    sort_order: 9,
    is_active: false,
    is_custom: false,
    base_id: 'exp.pets',
    subcategories: [
      { id: 'exp.pets.food', name: 'Alimento', sort_order: 1 },
      { id: 'exp.pets.vet', name: 'Veterinario', sort_order: 2 },
      { id: 'exp.pets.accessories', name: 'Accesorios', sort_order: 3 }
    ]
  },
  {
    id: 'exp.leisure',
    kind: 'expense',
    name: 'Ocio',
    icon: '🎉',
    color: '#f97316',
    sort_order: 10,
    is_active: true, // ★
    is_custom: false,
    base_id: 'exp.leisure',
    subcategories: [
      { id: 'exp.leisure.outings', name: 'Salidas', sort_order: 1 },
      { id: 'exp.leisure.cinema_events', name: 'Cine y eventos', sort_order: 2 },
      { id: 'exp.leisure.hobbies', name: 'Hobbies', sort_order: 3 },
      { id: 'exp.leisure.games', name: 'Juegos', sort_order: 4 }
    ]
  },
  {
    id: 'exp.subscriptions',
    kind: 'expense',
    name: 'Suscripciones',
    icon: '📱',
    color: '#a855f7',
    sort_order: 11,
    is_active: true, // ★
    is_custom: false,
    base_id: 'exp.subscriptions',
    subcategories: [
      { id: 'exp.subscriptions.streaming', name: 'Streaming', sort_order: 1 },
      { id: 'exp.subscriptions.music', name: 'Música', sort_order: 2 },
      { id: 'exp.subscriptions.apps_software', name: 'Apps y software', sort_order: 3 },
      { id: 'exp.subscriptions.cloud', name: 'Nube', sort_order: 4 }
    ]
  },
  {
    id: 'exp.clothing',
    kind: 'expense',
    name: 'Ropa y calzado',
    icon: '👕',
    color: '#14b8a6',
    sort_order: 12,
    is_active: false,
    is_custom: false,
    base_id: 'exp.clothing',
    subcategories: [
      { id: 'exp.clothing.clothes', name: 'Ropa', sort_order: 1 },
      { id: 'exp.clothing.shoes', name: 'Calzado', sort_order: 2 },
      { id: 'exp.clothing.accessories', name: 'Accesorios', sort_order: 3 }
    ]
  },
  {
    id: 'exp.tech',
    kind: 'expense',
    name: 'Tecnología',
    icon: '💻',
    color: '#0ea5e9',
    sort_order: 13,
    is_active: false,
    is_custom: false,
    base_id: 'exp.tech',
    subcategories: [
      { id: 'exp.tech.devices', name: 'Equipos', sort_order: 1 },
      { id: 'exp.tech.accessories', name: 'Accesorios', sort_order: 2 },
      { id: 'exp.tech.repairs', name: 'Reparaciones', sort_order: 3 }
    ]
  },
  {
    id: 'exp.finance',
    kind: 'expense',
    name: 'Finanzas',
    icon: '💳',
    color: '#eab308',
    sort_order: 14,
    is_active: true, // ★
    is_custom: false,
    base_id: 'exp.finance',
    subcategories: [
      { id: 'exp.finance.bank_fees', name: 'Comisiones bancarias', sort_order: 1 },
      { id: 'exp.finance.igtf', name: 'IGTF', sort_order: 2 },
      { id: 'exp.finance.interest', name: 'Intereses', sort_order: 3 },
      { id: 'exp.finance.cashea', name: 'Cuotas Cashea', sort_order: 4 },
      { id: 'exp.finance.loan_installments', name: 'Cuotas de préstamos', sort_order: 5 },
      { id: 'exp.finance.credit_card', name: 'Tarjeta de crédito', sort_order: 6 }
    ]
  },
  {
    id: 'exp.taxes',
    kind: 'expense',
    name: 'Impuestos y trámites',
    icon: '⚖️',
    color: '#78716c',
    sort_order: 15,
    is_active: false,
    is_custom: false,
    base_id: 'exp.taxes',
    subcategories: [
      { id: 'exp.taxes.taxes', name: 'Impuestos', sort_order: 1 },
      { id: 'exp.taxes.paperwork', name: 'Trámites y documentos', sort_order: 2 },
      { id: 'exp.taxes.fines', name: 'Multas', sort_order: 3 }
    ]
  },
  {
    id: 'exp.gifts',
    kind: 'expense',
    name: 'Regalos y donaciones',
    icon: '🎁',
    color: '#e11d48',
    sort_order: 16,
    is_active: false,
    is_custom: false,
    base_id: 'exp.gifts',
    subcategories: [
      { id: 'exp.gifts.gifts', name: 'Regalos', sort_order: 1 },
      { id: 'exp.gifts.donations', name: 'Donaciones', sort_order: 2 },
      { id: 'exp.gifts.celebrations', name: 'Celebraciones', sort_order: 3 }
    ]
  },
  {
    id: 'exp.travel',
    kind: 'expense',
    name: 'Viajes',
    icon: '✈️',
    color: '#0284c7',
    sort_order: 17,
    is_active: false,
    is_custom: false,
    base_id: 'exp.travel',
    subcategories: [
      { id: 'exp.travel.tickets', name: 'Pasajes', sort_order: 1 },
      { id: 'exp.travel.lodging', name: 'Alojamiento', sort_order: 2 },
      { id: 'exp.travel.meals', name: 'Comidas en viaje', sort_order: 3 },
      { id: 'exp.travel.activities', name: 'Actividades', sort_order: 4 }
    ]
  },
  {
    id: 'exp.business',
    kind: 'expense',
    name: 'Trabajo o negocio',
    icon: '💼',
    color: '#475569',
    sort_order: 18,
    is_active: false,
    is_custom: false,
    base_id: 'exp.business',
    subcategories: [
      { id: 'exp.business.supplies', name: 'Insumos', sort_order: 1 },
      { id: 'exp.business.tools', name: 'Herramientas', sort_order: 2 },
      { id: 'exp.business.marketing', name: 'Publicidad', sort_order: 3 },
      { id: 'exp.business.services', name: 'Servicios profesionales', sort_order: 4 }
    ]
  },
  {
    id: 'exp.other',
    kind: 'expense',
    name: 'Otros',
    icon: '📦',
    color: '#64748b',
    sort_order: 19,
    is_active: true, // ★
    is_custom: false,
    base_id: 'exp.other',
    subcategories: [
      { id: 'exp.other.unclassified', name: 'Sin clasificar', sort_order: 1 }
    ]
  },

  // ==========================================
  // INGRESOS (kind: 'income')
  // ==========================================
  {
    id: 'inc.salary',
    kind: 'income',
    name: 'Salario',
    icon: '💼',
    color: '#10b981',
    sort_order: 1,
    is_active: true, // ★
    is_custom: false,
    base_id: 'inc.salary',
    subcategories: [
      { id: 'inc.salary.base', name: 'Sueldo', sort_order: 1 },
      { id: 'inc.salary.cestaticket', name: 'Cestaticket', sort_order: 2 },
      { id: 'inc.salary.bonuses', name: 'Bonos', sort_order: 3 },
      { id: 'inc.salary.profit_sharing', name: 'Utilidades', sort_order: 4 },
      { id: 'inc.salary.vacation', name: 'Vacaciones', sort_order: 5 },
      { id: 'inc.salary.overtime', name: 'Horas extra', sort_order: 6 }
    ]
  },
  {
    id: 'inc.freelance',
    kind: 'income',
    name: 'Independiente',
    icon: '💻',
    color: '#06b6d4',
    sort_order: 2,
    is_active: true, // ★
    is_custom: false,
    base_id: 'inc.freelance',
    subcategories: [
      { id: 'inc.freelance.fees', name: 'Honorarios', sort_order: 1 },
      { id: 'inc.freelance.freelance', name: 'Freelance', sort_order: 2 },
      { id: 'inc.freelance.commissions', name: 'Comisiones por venta', sort_order: 3 }
    ]
  },
  {
    id: 'inc.business',
    kind: 'income',
    name: 'Negocio',
    icon: '🏪',
    color: '#3b82f6',
    sort_order: 3,
    is_active: false,
    is_custom: false,
    base_id: 'inc.business',
    subcategories: [
      { id: 'inc.business.sales', name: 'Ventas', sort_order: 1 },
      { id: 'inc.business.services', name: 'Servicios', sort_order: 2 }
    ]
  },
  {
    id: 'inc.remittance',
    kind: 'income',
    name: 'Remesas y familia',
    icon: '🌍',
    color: '#8b5cf6',
    sort_order: 4,
    is_active: true, // ★
    is_custom: false,
    base_id: 'inc.remittance',
    subcategories: [
      { id: 'inc.remittance.abroad', name: 'Remesas del exterior', sort_order: 1 },
      { id: 'inc.remittance.family_help', name: 'Ayuda familiar', sort_order: 2 }
    ]
  },
  {
    id: 'inc.investments',
    kind: 'income',
    name: 'Inversiones',
    icon: '📈',
    color: '#f59e0b',
    sort_order: 5,
    is_active: false,
    is_custom: false,
    base_id: 'inc.investments',
    subcategories: [
      { id: 'inc.investments.interest', name: 'Intereses', sort_order: 1 },
      { id: 'inc.investments.crypto_yield', name: 'Rendimientos cripto', sort_order: 2 },
      { id: 'inc.investments.dividends', name: 'Dividendos', sort_order: 3 },
      { id: 'inc.investments.fx_gain', name: 'Ganancia por cambio', sort_order: 4 }
    ]
  },
  {
    id: 'inc.rents',
    kind: 'income',
    name: 'Rentas',
    icon: '🔑',
    color: '#14b8a6',
    sort_order: 6,
    is_active: false,
    is_custom: false,
    base_id: 'inc.rents',
    subcategories: [
      { id: 'inc.rents.property', name: 'Alquiler de inmueble', sort_order: 1 },
      { id: 'inc.rents.vehicle', name: 'Alquiler de vehículo', sort_order: 2 }
    ]
  },
  {
    id: 'inc.state_bonuses',
    kind: 'income',
    name: 'Bonos del Estado',
    icon: '🏛️',
    color: '#eab308',
    sort_order: 7,
    is_active: false,
    is_custom: false,
    base_id: 'inc.state_bonuses',
    subcategories: [
      { id: 'inc.state_bonuses.patria', name: 'Bonos de la Patria', sort_order: 1 },
      { id: 'inc.state_bonuses.other', name: 'Otros bonos', sort_order: 2 }
    ]
  },
  {
    id: 'inc.refunds',
    kind: 'income',
    name: 'Reembolsos',
    icon: '🔄',
    color: '#10b981',
    sort_order: 8,
    is_active: true, // ★
    is_custom: false,
    base_id: 'inc.refunds',
    subcategories: [
      { id: 'inc.refunds.returns', name: 'Devoluciones', sort_order: 1 },
      { id: 'inc.refunds.expense_reimbursements', name: 'Reintegros de gastos', sort_order: 2 }
    ]
  },
  {
    id: 'inc.gifts',
    kind: 'income',
    name: 'Regalos',
    icon: '🎁',
    color: '#ec4899',
    sort_order: 9,
    is_active: false,
    is_custom: false,
    base_id: 'inc.gifts',
    subcategories: [
      { id: 'inc.gifts.received', name: 'Regalos recibidos', sort_order: 1 }
    ]
  },
  {
    id: 'inc.asset_sales',
    kind: 'income',
    name: 'Venta de bienes',
    icon: '🏷️',
    color: '#6366f1',
    sort_order: 10,
    is_active: false,
    is_custom: false,
    base_id: 'inc.asset_sales',
    subcategories: [
      { id: 'inc.asset_sales.used_items', name: 'Artículos usados', sort_order: 1 },
      { id: 'inc.asset_sales.vehicle', name: 'Vehículo', sort_order: 2 },
      { id: 'inc.asset_sales.other', name: 'Otros bienes', sort_order: 3 }
    ]
  },
  {
    id: 'inc.other',
    kind: 'income',
    name: 'Otros',
    icon: '📦',
    color: '#64748b',
    sort_order: 11,
    is_active: true, // ★
    is_custom: false,
    base_id: 'inc.other',
    subcategories: [
      { id: 'inc.other.unclassified', name: 'Sin clasificar', sort_order: 1 }
    ]
  }
];

/**
 * Convierte el catálogo jerárquico en una lista plana de registros para almacenar
 * en `user_categories` (tanto categorías padre como subcategorías con parent_id).
 */
export function flattenCatalog(catalog = BASE_CATEGORY_CATALOG, userId = null) {
  const records = [];
  const now = new Date().toISOString();

  catalog.forEach(cat => {
    // Registro de la categoría padre
    records.push({
      id: cat.id,
      user_id: userId,
      kind: cat.kind,
      parent_id: null,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      sort_order: cat.sort_order,
      is_active: Boolean(cat.is_active),
      is_custom: Boolean(cat.is_custom),
      base_id: cat.base_id || cat.id,
      deleted_at: null,
      created_at: now,
      updated_at: now
    });

    // Registros de las subcategorías
    (cat.subcategories || []).forEach(sub => {
      records.push({
        id: sub.id,
        user_id: userId,
        kind: cat.kind,
        parent_id: cat.id,
        name: sub.name,
        icon: sub.icon || cat.icon,
        color: sub.color || cat.color,
        sort_order: sub.sort_order,
        is_active: Boolean(cat.is_active), // hereda estado inicial
        is_custom: Boolean(sub.is_custom),
        base_id: sub.base_id || sub.id,
        deleted_at: null,
        created_at: now,
        updated_at: now
      });
    });
  });

  return records;
}

/**
 * Genera la siembra inicial para un usuario nuevo, activando las marcadas con ★
 * y dejando el resto inactivas.
 */
export function buildInitialUserCategories(userId = null) {
  return flattenCatalog(BASE_CATEGORY_CATALOG, userId);
}
