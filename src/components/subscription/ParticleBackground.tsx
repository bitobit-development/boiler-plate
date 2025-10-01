export default function ParticleBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="particle" />
      ))}
    </div>
  );
}