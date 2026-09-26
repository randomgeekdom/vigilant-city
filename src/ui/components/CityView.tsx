import { useState } from 'react';
import type { GameSession } from '../../engine/core/GameSession';
import type { Approach } from '../../engine/data/approaches';
import { APPROACH_DEFS } from '../../engine/data/approaches';
import { DIFFICULTY_DEFS } from '../../engine/data/difficulty';
import { DISTRICT_LABELS } from '../../engine/data/districts';
import { INCIDENT_TYPE_DEFS } from '../../engine/data/incidentTypes';
import { APPROACHES } from '../../engine/data/approaches';
import type { IncidentData, ResolutionReport } from '../../engine/core/types';
import { ApproachPicker } from './ApproachPicker';
import { TurnReport } from './TurnReport';

interface Props {
  session: GameSession;
  onResolve: (incidentId: string, a: Approach, b: Approach) => ResolutionReport;
  onPatrol: () => void;
}

export function CityView({ session, onResolve, onPatrol }: Props) {
  const [target, setTarget] = useState<IncidentData | null>(null);
  const [report, setReport] = useState<ResolutionReport | null>(null);
  const incidents = session.openIncidents;
  const empty = incidents.length === 0;

  const hero = session.playerHero;
  const heroPowerSet = hero?.powers[0]?.powerSet;
  const known = (incident: IncidentData, approach: Approach) =>
    hero?.manifestations.some((m) => m.approach === approach && m.powerSet === heroPowerSet && m.difficulty === incident.difficulty) ?? false;

  const resolve = (a: Approach, b: Approach) => {
    if (!target) return;
    const id = target.id;
    setTarget(null);
    const result = onResolve(id, a, b);
    setReport(result ?? null);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Open incidents</h2>
        <button
          onClick={onPatrol}
          disabled={!empty}
          type="button"
          title="Send a patrol to put fresh work on the board"
        >
          Patrol
        </button>
      </div>

      {empty && (
        <p className="muted">
          The city is briefly quiet. That will not last. Send a patrol to find out what is coming.
        </p>
      )}

      <div className="incident-grid">
        {incidents
          .slice()
          .sort((a, b) => a.timeToResolve - b.timeToResolve)
          .map((incident) => {
            const def = INCIDENT_TYPE_DEFS[incident.type];
            const urgent = incident.timeToResolve <= 1;
            return (
              <button
                key={incident.id}
                className={`incident${urgent ? ' urgent' : ''}`}
                onClick={() => setTarget(incident)}
                type="button"
              >
                <div className="incident-head">
                  <strong>{def.label}</strong>
                  <span className={`timer${urgent ? ' urgent' : ''}`}>{incident.timeToResolve}</span>
                </div>
                <div className="incident-where">{DISTRICT_LABELS[incident.district]}</div>
                <div className="incident-diff">
                  {DIFFICULTY_DEFS[incident.difficulty].label} · needs {DIFFICULTY_DEFS[incident.difficulty].roll}
                </div>
                <div className="incident-mods">
                  {APPROACHES.map((a) => {
                    const mod = incident.approachModifiers[a];
                    return (
                      <span key={a} className={`chip ${known(incident, a) ? 'known' : ''}`}>
                        {APPROACH_DEFS[a].label.slice(0, 4)} {mod >= 0 ? `+${mod}` : mod}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
      </div>

      {target && <ApproachPicker incident={target} onCancel={() => setTarget(null)} onConfirm={resolve} />}
      {report && <TurnReport report={report} onDismiss={() => setReport(null)} />}
    </div>
  );
}
