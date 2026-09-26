import { useState } from 'react';
import type { GameSession } from '../../engine/core/GameSession';
import type { IncidentData } from '../../engine/core/types';

interface Props {
  session: GameSession;
  onDeploy: (heroId: string, incidentId: string) => void;
}

const KIND_LABEL: Record<string, string> = {
  crime: 'Crime',
  disaster: 'Disaster',
  public: 'Public safety',
  supervillain: 'Supervillain',
  mundane: 'Mundane',
};

export function DispatchView({ session: s, onDeploy }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const open = s.openIncidents();
  const closed = s.incidents().filter((i) => i.resolved).slice(-8).reverse();
  const roster = s.available();
  const selectedHero = selected ? s.heroById(selected) : undefined;

  if (open.length === 0) {
    return (
      <div className="dispatch">
        <p className="empty">No open calls. The city is behaving itself, which it will not last.</p>
        {closed.length > 0 && <ResolvedList items={closed} session={s} />}
      </div>
    );
  }

  return (
    <div className="dispatch">
      <div className="incident-list">
        {open.map((i) => {
          const d = s.district(i.districtId);
          return (
            <article key={i.id} className={`incident sev-${band(i.severity)}`}>
              <header>
                <span className="kind">{KIND_LABEL[i.kind] ?? i.kind}</span>
                <span className="severity">severity {i.severity}</span>
                <span className="ticks">{i.turnsLeft} month{i.turnsLeft === 1 ? '' : 's'} left</span>
              </header>
              <h3>{d?.name ?? 'unknown district'}</h3>
              <p className="urgency">{urgencyText(i.turnsLeft)}</p>
              <div className="pick">
                <select value={selected ?? ''} onChange={(e) => setSelected(e.target.value || null)}>
                  <option value="">Assign…</option>
                  {roster.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.callsign} — {h.archetype}
                    </option>
                  ))}
                </select>
                <button
                  className="primary"
                  disabled={!selected || !selectedHero || !s.canDeploy(selected, i.id)}
                  onClick={() => {
                    if (selected) onDeploy(selected, i.id);
                    setSelected(null);
                  }}
                >
                  Send
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {closed.length > 0 && <ResolvedList items={closed} session={s} />}
    </div>
  );
}

function ResolvedList({ items, session }: { items: IncidentData[]; session: GameSession }) {
  return (
    <div className="resolved">
      <h3>Recently closed</h3>
      <ul>
        {items.map((i) => {
          const d = session.district(i.districtId);
          return (
            <li key={i.id} className={i.outcome}>
              <span className="r-district">{d?.name ?? '—'}</span>
              <span className="r-text">{i.resolution}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function band(severity: number): string {
  if (severity >= 7) return 'critical';
  if (severity >= 4) return 'elevated';
  return 'routine';
}

function urgencyText(turnsLeft: number): string {
  if (turnsLeft <= 1) return 'Nobody sent will be enough in time.';
  if (turnsLeft === 2) return 'One month of slack, no more.';
  return 'There is room to plan this.';
}
