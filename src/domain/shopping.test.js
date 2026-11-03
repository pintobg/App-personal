import { describe, it, expect } from 'vitest';
import {
  normalizeSection,
  getSectionMeta,
  calculateItemSubtotal,
  calculateListTotals,
  groupItemsBySection,
  duplicateShoppingList,
  updateProductCatalogWithPurchase
} from './shopping';

describe('Dominio de Lista de Compras (src/domain/shopping.js)', () => {
  describe('1. Normalización de secciones', () => {
    it('normaliza correctamente nombres y variantes de sección', () => {
      expect(normalizeSection('Víveres')).toBe('viveres');
      expect(normalizeSection('frutas y verduras')).toBe('frutas_verduras');
      expect(normalizeSection('CARNES')).toBe('carnes');
      expect(normalizeSection('Lácteos')).toBe('lacteos');
      expect(normalizeSection('Limpieza del hogar')).toBe('limpieza');
      expect(normalizeSection('Higiene personal')).toBe('higiene');
      expect(normalizeSection('Desconocido')).toBe('otros');
      expect(normalizeSection(null)).toBe('otros');
    });

    it('devuelve metadatos completos con getSectionMeta', () => {
      const meta = getSectionMeta('carnes');
      expect(meta.id).toBe('carnes');
      expect(meta.icon).toBe('🥩');
      expect(meta.label).toBe('Carnes');
    });
  });

  describe('2. Subtotales de artículos', () => {
    it('calcula el subtotal estimado usando cantidad y precio estimado', () => {
      const item = { quantity: 3, estimated_price: 2.5, price_currency: 'USD' };
      expect(calculateItemSubtotal(item, false)).toBe(7.5);
    });

    it('utiliza el precio real cuando está marcado y disponible', () => {
      const item = { quantity: 2, estimated_price: 1.5, actual_price: 1.8, price_currency: 'USD' };
      expect(calculateItemSubtotal(item, true)).toBe(3.6);
    });

    it('utiliza el estimado si actual_price es null aún con useActual = true', () => {
      const item = { quantity: 2, estimated_price: 1.5, actual_price: null, price_currency: 'USD' };
      expect(calculateItemSubtotal(item, true)).toBe(3.0);
    });
  });

  describe('3. Criterio de Aceptación: 5 artículos, 3 marcados, cálculo de totales y presupuesto', () => {
    const items = [
      { id: '1', name: 'Harina PAN', quantity: 2, estimated_price: 1.20, is_checked: true, actual_price: 1.25 }, // 2 * 1.25 = 2.50 (est: 2.40)
      { id: '2', name: 'Arroz', quantity: 1, estimated_price: 1.10, is_checked: true, actual_price: 1.10 }, // 1 * 1.10 = 1.10 (est: 1.10)
      { id: '3', name: 'Queso blanco', quantity: 0.5, estimated_price: 6.00, is_checked: true, actual_price: 5.80 }, // 0.5 * 5.80 = 2.90 (est: 3.00)
      { id: '4', name: 'Café', quantity: 1, estimated_price: 3.50, is_checked: false, actual_price: null }, // est: 3.50
      { id: '5', name: 'Detergente', quantity: 1, estimated_price: 4.00, is_checked: false, actual_price: null } // est: 4.00
    ];

    it('calcula exactamente el total estimado, total marcado y lo que falta', () => {
      const rates = { USD: 1, VES: 50 };
      const totals = calculateListTotals(items, 'USD', rates, 15);

      // Total estimado: 2.40 + 1.10 + 3.00 + 3.50 + 4.00 = 14.00 USD
      expect(totals.estimatedTotal).toBe(14);
      expect(totals.estimatedTotalAlt).toBe(700); // 14 * 50

      // Total marcado (con precios reales): 2.50 + 1.10 + 2.90 = 6.50 USD
      expect(totals.checkedTotal).toBe(6.5);
      expect(totals.checkedTotalAlt).toBe(325); // 6.5 * 50

      // Pendiente estimado: 3.50 + 4.00 = 7.50 USD (14.00 - (2.40 + 1.10 + 3.00))
      expect(totals.pendingTotal).toBe(7.5);
      expect(totals.pendingTotalAlt).toBe(375); // 7.5 * 50

      expect(totals.totalCount).toBe(5);
      expect(totals.checkedCount).toBe(3);
      expect(totals.pendingCount).toBe(2);
      expect(totals.progressPercent).toBe(60);

      // Presupuesto: 15 USD. Restante: 15 - 6.50 = 8.50 USD
      expect(totals.hasBudget).toBe(true);
      expect(totals.budgetAmount).toBe(15);
      expect(totals.budgetRemaining).toBe(8.5);
      expect(totals.isOverBudget).toBe(false);
      expect(totals.budgetUsagePercent).toBe(43); // 6.5 / 15 * 100 = 43.33%
    });

    it('detecta correctamente cuando el gasto marcado excede el presupuesto', () => {
      const totals = calculateListTotals(items, 'USD', {}, 5); // presupuesto 5 USD, marcado 6.50 USD
      expect(totals.isOverBudget).toBe(true);
      expect(totals.budgetRemaining).toBe(-1.5);
    });
  });

  describe('4. Agrupación por sección y ordenamiento de ítems', () => {
    it('agrupa por sección y coloca los ítems marcados al final tachados', () => {
      const listItems = [
        { id: '1', name: 'Carne molida', section: 'carnes', is_checked: true, quantity: 1, estimated_price: 7 },
        { id: '2', name: 'Pechuga de pollo', section: 'carnes', is_checked: false, quantity: 1, estimated_price: 5 },
        { id: '3', name: 'Arroz', section: 'viveres', is_checked: false, quantity: 2, estimated_price: 1 }
      ];

      const groups = groupItemsBySection(listItems);
      expect(groups.length).toBe(2);

      // Víveres va antes que carnes según sortOrder
      expect(groups[0].sectionKey).toBe('viveres');
      expect(groups[0].items.length).toBe(1);

      expect(groups[1].sectionKey).toBe('carnes');
      expect(groups[1].items.length).toBe(2);
      // En carnes, Pechuga (no marcada) debe ir antes que Carne molida (marcada)
      expect(groups[1].items[0].name).toBe('Pechuga de pollo');
      expect(groups[1].items[1].name).toBe('Carne molida');
    });
  });

  describe('5. Duplicar lista de compras', () => {
    it('duplica una lista terminada reseteando el estado de los ítems para repetir compra', () => {
      const origList = {
        id: 'list-123',
        name: 'Mercado Semanal',
        store: 'Excelsior Gama',
        currency: 'USD',
        budget: 50,
        status: 'done'
      };

      const origItems = [
        { id: 'it-1', list_id: 'list-123', name: 'Leche', quantity: 2, estimated_price: 1.8, is_checked: true, actual_price: 1.9 },
        { id: 'it-2', list_id: 'list-123', name: 'Pan', quantity: 1, estimated_price: 1.2, is_checked: true, actual_price: 1.2 }
      ];

      const { newList, newItems } = duplicateShoppingList(origList, origItems);

      expect(newList.id).not.toBe(origList.id);
      expect(newList.status).toBe('active');
      expect(newList.name).toBe('Mercado Semanal (copia)');
      expect(newList.completed_at).toBeNull();
      expect(newList.transaction_id).toBeNull();

      expect(newItems.length).toBe(2);
      newItems.forEach(it => {
        expect(it.list_id).toBe(newList.id);
        expect(it.is_checked).toBe(false);
        expect(it.actual_price).toBeNull();
      });
    });
  });

  describe('6. Actualización del catálogo de productos con historial', () => {
    it('crea nuevos productos y actualiza productos existentes agregando al historial', () => {
      const existingProducts = [
        {
          id: 'prod-harina',
          name: 'Harina PAN',
          default_unit: 'und',
          section: 'viveres',
          last_price: 1.10,
          last_price_currency: 'USD',
          price_history: [{ date: '2026-10-15', price: 1.10, currency: 'USD' }]
        }
      ];

      const purchasedItems = [
        { name: 'Harina PAN', product_id: 'prod-harina', quantity: 2, actual_price: 1.25, unit: 'und', section: 'viveres' },
        { name: 'Aceite vegetal', quantity: 1, actual_price: 2.80, unit: 'l', section: 'viveres' }
      ];

      const updated = updateProductCatalogWithPurchase(existingProducts, purchasedItems, 'USD', 'list-999');

      expect(updated.length).toBe(2);

      // Harina PAN actualizada con nuevo precio y 2 entradas en historial
      const harina = updated.find(p => p.name === 'Harina PAN');
      expect(harina.last_price).toBe(1.25);
      expect(harina.price_history.length).toBe(2);
      expect(harina.price_history[0].price).toBe(1.25);

      // Aceite vegetal creado desde cero
      const aceite = updated.find(p => p.name === 'Aceite vegetal');
      expect(aceite).toBeDefined();
      expect(aceite.last_price).toBe(2.80);
      expect(aceite.price_history.length).toBe(1);
    });
  });
});
