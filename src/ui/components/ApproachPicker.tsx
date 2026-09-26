import { useState } from 'react';
import { APPROACHES, APPROACH_DEFS, type Approach } from '../../engine/data/approaches';
import { DIFFICULTY_DEFS } from '../../engine/data/difficulty';
import { DISTRICT_LABELS } from '../../engine/data/districts';
import { INCIDENT_TYPE_DEFS } from '../../engine/data/incidentTypes';
import type { IncidentData } from '../../engine/core/types';

interface Props {
  incident: IncidentData;
  onCancel: () => void;
  onConfirm: (a: Approach, b: Approach) => void;
}

export function ApproachPicker({ incident, onCancel, onConfirm }: Props) {
  const [picked, setPicked] = useState<Approach[]>([]);
  const def = INCIDENT_TYPE_DEFS[incident.type];
  const ready = picked.length === 2;

  const toggle = (a: Approach) => {
    setPicked((prev) => {
      if (prev.includes(a)) return prev.filter((x) => x !== a);
      if (prev.length >= 2) return [prev[1]!, a];
      return [...prev, a];
    });
  };

  const total = picked.reduce((sum, a) => sum + incident.approachModifiers[a], 0);

  return (
    <div className="overlay">
      <div className="picker">
        <h2>{def.label}</h2>
        <p className="muted">{def.description}</p>
        <p className="picker-meta">
          {DISTRICT_LABELS[incident.district]} &middot; {DIFFICULTY_DEFS[incident.difficulty].label} (roll{' '}
          {DIFFICULTY_DEFS[incident.difficulty].roll}) &middot; resolves in {incident.timeToResolve}
        </p>

        <h3>Choose two approaches</h3>
        <div className="approach-grid">
          {APPROACHES.map((a) => {
            const mod = incident.approachModifiers[a];
            const on = picked.includes(a);
            return (
              <button
                key={a}
                className={`approach${on ? ' chosen' : ''}`}
                onClick={() => toggle(a)}
                type="button"
              >
                <span className="approach-label">{APPROACH_DEFS[a].label}</span>
                <span className="approach-blurb">{APPROACH_DEFS[a].blurb}</span>
                <span className={`mod ${mod >= 0 ? 'pos' : 'neg'}`}>
                  {mod >= 0 ? `+${mod}` : mod}
                </span>
              </button>
            );
          })}
        </div>

        <p className="muted small">
          Approach bonus {total >= 0 ? `+${total}` : total}. {picked.length}/2 selected.
          {picked.includes('lethal') && (
            <strong className="warn"> Lethal: whatever is behind this will be killed, not imprisoned.</strong>
          )}
        </p>

        <div className="picker-actions">
          <button onClick={onCancel} type="button">
            Walk away
          </button>
          <button className="primary" disabled={!ready} onClick={() => ready && onConfirm(picked[0]!, picked[1]!)} type="button">
            Intervene
          </button>
        </div>
      </div>
    </div>
  );
}
