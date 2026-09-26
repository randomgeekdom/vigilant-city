import type { GameSession } from '../../engine/core/GameSession';
import { POWER_SET_DEFS } from '../../engine/data/powersets';
import { ORIGIN_DEFS } from '../../engine/data/origins';

export function PrisonView({ session }: { session: GameSession }) {
  const villains = session.villains;
  return (
    <div className="panel">
      <h2>Who is out there</h2>
      <p className="muted">
        Every success puts someone behind bars. Every <em>Lethal</em> approach makes that permanent instead.
      </p>
      {villains.length === 0 ? (
        <p className="muted">Nothing on record yet.</p>
      ) : (
        <div className="villain-list">
          {villains.map((v) => (
            <div key={v.id} className={`villain ${v.status}`}>
              <div>
                <strong>{v.alias}</strong>
                <span className="real-name"> ({v.realName})</span>
              </div>
              <div className="muted small">
                {v.powers.map((p) => `${POWER_SET_DEFS[p.powerSet].displayName} · ${ORIGIN_DEFS[p.origin].label}`).join(', ')}
              </div>
              <span className="status">{v.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
