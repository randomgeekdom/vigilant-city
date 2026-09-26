import type { GameSession } from '../../engine/core/GameSession';

interface Props {
  session: GameSession;
}

const KIND_LABEL: Record<string, string> = {
  financial: 'Financial',
  industrial: 'Industrial',
  residential: 'Residential',
  docks: 'Docks',
  civic: 'Civic',
};

const FLAG_LABEL: Record<string, string> = {
  openBooks: 'Open books',
  cookedBooks: 'Adjusted books',
  emergencyDesignation: 'Emergency designation',
  oversight: 'Council oversight',
  reporting: 'Published reporting',
  defiant: 'Defied the council',
  criticalOnly: 'Critical calls only',
  refusedTriage: 'Refused triage terms',
  schools: 'School programme',
  raided: 'Raid conducted',
  infiltration: 'Source inside the cell',
  moraleProgramme: 'Support programme',
  pressProtocol: 'Press protocol',
  movedWitnesses: 'Witness relocated',
  decoyProtocol: 'Decoy protocol',
  leaked: 'Leak made moot',
  extendedMandate: 'Extended mandate',
  rivalryQuiet: 'Quiet coordination',
  engaged: 'Engaged the debate',
  fedRival: 'Fed a rival story',
};

export function CityView({ session: s }: Props) {
  const st = s.stats();
  const flags = Object.entries(s.flags()).filter(([, v]) => v > 0);

  return (
    <div className="city">
      <section className="districts">
        <h2>Districts</h2>
        <div className="district-grid">
          {s.districts().map((d) => (
            <article key={d.id} className="district">
              <header>
                <h3>{d.name}</h3>
                <span className="kind">{KIND_LABEL[d.kind] ?? d.kind}</span>
              </header>
              <p className="pop">{(d.population / 1000).toFixed(0)}k residents</p>
              <Meter label="Unrest" value={d.unrest} tone="unrest" />
              <Meter label="Security" value={d.security} tone="security" />
            </article>
          ))}
        </div>
      </section>

      <section className="record">
        <h2>Record</h2>
        <ul className="record-list">
          <li>
            <span>Incidents handled</span>
            <strong>{st.incidentsHandled}</strong>
          </li>
          <li>
            <span>Incidents missed</span>
            <strong className={st.incidentsFailed > 0 ? 'warn' : ''}>{st.incidentsFailed}</strong>
          </li>
          <li>
            <span>Heroes lost</span>
            <strong className={st.heroesLost > 0 ? 'warn' : ''}>{st.heroesLost}</strong>
          </li>
          <li>
            <span>Scandals</span>
            <strong className={st.scandals > 0 ? 'warn' : ''}>{st.scandals}</strong>
          </li>
        </ul>
      </section>

      <section className="standing">
        <h2>Standing orders</h2>
        {flags.length === 0 ? (
          <p className="empty">Nothing on the record yet. That will change.</p>
        ) : (
          <ul className="flag-list">
            {flags.map(([key, value]) => (
              <li key={key}>
                {FLAG_LABEL[key] ?? key}
                {value > 1 && <span className="count"> ×{value}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
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
