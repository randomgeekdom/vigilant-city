import { APPROACH_DEFS } from '../../engine/data/approaches';
import { DIFFICULTY_DEFS } from '../../engine/data/difficulty';
import { DISTRICT_LABELS } from '../../engine/data/districts';
import { INCIDENT_TYPE_DEFS } from '../../engine/data/incidentTypes';
import type { ResolutionReport, VillainOutcome } from '../../engine/core/types';

interface Props {
  report: ResolutionReport;
  onDismiss: () => void;
}

const VILLAIN_OUTCOMES: Record<VillainOutcome, { label: string; tone: string; detail: string }> = {
  killed: { label: 'Killed', tone: 'gain', detail: '' },
  imprisoned: { label: 'Imprisoned', tone: 'gain', detail: '' },
  escaped: {
    label: 'Contained',
    tone: 'loss-note',
    detail: ' &mdash; not the same as being stopped. They will be back before the night is out.',
  },
  'pushed-back': { label: 'Pushed back', tone: 'muted', detail: '' },
};

/**
 * The report deliberately leads with what you missed. Attending one incident
 * always costs the city something, and that is the entire game.
 */
export function TurnReport({ report, onDismiss }: Props) {
  const def = INCIDENT_TYPE_DEFS[report.incidentType];

  return (
    <div className="overlay">
      <div className="report">
        <h2 className={report.resolved ? 'win' : 'loss'}>
          {report.resolved ? 'Resolved' : 'It went wrong'}
        </h2>
        <p className="muted">
          {def.label} in {DISTRICT_LABELS[report.district]} &middot; {report.approaches.map((a) => APPROACH_DEFS[a].label).join(' + ')}
        </p>

        <div className="roll">
          <span>Roll {report.roll}</span>
          <span>
            {report.modifier >= 0 ? '+' : ''}
            {report.modifier} modifier
          </span>
          <span>= {report.roll + report.modifier}</span>
          <span className="muted">vs {report.target}</span>
        </div>

        {report.levelled && (
          <p className="gain">
            <strong>You levelled.</strong> That capability is yours permanently now.
          </p>
        )}
        {report.consequence && <p className="loss-note">{report.consequence}</p>}
        {report.identityEvent && (
          <p className={report.identityEvent.kind === 'disclosed' ? 'gain' : 'loss-note'}>
            {report.identityEvent.detail}
          </p>
        )}
        {report.villain && (
          <p className={VILLAIN_OUTCOMES[report.villain.outcome].tone}>
            {VILLAIN_OUTCOMES[report.villain.outcome].label}: <strong>{report.villain.alias}</strong>
            {VILLAIN_OUTCOMES[report.villain.outcome].detail}
            {report.villain.outcome === 'killed' && report.villain.boss && (
              <> &mdash; and the whole roster paid for it</>
            )}
            {report.villain.outcome === 'pushed-back' && (
              <> &mdash; still working, down to {Math.max(0, report.villain.influence)} influence</>
            )}
          </p>
        )}
        <p className="muted small">Reputation {report.reputationDelta >= 0 ? '+' : ''}{report.reputationDelta}</p>

        {report.collateral.length > 0 && (
          <div className="collateral">
            <h3>While you were busy</h3>
            <ul>
              {report.collateral.map((c) => (
                <li key={c.incidentId} className={c.resolved ? '' : 'bad'}>
                  {INCIDENT_TYPE_DEFS[c.incidentType].label} in {DISTRICT_LABELS[c.district]} —{' '}
                  {c.heroId
                    ? c.resolved
                      ? 'handled'
                      : `failed (${c.consequence ?? 'unresolved'})`
                    : c.consequence}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="picker-actions">
          <button className="primary" onClick={onDismiss} type="button">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
