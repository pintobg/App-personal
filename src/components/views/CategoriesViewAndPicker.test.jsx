import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import CategoryPicker from '../common/CategoryPicker';
import CategoriesView from './CategoriesView';
import { FinanceContext } from '../../context/FinanceContext';

describe('Pantalla Categorías y Componente CategoryPicker', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockCategories = [
    { id: 'exp.food', kind: 'expense', name: 'Alimentación', icon: '🍔', color: '#ef4444', is_active: true, sort_order: 1 },
    { id: 'exp.food.supermarket', kind: 'expense', parent_id: 'exp.food', name: 'Supermercado', icon: '🛒', is_active: true, sort_order: 1 },
    { id: 'exp.food.restaurants', kind: 'expense', parent_id: 'exp.food', name: 'Restaurantes', icon: '🍽️', is_active: true, sort_order: 2 },
    { id: 'exp.transport', kind: 'expense', name: 'Transporte', icon: '🚗', color: '#3b82f6', is_active: true, sort_order: 2 },
    { id: 'exp.pets', kind: 'expense', name: 'Mascotas', icon: '🐶', color: '#8b5cf6', is_active: false, sort_order: 15 },
    { id: 'inc.salary', kind: 'income', name: 'Salario', icon: '💼', color: '#10b981', is_active: true, sort_order: 1 },
    { id: 'inc.salary.base', kind: 'income', parent_id: 'inc.salary', name: 'Sueldo', is_active: true, sort_order: 1 },
    { id: 'inc.salary.cestaticket', kind: 'income', parent_id: 'inc.salary', name: 'Cestaticket', is_active: true, sort_order: 2 },
    { id: 'inc.freelance', kind: 'income', name: 'Freelance', icon: '💻', color: '#0ea5e9', is_active: true, sort_order: 2 }
  ];

  const getSubcategories = (parentId) => mockCategories.filter(c => c.parent_id === parentId);

  describe('1. CategoryPicker', () => {
    it('1. Criterio de Aceptación: Puedo registrar un ingreso con categoría Salario > Cestaticket', () => {
      let selectedResult = null;
      const onChange = vi.fn((val) => {
        selectedResult = val;
      });

      const { rerender } = render(
        <CategoryPicker
          kind="income"
          categories={mockCategories}
          selectedCategoryId={null}
          selectedSubcategoryId={null}
          onChange={onChange}
          transactions={[]}
          showCreate={false}
        />
      );

      // Debe mostrar Salario y Freelance
      const salarioChip = screen.getByText('Salario');
      expect(salarioChip).toBeDefined();

      // Al tocar Salario, se dispara onChange con la categoría
      fireEvent.click(salarioChip);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        categoryId: 'inc.salary',
        categoryName: 'Salario'
      }));

      // Rerender con Salario seleccionado para que aparezcan sus subcategorías
      rerender(
        <CategoryPicker
          kind="income"
          categories={mockCategories}
          selectedCategoryId="inc.salary"
          selectedSubcategoryId={null}
          onChange={onChange}
          transactions={[]}
          showCreate={false}
        />
      );

      // Ahora debe aparecer la fila con Cestaticket y Sueldo
      const cestaticketChip = screen.getByText('Cestaticket');
      expect(cestaticketChip).toBeDefined();

      // Al tocar Cestaticket, se dispara onChange con la subcategoría
      fireEvent.click(cestaticketChip);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        categoryId: 'inc.salary',
        categoryName: 'Salario',
        subcategoryId: 'inc.salary.cestaticket',
        subcategoryName: 'Cestaticket'
      }));
    });

    it('2. Criterio de Aceptación: Las categorías más usadas en los últimos 60 días aparecen primero', () => {
      const now = new Date();
      const recentTxs = [
        { id: 't1', type: 'spent', category_id: 'exp.transport', category: 'Transporte', date: now.toISOString() },
        { id: 't2', type: 'spent', category_id: 'exp.transport', category: 'Transporte', date: now.toISOString() },
        { id: 't3', type: 'spent', category_id: 'exp.food', category: 'Alimentación', date: now.toISOString() }
      ];

      render(
        <CategoryPicker
          kind="expense"
          categories={mockCategories}
          selectedCategoryId={null}
          onChange={vi.fn()}
          transactions={recentTxs}
          showCreate={false}
        />
      );

      // Debe existir la sección "Más usadas recientemente"
      expect(screen.getByText(/Más usadas recientemente/i)).toBeDefined();

      // Ambos deben figurar en los chips frecuentes
      const frecuentesContainer = screen.getByText(/Más usadas recientemente/i).parentElement;
      expect(frecuentesContainer.textContent).toContain('Transporte');
      expect(frecuentesContainer.textContent).toContain('Alimentación');
    });

    it('3. Ocultar una categoría la quita del selector', () => {
      // Mascota está is_active: false, no debe aparecer en las opciones de CategoryPicker
      render(
        <CategoryPicker
          kind="expense"
          categories={mockCategories}
          selectedCategoryId={null}
          onChange={vi.fn()}
          transactions={[]}
          showCreate={false}
        />
      );

      expect(screen.queryByText('Mascotas')).toBeNull();
    });

    it('4. Buscador filtra categorías y subcategorías en tiempo real', () => {
      render(
        <CategoryPicker
          kind="expense"
          categories={mockCategories}
          selectedCategoryId={null}
          onChange={vi.fn()}
          transactions={[]}
          showCreate={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Buscar categoría/i);
      fireEvent.change(searchInput, { target: { value: 'Transp' } });

      expect(screen.getByText('Transporte')).toBeDefined();
      expect(screen.queryByText('Alimentación')).toBeNull();
    });
  });

  describe('2. Pantalla CategoriesView', () => {
    it('muestra las pestañas de Gastos e Ingresos y cambia entre ellas', () => {
      const financeMock = {
        categories: mockCategories,
        transactions: [],
        getSubcategories,
        createCategory: vi.fn(),
        renameCategory: vi.fn(),
        hideCategory: vi.fn(),
        toggleActiveCategory: vi.fn(),
        updateCategory: vi.fn(),
        reorderCategories: vi.fn(),
        deleteCategory: vi.fn(),
        reassignCategoryTransactions: vi.fn(),
        showToast: vi.fn(),
        requestConfirm: vi.fn()
      };

      render(
        <FinanceContext.Provider value={financeMock}>
          <CategoriesView onBack={vi.fn()} />
        </FinanceContext.Provider>
      );

      // En tab Gastos por defecto
      expect(screen.getByText(/Alimentación/i)).toBeDefined();
      expect(screen.getByText(/Transporte/i)).toBeDefined();

      // Cambiar a Ingresos
      const ingresosTab = screen.getByRole('button', { name: /Ingresos/i });
      fireEvent.click(ingresosTab);

      // Ahora debe mostrar Salario y Freelance
      expect(screen.getByText(/Salario/i)).toBeDefined();
      expect(screen.getByText(/Freelance/i)).toBeDefined();
    });

    it('sección "Agregar del catálogo" muestra categorías inactivas y permite activarlas', () => {
      const toggleActiveCategory = vi.fn();
      const financeMock = {
        categories: mockCategories,
        transactions: [],
        getSubcategories,
        toggleActiveCategory,
        showToast: vi.fn()
      };

      render(
        <FinanceContext.Provider value={financeMock}>
          <CategoriesView onBack={vi.fn()} />
        </FinanceContext.Provider>
      );

      // Mascotas está inactiva en el tab de gastos
      const mascotasBtn = screen.getByText('Mascotas');
      expect(mascotasBtn).toBeDefined();

      // Al tocar Mascotas, se activa
      fireEvent.click(mascotasBtn);
      expect(toggleActiveCategory).toHaveBeenCalledWith('exp.pets');
    });

    it('si intentan borrar una categoría personalizada con movimientos, ofrece reasignarlos a otra antes', () => {
      const customCategory = {
        id: 'custom.vet',
        kind: 'expense',
        name: 'Veterinario',
        icon: '🐾',
        color: '#f59e0b',
        is_active: true,
        is_custom: true
      };

      const categoriesWithCustom = [...mockCategories, customCategory];
      const transactionsWithCustom = [
        { id: 'tx_vet_1', category_id: 'custom.vet', category: 'Veterinario', amount: 45 }
      ];

      const reassignCategoryTransactions = vi.fn().mockReturnValue(1);
      const deleteCategory = vi.fn();

      const financeMock = {
        categories: categoriesWithCustom,
        transactions: transactionsWithCustom,
        getSubcategories,
        reassignCategoryTransactions,
        deleteCategory,
        showToast: vi.fn()
      };

      render(
        <FinanceContext.Provider value={financeMock}>
          <CategoriesView onBack={vi.fn()} />
        </FinanceContext.Provider>
      );

      // Tocar la categoría personalizada para abrir modal de edición
      const vetCard = screen.getByText('Veterinario');
      fireEvent.click(vetCard);

      // Debe mostrar el botón "Eliminar"
      const deleteBtn = screen.getByRole('button', { name: 'Eliminar' });
      fireEvent.click(deleteBtn);

      // Al tener movimientos, debe abrir el modal de reasignación
      expect(screen.getByText(/Reasignar movimientos antes de borrar/i)).toBeDefined();
      expect(screen.getByText(/tiene movimientos registrados en tu historial/i)).toBeDefined();

      // Confirmar reasignación
      const reassignBtn = screen.getByRole('button', { name: /Reasignar y eliminar/i });
      fireEvent.click(reassignBtn);

      expect(reassignCategoryTransactions).toHaveBeenCalledWith('custom.vet', expect.any(String));
      expect(deleteCategory).toHaveBeenCalledWith('custom.vet');
    });
  });
});
