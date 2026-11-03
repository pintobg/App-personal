import { useState, useMemo } from 'react';
import ShoppingListDetailView from './ShoppingListDetailView';
import ShoppingListFormModal from './ShoppingListFormModal';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import { calculateListTotals } from '../../domain/shopping';
import { formatAmount, getCurrencySymbol } from '../../utils/formatters';
import { toLocalDateString } from '../../utils/dates';

export default function ShoppingListsView({
  shoppingLists = [],
  shoppingItems = [],
  shoppingProducts = [],
  rates = {},
  selectedListId = null,
  setSelectedListId = () => {},
  onCreateList = () => {},
  onUpdateList = () => {},
  onDeleteListWithUndo = () => {},
  onDuplicateList = () => {},
  onAddItem = () => {},
  onUpdateItem = () => {},
  onToggleItemCheck = () => {},
  onDeleteItem = () => {},
  onRegisterPurchase = () => {},
  searchProducts = () => []
}) {
  const [internalSelectedListId, setInternalSelectedListId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);

  // Permite controlar la lista seleccionada externamente (por ej. desde el FAB global) o internamente
  const activeListId = selectedListId !== undefined && selectedListId !== null
    ? selectedListId
    : internalSelectedListId;

  const setActiveListId = (id) => {
    setInternalSelectedListId(id);
    if (setSelectedListId) setSelectedListId(id);
  };

  // Listas activas y terminadas
  const activeLists = useMemo(() => {
    return (shoppingLists || [])
      .filter(l => l.status !== 'done' && !l.deleted_at)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [shoppingLists]);

  const completedLists = useMemo(() => {
    return (shoppingLists || [])
      .filter(l => l.status === 'done' && !l.deleted_at)
      .sort((a, b) => new Date(b.completed_at || b.created_at || 0) - new Date(a.completed_at || a.created_at || 0));
  }, [shoppingLists]);

  // Si hay una lista seleccionada, renderizar su vista de detalle
  const currentList = useMemo(() => {
    if (!activeListId) return null;
    return (shoppingLists || []).find(l => l.id === activeListId);
  }, [shoppingLists, activeListId]);

  if (currentList) {
    return (
      <ShoppingListDetailView
        list={currentList}
        items={shoppingItems}
        products={shoppingProducts}
        rates={rates}
        onBack={() => setActiveListId(null)}
        onAddItem={onAddItem}
        onUpdateItem={onUpdateItem}
        onToggleItemCheck={onToggleItemCheck}
        onDeleteItem={onDeleteItem}
        onRegisterPurchase={onRegisterPurchase}
        searchProducts={searchProducts}
      />
    );
  }

  const handleOpenCreateModal = () => {
    setEditingList(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (list, e) => {
    if (e) e.stopPropagation();
    setEditingList(list);
    setIsFormModalOpen(true);
  };

  const handleSaveModal = (data) => {
    if (data.id) {
      onUpdateList(data.id, data);
    } else {
      const created = onCreateList(data);
      if (created?.id) {
        setActiveListId(created.id);
      }
    }
  };

  const handleDuplicate = (listId, e) => {
    if (e) e.stopPropagation();
    const duplicated = onDuplicateList(listId);
    if (duplicated?.id) {
      setActiveListId(duplicated.id);
    }
  };

  const handleDelete = (listId, e) => {
    if (e) e.stopPropagation();
    onDeleteListWithUndo(listId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>
      {/* ENCABEZADO Y BOTÓN NUEVA LISTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Mis listas de mercado
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {activeLists.length} {activeLists.length === 1 ? 'lista activa' : 'listas activas'} • {completedLists.length} realizadas
          </div>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.84rem', fontWeight: 600, borderRadius: '10px' }}
        >
          + Nueva lista
        </Button>
      </div>

      {/* 1. SECCIÓN LISTAS ACTIVAS */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Listas Activas ({activeLists.length})
        </div>

        {activeLists.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📝</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>No tienes listas activas</div>
            <div style={{ fontSize: '0.78rem', marginTop: '4px', marginBottom: '1rem' }}>
              Crea una lista para planificar tus compras y comparar con el presupuesto.
            </div>
            <Button variant="secondary" onClick={handleOpenCreateModal} style={{ fontSize: '0.8rem' }}>
              + Crear mi primera lista
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeLists.map(list => {
              const listItems = shoppingItems.filter(i => i.list_id === list.id && !i.deleted_at);
              const totals = calculateListTotals(listItems, list.currency, rates, list.budget);
              const currSymbol = getCurrencySymbol(list.currency);

              return (
                <div
                  key={list.id}
                  className="glass-card"
                  onClick={() => setActiveListId(list.id)}
                  style={{
                    padding: '1rem',
                    borderRadius: '16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {list.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        {list.store && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-surface-elevated)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            🏪 {list.store}
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                          {list.currency}
                        </span>
                        {list.budget > 0 && (
                          <span style={{ fontSize: '0.72rem', color: totals.isOverBudget ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                            Presupuesto: {currSymbol}{formatAmount(list.budget, list.currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones de tarjeta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        title="Duplicar lista"
                        aria-label="Duplicar lista"
                        onClick={(e) => handleDuplicate(list.id, e)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', fontSize: '0.9rem' }}
                      >
                        📋
                      </button>
                      <button
                        type="button"
                        title="Editar lista"
                        aria-label="Editar lista"
                        onClick={(e) => handleOpenEditModal(list, e)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', fontSize: '0.9rem' }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        title="Eliminar lista"
                        aria-label="Eliminar lista"
                        onClick={(e) => handleDelete(list.id, e)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px', fontSize: '0.9rem' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Barra de progreso de artículos marcados */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>
                        {totals.checkedCount} de {totals.totalCount} {totals.totalCount === 1 ? 'artículo comprado' : 'artículos comprados'}
                      </span>
                      <span style={{ fontWeight: 600 }}>{totals.progressPercent}%</span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: 'var(--bg-surface-elevated)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${totals.progressPercent}%`,
                          background: totals.progressPercent === 100 ? 'var(--color-success-strong)' : 'var(--color-accent-strong)',
                          transition: 'width 0.25s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Totales y botón de abrir */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Marcado: </span>
                      <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                        {currSymbol}{formatAmount(totals.checkedTotal, list.currency)}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: '6px' }}>
                        (Est: {currSymbol}{formatAmount(totals.estimatedTotal, list.currency)})
                      </span>
                    </div>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.8rem' }}>
                      Abrir lista →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. SECCIÓN LISTAS TERMINADAS */}
      {completedLists.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Listas Terminadas ({completedLists.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {completedLists.map(list => {
              const listItems = shoppingItems.filter(i => i.list_id === list.id && !i.deleted_at);
              const totals = calculateListTotals(listItems, list.currency, rates);
              const currSymbol = getCurrencySymbol(list.currency);
              const completedDateStr = list.completed_at ? toLocalDateString(list.completed_at) : 'Completada';

              return (
                <div
                  key={list.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    opacity: 0.9
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => setActiveListId(list.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {list.name}
                      </span>
                      <span style={{ fontSize: '0.65rem', background: 'var(--color-success-soft)', color: 'var(--color-success)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                        ✓
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <span>{completedDateStr}</span>
                      {list.store && <span> • {list.store}</span>}
                      <span> • Total: {currSymbol}{formatAmount(totals.checkedTotal > 0 ? totals.checkedTotal : totals.estimatedTotal, list.currency)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <Button
                      variant="secondary"
                      onClick={(e) => handleDuplicate(list.id, e)}
                      title="Repetir lista para esta semana"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem', borderRadius: '8px' }}
                    >
                      🔁 Repetir lista
                    </Button>
                    <IconButton
                      ariaLabel="Eliminar lista"
                      variant="ghost"
                      onClick={(e) => handleDelete(list.id, e)}
                      style={{ width: '28px', height: '28px', color: 'var(--color-danger)' }}
                    >
                      🗑️
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal para crear o editar lista */}
      <ShoppingListFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialList={editingList}
        onSave={handleSaveModal}
      />
    </div>
  );
}
