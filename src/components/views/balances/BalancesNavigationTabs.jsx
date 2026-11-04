import React from 'react';
import { SegmentedControl, Icon } from '../../ui';

/**
 * Pestañas de Cuentas: "Por banco" | "Por moneda" y el botón para agregar.
 * activeFilter: 'asset' = por moneda; cualquier otro valor = por banco.
 */
export default function BalancesNavigationTabs({
  activeFilter,
  setActiveFilter,
  setSelectedFilters,
  onAddAsset
}) {
  const byCurrency = activeFilter === 'asset';
  const select = (value) => {
    setActiveFilter(value);
    if (setSelectedFilters) setSelectedFilters([]);
  };

  return (
    <div className="balances-toolbar">
      <SegmentedControl
        ariaLabel="Agrupar cuentas"
        options={[{ value: 'bank', label: 'Por banco' }, { value: 'asset', label: 'Por moneda' }]}
        value={byCurrency ? 'asset' : 'bank'}
        onChange={(value) => select(value === 'asset' ? 'asset' : 'all')}
      />
      {onAddAsset && (
        <button
          type="button"
          className="add-account-btn"
          onClick={onAddAsset}
          aria-label="Agregar cuenta o activo"
        >
          <Icon name="plus" size={16} strokeWidth={2.25} />
          <span>Cuenta</span>
        </button>
      )}
    </div>
  );
}
