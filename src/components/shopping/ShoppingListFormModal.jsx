import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function ShoppingListFormModal({
  isOpen,
  onClose,
  initialList = null,
  onSave
}) {
  const [name, setName] = useState('');
  const [store, setStore] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [budget, setBudget] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialList) {
        setName(initialList.name || '');
        setStore(initialList.store || '');
        setCurrency(initialList.currency || 'USD');
        setBudget(initialList.budget != null ? String(initialList.budget) : '');
      } else {
        setName('');
        setStore('');
        setCurrency('USD');
        setBudget('');
      }
      setError('');
    }
  }, [isOpen, initialList]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor indica un nombre para la lista');
      return;
    }

    onSave({
      id: initialList?.id,
      name: name.trim(),
      store: store.trim() || null,
      currency,
      budget: budget !== '' ? Number(budget) : null
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialList ? 'Editar lista de compras' : 'Nueva lista de compras'}
      maxWidth="480px"
      footer={
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} style={{ flex: 1.5 }}>
            {initialList ? 'Guardar cambios' : 'Crear lista'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div style={{
            padding: '0.6rem 0.8rem',
            background: 'var(--color-danger-soft)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: '8px',
            color: 'var(--color-danger)',
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        {/* Nombre de la lista */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
            Nombre de la lista *
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej. Mercado de la semana, Farmacia, Charcutería..."
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            style={{ width: '100%', height: '46px', borderRadius: '10px' }}
          />
        </div>

        {/* Tienda o supermercado (opcional) */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
            Supermercado o comercio (opcional)
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Ej. Excelsior Gama, Plaza's, Central Madeirense, Unicasa..."
            value={store}
            onChange={e => setStore(e.target.value)}
            style={{ width: '100%', height: '46px', borderRadius: '10px' }}
          />
        </div>

        {/* Moneda de la lista */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
            Moneda principal
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['USD', 'VES'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '10px',
                  border: currency === c ? '2px solid var(--color-accent)' : '1px solid var(--border-color)',
                  background: currency === c ? 'var(--color-accent-soft)' : 'var(--bg-surface)',
                  color: currency === c ? 'var(--color-accent)' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {c === 'USD' ? '💵 Dólares (USD)' : '🇻🇪 Bolívares (VES)'}
              </button>
            ))}
          </div>
        </div>

        {/* Presupuesto límite (opcional) */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
            Presupuesto límite (opcional)
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {currency === 'USD' ? '$' : 'Bs.'}
            </span>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              className="input-field"
              placeholder="0.00"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              style={{ width: '100%', height: '46px', paddingLeft: '2.5rem', borderRadius: '10px' }}
            />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Te alertará en la barra fija si el monto de lo marcado se acerca o sobrepasa este límite.
          </div>
        </div>
      </form>
    </Modal>
  );
}
