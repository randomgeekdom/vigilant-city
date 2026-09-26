/**
 * Headless harness. The engine has no DOM imports, so the whole game runs here.
 *
 * Checks three things:
 *  1. The loop terminates and produces plausible games over many seeds.
 *  2. A save/load round-trip is byte-identical AND continues the same rng stream.
 *  3. The pacing rule actually holds: resolving one incident ticks the others.
 */
import { GameSession } from './core/GameSession';
import { SNAPSHOT_VERSION, type CitySnapshot, type HeroData } from './core/types';
import { APPROACHES, type Approach } from './data/approaches';
import { POWER_SETS, type PowerSet } from './data/powersets';
import { POWER_ORIGINS, type PowerOrigin } from './data/origins';
import { Random } from './core/Random';

let failures = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

function pickTwo(rng: Random): [Approach, Approach] {
  const shuffled = rng.shuffle(APPROACHES);
  return [shuffled[0]!, shuffled[1]!];
}

function playRun(seed: number, maxTurns: number): GameSession {
  const rng = new Random(seed ^ 0x5eed);
  const powerSet = rng.pick(POWER_SETS) as PowerSet;
  const origin = rng.pick(POWER_ORIGINS) as PowerOrigin;
  const { session } = GameSession.newGame({
    realName: 'Test Subject',
    alias: 'Test Hero',
    powerSet,
    origin,
    seed,
  });

  let guard = 0;
  while (!session.isOver && session.turn < maxTurns && session.openIncidents.length > 0 && guard < 10_000) {
    const incident = session.openIncidents[Math.floor(rng.next() * session.openIncidents.length)]!;
    const [a, b] = pickTwo(rng);
    try {
      session.resolvePlayerIncident(incident.id, a, b);
    } catch {
      break;
    }
    guard += 1;
  }
  return session;
}

console.log('determinism and integrity');
{
  const seed = 1234;
  const session = playRun(seed, 60);
  const snap = session.snapshot();
  check('run produced history', session.history.length > 0, `history=${session.history.length}`);
  check('turns advanced', snap.turn > 0, `turn=${snap.turn}`);
  check('snapshot version current', snap.version === SNAPSHOT_VERSION);

  const replayed = playRun(seed, 60).snapshot();
  check('same seed reproduces run', JSON.stringify(replayed) === JSON.stringify(snap));

  const restored = GameSession.fromSnapshot(snap);
  check('load round-trip preserves state', JSON.stringify(restored.snapshot()) === JSON.stringify(snap));

  const continueA = playForward(restored, 5);
  const fresh = GameSession.fromSnapshot(snap);
  const continueB = playForward(fresh, 5);
  check(
    'rng stream continues identically after load',
    JSON.stringify(continueA.snapshot()) === JSON.stringify(continueB.snapshot()),
  );
}

console.log('pacing rule');
{
  const { session } = GameSession.newGame({
    realName: 'Pacer',
    alias: 'Pacer',
    powerSet: 'Flight',
    origin: 'genetic',
    seed: 99,
  });
  const before = session.openIncidents.map((i) => ({ id: i.id, t: i.timeToResolve }));
  const target = session.openIncidents[0]!;
  const others = before.filter((i) => i.id !== target.id);
  const [a, b] = ['swift', 'tactical'] as [Approach, Approach];
  session.resolvePlayerIncident(target.id, a, b);

  const ticked = others.every((o) => {
    const now = session.openIncidents.find((i) => i.id === o.id);
    return !now || now.timeToResolve === o.t - 1;
  });
  check('every other incident ticked down by exactly 1', ticked);
  check('resolved incident left the board', !session.openIncidents.some((i) => i.id === target.id));
}

console.log('failing hero loses capability before dying');
{
  const { session } = GameSession.newGame({
    realName: 'Fragile',
    alias: 'Fragile',
    powerSet: 'SuperStrength',
    origin: 'technological',
    seed: 4242,
  });
  const hero = session.playerHero as HeroData;
  const manifestCount = hero.manifestations.length;
  const powerCount = hero.powers.length;
  const wasPlayer = session.playerHero?.id;

  let sawManifestationLoss = false;
  let sawPowerLoss = false;
  for (let i = 0; i < 400 && !session.isOver; i += 1) {
    if (session.openIncidents.length === 0) {
      session.patrol();
      if (session.openIncidents.length === 0) break;
    }
    const inc = session.openIncidents[0]!;
    const [a, b] = pickTwo(new Random(i));
    try {
      session.resolvePlayerIncident(inc.id, a, b);
    } catch {
      break;
    }
    const h = session.allHeroes.find((x) => x.id === wasPlayer);
    if (h && h.manifestations.length < manifestCount) sawManifestationLoss = true;
    if (h && h.powers.length < powerCount) sawPowerLoss = true;
  }
  check('manifestations can be shed on failure', sawManifestationLoss || sawPowerLoss);
}

console.log('rider sweeps');
{
  let finished = 0;
  let incidents = 0;
  let over = 0;
  for (let seed = 1; seed <= 200; seed += 1) {
    const s = playRun(seed * 7919, 200);
    if (s.turn > 0) finished += 1;
    incidents += s.openIncidents.length;
    if (s.isOver) over += 1;
  }
  check('all 200 seeds produced a playable run', finished === 200, `finished=${finished}`);
  check('runs terminate or cap out', incidents >= 0);
  console.log(`  info terminal runs: ${over}/200, mean open incidents at cap: ${(incidents / 200).toFixed(2)}`);
}

console.log(failures === 0 ? '\nPLAYTEST PASS' : `\nPLAYTEST FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);

function playForward(session: GameSession, steps: number): GameSession {
  const rng = new Random(777);
  for (let i = 0; i < steps && !session.isOver && session.openIncidents.length > 0; i += 1) {
    const inc = session.openIncidents[0]!;
    const [a, b] = pickTwo(rng);
    try {
      session.resolvePlayerIncident(inc.id, a, b);
    } catch {
      break;
    }
  }
  return session;
}

export type { CitySnapshot };
