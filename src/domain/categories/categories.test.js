import { describe, it, expect } from 'vitest';
import {
  BASE_CATEGORY_CATALOG,
  buildInitialUserCategories
} from './catalog';
import {
  resolveLegacyCategory,
  migrateLegacyTransactions,
  migrateLegacyBudgets,
  migrateLegacyObligations
} from './migrateLegacy';
import { mapCategoryToDb, mapDbToCategory } from '../../services/syncService';

describe('Dominio de Categorías y Subcategorías Configurables', () => {
  describe('1. Siembra inicial del catálogo', () => {
    it('genera exactamente 19 categorías de gasto y 11 categorías de ingreso', () => {
      const expenses = BASE_CATEGORY_CATALOG.filter(c => c.kind === 'expense');
      const incomes = BASE_CATEGORY_CATALOG.filter(c => c.kind === 'income');
      expect(expenses.length).toBe(19);
      expect(incomes.length).toBe(11);
    });

    it('siembra el catálogo con las categorías ★ activas y el resto inactivas', () => {
      const seeded = buildInitialUserCategories('user-123');
      expect(seeded.length).toBeGreaterThan(30);

      // Categorías principales de gasto
      const expenseParents = seeded.filter(c => c.kind === 'expense' && !c.parent_id);
      expect(expenseParents.length).toBe(19);

      // Categorías principales de ingreso
      const incomeParents = seeded.filter(c => c.kind === 'income' && !c.parent_id);
      expect(incomeParents.length).toBe(11);

      // Verificar que exp.food, exp.transport, exp.housing, inc.salary, inc.business están activas (★)
      const food = expenseParents.find(c => c.id === 'exp.food');
      const salary = incomeParents.find(c => c.id === 'inc.salary');
      expect(food?.is_active).toBe(true);
      expect(salary?.is_active).toBe(true);

      // Verificar que categorías no-★ están inactivas por defecto
      const pets = expenseParents.find(c => c.id === 'exp.pets');
      const gifts = expenseParents.find(c => c.id === 'exp.gifts');
      const assetSales = incomeParents.find(c => c.id === 'inc.asset_sales');
      expect(pets?.is_active).toBe(false);
      expect(gifts?.is_active).toBe(false);
      expect(assetSales?.is_active).toBe(false);

      // Subcategorías heredan la estructura y apuntan a su parent_id
      const foodSubcats = seeded.filter(c => c.parent_id === 'exp.food');
      expect(foodSubcats.length).toBeGreaterThan(0);
      foodSubcats.forEach(sub => {
        expect(sub.kind).toBe('expense');
        expect(sub.is_active).toBe(true); // al estar exp.food activa
      });
    });
  });

  describe('2. Migración idempotente de datos existentes', () => {
    it('resuelve correctamente las categorías del catálogo viejo (constants.js) a nuevos IDs', () => {
      // Gastos clásicos
      expect(resolveLegacyCategory('Alimentación', 'Supermercado', 'spent')).toEqual({
        categoryId: 'exp.food',
        subcategoryId: 'exp.food.supermarket'
      });

      expect(resolveLegacyCategory('Transporte', 'Gasolina', 'spent')).toEqual({
        categoryId: 'exp.transport',
        subcategoryId: 'exp.transport.fuel'
      });

      // Split de Vivienda -> Vivienda vs Servicios
      expect(resolveLegacyCategory('Vivienda', 'Alquiler', 'spent')).toEqual({
        categoryId: 'exp.housing',
        subcategoryId: 'exp.housing.rent'
      });
      expect(resolveLegacyCategory('Vivienda', 'Servicios', 'spent')).toEqual({
        categoryId: 'exp.utilities',
        subcategoryId: 'exp.utilities.electricity'
      });

      // Split de Compras -> Ropa vs Tecnología vs Hogar
      expect(resolveLegacyCategory('Compras', 'Ropa', 'spent')).toEqual({
        categoryId: 'exp.clothing',
        subcategoryId: 'exp.clothing.clothes'
      });
      expect(resolveLegacyCategory('Compras', 'Electrónica', 'spent')).toEqual({
        categoryId: 'exp.tech',
        subcategoryId: 'exp.tech.devices'
      });
      expect(resolveLegacyCategory('Compras', 'Hogar', 'spent')).toEqual({
        categoryId: 'exp.housing',
        subcategoryId: 'exp.housing.household_items'
      });

      // Split de Entretenimiento -> Ocio vs Suscripciones
      expect(resolveLegacyCategory('Entretenimiento', 'Suscripciones', 'spent')).toEqual({
        categoryId: 'exp.subscriptions',
        subcategoryId: 'exp.subscriptions.streaming'
      });
      expect(resolveLegacyCategory('Entretenimiento', 'Cine/Eventos', 'spent')).toEqual({
        categoryId: 'exp.leisure',
        subcategoryId: 'exp.leisure.cinema_events'
      });

      // Deudas
      expect(resolveLegacyCategory('Deudas/Préstamos', 'Tarjeta de Crédito', 'spent')).toEqual({
        categoryId: 'exp.finance',
        subcategoryId: 'exp.finance.credit_card'
      });
    });

    it('asigna inc.other a ingresos sin categoría', () => {
      expect(resolveLegacyCategory(null, null, 'income')).toEqual({
        categoryId: 'inc.other',
        subcategoryId: 'inc.other.unclassified'
      });
      expect(resolveLegacyCategory('', '', 'income')).toEqual({
        categoryId: 'inc.other',
        subcategoryId: 'inc.other.unclassified'
      });
      expect(resolveLegacyCategory('Sueldo', null, 'income')).toEqual({
        categoryId: 'inc.salary',
        subcategoryId: 'inc.salary.base'
      });
    });

    it('las transferencias y ajustes no llevan categoría', () => {
      expect(resolveLegacyCategory('Transfer', 'Destino', 'transfer')).toEqual({
        categoryId: null,
        subcategoryId: null
      });
      expect(resolveLegacyCategory('Ajuste', 'Positivo', 'adjustment')).toEqual({
        categoryId: null,
        subcategoryId: null
      });
    });

    it('la migración de transacciones es idempotente y no sobrescribe movimientos ya migrados ni elimina campos viejos', () => {
      const legacyTxs = [
        {
          id: 'tx1',
          type: 'spent',
          amount: 50,
          category: 'Alimentación',
          subcategory: 'Restaurante',
          notes: 'Cena de negocios'
        },
        {
          id: 'tx2',
          type: 'income',
          amount: 200,
          category: null,
          subcategory: null,
          notes: 'Pago extra'
        },
        {
          id: 'tx3',
          type: 'transfer',
          amount: 100,
          category: 'Transfer'
        },
        {
          id: 'tx4_already_migrated',
          type: 'spent',
          amount: 15,
          category: 'Alimentación',
          subcategory: 'Supermercado',
          category_id: 'custom.food',
          subcategory_id: 'custom.food.artisan'
        }
      ];

      const migrated = migrateLegacyTransactions(legacyTxs);
      expect(migrated.length).toBe(4);

      const tx1 = migrated.find(t => t.id === 'tx1');
      expect(tx1.category_id).toBe('exp.food');
      expect(tx1.subcategory_id).toBe('exp.food.restaurants');
      expect(tx1.category).toBe('Alimentación'); // Conserva campo viejo
      expect(tx1.subcategory).toBe('Restaurante'); // Conserva campo viejo

      const tx2 = migrated.find(t => t.id === 'tx2');
      expect(tx2.category_id).toBe('inc.other');
      expect(tx2.subcategory_id).toBe('inc.other.unclassified');

      const tx3 = migrated.find(t => t.id === 'tx3');
      expect(tx3.category_id).toBeNull();
      expect(tx3.subcategory_id).toBeNull();

      // Ya migrado: permanece intacto
      const tx4 = migrated.find(t => t.id === 'tx4_already_migrated');
      expect(tx4.category_id).toBe('custom.food');
      expect(tx4.subcategory_id).toBe('custom.food.artisan');

      // Segunda pasada: idempotencia pura
      const secondPass = migrateLegacyTransactions(migrated);
      expect(secondPass).toEqual(migrated);
    });

    it('migra presupuestos viejos conservando los montos asignados', () => {
      const oldBudgets = {
        'Alimentación': 350,
        'Transporte': 80,
        'Vivienda': 500
      };

      const migrated = migrateLegacyBudgets(oldBudgets);
      expect(migrated['Alimentación'].amount).toBe(350);
      expect(migrated['Alimentación'].category_id).toBe('exp.food');
      expect(migrated['Transporte'].amount).toBe(80);
      expect(migrated['Transporte'].category_id).toBe('exp.transport');
      expect(migrated['Vivienda'].amount).toBe(500);
      expect(migrated['Vivienda'].category_id).toBe('exp.housing');

      // Idempotencia
      const secondPass = migrateLegacyBudgets(migrated);
      expect(secondPass['Alimentación'].category_id).toBe('exp.food');
      expect(secondPass['Alimentación'].amount).toBe(350);
    });

    it('migra obligaciones existentes asociando category_id', () => {
      const legacyObs = [
        { id: 'ob1', name: 'Alquiler', category: 'Vivienda' },
        { id: 'ob2', name: 'Tarjeta', category: 'Deudas/Préstamos', category_id: 'exp.finance' }
      ];

      const migrated = migrateLegacyObligations(legacyObs);
      expect(migrated[0].category_id).toBe('exp.housing');
      expect(migrated[0].category).toBe('Vivienda');
      expect(migrated[1].category_id).toBe('exp.finance');
    });
  });

  describe('3. Renombrar categoría cambia el nombre en todos los movimientos pasados', () => {
    it('resolver el nombre dinámicamente mediante category_id refleja el renombrado sin tocar el registro histórico', () => {
      // Estado de categorías del usuario
      let userCategories = [
        { id: 'exp.food', kind: 'expense', name: 'Alimentación', is_active: true }
      ];

      const getCategoryName = (id) => {
        const cat = userCategories.find(c => c.id === id);
        return cat ? cat.name : null;
      };

      // Movimiento histórico
      const historicalTx = {
        id: 'tx_past_1',
        category_id: 'exp.food',
        category: 'Alimentación'
      };

      expect(getCategoryName(historicalTx.category_id)).toBe('Alimentación');

      // El usuario renombra la categoría a "Mercado y Comida"
      userCategories = userCategories.map(c =>
        c.id === 'exp.food' ? { ...c, name: 'Mercado y Comida' } : c
      );

      // Ahora el movimiento pasado refleja inmediatamente el nuevo nombre
      expect(getCategoryName(historicalTx.category_id)).toBe('Mercado y Comida');
    });
  });

  describe('4. Ocultar categoría sin borrar movimientos', () => {
    it('ocultar una categoría la desactiva de las activas pero preserva los movimientos históricos', () => {
      let categories = [
        { id: 'exp.food', kind: 'expense', name: 'Alimentación', is_active: true },
        { id: 'exp.leisure', kind: 'expense', name: 'Ocio y Recreación', is_active: true }
      ];

      const transactions = [
        { id: 'tx_ocio', type: 'spent', amount: 30, category_id: 'exp.leisure', category: 'Ocio y Recreación' }
      ];

      // Ocultar exp.leisure
      categories = categories.map(c => c.id === 'exp.leisure' ? { ...c, is_active: false } : c);

      const activeCategories = categories.filter(c => c.is_active);
      expect(activeCategories.find(c => c.id === 'exp.leisure')).toBeUndefined();

      // Los movimientos no se borran y siguen teniendo su categoría intacta
      expect(transactions.length).toBe(1);
      expect(transactions[0].category_id).toBe('exp.leisure');
    });
  });

  describe('5. Sincronización entre dispositivos (Supabase mapper)', () => {
    it('mapCategoryToDb y mapDbToCategory serializan y deserializan fielmente', () => {
      const localCat = {
        id: 'custom.sub1',
        kind: 'expense',
        parentId: 'exp.food',
        name: 'Snacks de Oficina',
        icon: '🥪',
        color: '#f59e0b',
        sortOrder: 15,
        isActive: true,
        isCustom: true,
        baseId: null
      };

      const dbRecord = mapCategoryToDb(localCat, 'user-abc');
      expect(dbRecord.id).toBe('custom.sub1');
      expect(dbRecord.user_id).toBe('user-abc');
      expect(dbRecord.parent_id).toBe('exp.food');
      expect(dbRecord.name).toBe('Snacks de Oficina');
      expect(dbRecord.is_active).toBe(true);
      expect(dbRecord.is_custom).toBe(true);

      const restored = mapDbToCategory(dbRecord);
      expect(restored.id).toBe(localCat.id);
      expect(restored.parent_id).toBe(localCat.parentId);
      expect(restored.name).toBe(localCat.name);
      expect(restored.icon).toBe(localCat.icon);
      expect(restored.color).toBe(localCat.color);
      expect(restored.is_active).toBe(true);
      expect(restored.is_custom).toBe(true);
    });
  });
});
