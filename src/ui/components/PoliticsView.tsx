import type { GameSession } from '../../engine/core/GameSession';
import { CELL_DEFS, CELL_IDS, type CellId } from '../../engine/data/cells';

interface Props {
  session: GameSession;
  onCourt: (orgId: string, heroId: string) => void;
  onSuppress: (orgId: string) => void;
}

export function PoliticsView({ session, onCourt, onSuppress }: Props) {
  const orgs = session.organizations;
  const heroes = session.allHeroes;
  const playerId = session.playerHero?.id;

  return (
    <div className="panel">
      <h2>Politics</h2>
      <p className="muted">
        Where a hero's power came from decides what they believe. You can see it on their sheet, and
        so can everyone else.
      </p>

      <h3>Cells inside the roster</h3>
      <div className="cell-grid">
        {CELL_IDS.map((cell) => {
          const def = CELL_DEFS[cell];
          const members = heroes.filter((h) => h.politics.leaning === cell);
          const avg =
            members.length > 0
              ? Math.round(members.reduce((s, h) => s + h.politics.sympathy, 0) / members.length)
              : 0;
          return (
            <div key={cell} className="cell">
              <div className="cell-head">
                <strong>{def.label}</strong>
                <span className={`sym ${avg >= 0 ? 'pos' : 'neg'}`}>
                  {avg >= 0 ? '+' : ''}
                  {avg}
                </span>
              </div>
              <p className="creed">{def.creed}</p>
              <div className="muted small">
                Sees {def.sees}. Origin: {def.origin}.
              </div>
              <div className="members">
                {members.length === 0 ? (
                  <span className="muted small">Nobody in the roster.</span>
                ) : (
                  members.map((h) => (
                    <span key={h.id} className={`member${h.id === playerId ? ' you' : ''}`}>
                      {h.alias}
                      <em>
                        {h.politics.sympathy >= 0 ? '+' : ''}
                        {h.politics.sympathy}
                      </em>
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h3>Organisations pressing on the city</h3>
      {orgs.filter((o) => o.active).length === 0 ? (
        <p className="muted">None left standing.</p>
      ) : (
        <div className="org-list">
          {orgs
            .filter((o) => o.active)
            .map((org) => {
              const ally = heroes.find((h) => h.politics.leaning === org.ideology);
              return (
                <div key={org.id} className="org">
                  <div className="org-head">
                    <strong>{org.name}</strong>
                    <span className="muted small">{CELL_DEFS[org.ideology].label}</span>
                  </div>
                  <p className="agenda">{org.agenda}</p>
                  <div className="org-stats">
                    <span>
                      Power <strong>{org.power}</strong>
                    </span>
                    <span>
                      Standing{' '}
                      <strong className={org.standing >= 0 ? 'pos' : 'neg'}>
                        {org.standing >= 0 ? '+' : ''}
                        {org.standing}
                      </strong>
                    </span>
                  </div>
                  <div className="org-actions">
                    {ally && (
                      <button onClick={() => onCourt(org.id, ally.id)} type="button">
                        Court via {ally.alias}
                      </button>
                    )}
                    <button onClick={() => onSuppress(org.id)} type="button">
                      Suppress
                    </button>
                  </div>
                  {!ally && <p className="muted small">Nobody in your roster shares their politics.</p>}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export function cellLabelFor(cell: CellId): string {
  return CELL_DEFS[cell].label;
}
