import React, { useState, useContext } from 'react';
import ObligationsView from './ObligationsView';
import ShoppingListsView from '../shopping/ShoppingListsView';
import PlanningBudgetsTab from './planning/PlanningBudgetsTab';
import PlanningGoalsTab from './planning/PlanningGoalsTab';
import { FinanceContext } from '../../context/FinanceContext';

const SUB_TABS = [
  { id: 'presupuestos', label: 'Presupuestos' },
  { id: 'deudas', label: 'Deudas y cuotas' },
  { id: 'metas', label: 'Metas de ahorro' },
  { id: 'compras', label: 'Lista de compras' }
];

export default function PlanningView({
  activeSubTab: externalSubTab,
  setActiveSubTab: externalSetSubTab,
  budgets = {},
  transactions = [],
  rates = {},
  veRates = {},
  onOpenBudgetModal,
  getCategoryName,
  onOpenCategories,
  obligations = [],
  flippedObId,
  setFlippedObId,
  onEditObligation,
  onPayObligation,
  onDeleteObligation,
  onOpenObModal,
  goals = [],
  onOpenGoalModal,
  onDeleteGoal,
  assets = [],
  onOpenSettings,
  selectedShoppingListId,
  setSelectedShoppingListId,
  onRegisterShoppingPurchase,
  shoppingLists: propShoppingLists,
  shoppingItems: propShoppingItems,
  shoppingProducts: propShoppingProducts,
  onCreateShoppingList,
  onUpdateShoppingList,
  onDeleteShoppingListWithUndo,
  onDuplicateShoppingList,
  onAddShoppingItem,
  onUpdateShoppingItem,
  onToggleShoppingItemCheck,
  onDeleteShoppingItem,
  onSearchShoppingProducts
}) {
  const finance = useContext(FinanceContext);
  const lists = propShoppingLists || finance?.shoppingLists || [];
  const items = propShoppingItems || finance?.shoppingItems || [];
  const products = propShoppingProducts || finance?.shoppingProducts || [];
  const handleCreateList = onCreateShoppingList || finance?.createShoppingList;
  const handleUpdateList = onUpdateShoppingList || finance?.updateShoppingList;
  const handleDeleteList = onDeleteShoppingListWithUndo || finance?.deleteShoppingListWithUndo;
  const handleDuplicateList = onDuplicateShoppingList || finance?.duplicateShoppingList;
  const handleAddItem = onAddShoppingItem || finance?.addShoppingItem;
  const handleUpdateItem = onUpdateShoppingItem || finance?.updateShoppingItem;
  const handleToggleItemCheck = onToggleShoppingItemCheck || finance?.toggleShoppingItemCheck;
  const handleDeleteItem = onDeleteShoppingItem || finance?.deleteShoppingItem;
  const handleSearchProducts = onSearchShoppingProducts || finance?.searchShoppingProducts;

  const [internalSubTab, setInternalSubTab] = useState('presupuestos');
  const activeTab = externalSubTab !== undefined ? externalSubTab : internalSubTab;
  const setActiveTab = externalSetSubTab !== undefined ? externalSetSubTab : setInternalSubTab;

  return (
    <div className="view-container" style={{ padding: '0 1rem 3rem', color: 'var(--text-primary)' }}>
      {/* ENCABEZADO PRINCIPAL DE PLANIFICAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 5vw, 1.5rem)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Planificar
          </h1>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Presupuestos, compromisos y metas financieras
          </p>
        </div>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Ajustes"
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '1.1rem'
            }}
          >
            ⚙️
          </button>
        )}
      </div>

      {/* SUB-PESTAÑAS DE PLANIFICAR */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {SUB_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                padding: '0.6rem 0.25rem',
                color: isActive ? 'var(--color-accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              {tab.label}
              {tab.id === 'deudas' && obligations.length > 0 && (
                <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '8px', background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)' }}>
                  {obligations.filter(o => o.status !== 'paid').length}
                </span>
              )}
              {tab.id === 'metas' && goals.length > 0 && (
                <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '8px', background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)' }}>
                  {goals.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* CONTENIDO SEGÚN SUB-PESTAÑA */}
      {activeTab === 'presupuestos' && (
        <PlanningBudgetsTab
          budgets={budgets}
          transactions={transactions}
          rates={rates}
          getCategoryName={getCategoryName}
          onOpenCategories={onOpenCategories}
          onOpenBudgetModal={onOpenBudgetModal}
        />
      )}

      {activeTab === 'deudas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>Deudas y Cuotas</h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pagos pendientes y cuentas por cobrar</p>
            </div>
            {onOpenObModal && (
              <button
                type="button"
                onClick={onOpenObModal}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: 'var(--color-accent-soft)',
                  border: '1px solid var(--color-accent-border)',
                  color: 'var(--color-accent)',
                  cursor: 'pointer'
                }}
              >
                + Nueva Deuda
              </button>
            )}
          </div>

          <ObligationsView
            obligations={obligations}
            flippedObId={flippedObId}
            setFlippedObId={setFlippedObId}
            rates={rates}
            veRates={veRates}
            onEdit={onEditObligation}
            onPay={onPayObligation}
            onDelete={onDeleteObligation}
          />
        </div>
      )}

      {activeTab === 'metas' && (
        <PlanningGoalsTab
          goals={goals}
          assets={assets}
          rates={rates}
          onOpenGoalModal={onOpenGoalModal}
          onDeleteGoal={onDeleteGoal}
        />
      )}

      {activeTab === 'compras' && (
        <ShoppingListsView
          shoppingLists={lists}
          shoppingItems={items}
          shoppingProducts={products}
          rates={rates}
          selectedListId={selectedShoppingListId}
          setSelectedListId={setSelectedShoppingListId}
          onCreateList={handleCreateList}
          onUpdateList={handleUpdateList}
          onDeleteListWithUndo={handleDeleteList}
          onDuplicateList={handleDuplicateList}
          onAddItem={handleAddItem}
          onUpdateItem={handleUpdateItem}
          onToggleItemCheck={handleToggleItemCheck}
          onDeleteItem={handleDeleteItem}
          onRegisterPurchase={onRegisterShoppingPurchase}
          searchProducts={handleSearchProducts}
        />
      )}
    </div>
  );
}
