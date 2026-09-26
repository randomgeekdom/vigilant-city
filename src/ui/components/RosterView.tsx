import type { GameSession } from '../../engine/core/GameSession';
import { ORIGIN_DEFS } from '../../engine/data/origins';
import { POWER_SET_DEFS } from '../../engine/data/powersets';
import { APPROACH_DEFS } from '../../engine/data/approaches';
import { DIFFICULTY_DEFS } from '../../engine/data/difficulty';
import { CELL_DEFS } from '../../engine/data/cells';
import { trustFill, type TrustVerdict } from '../../engine/data/reputation';
import type { HeroData } from '../../engine/core/types';

const TRUST_READING: Record<TrustVerdict, string> = {
  held: 'The city still believes in us. It is not asking where the victories went yet.',
  slipping: 'The city is starting to ask where the victories went.',
  failing: 'Under the floor. Nobody is coming to our door, and the ones already answering are deciding for themselves.',
};

interface Props {
  session: GameSession;
  onDisclose: (heroId: string) => void;
}

export function RosterView({ session, onDisclose }: Props) {
  const playerId = session.playerHero?.id;
  const trust = session.trust;
  const floor = session.trustFloor;
  const verdict = session.trustState;
  return (
    <div className="panel">
      <h2>Heroes</h2>
      <p className="muted">
        You do not command these people. They answer when the city calls. What you do is decide which
        of them is left standing when you get back.
      </p>

      <div className={`trust trust-${verdict}`}>
        <div className="label">City trust</div>
        <div className="secrecy-bar">
          <span>{trust}</span>
          <div className="bar">
            <div className="fill" style={{ width: `${trustFill(trust, floor)}%` }} />
          </div>
          <span className="muted">floor {floor}</span>
        </div>
        <div className="muted small">{TRUST_READING[verdict]}</div>
        <div className="muted small">
          Every reputation above, added up. Not one of them can carry a city that has stopped
          believing in the rest.
        </div>
      </div>

      <div className="hero-list">
        {session.allHeroes.map((hero) => (
          <HeroCard key={hero.id} hero={hero} isPlayer={hero.id === playerId} onDisclose={onDisclose} />
        ))}
      </div>
    </div>
  );
}

function HeroCard({
  hero,
  isPlayer,
  onDisclose,
}: {
  hero: HeroData;
  isPlayer: boolean;
  onDisclose: (heroId: string) => void;
}) {
  const secrecy = hero.identity.exposed ? 0 : hero.identity.secrecy;
  return (
    <div className={`hero-card${isPlayer ? ' player' : ''}`}>
      <div className="hero-head">
        <div>
          <strong>{hero.alias}</strong>
          <span className="real-name">{isPlayer ? ` (${hero.realName})` : ''}</span>
        </div>
        <span className={`rep${hero.reputation < 0 ? ' bad' : ''}`}>Rep {hero.reputation}</span>
      </div>

      <div className="hero-powers">
        {hero.powers.length === 0 && <span className="muted">No powers left. Not really a hero.</span>}
        {hero.powers.map((p) => (
          <span key={`${p.powerSet}-${p.origin}`} className="power">
            {POWER_SET_DEFS[p.powerSet].displayName}
            <em>{ORIGIN_DEFS[p.origin].label}</em>
          </span>
        ))}
      </div>

      <div className="hero-manifests">
        <div className="label">Proven</div>
        {hero.manifestations.length === 0 ? (
          <span className="muted small">Has not yet learned to do anything reliably.</span>
        ) : (
          <ul>
            {hero.manifestations.map((m) => (
              <li key={`${m.name}-${m.approach}`}>
                {POWER_SET_DEFS[m.powerSet].displayName} via {APPROACH_DEFS[m.approach].label}
                <span className="muted"> ({DIFFICULTY_DEFS[m.difficulty].label})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hero-civil">
        <div className="label">Civilian life</div>
        <div className={hero.identity.exposed ? 'exposed' : ''}>
          {hero.identity.exposed ? (
            <strong>Exposed. Cover gone.</strong>
          ) : hero.identity.disclosed ? (
            <strong>Public by choice. {hero.realName} is a known quantity.</strong>
          ) : (
            <>
              {hero.identity.civilianJob} &middot; {hero.identity.civilianTies.join('; ')}
            </>
          )}
        </div>
        <div className="secrecy-bar">
          <span>Secrecy</span>
          <div className="bar">
            <div className="fill" style={{ width: `${secrecy}%` }} />
          </div>
          <span>{secrecy}</span>
        </div>
        {hero.identity.tieDamage > 0 && (
          <div className="muted small warn">Ties damaged: {hero.identity.tieDamage}%</div>
        )}
        <div className="hero-actions">
          {!hero.identity.exposed && !hero.identity.disclosed && (
            <button onClick={() => onDisclose(hero.id)} type="button" title="Take the mask off on purpose. Costs 15 reputation now, buys legitimacy forever — and 15 is most of what the city is holding in trust.">
              Go public
            </button>
          )}
        </div>
      </div>

      <div className="hero-politics">
        <div className="label">Politics</div>
        <div className="pol-row">
          <span>{CELL_DEFS[hero.politics.leaning].label}</span>
          <span className={`sym ${hero.politics.sympathy >= 0 ? 'pos' : 'neg'}`}>
            {hero.politics.sympathy >= 0 ? '+' : ''}
            {hero.politics.sympathy}
          </span>
        </div>
        <div className="muted small">{CELL_DEFS[hero.politics.leaning].creed}</div>
      </div>
    </div>
  );
}
