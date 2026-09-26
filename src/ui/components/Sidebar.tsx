import type { GameSession } from '../../engine/core/GameSession';

interface Props {
  session: GameSession;
  canAdvance: boolean;
  onAdvance: () => void;
  onSave: () => void;
  onLoad: () => void;
  onNewGame: () => void;
}

const METERS: readonly { key: 'funding' | 'trust' | 'intel'; label: string; max: number; tone: string }[] = [
  { key: 'funding', label: 'Funding', max: 500, tone: 'gold' },
  { key: 'trust', label: 'Public Trust', max: 100, tone: 'blue' },
  { key: 'intel', label: 'Intel', max: 100, tone: 'violet' },
];

export function Sidebar({ session: s, canAdvance, onAdvance, onSave, onLoad, onNewGame }: Props) {
  const res = s.res();
  const open = s.openIncidents().length;
  const active = s.heroes().filter((h) => h.status === 'active').length;

  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>Vigilant City</h1>
        <p className="agency">{s.agencyName}</p>
        <p className="date">
          {s.dateLabel()} <span className="turn">· month {s.turn}</span>
        </p>
      </div>

      <div className="meters">
        {METERS.map((m) => {
          const value = res[m.key];
          const pct = Math.max(0, Math.min(100, (value / m.max) * 100));
          return (
            <div className="meter" key={m.key}>
              <div className="meter-head">
                <span>{m.label}</span>
                <span className="meter-value">{Math.round(value)}</span>
              </div>
              <div className="meter-track">
                <div className={`meter-fill ${m.tone}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="summary">
        <div>
          <span className="summary-label">Active</span>
          <span className="summary-value">{active}</span>
        </div>
        <div>
          <span className="summary-label">Open calls</span>
          <span className={`summary-value ${open > 0 ? 'warn' : ''}`}>{open}</span>
        </div>
        <div>
          <span className="summary-label">Handled</span>
          <span className="summary-value">{s.stats().incidentsHandled}</span>
        </div>
        <div>
          <span className="summary-label">Missed</span>
          <span className={`summary-value ${s.stats().incidentsFailed > 0 ? 'warn' : ''}`}>
            {s.stats().incidentsFailed}
          </span>
        </div>
      </div>

      <div className="controls">
        <button className="primary" onClick={onAdvance} disabled={!canAdvance}>
          {s.pending ? 'Resolve the decision' : 'Advance one month'}
        </button>
        <div className="row">
          <button onClick={onSave}>Save</button>
          <button onClick={onLoad}>Load</button>
        </div>
        <button className="ghost" onClick={onNewGame}>
          Abandon run
        </button>
      </div>

      <p className="credit">Director {s.directorName}</p>
    </aside>
  );
}
