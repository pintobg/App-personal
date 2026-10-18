export default function EmptyState({ icon, message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', opacity: 0.7, textAlign: 'center' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem', filter: 'grayscale(0.5)' }}>{icon}</div>
      <div style={{ color: '#98989d', fontSize: '0.95rem', fontWeight: 500 }}>{message}</div>
    </div>
  );
}
