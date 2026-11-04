import { SegmentedControl } from '../ui';

const OPTIONS = [
  { value: 'bcv', label: 'BCV' },
  { value: 'paralelo', label: 'Paralelo' },
  { value: 'custom', label: 'Propia' }
];

/**
 * Elige con qué tasa se calculan los totales en dólares: BCV, paralelo o una propia.
 * Vive solo en Tasas para que haya un único lugar donde cambiarla.
 */
export default function ReferenceRateSelector({ referenceRate = 'bcv', setReferenceRate, onChanged }) {
  return (
    <SegmentedControl
      className="reference-rate-selector"
      role="radio"
      ariaLabel="Tasa para tus totales"
      options={OPTIONS}
      value={referenceRate || 'bcv'}
      onChange={(value, opt) => {
        if (setReferenceRate) setReferenceRate(value);
        if (onChanged) onChanged(opt);
      }}
    />
  );
}
