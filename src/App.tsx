import { useEffect, useReducer, useRef, useState } from 'react';
import { GameSession } from './engine/core/GameSession';
import { Sidebar } from './ui/components/Sidebar';
import { ChronicleView } from './ui/components/ChronicleView';
import { EventModal } from './ui/components/EventModal';
import { NewGame } from './ui/components/NewGame';
import { RosterView } from './ui/components/RosterView';
import { DispatchView } from './ui/components/DispatchView';
import { CityView } from './ui/components/CityView';
import { GameOver } from './ui/components/GameOver';

type TabKey = 'roster' | 'dispatch' | 'city';

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'roster', label: 'Roster' },
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'city', label: 'City' },
];

export function App() {
  const sessionRef = useRef<GameSession | null>(null);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [tab, setTab] = useState<TabKey>('roster');
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await window.gameAPI?.load();
      if (cancelled) return;
      if (data) {
        try {
          sessionRef.current = GameSession.Load(data);
        } catch {
          sessionRef.current = null;
        }
      }
      setBooted(true);
      force();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scheduleSave = () => {
    setTimeout(() => {
      const s = sessionRef.current;
      if (s && window.gameAPI) void window.gameAPI.save(s.Save());
    }, 60);
  };

  const commit = (fn: () => void) => {
    fn();
    force();
    scheduleSave();
  };

  const startNewGame = (opts: {
    seed: number;
    agencyName: string;
    cityName: string;
    directorName: string;
    rosterSize: number;
  }) => {
    sessionRef.current = GameSession.NewGame(opts);
    setTab('roster');
    force();
    scheduleSave();
  };

  const loadGame = () => {
    void (async () => {
      const data = await window.gameAPI?.load();
      if (!data) return;
      try {
        sessionRef.current = GameSession.Load(data);
        force();
      } catch {
        /* corrupt save — treat as no save */
      }
    })();
  };

  const abandon = () => {
    sessionRef.current = null;
    setBooted(true);
    force();
  };

  const s = sessionRef.current;

  if (!booted) return <div className="splash">Vigilant City — powering up the grid…</div>;
  if (!s) return <NewGame onStart={startNewGame} onLoad={loadGame} />;

  const canAdvance = !s.pending && !s.isOver;

  return (
    <div className="app">
      <Sidebar
        session={s}
        canAdvance={canAdvance}
        onAdvance={() => commit(() => s.Advance())}
        onSave={() => {
          if (window.gameAPI) void window.gameAPI.save(s.Save());
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
            >
              {t.label}
              {t.key === 'dispatch' && s.openIncidents().length > 0 && (
                <span className="badge">{s.openIncidents().length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="tab-body">
          {tab === 'roster' && (
            <RosterView
              session={s}
              onRecruit={() => commit(() => s.recruit())}
              onRest={(id) => commit(() => s.rest(id))}
              onRecall={(id) => commit(() => s.recall(id))}
              onStandDown={() => commit(() => s.standDownStruggling())}
              onReveal={(id) => commit(() => s.revealSecret(id))}
            />
          )}
          {tab === 'dispatch' && (
            <DispatchView session={s} onDeploy={(heroId, incidentId) => commit(() => s.deploy(heroId, incidentId))} />
          )}
          {tab === 'city' && <CityView session={s} />}
        </div>
      </main>

      <ChronicleView entries={s.logEntries(60)} />

      {s.pending && <EventModal event={s.pending} onChoose={(i) => commit(() => s.Choose(i))} />}
      {s.isOver && <GameOver reason={s.overReason} session={s} onNewGame={abandon} />}
    </div>
  );
}
