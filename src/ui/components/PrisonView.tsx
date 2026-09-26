import type { GameSession } from '../../engine/core/GameSession';
import { POWER_SET_DEFS } from '../../engine/data/powersets';
import { ORIGIN_DEFS } from '../../engine/data/origins';
import { CELL_DEFS } from '../../engine/data/cells';
import { tierForInfluence } from '../../engine/data/villains';

export function PrisonView({ session }: { session: GameSession }) {
  const villains = session.villains;
  const active = villains.filter((v) => v.status === 'active');
  const settled = villains.filter((v) => v.status !== 'active');

  return (
    <div className="panel">
      <h2>Who is out there</h2>
      <p className="muted">
        Every turn you spend elsewhere, they get stronger. Push one back to nothing and another takes
        its place — there is no rest.
      </p>

      <h3>Working now</h3>
      {active.length === 0 ? (
        <p className="muted">Nothing that anyone can name. Enjoy it.</p>
      ) : (
        <div className="villain-list">
          {active
            .slice()
            .sort((a, b) => b.influence - a.influence)
            .map((v) => {
              const tier = tierForInfluence(v.influence);
              return (
                <div key={v.id} className={`villain active t${tier.tier}`}>
                  <div>
                    <strong>{v.alias}</strong>
                    <span className="real-name"> ({v.realName})</span>
                  </div>
                  <div className="muted small">
                    {v.powers.map((p) => `${POWER_SET_DEFS[p.powerSet].displayName} · ${ORIGIN_DEFS[p.origin].label}`).join(', ')}
                    {v.backedBy && <> — backed by {CELL_DEFS[v.backedBy].label}</>}
                  </div>
                  <div className="influence">
                    <div className="bar">
                      <div className="fill" style={{ width: `${v.influence}%` }} />
                    </div>
                    <span>
                      {v.influence} &middot; {tier.label}
                    </span>
                  </div>
                  <p className="muted small">{tier.effect}</p>
                </div>
              );
            })}
        </div>
      )}

      {settled.length > 0 && (
        <>
          <h3>Settled</h3>
          <div className="villain-list">
            {settled.map((v) => (
              <div key={v.id} className={`villain ${v.status}`}>
                <div>
                  <strong>{v.alias}</strong>
                  <span className="real-name"> ({v.realName})</span>
                </div>
                <span className="status">{v.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
