interface Props {
  reason: string;
  session: { dateLabel: () => string; stats: () => { incidentsHandled: number; incidentsFailed: number; heroesLost: number; scandals: number } };
  onNewGame: () => void;
}

export function GameOver({ reason, session, onNewGame }: Props) {
  const st = session.stats();
  return (
    <div className="modal-backdrop">
      <div className="modal gameover">
        <h2 className="modal-title">The run ends</h2>
        <p className="modal-text">{reason}</p>
        <p className="modal-text dim">It lasted until {session.dateLabel()}.</p>
        <ul className="final-stats">
          <li>
            <span>Incidents handled</span>
            <strong>{st.incidentsHandled}</strong>
          </li>
          <li>
            <span>Incidents missed</span>
            <strong>{st.incidentsFailed}</strong>
          </li>
          <li>
            <span>Heroes lost</span>
            <strong>{st.heroesLost}</strong>
          </li>
          <li>
            <span>Scandals</span>
            <strong>{st.scandals}</strong>
          </li>
        </ul>
        <button className="primary" onClick={onNewGame}>
          Start again
        </button>
      </div>
    </div>
  );
}
