import type { GameSession } from '../../engine/core/GameSession';
import { THREAT_DEFS } from '../../engine/data/difficulty';
import { ORIGIN_DEFS } from '../../engine/data/origins';
import { POWER_SET_DEFS } from '../../engine/data/powersets';

interface Props {
  session: GameSession;
  onSave: () => void;
  onLoad: () => void;
  onNewGame: () => void;
}

export function Sidebar({ session, onSave, onLoad, onNewGame }: Props) {
  const hero = session.playerHero;
  if (!hero) return null;
  const power = hero.powers[0];
  const trust = session.trust;
  const trustTone = session.trustState === 'failing' ? 'bad' : session.trustState === 'slipping' ? 'warn' : '';

  return (
    <aside className="sidebar">
      <h1>Vigilant City</h1>

      <div className="me">
        <div className="me-alias">{hero.alias}</div>
        <div className="me-real">{hero.realName}</div>
        {power && (
          <div className="me-power">
            {POWER_SET_DEFS[power.powerSet].displayName}
            <em>{ORIGIN_DEFS[power.origin].label}</em>
          </div>
        )}
        <div className={`me-secrecy${hero.identity.exposed ? ' exposed' : ''}`}>
          {hero.identity.exposed ? 'Cover blown' : `Secrecy ${hero.identity.secrecy}`}
        </div>
      </div>

      <div className="stat-row">
        <span>Turn</span>
        <strong>{session.turn}</strong>
      </div>
      <div className="stat-row">
        <span>Open</span>
        <strong>{session.openIncidents.length}</strong>
      </div>
      <div className="stat-row">
        <span>City</span>
        <strong title={THREAT_DEFS[session.threat].blurb}>{THREAT_DEFS[session.threat].label}</strong>
      </div>
      <div className="stat-row">
        <span>City trust</span>
        <strong
          className={trustTone}
          title={`The city's opinion of the whole roster, summed. At ${session.trustFloor} it stops believing in us and the run ends.`}
        >
          {trust}
        </strong>
      </div>
      <div className="stat-row">
        <span>Reputation</span>
        <strong className={hero.reputation < 0 ? 'bad' : ''}>{hero.reputation}</strong>
      </div>
      <div className="stat-row">
        <span>Proven</span>
        <strong>{hero.manifestations.length}</strong>
      </div>

      <div className="sidebar-actions">
        <button onClick={onSave} type="button">
          Save
        </button>
        <button onClick={onLoad} type="button">
          Load
        </button>
        <button onClick={onNewGame} type="button">
          New run
        </button>
      </div>
    </aside>
  );
}
