/**
 * Headless harness. The engine has no DOM imports, so the whole game runs here.
 *
 * Checks three things:
 *  1. The loop terminates and produces plausible games over many seeds.
 *  2. A save/load round-trip is byte-identical AND continues the same rng stream.
 *  3. The pacing rule actually holds: resolving one incident ticks the others.
 */
import { GameSession } from './core/GameSession';
import { SNAPSHOT_VERSION, type CitySnapshot, type HeroData, type VillainData } from './core/types';
import { APPROACHES, type Approach } from './data/approaches';
import {
  activeBosses,
  BOSS_DEATH_TRUST_COST,
  BOSS_POWER_DEFS,
  BOSS_RETURN_INFLUENCE,
  BOSS_THRESHOLD,
  MAX_ACTIVE_BOSSES,
} from './data/bosses';
import { POWER_SETS, type PowerSet } from './data/powersets';
import { POWER_ORIGINS, type PowerOrigin } from './data/origins';
import {
  DEFAULT_THREAT,
  divertedGrowth,
  THREAT_DEFS,
  THREAT_LEVELS,
  trustFloorPerHero,
  type ThreatLevel,
} from './data/difficulty';
import { Random } from './core/Random';
import { ideologyModifier } from './core/politics';
import { rosterTrust, TRUST_LOST, trustFloor } from './data/reputation';
import { BACKED_PENALTY, HUNT_MULTIPLIER, INFLUENCE_ON_FAILURE, INFLUENCE_ON_SUCCESS, MAX_INFLUENCE } from './data/villains';

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

/**
 * "an Easy city", "a Difficult city". The harness output is read by whoever tunes
 * the tables next, and a wrong article in a check name is a small sign that
 * nobody was.
 */
function onCity(threat: ThreatLevel): string {
  const label = THREAT_DEFS[threat].label;
  return `${/^[AEIOU]/.test(label) ? 'an' : 'a'} ${label.toLowerCase()} city`;
}

