import { useState, useEffect } from 'react';
import CustomSelect from '../common/CustomSelect';

const COMMON_CURRENCIES = ['USD', 'USDT', 'VES', 'EUR', 'COP', 'BTC', 'ETH'];

export default function GoalModal({
  isOpen,
  onClose,
  goal,
  assets = [],
  onSave,
  onDelete
}) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [deadline, setDeadline] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (goal) {
        setName(goal.name || '');
        setTargetAmount(goal.targetAmount != null ? String(goal.targetAmount) : '');
        setCurrency(goal.currency || 'USD');
        setDeadline(goal.deadline ? goal.deadline.slice(0, 10) : '');
        setSelectedAccountIds(Array.isArray(goal.accountIds) ? goal.accountIds : []);
      } else {
        setName('');
        setTargetAmount('');
        setCurrency('USD');
        // Fecha límite sugerida: fin de este año o 6 meses en adelante
        const d = new Date();
        d.setMonth(d.getMonth() + 6);
        setDeadline(d.toISOString().slice(0, 10));
        setSelectedAccountIds([]);
      }
      setError('');
    }
  }, [isOpen, goal]);

  if (!isOpen) return null;

  const currencyOptions = Array.from(
    new Set([...COMMON_CURRENCIES, ...assets.map(a => a.name).filter(Boolean)])
  ).map(c => ({ value: c, label: c }));

  const toggleAccount = (accountId) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAllAccounts = () => {
    if (selectedAccountIds.length === assets.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(assets.map(a => a.id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor indica un nombre para la meta');
      return;
    }
    const cleanAmountStr = String(targetAmount).replace(/\./g, '').replace(',', '.');
    const parsedAmount = parseFloat(cleanAmountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor ingresa un monto objetivo válido mayor a cero');
      return;
    }
    if (!deadline) {
      setError('Por favor selecciona una fecha límite');
      return;
    }

    onSave({
      ...(goal?.id ? { id: goal.id } : {}),
      name: name.trim(),
      targetAmount: parsedAmount,
      currency,
      deadline,
      accountIds: selectedAccountIds
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Atrás">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Atrás</span>
          </button>
          <h2>{goal?.id ? 'Editar Meta' : 'Nueva Meta de Ahorro'}</h2>
          <div style={{ width: '64px' }} />
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <div className="input-group">
            <label>Nombre de la meta</label>
            <input
              type="text"
              className="input-field"
              placeholder="ej. Fondo de emergencia, Vacaciones, Moto"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ flex: 2 }}>
              <label>Monto objetivo</label>
              <input
                type="text"
                inputMode="decimal"
                className="input-field"
                placeholder="0,00"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                required
              />
            </div>
            <div className="input-group" style={{ flex: 1.2 }}>
              <label>Moneda</label>
              <CustomSelect
                placeholder="Moneda"
                title="Moneda de la meta"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                options={currencyOptions}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Fecha límite</label>
            <input
              type="date"
              className="input-field"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ margin: 0 }}>Cuentas que cuentan para la meta</label>
              {assets.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllAccounts}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    padding: '2px 4px'
                  }}
                >
                  {selectedAccountIds.length === assets.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              )}
            </div>

            {assets.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem 0' }}>
                No tienes cuentas registradas aún.
              </div>
            ) : (
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                padding: '0.2rem'
              }}>
                {assets.map(asset => {
                  const isChecked = selectedAccountIds.includes(asset.id);
                  return (
                    <label
                      key={asset.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        background: isChecked ? 'rgba(2, 132, 199, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                        border: isChecked ? '1px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAccount(asset.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0284c7' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{asset.location}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{asset.name}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#cbd5e1' }}>
                        {Number(asset.amount || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {asset.name}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <small style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.35rem', display: 'block' }}>
              El saldo de estas cuentas se convertirá a {currency} a la tasa de hoy para calcular tu avance.
            </small>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            {goal?.id && onDelete && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={() => {
                  onDelete(goal.id);
                  onClose();
                }}
              >
                Eliminar
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {goal?.id ? 'Guardar Cambios' : 'Crear Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
