import type { GameSession } from '../../engine/core/GameSession';

export function ChronicleView({ session }: { session: GameSession }) {
  return (
    <aside className="chronicle">
      <h3>The city's memory</h3>
      {session.history.length === 0 ? (
        <p className="muted small">Nothing has happened yet.</p>
      ) : (
        <ul>
          {session.history.slice(0, 40).map((line, i) => (
            <li key={`${i}-${line.slice(0, 12)}`}>{line}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
