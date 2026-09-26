import type { GameSession } from '../../engine/core/GameSession';
import type { HeroData } from '../../engine/core/types';

interface Props {
  session: GameSession;
  onRecruit: () => void;
  onRest: (id: string) => void;
  onRecall: (id: string) => void;
  onStandDown: () => void;
  onReveal: (id: string) => void;
}

const SECRET_LABEL: Record<string, string> = {
  payroll: 'second paycheque',
  substance: 'substance problem',
  informant: 'prior informant',
  faction: 'cell membership',
  imposter: 'powers unverified',
};

export function RosterView({ session: s, onRecruit, onRest, onRecall, onStandDown, onReveal }: Props) {
  const heroes = s.heroes();

  return (
    <div className="roster">
      <div className="roster-actions">
        <button className="primary" disabled={!s.canRecruit()} onClick={onRecruit}>
          Recruit (45 funding)
        </button>
        <button onClick={onStandDown}>Stand down the struggling</button>
        <span className="hint">
          {heroes.filter((h) => h.status === 'active').length} active of {heroes.length} on file
        </span>
      </div>

      <div className="hero-grid">
        {heroes.map((h) => (
          <HeroCard
            key={h.id}
            hero={h}
            onRest={onRest}
            onRecall={onRecall}
            onReveal={onReveal}
            canRest={s.canRest(h.id)}
            session={s}
          />
        ))}
      </div>
    </div>
  );
}

function HeroCard({
  hero: h,
  onRest,
  onRecall,
  onReveal,
  canRest,
  session,
}: {
  hero: HeroData;
  onRest: (id: string) => void;
  onRecall: (id: string) => void;
  onReveal: (id: string) => void;
  canRest: boolean;
  session: GameSession;
}) {
  const incident = h.deployedTo ? session.incidents().find((i) => i.id === h.deployedTo) : undefined;
  const district = incident ? session.district(incident.districtId) : undefined;

  return (
    <article className={`hero-card status-${h.status}`}>
      <header>
        <div>
          <h3>{h.callsign}</h3>
          <p className="real">{h.name}</p>
        </div>
        <span className="archetype">{h.archetype}</span>
      </header>

      {h.secret && (
        <div className="secret">
          <strong>Secret:</strong> {SECRET_LABEL[h.secret] ?? h.secret}
          <div className="pressure-track">
            <div className="pressure-fill" style={{ width: `${h.secretPressure}%` }} />
          </div>
        </div>
      )}

      <div className="stats">
        <Bar label="Condition" value={h.condition} tone="condition" />
        <Bar label="Morale" value={h.morale} tone="morale" />
        <Bar label="Fame" value={h.fame} tone="fame" />
      </div>

      <p className="quirks">
        {h.quirks.length > 0 ? h.quirks.join(' · ') : 'no known quirks'}
        <span className="age"> · age {h.age}</span>
      </p>

      <footer>
        {h.status === 'lost' ? (
          <span className="tag lost">lost</span>
        ) : incident ? (
          <span className="tag deployed">
            on the job — {district?.name ?? 'field'} ({incident.turnsLeft} left)
          </span>
        ) : h.status === 'injured' ? (
          <span className="tag resting">recovering</span>
        ) : (
          <span className="tag available">available</span>
        )}
        <span className="missions">{h.missions} calls</span>
      </footer>

      <div className="hero-buttons">
        {incident && (
          <button onClick={() => onRecall(h.id)}>Recall</button>
        )}
        {h.status === 'active' && !incident && (
          <button disabled={!canRest} onClick={() => onRest(h.id)}>
            Stand down
          </button>
        )}
        {h.secret && (
          <button className="warn-btn" onClick={() => onReveal(h.id)}>
            Release the story
          </button>
        )}
      </div>
    </article>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bar">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className={`bar-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="bar-value">{Math.round(value)}</span>
    </div>
  );
}
