import { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { ActionSheet, Icon } from '../ui';
import CategoryPicker from './CategoryPicker';

/**
 * Barra de selección múltiple en Movimientos: Categoría, Cuenta, Eliminar y cerrar.
 * Los cambios se pueden deshacer desde el aviso que aparece abajo.
 */
export default function BulkActionBar({ selectedTxs = [], onDelete, onExit }) {
  const finance = useContext(FinanceContext);
  const [panel, setPanel] = useState(null); // 'category' | 'account' | null
  const count = selectedTxs.length;
  const assets = finance?.assets || [];
  const bulkEdit = finance?.bulkEditTransactions;

  // Tipo de categoría: el de la mayoría de los seleccionados (gasto o ingreso).
  const spentCount = selectedTxs.filter(t => t.type === 'spent').length;
  const incomeCount = selectedTxs.filter(t => t.type === 'income').length;
  const kind = incomeCount > spentCount ? 'income' : 'spent';
  const currencies = Array.from(new Set(selectedTxs.filter(t => t.type === 'spent' || t.type === 'income').map(t => (t.currency || '').toUpperCase())));
  const movable = selectedTxs.filter(t => (t.type === 'spent' || t.type === 'income') && !t.parentTransactionId);
  // Cuentas de la misma moneda, sin la cuenta donde ya están todos los seleccionados.
  const accountOptions = assets.filter(a =>
    currencies.includes((a.name || '').trim().toUpperCase()) &&
    !(movable.length > 0 && movable.every(t => t.assetId === a.id))
  );

  const finish = () => { setPanel(null); onExit?.(); };

  return (
    <>
      <div className="bulk-bar" role="toolbar" aria-label="Acciones para los movimientos seleccionados">
        <span className="bulk-bar-count" aria-live="polite">
          <strong>{count}</strong>
          <span className="bulk-bar-count-word"> {count === 1 ? 'seleccionado' : 'seleccionados'}</span>
        </span>
        <button type="button" className="bulk-bar-btn" disabled={!count || !bulkEdit} onClick={() => setPanel('category')}>
          <Icon name="tag" size={18} /><span>Categoría</span>
        </button>
        <button type="button" className="bulk-bar-btn" disabled={!count || !bulkEdit} onClick={() => setPanel('account')}>
          <Icon name="exchange" size={18} /><span>Cuenta</span>
        </button>
        <button type="button" className="bulk-bar-btn danger" disabled={!count} onClick={onDelete} aria-label="Eliminar seleccionados">
          <Icon name="trash" size={18} /><span>Eliminar</span>
        </button>
        <button type="button" className="bulk-bar-close" onClick={onExit} aria-label="Salir de la selección">
          <Icon name="close" size={20} />
        </button>
      </div>

      {panel === 'category' && (
        <ActionSheet
          isOpen
          onClose={() => setPanel(null)}
          title={`Cambiar categoría (${kind === 'income' ? 'ingresos' : 'gastos'})`}
          subtitle={`Se aplica a ${kind === 'income' ? incomeCount : spentCount} de ${count}`}
        >
          <CategoryPicker
            kind={kind === 'income' ? 'income' : 'expense'}
            transactions={finance?.transactions || []}
            onChange={({ categoryId, categoryName, subcategoryId, subcategoryName }) => {
              bulkEdit(selectedTxs, { type: 'category', kind, category: categoryName, category_id: categoryId, subcategory: subcategoryName || '', subcategory_id: subcategoryId || null });
              finish();
            }}
          />
        </ActionSheet>
      )}

      {panel === 'account' && (
        <ActionSheet
          isOpen
          onClose={() => setPanel(null)}
          title="Mover a otra cuenta"
          subtitle="Solo cuentas con la misma moneda. Los saldos se corrigen solos."
          actions={accountOptions.length ? accountOptions.map(a => ({
            label: `${a.location} · ${(a.name || '').toUpperCase() === 'VES' ? 'Bs.' : (a.name || '').toUpperCase()}`,
            onClick: () => { bulkEdit(selectedTxs, { type: 'move', assetId: a.id }); finish(); }
          })) : [{ label: 'No hay cuentas con esa moneda', disabled: true }]}
        />
      )}
    </>
  );
}
