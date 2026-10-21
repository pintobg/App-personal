export default function FabAction({ onClick, icon, label, variant = 'info' }) {
  return (
    <button
      type="button"
      className="fab-action-pill"
      onClick={onClick}
    >
      <span className={`fab-action-icon ${variant}`}>
        {icon}
      </span>
      <span className="fab-action-label">{label}</span>
    </button>
  );
}
