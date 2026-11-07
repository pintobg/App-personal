import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { SHOPPING_SECTIONS, SHOPPING_UNITS, normalizeSection } from '../../domain/shopping';

function toInput(v) {
  return v === null || v === undefined ? '' : String(v);
}

/**
 * Edición completa de un artículo: nombre, cantidad, unidad, sección,
 * precio estimado y precio real. También permite borrarlo o ver su historial.
 */
export default function ShoppingItemEditModal({ item, onClose, onSave, onDelete, onOpenHistory }) {
  const [form, setForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || '',
        quantity: toInput(item.quantity ?? 1),
        unit: item.unit || 'und',
        section: normalizeSection(item.section),
        estimated_price: toInput(item.estimated_price),
        actual_price: toInput(item.actual_price)
      });
      setConfirmDelete(false);
    } else {
      setForm(null);
    }
  }, [item]);

  if (!item || !form) return null;

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));
  const canSave = form.name.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const qty = Number(form.quantity);
    const est = Number(form.estimated_price);
    const act = form.actual_price === '' ? null : Number(form.actual_price);
    onSave(item.id, {
      name: form.name.trim(),
      quantity: qty > 0 ? qty : 1,
      unit: form.unit,
      section: form.section,
      estimated_price: Number.isFinite(est) && est >= 0 ? est : 0,
      actual_price: act === null || !Number.isFinite(act) || act < 0 ? null : act
    });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Editar artículo" maxWidth="460px">
      <form onSubmit={handleSubmit} className="shop-edit-form">
        <label className="shop-edit-field">
          <span>Nombre</span>
          <input className="input-field" type="text" value={form.name} onChange={set('name')} />
        </label>

        <div className="shop-edit-grid">
          <label className="shop-edit-field">
            <span>Cantidad</span>
            <input className="input-field" type="number" step="any" min="0.01" inputMode="decimal" value={form.quantity} onChange={set('quantity')} />
          </label>
          <label className="shop-edit-field">
            <span>Unidad</span>
            <select className="input-field" value={form.unit} onChange={set('unit')}>
              {SHOPPING_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="shop-edit-field">
            <span>Precio estimado</span>
            <input className="input-field" type="number" step="any" min="0" inputMode="decimal" placeholder="0,00" value={form.estimated_price} onChange={set('estimated_price')} />
          </label>
          <label className="shop-edit-field">
            <span>Precio real</span>
            <input className="input-field" type="number" step="any" min="0" inputMode="decimal" placeholder="Al comprar" value={form.actual_price} onChange={set('actual_price')} />
          </label>
        </div>

        <label className="shop-edit-field">
          <span>Sección</span>
          <select className="input-field" value={form.section} onChange={set('section')}>
            {SHOPPING_SECTIONS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
          </select>
        </label>

        {onOpenHistory && (
          <button type="button" className="link-btn" onClick={() => { onClose(); onOpenHistory(item); }}>
            Ver historial de precios
          </button>
        )}

        <div className="shop-edit-actions">
          {confirmDelete ? (
            <Button variant="danger" onClick={() => { onDelete(item.id); onClose(); }}>
              Sí, borrar
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} style={{ color: 'var(--color-danger)' }}>
              Eliminar
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={!canSave}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
