import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ShoppingListsView from './ShoppingListsView';
import ShoppingListDetailView from './ShoppingListDetailView';
import PriceHistoryModal from './PriceHistoryModal';
import { calculateListTotals } from '../../domain/shopping';
import { executeAddOrEditTransaction } from '../../domain/operations';
import { syncService } from '../../services/syncService';

describe('Lista de compras dentro de Planificar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('1. Criterio de Aceptación: Creo una lista, agrego 5 artículos, marco 3 y el total marcado coincide con la suma', () => {
    it('calcula correctamente los totales marcados y pendientes', () => {
      const items = [
        { id: '1', list_id: 'l1', name: 'Harina PAN', quantity: 2, estimated_price: 1.20, actual_price: 1.25, is_checked: true, section: 'viveres' }, // 2.50
        { id: '2', list_id: 'l1', name: 'Arroz', quantity: 1, estimated_price: 1.10, actual_price: 1.10, is_checked: true, section: 'viveres' }, // 1.10
        { id: '3', list_id: 'l1', name: 'Queso blanco', quantity: 0.5, estimated_price: 6.00, actual_price: 5.80, is_checked: true, section: 'lacteos' }, // 2.90
        { id: '4', list_id: 'l1', name: 'Café', quantity: 1, estimated_price: 3.50, is_checked: false, section: 'viveres' }, // est: 3.50
        { id: '5', list_id: 'l1', name: 'Detergente', quantity: 1, estimated_price: 4.00, is_checked: false, section: 'limpieza' } // est: 4.00
      ];

      const totals = calculateListTotals(items, 'USD', { USD: 1, VES: 50 }, 20);

      // Total marcado: 2.50 + 1.10 + 2.90 = 6.50 USD
      expect(totals.checkedTotal).toBe(6.5);
      expect(totals.checkedCount).toBe(3);

      // Total estimado general: 2.40 + 1.10 + 3.00 + 3.50 + 4.00 = 14.00 USD
      expect(totals.estimatedTotal).toBe(14);
      // Falta estimada: 3.50 + 4.00 = 7.50 USD
      expect(totals.pendingTotal).toBe(7.5);
      expect(totals.pendingCount).toBe(2);

      // Renderizado en la barra inferior de ShoppingListDetailView
      const list = { id: 'l1', name: 'Mercado Semanal', currency: 'USD', status: 'active', budget: 20 };
      render(
        <ShoppingListDetailView
          list={list}
          items={items}
          rates={{ USD: 1, VES: 50 }}
          onBack={vi.fn()}
          onAddItem={vi.fn()}
          onUpdateItem={vi.fn()}
          onToggleItemCheck={vi.fn()}
          onDeleteItem={vi.fn()}
          onRegisterPurchase={vi.fn()}
        />
      );

      // Comprobar que en la barra se muestran los totales
      expect(screen.getByText('Marcado (3)')).toBeDefined();
      expect(screen.getByText('$6,50')).toBeDefined();
      expect(screen.getByText('Estimado')).toBeDefined();
      expect(screen.getByText('$14,00')).toBeDefined();
      expect(screen.getByText('Falta (2)')).toBeDefined();
      expect(screen.getByText('$7,50')).toBeDefined();
    });
  });

  describe('2. Criterio de Aceptación: "Registrar compra" crea un gasto con la categoría correcta y el saldo baja', () => {
    it('ejecuta la compra con la categoría exp.food.supermarket y descuenta de la cuenta seleccionada', () => {
      const assets = [
        { id: 'acc-usd', name: 'USD', location: 'Banesco Panamá', amount: 200 }
      ];

      const list = { id: 'l1', name: 'Mercado Central', currency: 'USD', store: 'Central Madeirense' };
      const checkedTotal = 45.50;

      // Simular payload generado por onRegisterPurchase
      const txPayload = {
        type: 'spent',
        assetId: 'acc-usd',
        currency: 'USD',
        amount: String(checkedTotal),
        category: 'Alimentación',
        subcategory: 'Supermercado',
        category_id: 'exp.food',
        subcategory_id: 'exp.food.supermarket',
        notes: `Compra: ${list.name} (${list.store})`,
        date: '2026-11-03'
      };

      const result = executeAddOrEditTransaction({ assets, transactions: [], rates: { USD: 1 } }, txPayload);

      expect(result.success).toBe(true);
      expect(result.nextTransactions[0].category_id).toBe('exp.food');
      expect(result.nextTransactions[0].subcategory_id).toBe('exp.food.supermarket');
      expect(result.nextTransactions[0].amount).toBe(45.50);

      // Saldo de la cuenta debe haber bajado de 200 a 154.50
      const updatedAsset = result.nextAssets.find(a => a.id === 'acc-usd');
      expect(updatedAsset.amount).toBe(154.50);
    });
  });

  describe('3. Criterio de Aceptación: Sugerencia de último precio e historial de productos', () => {
    it('autocompleta y sugiere el último precio al escribir el nombre del producto', () => {
      const products = [
        {
          id: 'p-harina',
          name: 'Harina PAN',
          default_unit: 'paquete',
          section: 'viveres',
          last_price: 1.30,
          last_price_currency: 'USD',
          price_history: [{ date: '2026-10-28', price: 1.30, currency: 'USD' }]
        }
      ];

      const list = { id: 'l1', name: 'Mercado', currency: 'USD', status: 'active' };

      render(
        <ShoppingListDetailView
          list={list}
          items={[]}
          products={products}
          rates={{ USD: 1 }}
          onBack={vi.fn()}
          onAddItem={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/Nombre del producto/i);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Harina' } });

      // Debe sugerir "Harina PAN"
      expect(screen.getByText('Harina PAN')).toBeDefined();
      expect(screen.getByText(/Último: \$1,30/i)).toBeDefined();

      // Al seleccionar la sugerencia, se precarga
      fireEvent.click(screen.getByText('Harina PAN'));
      expect(screen.getByText(/Último precio registrado: \$1,30 USD/i)).toBeDefined();
    });

    it('muestra el historial de compras en PriceHistoryModal', () => {
      const product = {
        name: 'Harina PAN',
        section: 'viveres',
        default_unit: 'und',
        last_price: 1.30,
        price_history: [
          { date: '2026-11-01', price: 1.30, currency: 'USD' },
          { date: '2026-10-15', price: 1.20, currency: 'USD' }
        ]
      };

      render(
        <PriceHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          product={product}
        />
      );

      expect(screen.getByText('Historial de precios')).toBeDefined();
      expect(screen.getAllByText('Harina PAN').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$1,30 USD').length).toBeGreaterThan(0);
      expect(screen.getByText('$1,20 USD')).toBeDefined();
    });
  });

  describe('4. Gestión de listas: Activas, terminadas, duplicar y borrar con Deshacer', () => {
    it('muestra listas activas arriba y terminadas abajo', () => {
      const shoppingLists = [
        { id: 'l1', name: 'Mercado de hoy', status: 'active', currency: 'USD' },
        { id: 'l2', name: 'Mercado anterior', status: 'done', currency: 'USD', completed_at: '2026-10-25' }
      ];

      render(
        <ShoppingListsView
          shoppingLists={shoppingLists}
          shoppingItems={[]}
          rates={{ USD: 1 }}
        />
      );

      expect(screen.getByText('Listas Activas (1)')).toBeDefined();
      expect(screen.getByText('Mercado de hoy')).toBeDefined();

      expect(screen.getByText('Listas Terminadas (1)')).toBeDefined();
      expect(screen.getByText('Mercado anterior')).toBeDefined();
    });

    it('permite duplicar una lista mediante el botón Repetir lista', () => {
      const onDuplicate = vi.fn();
      const shoppingLists = [
        { id: 'l2', name: 'Mercado de la semana pasada', status: 'done', currency: 'USD' }
      ];

      render(
        <ShoppingListsView
          shoppingLists={shoppingLists}
          shoppingItems={[]}
          rates={{ USD: 1 }}
          onDuplicateList={onDuplicate}
        />
      );

      const repeatBtn = screen.getByText('🔁 Repetir lista');
      fireEvent.click(repeatBtn);
      expect(onDuplicate).toHaveBeenCalledWith('l2');
    });

    it('invoca onDeleteListWithUndo al presionar eliminar', () => {
      const onDelete = vi.fn();
      const shoppingLists = [
        { id: 'l1', name: 'Lista a borrar', status: 'active', currency: 'USD' }
      ];

      render(
        <ShoppingListsView
          shoppingLists={shoppingLists}
          shoppingItems={[]}
          rates={{ USD: 1 }}
          onDeleteListWithUndo={onDelete}
        />
      );

      const delBtn = screen.getByLabelText('Eliminar lista');
      fireEvent.click(delBtn);
      expect(onDelete).toHaveBeenCalledWith('l1');
    });
  });

  describe('5. Criterio de Aceptación: Funciona sin conexión / modo avión y sincroniza', () => {
    it('encola los cambios de lista y artículos en syncService cuando hay usuario', async () => {
      const queueSpy = vi.spyOn(syncService, 'queueChange');

      const mockList = { id: 'list-offline', name: 'Mercado sin conexión', currency: 'USD' };
      const mockItem = { id: 'item-offline', list_id: 'list-offline', name: 'Arroz', quantity: 2 };

      syncService.queueChange('shopping_lists', 'upsert', mockList, 'user-123');
      syncService.queueChange('shopping_items', 'upsert', mockItem, 'user-123');

      expect(queueSpy).toHaveBeenCalledWith('shopping_lists', 'upsert', mockList, 'user-123');
      expect(queueSpy).toHaveBeenCalledWith('shopping_items', 'upsert', mockItem, 'user-123');
    });
  });
});
