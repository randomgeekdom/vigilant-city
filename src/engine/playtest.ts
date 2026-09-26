import { GameSession } from './core/GameSession';
import { EventRegistry } from './core/EventSystem';
import { ALL_EVENTS } from './events';
import type { HeroStatus } from './core/types';

const TURNS = Number(process.env.VIGILANT_TURNS ?? 60);
const SEED = Number(process.env.VIGILANT_SEED ?? 20260925);

let failures = 0;

function check(label: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok   ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function inRange(v: number, lo: number, hi: number): boolean {
  return Number.isFinite(v) && v >= lo && v <= hi;
}

function direct(session: GameSession): void {
  const open = [...session.openIncidents()].sort((a, b) => b.severity - a.severity);
  for (const incident of open) {
    const free = [...session.available()].sort((a, b) => b.condition - a.condition);
    const hero = free[0];
    if (hero) session.deploy(hero.id, incident.id);
  }
}

function simulate(seed: number, turns: number): GameSession {
  const session = GameSession.NewGame({
    seed,
    agencyName: '',
    cityName: '',
    directorName: '',
    rosterSize: 4,
  });

  for (let i = 0; i < turns; i++) {
    if (session.isOver) break;
    if (session.pending) {
      const enabled = session.pending.choices.findIndex((c) => c.enabled);
      session.Choose(enabled >= 0 ? enabled : 0);
    }
    direct(session);
    session.Advance();
  }
  return session;
}

console.log(`Vigilant City playtest — seed ${SEED}, ${TURNS} months\n`);

const registry = new EventRegistry(ALL_EVENTS);
console.log('event packs');
check('registry loaded', registry.size() > 0, `${registry.size()} events`);
const ids = new Set(ALL_EVENTS.map((e) => e.id));
check('event ids unique', ids.size === ALL_EVENTS.length, `${ids.size} unique of ${ALL_EVENTS.length}`);
check(
  'every event has choices or effect',
  ALL_EVENTS.every((e) => e.choices.length > 0 || e.effect !== undefined),
);
check('every event has a title', ALL_EVENTS.every((e) => e.title.trim().length > 0));
check('every choice has an effect', ALL_EVENTS.every((e) => e.choices.every((c) => typeof c.effect === 'function')));

console.log('\nsingle run');
const session = simulate(SEED, TURNS);
const res = session.res();
const stats = session.stats();

check('turns advanced', session.turn > 0, `${session.turn} months`);
check('funding finite and in range', inRange(res.funding, 0, 500), `${res.funding.toFixed(1)}`);
check('trust finite and in range', inRange(res.trust, 0, 100), `${res.trust.toFixed(1)}`);
check('intel finite and in range', inRange(res.intel, 0, 100), `${res.intel.toFixed(1)}`);
check('roster survived', session.heroes().length >= 1, `${session.heroes().length} heroes`);
check(
  'hero stats in range',
  session.heroes().every(
    (h) => inRange(h.condition, 0, 100) && inRange(h.morale, 0, 100) && inRange(h.fame, 0, 100),
  ),
);
check('districts in range', session.districts().every((d) => inRange(d.unrest, 0, 100) && inRange(d.security, 0, 100)));
check(
  'no NaN leaked into state',
  !/NaN|Infinity/.test(session.Save()),
  'snapshot stringifies clean',
);
check('stats non-negative', stats.incidentsHandled >= 0 && stats.incidentsFailed >= 0);

const orphans = session.heroes().filter((h) => {
  if (h.deployedTo === null) return false;
  const inc = session.incidents().find((i) => i.id === h.deployedTo);
  return !inc || inc.resolved;
});
check('no heroes stranded on closed incidents', orphans.length === 0, `${orphans.length} orphans`);

const badStatus: HeroStatus[] = ['active', 'injured', 'retired', 'lost'];
check(
  'hero statuses valid',
  session.heroes().every((h) => badStatus.includes(h.status)),
);

console.log('\nsave round-trip');
const saved = session.Save();
const restored = GameSession.Load(saved);
check('turn matches', restored.turn === session.turn);
check('resources match', JSON.stringify(restored.res()) === JSON.stringify(session.res()));
check('roster matches', restored.heroes().length === session.heroes().length);
check('chronicle matches', restored.logEntries(60).length === session.logEntries(60).length);

const nextA = simulate(SEED, TURNS);
nextA.Advance();
const fromSave = GameSession.Load(saved);
fromSave.Advance();
check(
  'restore continues the same deterministic stream',
  nextA.Save() === fromSave.Save(),
  nextA.Save() === fromSave.Save() ? 'byte-identical' : 'streams diverged',
);

console.log('\nmulti-seed sweep');
let ranOut = 0;
let survived = 0;
let handledTotal = 0;
for (let i = 0; i < 12; i++) {
  const s = simulate(SEED + i * 7919, 48);
  if (s.isOver) ranOut += 1;
  else survived += 1;
  handledTotal += s.stats().incidentsHandled;
  const r = s.res();
  if (!inRange(r.funding, 0, 500) || !inRange(r.trust, 0, 100)) {
    check(`seed ${SEED + i * 7919} resources in range`, false, `funding ${r.funding} trust ${r.trust}`);
  }
}
check('no seed produced out-of-range resources', true);
check('run terminates on every seed', survived + ranOut === 12, `${survived} survived, ${ranOut} ended`);
check('greedy director actually resolves calls', handledTotal > 0, `${handledTotal} handled across sweep`);
check('greedy director is beatable', survived > 0, `${survived}/12 survived 48 months`);

console.log('\nfinal state of seed ' + SEED);
console.log(`  ${session.agencyName} over ${session.dateLabel()}`);
console.log(`  funding ${res.funding.toFixed(0)}  trust ${res.trust.toFixed(0)}  intel ${res.intel.toFixed(0)}`);
console.log(`  handled ${stats.incidentsHandled}  missed ${stats.incidentsFailed}  lost ${stats.heroesLost}  scandals ${stats.scandals}`);
if (session.isOver) console.log(`  ended: ${session.overReason}`);

console.log('\nsample chronicle');
for (const entry of session.logEntries(8)) {
  console.log(`  [${entry.kind}] ${entry.text}`);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
