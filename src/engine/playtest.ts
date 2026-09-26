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
import { ideologyModifier } from './core/politics';
import { rosterTrust, TRUST_FLOOR_PER_HERO, TRUST_LOST, trustFloor } from './data/reputation';
import { BACKED_PENALTY, HUNT_MULTIPLIER, INFLUENCE_ON_SUCCESS, MAX_INFLUENCE } from './data/villains';

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

function playRun(seed: number, maxTurns: number, strategy: 'neglect' | 'random' | 'focus' = 'random'): GameSession {
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
  while (!session.isOver && session.turn < maxTurns && guard < 10_000) {
    if (strategy === 'neglect') {
      session.patrol();
      guard += 1;
      continue;
    }
    if (session.openIncidents.length === 0) {
      session.patrol();
      guard += 1;
      continue;
    }
    // A focused player goes after whoever is closest to taking the city, and
    // hunts them directly when there is no work of theirs on the board.
    if (strategy === 'focus') {
      const worst = session.villains
        .filter((v) => v.status === 'active')
        .sort((a, b) => b.influence - a.influence)[0];
      if (worst) {
        const theirs = session.openIncidents.filter((i) => i.villainId === worst.id);
        const incident = theirs[0];
        const [a, b] = pickTwo(rng);
        try {
          if (incident) session.resolvePlayerIncident(incident.id, a, b);
          else session.huntVillain(worst.id, a, b);
        } catch {
          break;
        }
        guard += 1;
        continue;
      }
    }
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

console.log('villains are the second board');
{
  const { session } = GameSession.newGame({
    realName: 'Focus Test',
    alias: 'Focus Test',
    powerSet: 'Telekinesis',
    origin: 'alien',
    seed: 5150,
  });
  check('incidents name a culprit', session.openIncidents.every((i) => session.villains.some((v) => v.id === i.villainId)));
  const activeCount = session.villains.filter((v) => v.status === 'active').length;
  check('a villain exists at start', activeCount > 0);

  // Attending one villain's work is what lets the others grow.
  const others = session.villains.filter((v) => v.status === 'active' && v.id !== session.openIncidents[0]!.villainId);
  const before = others.map((v) => v.influence);
  session.resolvePlayerIncident(session.openIncidents[0]!.id, 'diplomatic', 'tactical');
  const grew = others.filter((v, i) => v.influence > before[i]!).length;
  check('success feeds the villains you were not attending', grew > 0 || others.length === 0, `${grew}/${others.length} grew`);
}

console.log('hunting');
{
  // A hunt has to be available to any active villain, whether or not they happen
  // to be committing something right now. A player who is losing to someone with
  // no open work would otherwise have no legal way to respond to them.
  const { session } = GameSession.newGame({
    realName: 'Hunt Test',
    alias: 'Hunt Test',
    powerSet: 'CombatMaster',
    origin: 'technological',
    seed: 31337,
  });
  const target = session.villains.find((v) => v.status === 'active');
  if (!target) {
    console.log('  info no active villain in this seed; hunting checks skipped');
  } else {
    const turnBefore = session.turn;
    const influenceBefore = target.influence;
    const report = session.huntVillain(target.id, 'lethal', 'tactical');
    check('a hunt costs a turn', session.turn === turnBefore + 1, `turn ${turnBefore} -> ${session.turn}`);
    check('a hunt is attributed to its target', report.villain?.alias === target.alias, String(report.villain?.alias));

    if (report.resolved) {
      // A direct confrontation has to be worth more than catching them at the
      // scene, otherwise there is never a reason to prefer one over the other.
      // Influence floors at 0, and other heroes cleaning up the target's
      // remaining work in the same turn can add to the drop, so this is a floor.
      const drop = influenceBefore - target.influence;
      const plain = Math.abs(INFLUENCE_ON_SUCCESS) - (target.backedBy ? BACKED_PENALTY : 0);
      const floor = Math.min(Math.round(plain * HUNT_MULTIPLIER), influenceBefore);
      check(
        'a successful hunt knocks the target back harder than their incident would',
        drop >= floor,
        `dropped ${drop}, at least ${floor} (from ${influenceBefore})`,
      );
    } else {
      check(
        'a failed hunt gives the target influence',
        target.influence >= influenceBefore,
        `${influenceBefore} -> ${target.influence}`,
      );
    }

    // Stopping someone takes their outstanding work off the board with them,
    // otherwise the rest of the roster burns turns on incidents that no longer
    // apply pressure to anyone.
    check(
      'a stopped villain leaves no orphan work behind',
      target.status === 'active' || !session.openIncidents.some((i) => i.villainId === target.id),
      `${target.alias} is ${target.status} with ${session.openIncidents.filter((i) => i.villainId === target.id).length} incidents still open`,
    );

    // Hunting someone already stopped is not a legal move.
    const finished = session.villains.find((v) => v.status !== 'active');
    if (finished) {
      let threw = false;
      try {
        session.huntVillain(finished.id, 'lethal', 'tactical');
      } catch {
        threw = true;
      }
      check('you cannot hunt someone who is already stopped', threw);
    } else {
      check('the hunt retired its target, so the stopped-villain case applies', false, 'target was pushed back, not stopped');
    }
  }
}

console.log('patrol costs a turn');
{
  const { session } = GameSession.newGame({
    realName: 'Patrol Test',
    alias: 'Patrol Test',
    powerSet: 'Invisibility',
    origin: 'genetic',
    seed: 2468,
  });
  const turnBefore = session.turn;
  const tracked = session.openIncidents.map((i) => ({ incident: i, before: i.timeToResolve }));
  const villainBefore = new Map(session.villains.map((v) => [v.id, v.influence]));

  session.patrol();

  check('patrol advances the turn', session.turn === turnBefore + 1, `${turnBefore} -> ${session.turn}`);
  check('patrol ages open incidents', tracked.some((t) => t.incident.timeToResolve < t.before));

  // A villain can only lose influence if their own incident expired and another
  // hero answered it. Attending nothing must never push anyone back.
  const stillOpen = new Set(session.openIncidents.map((i) => i.id));
  const expiredVillains = new Set(
    tracked.filter((t) => !stillOpen.has(t.incident.id)).map((t) => t.incident.villainId),
  );
  const wronglyPushed = session.villains.filter(
    (v) => v.influence < (villainBefore.get(v.id) ?? 0) && !expiredVillains.has(v.id),
  );
  check('patrol itself never pushes a villain back', wronglyPushed.length === 0, `${wronglyPushed.length} wrongly reduced`);
  check('patrol then adds work', session.openIncidents.length > 0);
}

console.log('attention is the whole game');
{
  // Neglect: never intervene, just keep patrolling.
  const measure = (strategy: 'neglect' | 'random' | 'focus') => {
    let total = 0;
    let survived = 0;
    let maxTurns = 0;
    let onTrust = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const s = playRun(seed * 7919, 600, strategy === 'neglect' ? 'neglect' : strategy);
      total += s.turn;
      maxTurns = Math.max(maxTurns, s.turn);
      if (!s.isOver) survived += 1;
      if (s.overReason === TRUST_LOST) onTrust += 1;
    }
    return { avg: Math.round(total / 200), survived, maxTurns, onTrust };
  };
  const neglect = measure('neglect');
  const spread = measure('random');
  const focus = measure('focus');
  console.log(`  info never intervening:  avg ${neglect.avg} turns, ${neglect.survived}/200 survived, ${neglect.onTrust} on trust`);
  console.log(`  info spreading attention: avg ${spread.avg} turns, ${spread.survived}/200 survived, ${spread.onTrust} on trust`);
  console.log(`  info focused attention:  avg ${focus.avg} turns, ${focus.survived}/200 survived, ${focus.onTrust} on trust (longest ${focus.maxTurns})`);

  check('focusing beats spreading', focus.avg > spread.avg, `${focus.avg} vs ${spread.avg}`);
  check('focusing beats doing nothing at all', focus.avg > neglect.avg, `${focus.avg} vs ${neglect.avg}`);
  check('aimless intervention is not a strategy', spread.avg <= neglect.avg + 10, `${spread.avg} vs ${neglect.avg}`);
  check('focusing is the only route to survival', focus.survived > 0 && spread.survived === 0, `${focus.survived} vs ${spread.survived}`);
  check('the game is not trivially winnable by focusing alone', focus.survived < 200, `${focus.survived}/200 survived`);
}

console.log("the city's trust");
{
  const { session } = GameSession.newGame({
    realName: 'Trust Test',
    alias: 'Trust Test',
    powerSet: 'Flight',
    origin: 'genetic',
    seed: 6161,
  });

  // Trust is the roster sum, not a counter that can quietly drift away from it.
  const summed = session.allHeroes.reduce((n, h) => n + h.reputation, 0);
  check('trust is the sum of the roster', session.trust === summed, `${session.trust} vs ${summed}`);
  check('the engine and the rules agree on that sum', rosterTrust(session.allHeroes) === summed);
  check('a fresh city starts above the floor', session.trust > session.trustFloor, `${session.trust} vs ${session.trustFloor}`);
  check('the floor is a debt, not a surplus', TRUST_FLOOR_PER_HERO < 0, `${TRUST_FLOOR_PER_HERO}`);
  check('a bigger roster is a bigger promise', trustFloor(5) < trustFloor(3), `${trustFloor(3)} -> ${trustFloor(5)}`);

  // What actually empties the city is unattended work: the whole roster takes
  // that hit, which is why one bad night is survivable and a hundred are not.
  const { session: idle } = GameSession.newGame({
    realName: 'Nobody There',
    alias: 'Nobody There',
    powerSet: 'Flight',
    origin: 'genetic',
    seed: 1717,
  });
  let sawBleed = false;
  let trustEnded = false;
  let worstVillain = 0;
  for (let turn = 0; turn < 400 && !idle.isOver; turn += 1) {
    const before = idle.trust;
    idle.patrol();
    if (idle.trust < before) sawBleed = true;
    if (idle.overReason === TRUST_LOST) {
      trustEnded = true;
      worstVillain = Math.max(0, ...idle.villains.filter((v) => v.status === 'active').map((v) => v.influence));
    }
  }
  check('a night when nobody answers costs the city standing', sawBleed);
  check('the city can stop believing in its guardians', trustEnded, `ended at turn ${idle.turn}: ${idle.overReason}`);
  // The two clocks are independent. Losing the city is not the same failure as
  // handing it to a villain, and a run has to be able to end on either.
  check(
    'losing the city is not the same as losing it to a villain',
    trustEnded && worstVillain < MAX_INFLUENCE,
    `worst active villain at ${worstVillain}`,
  );
}

console.log('rider sweeps');
{
  let finished = 0;
  let over = 0;
  let exposedRuns = 0;
  let disclosedRuns = 0;
  let totalTurns = 0;
  let villainsLeft = 0;
  for (let seed = 1; seed <= 200; seed += 1) {
    const s = playRun(seed * 7919, 400);
    if (s.turn > 0) finished += 1;
    totalTurns += s.turn;
    villainsLeft += s.villains.filter((v) => v.status === 'active').length;
    if (s.isOver) over += 1;
    if (s.allHeroes.some((h) => h.identity.exposed)) exposedRuns += 1;
    if (s.allHeroes.some((h) => h.identity.disclosed)) disclosedRuns += 1;
  }
  check('all 200 seeds produced a playable run', finished === 200, `finished=${finished}`);
  check('attentive play does not run out of road', finished === 200);
  const avgTurns = Math.round(totalTurns / 200);
  console.log(`  info terminal runs: ${over}/200, mean run length: ${avgTurns} turns`);
  console.log(`  info runs with an exposed hero: ${exposedRuns}/200, runs with a disclosed hero: ${disclosedRuns}/200`);
  console.log(`  info mean villains still working at the cap: ${(villainsLeft / 200).toFixed(2)}`);
}

console.log('secret identity');
{
  const { session } = GameSession.newGame({
    realName: 'Nora Ellery',
    alias: 'Iron Woman',
    powerSet: 'ArmoredBody',
    origin: 'technological',
    seed: 31337,
  });
  const hero = session.playerHero!;
  check('hero starts with a civilian job', hero.identity.civilianJob.length > 0);
  check('hero starts with civilian ties', hero.identity.civilianTies.length > 0);
  check('hero starts unexposed and undisclosed', !hero.identity.exposed && !hero.identity.disclosed);

  const repBefore = hero.reputation;
  const moraleBefore = hero.morale;
  session.disclose(hero.id);
  check('disclosure marks the hero public', hero.identity.disclosed);
  check('disclosure sets secrecy to solid', hero.identity.secrecy === 100);
  check('disclosure costs reputation up front', hero.reputation < repBefore, `${repBefore} -> ${hero.reputation}`);
  check('disclosure restores morale', hero.morale > moraleBefore);
  check('a disclosed hero can never be blown', !hero.identity.exposed);
}

console.log('metapolitics');
{
  const { session } = GameSession.newGame({
    realName: 'Origin Test',
    alias: 'Origin Test',
    powerSet: 'Flight',
    origin: 'supernatural',
    seed: 8080,
  });
  const hero = session.playerHero!;
  check('leaning derives from power origin', hero.politics.leaning === 'choir', `leaning=${hero.politics.leaning}`);

  const orgs = session.organizations;
  check('organisations exist at start', orgs.length >= 2, `orgs=${orgs.length}`);

  const before = hero.politics.sympathy;
  session.courtOrganization(orgs[0]!.id, hero.id);
  check('courting an org shifts sympathy', hero.politics.sympathy !== before, `${before} -> ${hero.politics.sympathy}`);

  const org = orgs[0]!;
  const power = org.power;
  session.suppressOrganization(org.id);
  check('suppression weakens an org', org.power < power, `${power} -> ${org.power}`);
}

console.log('ideology reaches the dice');
{
  const { session } = GameSession.newGame({
    realName: 'Ideology Test',
    alias: 'Ideology Test',
    powerSet: 'Flight',
    origin: 'genetic',
    seed: 606,
  });
  const incident = session.openIncidents[0]!;
  const base = incident.approachModifiers.diplomatic;
  const hero = session.playerHero!;
  const delta = ideologyModifier(session.organizations, hero, 'diplomatic');
  check('ideology returns a modifier', Number.isFinite(delta), `delta=${delta}`);
  check('ideology is not a no-op on every org', delta !== 0 || session.organizations.length === 0, `base=${base}`);
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
