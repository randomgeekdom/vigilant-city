import { useState } from 'react';
import { makeAlias, POWER_SETS, POWER_SET_DEFS, type PowerSet } from '../../engine/data/powersets';
import { POWER_ORIGINS, ORIGIN_DEFS, type PowerOrigin } from '../../engine/data/origins';
import { DEFAULT_THREAT, THREAT_DEFS, THREAT_LEVELS, type ThreatLevel } from '../../engine/data/difficulty';
import { Random } from '../../engine/core/Random';

interface Props {
  onStart: (opts: {
    realName: string;
    alias: string;
    powerSet: PowerSet;
    origin: PowerOrigin;
    threat: ThreatLevel;
  }) => void;
  onLoad: () => void;
  hasSave: boolean;
}

export function NewGame({ onStart, onLoad, hasSave }: Props) {
  const [realName, setRealName] = useState('');
  const [alias, setAlias] = useState('');
  const [powerSet, setPowerSet] = useState<PowerSet>('Flight');
  const [origin, setOrigin] = useState<PowerOrigin>('genetic');
  const [threat, setThreat] = useState<ThreatLevel>(DEFAULT_THREAT);
  const [touched, setTouched] = useState(false);

  const suggest = () => {
    const rng = new Random(Date.now() & 0x7fffffff);
    setAlias(makeAlias(powerSet, realName, (a) => rng.pick(a)));
  };

  const start = () => {
    setTouched(true);
    if (!realName.trim() || !alias.trim()) return;
    onStart({ realName: realName.trim(), alias: alias.trim(), powerSet, origin, threat });
  };

  return (
    <div className="start">
      <div className="start-inner">
        <h1>Vigilant City</h1>
        <p className="premise">
          When <strong>Athena</strong> fell &mdash; felled by a devastating foe, the heavens crying as she
          tumbled &mdash; the city was given no time to mourn. The city needed a new guardian, and it
          needed one fast.
        </p>
        <p className="premise">
          The city has chosen <em>you</em>. What you were before, and what you are capable of, is
          yours to decide.
        </p>

        <div className="field">
          <label htmlFor="real">Real name</label>
          <input
            id="real"
            value={realName}
            placeholder="e.g. Nora Ellery"
            onChange={(e) => {
              setRealName(e.target.value);
              setTouched(false);
            }}
          />
          {touched && !realName.trim() && <span className="err">Required.</span>}
        </div>

        <div className="field">
          <label htmlFor="alias">Alias</label>
          <div className="row">
            <input
              id="alias"
              value={alias}
              placeholder="e.g. Iron Woman"
              onChange={(e) => {
                setAlias(e.target.value);
                setTouched(false);
              }}
            />
            <button onClick={suggest} type="button">
              Suggest
            </button>
          </div>
          {touched && !alias.trim() && <span className="err">Required.</span>}
        </div>

        <div className="field">
          <label>Power</label>
          <div className="grid-powers">
            {POWER_SETS.map((p) => (
              <button
                key={p}
                className={powerSet === p ? 'chip sel' : 'chip'}
                onClick={() => setPowerSet(p)}
                type="button"
              >
                {POWER_SET_DEFS[p].displayName}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Origin</label>
          <div className="grid-cards">
            {POWER_ORIGINS.map((o) => (
              <button
                key={o}
                className={origin === o ? 'card sel' : 'card'}
                onClick={() => setOrigin(o)}
                type="button"
              >
                <strong>{ORIGIN_DEFS[o].label}</strong>
                <span>{ORIGIN_DEFS[o].blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>How hard is the city</label>
          <div className="grid-cards">
            {THREAT_LEVELS.map((t) => (
              <button
                key={t}
                className={threat === t ? 'card sel' : 'card'}
                onClick={() => setThreat(t)}
                type="button"
              >
                <strong>{THREAT_DEFS[t].label}</strong>
                <span>{THREAT_DEFS[t].blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="start-actions">
          <button className="primary" onClick={start} type="button">
            Become the guardian
          </button>
          {hasSave && (
            <button onClick={onLoad} type="button">
              Continue saved run
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