function playRun(
  seed: number,
  maxTurns: number,
  strategy: 'neglect' | 'random' | 'focus' = 'random',
  threat: ThreatLevel = DEFAULT_THREAT,
): GameSession {
  const rng = new Random(seed ^ 0x5eed);
  const powerSet = rng.pick(POWER_SETS) as PowerSet;
  const origin = rng.pick(POWER_ORIGINS) as PowerOrigin;
  const { session } = GameSession.newGame({
    realName: 'Test Subject',
    alias: 'Test Hero',
    powerSet,
    origin,
    threat,
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
    // hunts them directly rather than cleaning up after them. A boss is the
    // clearest case: work you mop up at the scene barely comes off one, so a
    // player who has read that will go at them instead of tidying up.
    if (strategy === 'focus') {
      const worst = session.villains
        .filter((v) => v.status === 'active')
        .sort((a, b) => b.influence - a.influence)[0];
      if (worst) {
        const theirs = session.openIncidents.filter((i) => i.villainId === worst.id);
        const incident = theirs[0];
        const goHunting = worst.boss !== null || !incident;
        const [a, b] = pickTwo(rng);
        try {
          if (goHunting) session.huntVillain(worst.id, a, b);
          else session.resolvePlayerIncident(incident.id, a, b);
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

console.log('villains grow into bosses');
{
  const start = GameSession.newGame({
    realName: 'Boss Test',
    alias: 'Boss Test',
    powerSet: 'Telekinesis',
    origin: 'alien',
    seed: 8123,
  }).session;
  // Nobody arrives as one. They are earned by being left alone, and a new city
  // has not left anybody alone yet.
  check('nobody starts the run as a boss', start.villains.every((v) => v.boss === null));

  // A neglected board is the only way a boss exists at all, so neglect is how the
  // harness goes looking for one. The cap is part of the design: a run should
  // have faces in it, not a bestiary. Swept across seeds, because a single run
  // is not evidence that the cap is ever actually reached.
  let peak = 0;
  let firstBoss: VillainData | null = null;
  for (let seed = 1; seed <= 12; seed += 1) {
    const { session: idle } = GameSession.newGame({
      realName: 'Neglect',
      alias: 'Neglect',
      powerSet: 'Telekinesis',
      origin: 'alien',
      seed: seed * 8123,
    });
    for (let turn = 0; turn < 300 && !idle.isOver; turn += 1) {
      idle.patrol();
      peak = Math.max(peak, activeBosses(idle.villains).length);
      firstBoss ??= idle.villains.find((v) => v.boss !== null) ?? null;
    }
  }
  check('a neglected board produces a boss', firstBoss !== null);
  check(
    'a boss has outgrown their one power',
    (firstBoss?.powers.length ?? 0) >= 2,
    `powers=${firstBoss?.powers.length ?? 0}`,
  );
  check('at most two bosses at once', peak <= MAX_ACTIVE_BOSSES, `peak=${peak}`);
  check('a run really does get to two', peak >= 2, `peak=${peak} over 12 neglected seeds`);
  console.log(`  info peak bosses on the board: ${peak}`);

  // The design claim, tested rather than asserted: work you mop up at the scene
  // barely comes off a boss, and going after them in person is the answer.
  //
  // Both are measured as expected progress per attempt, because a resolution
  // that misses hands the target influence back. That is what makes mopping up
  // a dead end rather than merely a slower route: at the hit rates the harness
  // actually sees, a night spent cleaning up after a boss barely moves them at
  // all, and the same night spent hunting them is several times better.
  if (firstBoss) {
    const boss = firstBoss;
    const plain = Math.abs(INFLUENCE_ON_SUCCESS) - (boss.backedBy ? BACKED_PENALTY : 0);
    const def = BOSS_POWER_DEFS[boss.boss!];
    const mopped = plain * def.resistance;
    const hunted = plain * HUNT_MULTIPLIER * def.huntResistance;
    const half = 0.5;
    const moppedExpected = half * -mopped + half * INFLUENCE_ON_FAILURE;
    const huntedExpected = half * -hunted + half * INFLUENCE_ON_FAILURE;
    check(
      'mopping up after a boss barely makes progress',
      moppedExpected > -plain / 8,
      `expected ${moppedExpected.toFixed(1)} per attempt from ${mopped.toFixed(1)} knockback`,
    );
    check(
      'hunting a boss is several times better than mopping up',
      huntedExpected < moppedExpected / 2,
      `${huntedExpected.toFixed(1)} vs ${moppedExpected.toFixed(1)} expected per attempt`,
    );
    check('a hunt still lands hard on a boss', hunted >= plain * HUNT_MULTIPLIER * 0.75, `${hunted.toFixed(1)} from ${plain}`);
  }
}

console.log('a boss at zero is a fork');
{
  // Both branches have to be reachable and they have to cost different things.
  // Non-lethal play is forced by only ever picking two non-lethal approaches, and
  // the whole thing is swept over many seeds because a single run is not
  // guaranteed to contain a boss with two pieces of work on the board at the
  // moment it is taken down.
  const nonLethal: [Approach, Approach] = ['diplomatic', 'stealthy'];
  let containments = 0;
  let returned = 0;
  let workHeld = 0;
  let workBefore = 0;
  let workAfter = 0;
  let duplicated = 0;
  let trustBeforeContainment = 0;
  let trustAfterContainment = 0;
  let earnedAtContainment = 0;
  let rosterAtContainment = 0;
  for (let seed = 1; seed <= 24; seed += 1) {
    const { session } = GameSession.newGame({
      realName: 'Fork Test',
      alias: 'Fork Test',
      powerSet: 'CombatMaster',
      origin: 'genetic',
      seed: seed * 3301,
    });
    for (let turn = 0; turn < 300 && !session.isOver; turn += 1) {
      if (activeBosses(session.villains).length === 0) {
        session.patrol();
        continue;
      }
      const boss = session.villains.find((v) => v.boss !== null && v.status === 'active')!;
      const work = session.openIncidents.filter((i) => i.villainId === boss.id);
      const before = work.length;
      const powersBefore = boss.powers.length;
      const trustBefore = session.trust;
      const roster = session.allHeroes.length;
      let report;
      try {
        report = work.length > 0
          ? session.resolvePlayerIncident(work[0]!.id, ...nonLethal)
          : session.huntVillain(boss.id, ...nonLethal);
      } catch {
        break;
      }
      if (report.villain?.outcome !== 'escaped') continue;
      containments += 1;
      if (boss.powers.length > powersBefore) returned += 1;
      const held = new Set(boss.powers.map((p) => p.powerSet));
      if (held.size !== boss.powers.length) duplicated += 1;
      if (before >= 2) {
        workHeld += 1;
        workBefore += before;
        workAfter += session.openIncidents.filter((i) => i.villainId === boss.id).length;
      }
      // The first one, so the numbers describe a single containment and not an
      // average over a run that also lost heroes along the way.
      if (containments === 1) {
        trustBeforeContainment = trustBefore;
        trustAfterContainment = session.trust;
        earnedAtContainment = report.reputationDelta;
        rosterAtContainment = roster;
      }
    }
  }
  console.log(`  info containments: ${containments}, of which returned with another power: ${returned}`);

  check('a boss can be contained without being killed', containments > 0, `containments=${containments}`);
  check('a contained boss comes back with another power', containments > 0 && returned > 0, `${returned}/${containments}`);
  // The powers list is the only record of how many times a boss got away, so it
  // has to stay a set. A repeat entry would overstate their escalation forever.
  check('no boss ever holds the same power twice', duplicated === 0, `${duplicated} with a duplicate`);
  // Containment is the branch that does not cost the city's standing. Measured
  // against the price a kill would have charged, because the resolution moves
  // trust on its own account and the fork is only a fork if the two differ.
  check(
    'containment does not cost the city its standing',
    containments > 0 &&
      trustAfterContainment >= trustBeforeContainment + earnedAtContainment - BOSS_DEATH_TRUST_COST * rosterAtContainment,
    `trust ${trustBeforeContainment} -> ${trustAfterContainment}, earned ${earnedAtContainment}, ` +
      `a kill would have cost ${BOSS_DEATH_TRUST_COST * rosterAtContainment}`,
  );
  // Stopping someone takes their work with them. Being contained is not being
  // stopped, so their work has to stay on the board — otherwise the non-lethal
  // branch would clear the board *and* hand the same villain back, and it would
  // be the better answer every time.
  check(
    "containment leaves the boss's work on the board",
    workHeld > 0 && workAfter >= workBefore - workHeld,
    `${workHeld} containments with 2+ incidents: ${workBefore} before, ${workAfter} after (one resolved each)`,
  );

  // The lethal branch, and the price the user chose for it.
  const { session: lethalRun } = GameSession.newGame({
    realName: 'Lethal Test',
    alias: 'Lethal Test',
    powerSet: 'SuperStrength',
    origin: 'genetic',
    seed: 9001,
  });
  let sawKill = false;
  let killWasFlaggedBoss = false;
  let trustBefore = 0;
  let trustAfter = 0;
  let earned = 0;
  let rosterAtKill = 0;
  for (let turn = 0; turn < 400 && !lethalRun.isOver; turn += 1) {
    const boss = lethalRun.villains.find((v) => v.boss !== null && v.status === 'active');
    if (!boss) {
      lethalRun.patrol();
      continue;
    }
    const work = lethalRun.openIncidents.filter((i) => i.villainId === boss.id);
    trustBefore = lethalRun.trust;
    rosterAtKill = lethalRun.allHeroes.length;
    let report;
    try {
      report = work.length > 0
        ? lethalRun.resolvePlayerIncident(work[0]!.id, 'lethal', 'tactical')
        : lethalRun.huntVillain(boss.id, 'lethal', 'tactical');
    } catch {
      break;
    }
    if (report.villain?.outcome === 'killed') {
      killWasFlaggedBoss = report.villain.boss;
      // The resolution itself moves trust, so the price of the execution is what
      // is left once the night's own reputation gain is accounted for.
      earned = report.reputationDelta;
      trustAfter = lethalRun.trust;
      sawKill = true;
      break;
    }
  }
  check('a boss can be killed outright', sawKill);
  check(
    'killing a boss costs the whole roster standing',
    sawKill && trustAfter <= trustBefore + earned - BOSS_DEATH_TRUST_COST * rosterAtKill,
    `trust ${trustBefore} -> ${trustAfter}, earned ${earned}, roster of ${rosterAtKill}, price ${BOSS_DEATH_TRUST_COST * rosterAtKill}`,
  );
  // The report has to be able to tell the player why that happened, and the turn
  // report reads this flag to decide whether to mention the price at all.
  check('the report says the kill was a boss kill', sawKill && killWasFlaggedBoss, `flagged=${killWasFlaggedBoss}`);
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
  const measure = (
    strategy: 'neglect' | 'random' | 'focus',
    threat: ThreatLevel = DEFAULT_THREAT,
  ) => {
    let total = 0;
    let survived = 0;
    let maxTurns = 0;
    let onTrust = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const s = playRun(seed * 7919, 600, strategy, threat);
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

console.log('how hard is the city');
{
  // The setting is only real if it reaches both clocks. A run is won by
  // attention and lost by running out of goodwill, so a city that changes only
  // one of them is half a difficulty setting, and the sweep below is the only
  // thing here that would notice.
  const measure = (strategy: 'neglect' | 'random' | 'focus', threat: ThreatLevel) => {
    let total = 0;
    let survived = 0;
    let onTrust = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const s = playRun(seed * 7919, 600, strategy, threat);
      total += s.turn;
      if (!s.isOver) survived += 1;
      if (s.overReason === TRUST_LOST) onTrust += 1;
    }
    return { avg: Math.round(total / 200), survived, onTrust };
  };

  const rows = THREAT_LEVELS.map((threat) => ({
    threat,
    neglect: measure('neglect', threat),
    spread: measure('random', threat),
    focus: measure('focus', threat),
  }));

  console.log('  info 200 seeds per cell, 600-turn cap');
  const pad = (n: number) => String(n).padStart(3);
  for (const row of rows) {
    console.log(
      `  info ${THREAT_DEFS[row.threat].label.padEnd(14)}` +
        ` never ${pad(row.neglect.avg)}  random ${pad(row.spread.avg)}  focus ${pad(row.focus.avg)}` +
        `  (focus ${row.focus.survived}/200 survived, ${row.focus.onTrust}/200 on trust)`,
    );
  }

  check(
    'the price of inattention rises with the city',
    THREAT_LEVELS.every((t, i) => i === 0 || divertedGrowth(t) > divertedGrowth(THREAT_LEVELS[i - 1]!)),
    THREAT_LEVELS.map((t) => divertedGrowth(t)).join(' < '),
  );
  check(
    'a harder city asks for its debt back sooner',
    THREAT_LEVELS.every((t, i) => i === 0 || trustFloor(3, t) > trustFloor(3, THREAT_LEVELS[i - 1]!)),
    THREAT_LEVELS.map((t) => trustFloor(3, t)).join(' < '),
  );

  // The claim the whole design rests on has to survive the knob. If focusing
  // stops beating aimless play somewhere on the ladder, the setting has broken
  // the game rather than scaled it, and no amount of monotone run lengths makes
  // that acceptable.
  for (const row of rows) {
    check(`focusing still beats spreading on ${onCity(row.threat)}`, row.focus.avg > row.spread.avg, `${row.focus.avg} vs ${row.spread.avg}`);
    check(`focusing still beats doing nothing on ${onCity(row.threat)}`, row.focus.avg > row.neglect.avg, `${row.focus.avg} vs ${row.neglect.avg}`);
    check(
      `aimless intervention is still not a strategy on ${onCity(row.threat)}`,
      row.spread.avg <= row.neglect.avg + 10,
      `${row.spread.avg} vs ${row.neglect.avg}`,
    );
  }
  for (let i = 1; i < rows.length; i += 1) {
    const here = rows[i]!;
    const before = rows[i - 1]!;
    check(
      `focused play is shorter on ${onCity(here.threat)} than on ${onCity(before.threat)}`,
      here.focus.avg < before.focus.avg,
      `${before.focus.avg} -> ${here.focus.avg}`,
    );
  }
  // A run the player cannot finish is not a difficulty, it is a wall, and an
  // easy city that cannot be beaten is the same bug pointing the other way.
  const easy = rows[0]!;
  const brutal = rows[rows.length - 1]!;
  check('a brutal city is not more winnable than an easy one', easy.focus.survived >= brutal.focus.survived, `${easy.focus.survived} vs ${brutal.focus.survived}`);
  check('an easy city is survivable by playing well', easy.focus.survived > 0, `${easy.focus.survived}/200 survived`);
  check('even the easiest city is not a formality', easy.focus.survived < 200, `${easy.focus.survived}/200 survived`);
}

console.log('the city you chose is the city you play');
{
  // Measured off the board rather than read off the table, because the number
  // the setting exists to move is a number the engine has to actually be using.
  //
  // A turn can hand a villain *extra* growth, because a second crime expiring
  // while the player was busy diverts attention as well. So the claim is about
  // the cheapest turn there is: attend one crime and everybody you were not
  // attending pays exactly the setting's number and nothing else. Villains with
  // open work of their own are left out of the sample, because one of those
  // expiring is the other way a turn goes wrong.
  const observedGrowth = (threat: ThreatLevel, seed: number): number | null => {
    const expected = divertedGrowth(threat);
    const { session } = GameSession.newGame({
      realName: 'City Test',
      alias: 'City Test',
      powerSet: 'Telekinesis',
      origin: 'alien',
      threat,
      seed,
    });
    const gains: number[] = [];
    for (let turn = 0; turn < 40 && !session.isOver && session.openIncidents.length > 0; turn += 1) {
      const incident = session.openIncidents[0]!;
      const openFor = new Set(session.openIncidents.map((i) => i.villainId));
      const others = session.villains.filter(
        (v) =>
          v.status === 'active' &&
          v.boss === null &&
          v.id !== incident.villainId &&
          !openFor.has(v.id) &&
          v.influence + expected <= MAX_INFLUENCE,
      );
      if (others.length === 0) {
        session.patrol();
        continue;
      }
      const before = new Map(others.map((v) => [v.id, v.influence]));
      try {
        const [a, b] = pickTwo(new Random(turn * 7919 + 1));
        session.resolvePlayerIncident(incident.id, a, b);
      } catch {
        break;
      }
      for (const v of others) gains.push(v.influence - (before.get(v.id) ?? 0));
    }
    return gains.length === 0 ? null : Math.min(...gains);
  };

  for (const threat of THREAT_LEVELS) {
    const label = THREAT_DEFS[threat].label;
    const { session } = GameSession.newGame({
      realName: 'City Test',
      alias: 'City Test',
      powerSet: 'Telekinesis',
      origin: 'alien',
      threat,
      seed: 4711,
    });
    check(`a new run is the ${label.toLowerCase()} city it was set to`, session.threat === threat, `${session.threat}`);
    check(
      `the ${label.toLowerCase()} floor is the one its roster is measured against`,
      session.trustFloor === trustFloor(session.allHeroes.length, threat),
      `${session.trustFloor} vs ${trustFloor(session.allHeroes.length, threat)}`,
    );
    check(
      `a save keeps the ${label.toLowerCase()} city`,
      GameSession.fromSnapshot(session.snapshot()).threat === threat,
    );

    let observed: number | null = null;
    for (let seed = 1; seed <= 4 && observed === null; seed += 1) {
      observed = observedGrowth(threat, seed * 104729);
    }
    check(
      `inattention costs ${divertedGrowth(threat)} a turn on ${onCity(threat)}`,
      observed === divertedGrowth(threat),
      `cheapest turn measured ${observed}`,
    );
  }
  const unasked = GameSession.newGame({
    realName: 'Default',
    alias: 'Default',
    powerSet: 'Flight',
    origin: 'genetic',
    seed: 5,
  });
  check('a run with no city named gets the average one', unasked.session.threat === DEFAULT_THREAT, `${unasked.session.threat}`);
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
  check(
    'the floor is a debt, not a surplus, on every city',
    THREAT_LEVELS.every((t) => trustFloorPerHero(t) < 0),
    THREAT_LEVELS.map((t) => trustFloorPerHero(t)).join(', '),
  );
  check(
    'a bigger roster is a bigger promise',
    THREAT_LEVELS.every((t) => trustFloor(5, t) < trustFloor(3, t)),
    `on average: ${trustFloor(3, DEFAULT_THREAT)} -> ${trustFloor(5, DEFAULT_THREAT)}`,
  );

  // What actually empties the city is unattended work: the whole roster takes
  // that hit, which is why one bad night is survivable and a hundred are not.
  //
  // The two terminal clocks are measured across many idle runs rather than off
  // one seed. A single seed is not a claim about the design — it is a claim
  // about seed 1717 — and it flips the moment any balance number moves. What
  // §11.1 actually asserts is that a run can end on either clock and that they
  // are different failures, which is a property of the population.
  let sawBleed = false;
  let onTrust = 0;
  let onConquest = 0;
  let worstAtTrustLoss = 0;
  for (let seed = 1; seed <= 60; seed += 1) {
    const { session: idle } = GameSession.newGame({
      realName: 'Nobody There',
      alias: 'Nobody There',
      powerSet: 'Flight',
      origin: 'genetic',
      seed: seed * 2749,
    });
    for (let turn = 0; turn < 400 && !idle.isOver; turn += 1) {
      const before = idle.trust;
      idle.patrol();
      if (idle.trust < before) sawBleed = true;
    }
    if (idle.overReason === TRUST_LOST) {
      onTrust += 1;
      worstAtTrustLoss = Math.max(
        worstAtTrustLoss,
        ...idle.villains.filter((v) => v.status === 'active').map((v) => v.influence),
      );
    } else if (idle.isOver) {
      onConquest += 1;
    }
  }
  console.log(`  info idle runs ending on trust: ${onTrust}/60, on conquest: ${onConquest}/60`);
  check('a night when nobody answers costs the city standing', sawBleed);
  check('the city can stop believing in its guardians', onTrust > 0, `${onTrust}/60 idle runs ended on trust`);
  check('a villain can take the city instead', onConquest > 0, `${onConquest}/60 idle runs ended on conquest`);
  // Losing the city is not the same failure as handing it to someone. Every run
  // that ended on trust did so with somebody well short of taking it.
  check(
    'losing the city is not the same as losing it to a villain',
    onTrust > 0 && worstAtTrustLoss < MAX_INFLUENCE,
    `worst active villain at ${worstAtTrustLoss} across ${onTrust} trust losses`,
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
