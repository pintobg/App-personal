import Button from './Button';
import Modal from './Modal';

/**
 * Componente ConfirmDialog del Sistema de Diseño
 * Reemplaza el uso de window.confirm() con un diálogo accesible, estilizado y consistente.
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Confirmar acción',
  message = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger' | 'primary' | 'warning'
  onConfirm,
  onCancel,
  className = '',
  ...rest
}) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  const footer = (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-3)',
        width: '100%',
        justifyContent: 'flex-end'
      }}
    >
      <Button
        variant="secondary"
        onClick={onCancel}
        style={{ flex: 1 }}
      >
        {cancelText}
      </Button>
      <Button
        variant={isDanger ? 'danger' : 'primary'}
        onClick={onConfirm}
        style={{ flex: 1 }}
      >
        {confirmText}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth="420px"
      showCloseButton={false}
      footer={footer}
      className={`ui-confirm-dialog ${className}`.trim()}
      {...rest}
    >
      <p
        style={{
          margin: '0 0 var(--space-4)',
          fontSize: 'var(--font-sm)',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          whiteSpace: 'pre-line'
        }}
      >
        {message}
      </p>
    </Modal>
  );
}
