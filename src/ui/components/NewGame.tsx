import { useState } from 'react';

interface Props {
  onStart: (opts: {
    seed: number;
    agencyName: string;
    cityName: string;
    directorName: string;
    rosterSize: number;
  }) => void;
  onLoad: () => void;
}

export function NewGame({ onStart, onLoad }: Props) {
  const [agencyName, setAgencyName] = useState('');
  const [cityName, setCityName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [rosterSize, setRosterSize] = useState(4);

  return (
    <div className="newgame">
      <div className="newgame-card">
        <h1>Vigilant City</h1>
        <p className="tagline">
          You do not fight. You have a roster, a budget, a city that is frightened of you, and eleven months
          until the budget review. Decide what to send where, and who to believe.
        </p>

        <label>
          Agency
          <input
            value={agencyName}
            placeholder="leave blank to generate"
            onChange={(e) => setAgencyName(e.target.value)}
          />
        </label>
        <label>
          City
          <input
            value={cityName}
            placeholder="leave blank to generate"
            onChange={(e) => setCityName(e.target.value)}
          />
        </label>
        <label>
          Director
          <input
            value={directorName}
            placeholder="leave blank to generate"
            onChange={(e) => setDirectorName(e.target.value)}
          />
        </label>
        <label>
          Roster size
          <input
            type="number"
            min={2}
            max={6}
            value={rosterSize}
            onChange={(e) => setRosterSize(Math.max(2, Math.min(6, Number(e.target.value) || 2)))}
          />
        </label>
        <label>
          Seed
          <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 1)} />
        </label>

        <div className="newgame-actions">
          <button className="primary" onClick={() => onStart({ seed, agencyName, cityName, directorName, rosterSize })}>
            Begin
          </button>
          <button onClick={onLoad}>Continue saved run</button>
        </div>
      </div>
    </div>
  );
}
