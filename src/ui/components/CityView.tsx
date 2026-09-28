import { useState } from 'react';
import type { GameSession } from '../../engine/core/GameSession';
import type { Approach } from '../../engine/data/approaches';
import { APPROACH_DEFS } from '../../engine/data/approaches';
import { DIFFICULTY_DEFS } from '../../engine/data/difficulty';
import type { DifficultyLevel } from '../../engine/data/difficulty';
import { DISTRICTS, DISTRICT_LABELS } from '../../engine/data/districts';
import { INCIDENT_TYPE_DEFS } from '../../engine/data/incidentTypes';
import { BOSS_POWER_DEFS } from '../../engine/data/bosses';
import { tierForInfluence } from '../../engine/data/villains';
import { APPROACHES } from '../../engine/data/approaches';
import type { IncidentData, ResolutionReport } from '../../engine/core/types';
import { ApproachPicker } from './ApproachPicker';
import { TurnReport } from './TurnReport';

interface Props {
  session: GameSession;
  onResolve: (incidentId: string, a: Approach, b: Approach) => ResolutionReport;
  onHunt: (villainId: string, a: Approach, b: Approach) => ResolutionReport;
  onPatrol: () => void;
}

export function CityView({ session, onResolve, onHunt, onPatrol }: Props) {
  const [target, setTarget] = useState<IncidentData | null>(null);
  const [huntTarget, setHuntTarget] = useState<string | null>(null);
  const [report, setReport] = useState<ResolutionReport | null>(null);
  const incidents = session.openIncidents;
  const empty = incidents.length === 0;

  const hero = session.playerHero;
  const heroPowerSet = hero?.powers[0]?.powerSet;
  const known = (incident: IncidentData, approach: Approach) =>
    hero?.manifestations.some((m) => m.approach === approach && m.powerSet === heroPowerSet && m.difficulty === incident.difficulty) ?? false;
  const behind = (incident: IncidentData) => session.villains.find((v) => v.id === incident.villainId);

  const resolve = (a: Approach, b: Approach) => {
    if (!target) return;
    const id = target.id;
    setTarget(null);
    const result = onResolve(id, a, b);
    setReport(result ?? null);
  };

  const hunt = (a: Approach, b: Approach) => {
    if (!huntTarget) return;
    const id = huntTarget;
    setHuntTarget(null);
    const result = onHunt(id, a, b);
    setReport(result ?? null);
  };

  const activeVillains = session.villains
    .filter((v) => v.status === 'active')
    .sort((a, b) => b.influence - a.influence);

  /**
   * A stand-in incident so the approach picker can be reused for a hunt. The
   * engine builds the real one; this only has to be honest about difficulty so
   * the player is not shown a target they cannot actually meet.
   */
  const huntIncident = (villainId: string): IncidentData => {
    const villain = session.villains.find((v) => v.id === villainId);
    const tier = tierForInfluence(villain?.influence ?? 0);
    const difficulty: DifficultyLevel = tier.tier >= 3 ? 'difficult' : tier.tier >= 2 ? 'average' : 'easy';
    return {
      id: `hunt-${villainId}`,
      type: 'murder',
      description: `A confrontation with ${villain?.alias ?? 'them'}.`,
      district: incidents[0]?.district ?? DISTRICTS[0],
      timeToResolve: 1,
      difficulty,
      approachModifiers: Object.fromEntries(APPROACHES.map((a) => [a, 0])) as Record<Approach, number>,
      villainId,
    };
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Open incidents</h2>
        <button
          onClick={onPatrol}
          type="button"
          title="Costs a full turn: every open incident ages and every villain grows before you get the new work"
        >
          Patrol (costs a turn)
        </button>
      </div>

      {empty && (
        <p className="muted">
          Nothing open. Go out, or hunt someone who is not currently committing a crime.
        </p>
      )}

      {activeVillains.length > 0 && (
        <div className="hunt-bar">
          <span className="muted small">Go after someone directly:</span>
          {activeVillains.map((v) => {
            const tier = tierForInfluence(v.influence);
            return (
              <button
                key={v.id}
                className={`hunt-chip t${tier.tier}${v.boss ? ' boss' : ''}${huntTarget === v.id ? ' selected' : ''}`}
                onClick={() => setHuntTarget(huntTarget === v.id ? null : v.id)}
                type="button"
                title={
                  v.boss
                    ? `${v.alias} has outgrown the job. ${BOSS_POWER_DEFS[v.boss].tell} Costs a full turn, and attention barely comes off them.`
                    : `Confront ${v.alias}. Costs a full turn and hits harder than catching them at the scene.`
                }
              >
                {v.alias}
                <em>
                  {v.influence} {v.boss ? 'boss' : tier.label}
                </em>
              </button>
            );
          })}
        </div>
      )}

      <div className="incident-grid">
        {incidents
          .slice()
          .sort((a, b) => a.timeToResolve - b.timeToResolve)
          .map((incident) => {
            const def = INCIDENT_TYPE_DEFS[incident.type];
            const urgent = incident.timeToResolve <= 1;
            const villain = behind(incident);
            const tier = villain ? tierForInfluence(villain.influence) : null;
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
                {villain && tier && (
                  <div className={`incident-behind t${tier.tier}`}>
                    {villain.alias}
                    <span className="infl">
                      {villain.influence}
                      <em>{tier.label}</em>
                    </span>
                  </div>
                )}
                <div className="incident-diff">
                  {DIFFICULTY_DEFS[incident.difficulty].label} &middot; needs {DIFFICULTY_DEFS[incident.difficulty].roll}
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
      {huntTarget && (
        <ApproachPicker
          incident={huntIncident(huntTarget)}
          onCancel={() => setHuntTarget(null)}
          onConfirm={hunt}
        />
      )}
      {report && <TurnReport report={report} onDismiss={() => setReport(null)} />}
    </div>
  );
}
