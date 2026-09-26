import type { GameSession } from '../../engine/core/GameSession';

interface Props {
  session: GameSession;
  reason: string | null;
  onNewGame: () => void;
}

export function GameOver({ session, reason, onNewGame }: Props) {
  return (
    <div className="overlay">
      <div className="report">
        <h2 className="loss">The city falls</h2>
        <p className="muted">{reason ?? 'Vigilant has no guardian left.'}</p>
        <p className="muted small">
          You answered {session.turn} {session.turn === 1 ? 'call' : 'calls'}.
        </p>
        <div className="picker-actions">
          <button className="primary" onClick={onNewGame} type="button">
            Another city
          </button>
        </div>
      </div>
    </div>
  );
}
