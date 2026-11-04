import React, { useState, useContext } from 'react';
import ObligationsView from './ObligationsView';
import ShoppingListsView from '../shopping/ShoppingListsView';
import PlanningBudgetsTab from './planning/PlanningBudgetsTab';
import PlanningGoalsTab from './planning/PlanningGoalsTab';
import PlanningTabHeader from './planning/PlanningTabHeader';
import { FinanceContext } from '../../context/FinanceContext';

const SUB_TABS = [
  { id: 'presupuestos', label: 'Presupuestos' },
  { id: 'deudas', label: 'Deudas' },
  { id: 'metas', label: 'Metas' },
  { id: 'compras', label: 'Compras' }
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
  actionObId,
  setActionObId,
  onEditObligation,
  onPayObligation,
  onDeleteObligation,
  onOpenObModal,
  goals = [],
  onOpenGoalModal,
  onDeleteGoal,
  assets = [],
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
    <div className="view-container planning-view">
      <h1 className="page-title">Planificar</h1>

      {/* Sub-pestañas: ocupan todo el ancho, sin desplazamiento lateral */}
      <div className="planning-tabs" role="tablist" aria-label="Secciones de Planificar">
        {SUB_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const count = tab.id === 'deudas'
            ? obligations.filter(o => o.status !== 'paid').length
            : (tab.id === 'metas' ? goals.length : 0);
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`planning-tab${isActive ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              {count > 0 && <span className="planning-tab-count">{count}</span>}
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
          <PlanningTabHeader
            hint="Lo que debes pagar y lo que te deben."
            actions={[onOpenObModal && { label: '+ Nueva', ariaLabel: 'Nueva deuda o cobro', onClick: onOpenObModal, primary: true }]}
          />

          <ObligationsView
            obligations={obligations}
            actionObId={actionObId}
            setActionObId={setActionObId}
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
