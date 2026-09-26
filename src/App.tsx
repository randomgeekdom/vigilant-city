import { useEffect, useReducer, useRef, useState } from 'react';
import { parseSave } from './engine/core/saveIO';
import { GameSession } from './engine/core/GameSession';
import type { ResolutionReport } from './engine/core/types';
import type { Approach } from './engine/data/approaches';
import type { PowerSet } from './engine/data/powersets';
import type { PowerOrigin } from './engine/data/origins';
import { Sidebar } from './ui/components/Sidebar';
import { ChronicleView } from './ui/components/ChronicleView';
import { NewGame } from './ui/components/NewGame';
import { RosterView } from './ui/components/RosterView';
import { CityView } from './ui/components/CityView';
import { PrisonView } from './ui/components/PrisonView';
import { PoliticsView } from './ui/components/PoliticsView';
import { GameOver } from './ui/components/GameOver';

type TabKey = 'city' | 'roster' | 'politics' | 'prison';

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'city', label: 'City' },
  { key: 'roster', label: 'Heroes' },
  { key: 'politics', label: 'Politics' },
  { key: 'prison', label: 'Prison' },
];

export function App() {
  const sessionRef = useRef<GameSession | null>(null);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [tab, setTab] = useState<TabKey>('city');
  const [booted, setBooted] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await window.gameAPI?.load();
      if (cancelled) return;
      if (raw) {
        const data = parseSave(raw);
        if (data) {
          try {
            sessionRef.current = GameSession.fromSnapshot(data);
            setHasSave(true);
          } catch {
            sessionRef.current = null;
          }
        }
      }
      setBooted(true);
      force();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = () => {
    const s = sessionRef.current;
    if (s && window.gameAPI) void window.gameAPI.save(JSON.stringify(s.snapshot()));
  };

  const commit = (fn: () => void) => {
    fn();
    force();
    setTimeout(persist, 60);
  };

  const startNewGame = (opts: {
    realName: string;
    alias: string;
    powerSet: PowerSet;
    origin: PowerOrigin;
  }) => {
    const { session } = GameSession.newGame(opts);
    sessionRef.current = session;
    setHasSave(true);
    setTab('city');
    force();
    setTimeout(persist, 60);
  };

  const loadGame = () => {
    void (async () => {
      const raw = await window.gameAPI?.load();
      if (!raw) return;
      const data = parseSave(raw);
      if (!data) return;
      try {
        sessionRef.current = GameSession.fromSnapshot(data);
        setTab('city');
        force();
      } catch {
        /* corrupt save — treat as no save */
      }
    })();
  };

  const abandon = () => {
    sessionRef.current = null;
    setTab('city');
    force();
  };

  const s = sessionRef.current;

  if (!booted) return <div className="splash">Vigilant City — the city is waking up…</div>;
  if (!s) return <NewGame onStart={startNewGame} onLoad={loadGame} hasSave={hasSave} />;

  const resolve = (incidentId: string, a: Approach, b: Approach): ResolutionReport => {
    let out: ResolutionReport | null = null;
    commit(() => {
      out = s.resolvePlayerIncident(incidentId, a, b);
    });
    return out!;
  };

  return (
    <div className="app">
      <Sidebar
        session={s}
        onSave={() => {
          persist();
          force();
        }}
        onLoad={loadGame}
        onNewGame={abandon}
      />

      <main className="main">
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? 'tab active' : 'tab'}
              onClick={() => setTab(t.key)}
              type="button"
            >
              {t.label}
              {t.key === 'city' && s.openIncidents.length > 0 && (
                <span className="badge">{s.openIncidents.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="tab-body">
          {tab === 'city' && (
            <CityView session={s} onResolve={resolve} onPatrol={() => commit(() => s.patrol())} />
          )}
          {tab === 'roster' && (
            <RosterView session={s} onDisclose={(id) => commit(() => s.disclose(id))} />
          )}
          {tab === 'politics' && (
            <PoliticsView
              session={s}
              onCourt={(orgId, heroId) => commit(() => s.courtOrganization(orgId, heroId))}
              onSuppress={(orgId) => commit(() => s.suppressOrganization(orgId))}
            />
          )}
          {tab === 'prison' && <PrisonView session={s} />}
        </div>
      </main>

      <ChronicleView session={s} />

      {s.isOver && <GameOver session={s} reason={s.overReason} onNewGame={abandon} />}
    </div>
  );
}
