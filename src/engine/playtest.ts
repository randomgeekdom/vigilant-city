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
  BILL_SEEDING_STEP,
  BOSS_DEATH_TRUST_COST,
  BOSS_ESCAPE_GROWTH,
  BOSS_POWER_DEFS,
  BOSS_POWERS,
  BOSS_RETURN_INFLUENCE,
  type BossPower,
  BOSS_SEED_CHANCE,
  BOSS_THRESHOLD,
  bossBill,
  bossGrowth,
  bossResistance,
  bossSeedChance,
  MAX_ACTIVE_BOSSES,
  MAX_BILL_UNITS,
  MAX_ESCAPE_GROWTH,
  ORDINARY_SEED_CHANCE,
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
import { rosterTrust, TRUST_LOST, trustFloor, trustWarningBand, unansweredNights, WARNING_NIGHTS, type TrustSample } from './data/reputation';
import { BACKED_PENALTY, HUNT_MULTIPLIER, INFLUENCE_ON_FAILURE, INFLUENCE_ON_SUCCESS, knockback, MAX_INFLUENCE } from './data/villains';

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

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function turns(count: number): string {
  return `${count} ${count === 1 ? 'turn' : 'turns'}`;
}

function playRun(
  seed: number,
  maxTurns: number,
  strategy: 'neglect' | 'random' | 'focus' = 'random',
  threat: ThreatLevel = DEFAULT_THREAT,
  trace?: TrustSample[],
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
    if (trace) trace.push({ turn: session.turn, margin: session.trustMargin, roster: session.allHeroes.length });
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
  if (trace) trace.push({ turn: session.turn, margin: session.trustMargin, roster: session.allHeroes.length });
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
  // One job per villain. Reusing a culprit made the board read as one person
  // committing several crimes at once, and a player could not tell the second
  // board apart from the first.
  check(
    'no villain is behind more than one open incident',
    new Set(session.openIncidents.map((i) => i.villainId)).size === session.openIncidents.length,
    `${session.openIncidents.length} incidents, ${new Set(session.openIncidents.map((i) => i.villainId)).size} culprits`,
  );
  const activeCount = session.villains.filter((v) => v.status === 'active').length;
  check('a villain exists at start', activeCount > 0);

  // Backing is a deduction, and that is the whole rule. The engine once added
  // the penalty the other way round and this harness re-derived the same
  // expression by hand with the sign flipped, so the two agreed with each other
  // and disagreed with the game by 10. Everything below reads `knockback` now
  // rather than rebuilding it, and this pins the direction so a future
  // inversion fails here instead of quietly handing every villain more pushback.
  check(
    'backing makes a villain harder to move, not easier',
    knockback('ascendants') === INFLUENCE_ON_SUCCESS + BACKED_PENALTY && knockback('ascendants') > knockback(null),
    `unbacked ${knockback(null)}, backed ${knockback('ascendants')}`,
  );

  // Attending one villain's work is what lets the others grow. Swept across seeds
  // rather than pinned to this one board: the board has to offer a turn in which
  // the other villains' work survives the tick, or "the others grew" is really
  // "the others were settled out of the game by collateral" and the check has
  // nothing to measure. One in four boards has all-timer work at the start.
  let fedSample: { grew: number; others: number } | null = null;
  for (let seed = 5151; seed <= 5400 && fedSample === null; seed += 1) {
    const { session: board } = GameSession.newGame({
      realName: 'Focus Test',
      alias: 'Focus Test',
      powerSet: 'Telekinesis',
      origin: 'alien',
      seed,
    });
    const target = board.openIncidents.find((i) => i.timeToResolve > 1);
    if (!target) continue;
    const bystanders = board.villains.filter((v) => v.status === 'active' && v.id !== target.villainId);
    const otherWork = board.openIncidents.filter((i) => i.villainId !== target.villainId);
    if (bystanders.length === 0 || otherWork.some((i) => i.timeToResolve <= 1)) continue;
    const before = bystanders.map((v) => v.influence);
    board.resolvePlayerIncident(target.id, 'diplomatic', 'tactical');
    const grew = bystanders.filter((v, i) => v.status === 'active' && v.influence > before[i]!).length;
    fedSample = { grew, others: bystanders.length };
  }
  check(
    'success feeds the villains you were not attending',
    fedSample !== null && fedSample.grew === fedSample.others,
    fedSample ? `${fedSample.grew}/${fedSample.others} grew` : 'no board with bystander work survived the tick',
  );
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
      const plain = Math.abs(knockback(target.backedBy));
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
    const def = BOSS_POWER_DEFS[boss.boss!];
    const plain = Math.abs(knockback(boss.backedBy));
    const half = 0.5;
    const expected = (drop: number): number => half * -drop + half * INFLUENCE_ON_FAILURE;
    // Read off the engine rather than off the table. This block used to rebuild
    // the multiplier by hand from `def.resistance`, which is the same mistake the
    // knockback sign made: two copies of one rule that agree with each other and
    // can disagree with the game. `bossResistance` now steps per escape, so a
    // hand-rolled copy of the base number would quietly stop describing a boss
    // that has been let go more than once.
    const mopped = plain * bossResistance(boss, false);
    const hunted = plain * HUNT_MULTIPLIER * bossResistance(boss, true);

    // Printed rather than only asserted: DESIGN 10.3 quotes these two as the
    // arithmetic behind the fork, and a worked example written out by hand is the
    // first thing to go stale when a number moves.
    console.log(
      `  info ${boss.alias} (${def.tell})` +
        ` mopping up ${expected(mopped).toFixed(1)}/attempt from ${mopped.toFixed(1)},` +
        ` hunting ${expected(hunted).toFixed(1)}/attempt from ${hunted.toFixed(1)}`,
    );

    // The claim is about bosses as a class, so it is checked against every power
    // on the list rather than against whichever one a seed happened to grow
    // first. Pinning the check to the first boss made it a check on the rng: the
    // old threshold, calibrated to Invisibility's ×0.55, started failing the
    // moment the sweep found Shapeshifting's ×0.6 instead, even though neither
    // the mechanic nor the claim had moved. A boss at zero escapes carries the
    // base resistance, which is the number the table in DESIGN 10.3 lists.
    const baseBoss = (power: BossPower): VillainData => ({
      ...boss,
      boss: power,
      powers: [{ powerSet: power, origin: 'genetic' }],
    });
    const rows = BOSS_POWERS.map((power) => {
      const v = baseBoss(power);
      const mop = plain * bossResistance(v, false);
      const hunt = plain * HUNT_MULTIPLIER * bossResistance(v, true);
      return { power, mop, hunt, mopExpected: expected(mop), huntExpected: expected(hunt) };
    });
    // A plain villain's mop-up expected progress is the scale "barely" is judged
    // against: a boss has to come off at less than half of that, at the softest
    // resistance on the list, or "barely" does not describe anything.
    const plainExpected = expected(plain);
    const format = (r: (typeof rows)[number]): string => `${r.power} ${r.mopExpected.toFixed(1)}`;
    check(
      'mopping up after a boss barely makes progress',
      rows.every((r) => r.mopExpected > plainExpected / 2),
      `plain ${plainExpected.toFixed(1)}; ${rows.map(format).join(', ')}`,
    );
    check(
      'hunting a boss is several times better than mopping up',
      rows.every((r) => r.huntExpected < r.mopExpected / 2),
      rows.map((r) => `${r.power} ${r.huntExpected.toFixed(1)} vs ${r.mopExpected.toFixed(1)}`).join(', '),
    );
    check(
      'a hunt still lands hard on a boss',
      rows.every((r) => r.hunt >= plain * HUNT_MULTIPLIER * 0.75),
      `plain ${plain}; ${rows.map((r) => `${r.power} ${r.hunt.toFixed(1)}`).join(', ')}`,
    );
  }
}

console.log('a boss gets harder every time it gets away');
{
  // The escalation record the player is shown has to mean something, so it is
  // measured by walking a real boss up its own power list rather than by
  // asserting that the list exists. It used to be decoration: `bossResistance`
  // read only the power that grew them into a boss, so a boss holding six took
  // exactly the same effort to move as one holding two, and the growth the list
  // was bolted onto capped out at two escapes and stayed there.
  const { session } = GameSession.newGame({
    realName: 'Escalation Test',
    alias: 'Escalation Test',
    powerSet: 'Telekinesis',
    origin: 'alien',
    seed: 8123 * 2,
  });
  for (let turn = 0; turn < 300 && !session.isOver && !session.villains.some((v) => v.boss !== null); turn += 1) {
    session.patrol();
  }
  const found = session.villains.find((v) => v.boss !== null);
  if (!found) {
    check('a boss to escalate', false, 'no boss in 300 neglected turns');
  } else {
    // The powers array is the only record of how often they got away, so the
    // walk is built by handing them every power they do not already hold — the
    // same set `availableBossPowers` draws from and the same one the harness
    // asserts is never repeated.
    const walked: VillainData[] = [{ ...found, powers: found.powers.map((p) => ({ ...p })) }];
    for (const power of BOSS_POWERS) {
      const previous = walked[walked.length - 1]!;
      if (previous.powers.some((p) => p.powerSet === power)) continue;
      walked.push({ ...found, powers: [...previous.powers, { powerSet: power, origin: 'genetic' }] });
    }
    // What the claim actually needs is that the list can be exhausted, not that
    // the first boss found happens to hold exactly one power. It does not: a
    // boss is grown into the role by taking a power, and may already have taken
    // more before the sweep notices it, so counting the walk states pinned the
    // check to which seed produced the boss. It asserts the endpoint instead —
    // after the walk, every power on the list is held.
    check(
      'a boss can work through every power on the list',
      BOSS_POWERS.every((power) => walked[walked.length - 1]!.powers.some((p) => p.powerSet === power)),
      `walked ${walked.length - 1} escapes, holding ${walked[walked.length - 1]!.powers.length} powers`,
    );

    const plain = Math.abs(knockback(found.backedBy));
    const half = 0.5;
    // Expected progress per attempt, the same measure the block above uses,
    // because a resolution that misses hands the target influence straight back.
    // What is measured is a run of nights, not a single good one.
    const perAttempt = (villain: VillainData, isHunt: boolean): number => {
      const drop = plain * (isHunt ? HUNT_MULTIPLIER : 1) * bossResistance(villain, isHunt);
      return half * -drop + half * INFLUENCE_ON_FAILURE;
    };
    const mopped = walked.map((v) => perAttempt(v, false));
    const hunted = walked.map((v) => perAttempt(v, true));
    const growth = walked.map((v) => bossGrowth(v));

    console.log(
      `  info ${found.alias} across ${walked.length - 1} escapes: ` +
        walked
          .map((_, i) => `${i}: mop ${mopped[i]!.toFixed(1)} hunt ${hunted[i]!.toFixed(1)} grow +${growth[i]}`)
          .join(' | '),
    );

    // Progress per attempt is a negative number, so "worse" is "closer to zero":
    // each escape has to push the figure up, not down. A boss that got away six
    // times is the row on the right of that run.
    const worsens = (xs: number[]) => xs.every((x, i) => i === 0 || x > xs[i - 1]!);
    check('mopping up after a boss gets worse every escape', worsens(mopped), mopped.map((x) => x.toFixed(1)).join(' > '));
    check('hunting a boss gets worse every escape too', worsens(hunted), hunted.map((x) => x.toFixed(1)).join(' > '));
    check(
      'by the end of the list, mopping up after a boss is not a route at all',
      mopped[mopped.length - 1]! >= 0,
      `${mopped[mopped.length - 1]!.toFixed(1)} per attempt, a miss still costs ${INFLUENCE_ON_FAILURE}`,
    );
    check(
      'hunting is still the answer on a boss who has been let go six times',
      hunted[hunted.length - 1]! < 0,
      `${hunted[hunted.length - 1]!.toFixed(1)} per attempt`,
    );
    check(
      'hunting beats mopping up at every step of the list',
      hunted.every((h, i) => h < mopped[i]!),
      `${hunted[hunted.length - 1]!.toFixed(1)} vs ${mopped[mopped.length - 1]!.toFixed(1)} at full escalation`,
    );
    // Growth is a rate and the cap is on purpose: a boss that can be contained
    // for ever must not accelerate for ever either. Resistance is a multiplier
    // and keeps stepping past the cap, so the escalation does not stop at two.
    check(
      'the growth bonus is still bounded where it always was',
      growth.every((g) => g <= BOSS_POWER_DEFS[found.boss!].growth + MAX_ESCAPE_GROWTH * BOSS_ESCAPE_GROWTH),
      growth.join(' < '),
    );
  }
}

console.log('a boss left alone is a bill, and going and getting them ends it');
{
  // Everything else about a boss is charged to the player who engages one: the
  // resistance steps out and the growth bonus all land on whoever turns up. This
  // is the axis that punishes the player who does not, and it is the reason a
  // boss can be described as a bill for attention you did not spend.
  //
  // It is a pure derivation off influence past the threshold, so it is checked
  // as one first and then as something a real run does.
  const asVillain = (influence: number, boss: VillainData['boss'] = 'TimeManipulation'): VillainData =>
    ({ id: 'x', alias: 'X', backedBy: null, influence, status: 'active', boss, powers: [] }) as unknown as VillainData;

  check(
    'a boss nobody has let run yet is not billing anything',
    bossBill(asVillain(BOSS_THRESHOLD)) === 0 && bossBill(asVillain(BOSS_THRESHOLD - 20)) === 0,
    `${bossBill(asVillain(BOSS_THRESHOLD))} at the threshold`,
  );
  check(
    'the bill rises the longer a boss is left alone',
    bossBill(asVillain(BOSS_THRESHOLD + 30)) > bossBill(asVillain(BOSS_THRESHOLD + 5)),
    `${bossBill(asVillain(BOSS_THRESHOLD + 5))} -> ${bossBill(asVillain(BOSS_THRESHOLD + 30))} past the threshold`,
  );
  check(
    'the bill is bounded, so a neglected boss cannot accelerate for ever',
    [0, 15, 30, 45, 100].every((over) => bossBill(asVillain(BOSS_THRESHOLD + over)) <= MAX_BILL_UNITS) &&
      bossBill(asVillain(MAX_INFLUENCE)) === MAX_BILL_UNITS,
    `${bossBill(asVillain(MAX_INFLUENCE))} units at ${MAX_INFLUENCE}, capped at ${MAX_BILL_UNITS}`,
  );
  check(
    'an ordinary villain is never billed',
    bossBill(asVillain(MAX_INFLUENCE, null)) === 0 && bossSeedChance(asVillain(MAX_INFLUENCE, null)) === ORDINARY_SEED_CHANCE,
    `${bossSeedChance(asVillain(MAX_INFLUENCE, null))} against a boss at ${bossSeedChance(asVillain(MAX_INFLUENCE))}`,
  );
  check(
    'a boss left alone spreads more work, and never more than a chance',
    bossSeedChance(asVillain(MAX_INFLUENCE)) > BOSS_SEED_CHANCE &&
      bossSeedChance(asVillain(MAX_INFLUENCE)) === BOSS_SEED_CHANCE + MAX_BILL_UNITS * BILL_SEEDING_STEP &&
      bossSeedChance(asVillain(MAX_INFLUENCE)) < 1,
    `${(BOSS_SEED_CHANCE * 100).toFixed(0)}% unbilled -> ${(bossSeedChance(asVillain(MAX_INFLUENCE)) * 100).toFixed(0)}% at the ceiling`,
  );

  // The claim that makes it a cost rather than a tax: engaging a boss is what
  // stops the bill, because a knockback is applied before the board is ticked
  // and the bill is read off influence. A player who goes and gets them can
  // never pay this, however many times they come back.
  //
  // Swept for the same reason as the containment and kill halves: a run that was
  // neglected long enough to bill a boss is by then close to losing the city, so
  // pinning this to one seed pins it to that seed's luck. What is claimed is
  // that the observation happens at all — that attention is what clears a bill,
  // and it cannot be otherwise, because the bill is read off influence and
  // influence only ever falls when somebody goes and gets them.
  let sawBill = false;
  let unitsAfter = -1;
  let sawRaised = '';
  let sawCleared = '';
  for (let seed = 1; seed <= 24 && !sawBill; seed += 1) {
    const { session: neglected } = GameSession.newGame({
      realName: 'Bill Test',
      alias: 'Bill Test',
      powerSet: 'Telekinesis',
      origin: 'alien',
      seed: seed * 4001,
    });
    let target: VillainData | undefined;
    for (let turn = 0; turn < 400 && !neglected.isOver; turn += 1) {
      neglected.patrol();
      target = neglected.villains.find((v) => v.boss !== null && v.status === 'active' && bossBill(v) > 0);
      if (target) break;
    }
    if (!target) continue;
    sawBill = true;
    sawRaised = `${target.alias} billed ${bossBill(target)} at ${target.influence} (${(bossSeedChance(target) * 100).toFixed(0)}% seeding)`;
    let attempts = 0;
    while (attempts < 12 && bossBill(target) > 0 && !neglected.isOver) {
      try {
        neglected.huntVillain(target.id, 'swift', 'tactical');
      } catch {
        break;
      }
      attempts += 1;
    }
    sawCleared =
      `${bossBill(target)} after ${attempts} hunts, now at ${target.influence}` +
      `${neglected.isOver ? ' (the run had already ended)' : ''}`;
    unitsAfter = bossBill(target);
  }
  check('neglect alone runs a boss up a bill', sawBill, 'no boss billed across 24 neglected runs');
  check('going and getting them ends the bill', sawBill && unitsAfter === 0, sawRaised + ' -> ' + sawCleared);
}

console.log('a returned boss is never one night from zero');
{
  // The containment branch cost what it cost by accident: `BOSS_RETURN_INFLUENCE`
  // sat at 40 because a knockback correction moved the hunt to 33.6-39.9 rather
  // than because anybody picked it, and 40 left a returned boss one hunt from
  // zero at the top of that range. The number is now chosen against the strongest
  // hunt in the game, and the choice is asserted so it cannot drift back into
  // being a coincidence. The ceiling is built off a *backed* villain, because
  // that is the only kind in a run — 35 is the base the knockback rule is written
  // against and a figure the player never meets, so measuring against it would
  // clear a number the game does not actually use.
  const strongestHunt =
    HUNT_MULTIPLIER *
    Math.abs(knockback('ascendants')) *
    Math.max(...BOSS_POWERS.map((p) => BOSS_POWER_DEFS[p].huntResistance));
  check(
    'a containment always costs a second night, whatever they are carrying',
    BOSS_RETURN_INFLUENCE > strongestHunt,
    `returns at ${BOSS_RETURN_INFLUENCE}, the best hunt in the game is ${strongestHunt.toFixed(1)}`,
  );
  check(
    'and they still come back below the threshold that made them a boss',
    BOSS_RETURN_INFLUENCE < BOSS_THRESHOLD,
    `${BOSS_RETURN_INFLUENCE} against ${BOSS_THRESHOLD}`,
  );
}

console.log('a boss at zero is a fork');
{
  // Both branches have to be reachable and they have to cost different things.
  // Non-lethal play is forced by only ever picking two non-lethal approaches, and
  // the whole thing is swept over many seeds because a single run is not
  // guaranteed to contain a boss that is holding work of its own at the moment it
  // is taken down. The boss is hunted directly rather than by resolving its work,
  // so the work is never the thing being consumed, and the sweep is 96 seeds
  // because a check that cannot reach its own precondition is not a check.
  const nonLethal: [Approach, Approach] = ['diplomatic', 'stealthy'];
  let containments = 0;
  let returned = 0;
  let returnedAt = 0;
  let escalated = 0;
  const firstResistance = new Map<string, number>();
  let workHeld = 0;
  let workBefore = 0;
  let workAfter = 0;
  let duplicated = 0;
  let trustBeforeContainment = 0;
  let trustAfterContainment = 0;
  let earnedAtContainment = 0;
  let rosterAtContainment = 0;
  let trustMeasured = false;
  for (let seed = 1; seed <= 96; seed += 1) {
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
      // Work that will still be on the board after this turn's collateral tick.
      // A one-night job is a bad probe: the tick would close it whether or not
      // containment cleared it, and the check could not tell the two apart.
      const heldWork = session.openIncidents.filter((i) => i.villainId === boss.id && i.timeToResolve > 1);
      const powersBefore = boss.powers.length;
      const resistanceBefore = bossResistance(boss, true);
      // First time this particular one is met, so the comparison below is their
      // resistance against their own starting point rather than against whoever
      // happened to hold the title on the previous turn.
      const firstSight = firstResistance.get(boss.id);
      if (firstSight === undefined) firstResistance.set(boss.id, resistanceBefore);
      const trustBefore = session.trust;
      const roster = session.allHeroes.length;
      const openBefore = session.openIncidents.map((i) => i.id);
      let report;
      try {
        report = session.huntVillain(boss.id, ...nonLethal);
      } catch {
        break;
      }
      // Whether the boss's own work outlived the turn, measured by identity so a
      // job that expired is not mistaken for one containment left behind.
      const heldAfter = heldWork.filter((i) => session.openIncidents.some((open) => open.id === i.id)).length;
      if (report.villain?.outcome !== 'escaped') continue;
      containments += 1;
      if (boss.powers.length > powersBefore) returned += 1;
      // The return is not a derived report: the session hands them back inside
      // the same resolution, so this is the number the board is actually on.
      if (boss.influence === BOSS_RETURN_INFLUENCE) returnedAt += 1;
      if (firstSight !== undefined && resistanceBefore < firstSight) escalated += 1;
      const held = new Set(boss.powers.map((p) => p.powerSet));
      if (held.size !== boss.powers.length) duplicated += 1;
      if (heldWork.length > 0) {
        workHeld += 1;
        workBefore += heldWork.length;
        workAfter += heldAfter;
      }
      // The first containment on a turn where nothing else moved the number, so
      // the reading is the containment's own effect and not one turn's collateral
      // spike. Trust falls for work nobody answered, and this turn may have let
      // some expire; the check below compares a containment against a kill of the
      // same boss, so only a clean turn can be laid beside it.
      const expired = openBefore.filter((id) => !session.openIncidents.some((i) => i.id === id));
      if (!trustMeasured && expired.length === 0) {
        trustMeasured = true;
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
  // Both halves of the escalation, observed rather than inferred. The pure
  // derivations are checked above; this is the same claim made about a real run,
  // so a boss that comes back at the wrong number or at the same difficulty as
  // last time fails here instead of quietly making the other checks true.
  // Every containment hands them back — including the ones where they have
  // worked through the whole list and there is no power left to give — so this
  // is counted against the containments rather than against the power gains.
  check(
    'every containment hands the boss back at the number the design picked',
    containments > 0 && returnedAt === containments,
    `${returnedAt}/${containments} came back at ${BOSS_RETURN_INFLUENCE}`,
  );
  check(
    'a contained boss comes back harder to move than they went',
    containments > 0 && escalated > 0,
    `${escalated} containments of a boss already measured, out of ${containments}`,
  );
  // The powers list is the only record of how many times a boss got away, so it
  // has to stay a set. A repeat entry would overstate their escalation forever.
  check('no boss ever holds the same power twice', duplicated === 0, `${duplicated} with a duplicate`);
  // Containment is the branch that does not cost the city's standing. Measured
  // against the price a kill would have charged, because the resolution moves
  // trust on its own account and the fork is only a fork if the two differ.
  check(
    'containment does not cost the city its standing',
    trustMeasured &&
      trustAfterContainment >= trustBeforeContainment + earnedAtContainment - BOSS_DEATH_TRUST_COST * rosterAtContainment,
    `trust ${trustBeforeContainment} -> ${trustAfterContainment}, earned ${earnedAtContainment}, ` +
      `a kill would have cost ${BOSS_DEATH_TRUST_COST * rosterAtContainment}`,
  );
  // Stopping someone takes their work with them. Being contained is not being
  // stopped, so their work has to stay on the board — otherwise the non-lethal
  // branch would clear the board *and* hand the same villain back, and it would
  // be the better answer every time. The boss is hunted rather than tidied up
  // here, so nothing in the action consumes the work: every job it held that was
  // due to outlive the turn is still open afterwards.
  check(
    "containment leaves the boss's work on the board",
    workHeld > 0 && workAfter === workBefore,
    `${workHeld} containments with work: ${workAfter}/${workBefore} kept`,
  );

  // The lethal branch, and the price the user chose for it.
  let sawKill = false;
  let killWasFlaggedBoss = false;
  let trustBefore = 0;
  let trustAfter = 0;
  let earned = 0;
  let rosterAtKill = 0;
  // Swept for the same reason as the containment half: one seed is not a
  // guarantee that a boss ever comes up, and a check pinned to a lucky seed is a
  // check that fails the next time a balance number moves rather than the next
  // time the mechanic breaks.
  for (let seed = 1; seed <= 24 && !sawKill; seed += 1) {
    const { session: lethalRun } = GameSession.newGame({
      realName: 'Lethal Test',
      alias: 'Lethal Test',
      powerSet: 'SuperStrength',
      origin: 'genetic',
      seed: seed * 9001,
    });
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

/**
 * One cell of the attention sweep: the same 200 seeds, the same strategies, with
 * the trust clock read as a *timing* rather than as a terminal cause.
 *
 * `onTrust` says how many runs ended on the floor and nothing about how long
 * before the end the city started asking, which is the only question "does this
 * floor pull too early, too late, or not at all" can be answered with. So the
 * margin is read every turn and the cell separates two readings that look alike
 * on the board and are not alike to play:
 *
 *  - **committed**: the turn from which the run never leaves the margin again. An
 *    earlier brush is noise — trust moves both ways, and a run that grazes the
 *    floor and recovers was never in danger. The committed pull is the deadline.
 *  - **warning**: how many turns of it there are. This is the felt clock. Two
 *    turns of warning on a two-hundred-turn run is a cliff, and forty is a run
 *    that ends in a way you could see coming, and both are the same number of
 *    points of margin.
 *
 * `neverFelt` and `neverCommitted` are the two scale-free shapes at the other end,
 * and `warningShare` is warning as a fraction of the run so the four cities can
 * be compared without pretending a turn means the same thing on each.
 *
 * The cell also re-reads every run it played at each candidate width in
 * `CANDIDATE_NIGHTS`, because the width of the band is a choice and this is the
 * only place it can be measured: the band reaches `trustVerdict` and this
 * reading, and nothing that decides whether a run is won.
 */
interface SweepCell {
  avg: number;
  survived: number;
  maxTurns: number;
  onTrust: number;
  committed: number;
  warning: number;
  warningShare: number;
  neverFelt: number;
  neverCommitted: number;
  candidates: WarningShape[];
}

/** One band width, read as the ladder reads the chosen one. */
interface WarningShape {
  committed: number;
  warning: number;
  warningShare: number;
  neverFelt: number;
  neverCommitted: number;
}

/**
 * Candidate widths in nights, printed beside the chosen one on every run of the
 * ladder so the width stays a measurement rather than a number somebody liked.
 * A night is the unit because a night is what the band is measured against: one
 * unattended crime costs every hero on the roster a point.
 */
const CANDIDATE_NIGHTS = [1, 2, 3, 4];

/**
 * The turn from which every remaining sample is inside the band, or null if the
 * run leaves it again before the end. Walking backwards from the last sample is
 * the only way to find it: the first touch is not the question.
 */
function committedTurn(trace: TrustSample[], nights: number): number | null {
  for (let i = trace.length - 1; i >= 0; i -= 1) {
    const sample = trace[i]!;
    if (sample.margin >= trustWarningBand(sample.roster, nights)) return trace[i + 1]?.turn ?? null;
  }
  return trace[0]?.turn ?? null;
}

function warningShape(traces: readonly TrustSample[][], nights: number): WarningShape {
  let neverFelt = 0;
  let neverCommitted = 0;
  const committed: number[] = [];
  const warning: number[] = [];
  const warningShare: number[] = [];
  for (const trace of traces) {
    if (!trace.some((sample) => sample.margin < trustWarningBand(sample.roster, nights))) neverFelt += 1;
    const committedAt = committedTurn(trace, nights);
    if (committedAt === null) {
      neverCommitted += 1;
      continue;
    }
    const end = trace[trace.length - 1]!.turn;
    committed.push(committedAt);
    warning.push(end - committedAt);
    warningShare.push((end - committedAt) / Math.max(1, end));
  }
  return {
    committed: median(committed),
    warning: median(warning),
    warningShare: median(warningShare),
    neverFelt,
    neverCommitted,
  };
}

function sweepCell(
  strategy: 'neglect' | 'random' | 'focus',
  threat: ThreatLevel = DEFAULT_THREAT,
): SweepCell {
  let total = 0;
  let survived = 0;
  let maxTurns = 0;
  let onTrust = 0;
  const traces: TrustSample[][] = [];
  for (let seed = 1; seed <= 200; seed += 1) {
    const trace: TrustSample[] = [];
    const s = playRun(seed * 7919, 600, strategy, threat, trace);
    traces.push(trace);
    total += s.turn;
    maxTurns = Math.max(maxTurns, s.turn);
    if (!s.isOver) survived += 1;
    if (s.overReason === TRUST_LOST) onTrust += 1;
  }
  const chosen = warningShape(traces, WARNING_NIGHTS);
  return {
    avg: Math.round(total / 200),
    survived,
    maxTurns,
    onTrust,
    committed: chosen.committed,
    warning: chosen.warning,
    warningShare: chosen.warningShare,
    neverFelt: chosen.neverFelt,
    neverCommitted: chosen.neverCommitted,
    candidates: CANDIDATE_NIGHTS.map((nights) => warningShape(traces, nights)),
  };
}

console.log('attention is the whole game');
{
  // Neglect: never intervene, just keep patrolling.
  const neglect = sweepCell('neglect');
  const spread = sweepCell('random');
  const focus = sweepCell('focus');
  console.log(`  info never intervening:  avg ${neglect.avg} turns, ${neglect.survived}/200 survived, ${neglect.onTrust} on trust`);
  console.log(`  info spreading attention: avg ${spread.avg} turns, ${spread.survived}/200 survived, ${spread.onTrust} on trust`);
  console.log(`  info focused attention:  avg ${focus.avg} turns, ${focus.survived}/200 survived, ${focus.onTrust} on trust (longest ${focus.maxTurns})`);
  // When the floor starts being the run's clock, per strategy, so the §11.1 claim
  // that skill buys time rather than a better floor is a measured one.
  console.log('  info when the floor pulls on the average city, median over 200 seeds');
  for (const [label, cell] of [
    ['never intervening', neglect],
    ['spreading', spread],
    ['focused', focus],
  ] as const) {
    console.log(
      `  info ${label.padEnd(19)} commits at turn ${cell.committed} of ${cell.avg}, ` +
        `${turns(cell.warning)} of warning, ${cell.neverFelt}/200 never came near it, ` +
        `${cell.neverCommitted}/200 never committed`,
    );
  }

  check('focusing beats spreading', focus.avg > spread.avg, `${focus.avg} vs ${spread.avg}`);
  check('focusing beats doing nothing at all', focus.avg > neglect.avg, `${focus.avg} vs ${neglect.avg}`);
  // "Aimless intervention is barely better than doing nothing", and the old
  // check for it was a fixed +10 turns, which sat *exactly* on its boundary
  // (42 against 32) and which the neighbouring comment had already called
  // meaningless: ten turns is nothing on a run of 220 and a lot on a run of 19.
  //
  // The scale-free form is what the claim actually says. Focusing buys
  // `focus - neglect` turns over inaction, and turning up without a target may
  // capture only a fraction of that difference. A third is the ceiling, not a
  // measured figure, and it is deliberately loose enough to keep the documented
  // exception alive: where the trust clock ends the run rather than conquest,
  // merely showing up does buy time, because attending any incident at all stops
  // it expiring. That exception is asserted where it matters — aimless never
  // survives a run, on any city.
  check(
    'aimless intervention is not a strategy',
    spread.avg - neglect.avg <= (focus.avg - neglect.avg) / 3,
    `${spread.avg} against ${neglect.avg}, and focusing buys ${focus.avg - neglect.avg}`,
  );
  check('focusing is the only route to survival', focus.survived > 0 && spread.survived === 0, `${focus.survived} vs ${spread.survived}`);
  check('the game is not trivially winnable by focusing alone', focus.survived < 200, `${focus.survived}/200 survived`);
}

console.log('how hard is the city');
{
  // The setting is only real if it reaches both clocks. A run is won by
  // attention and lost by running out of goodwill, so a city that changes only
  // one of them is half a difficulty setting, and the sweep below is the only
  // thing here that would notice.
  const rows = THREAT_LEVELS.map((threat) => ({
    threat,
    neglect: sweepCell('neglect', threat),
    spread: sweepCell('random', threat),
    focus: sweepCell('focus', threat),
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

  // When the floor arrives, which is the question the ladder's trust column is
  // really about. The warning is the number a player would describe as "too
  // early" or "too late", and the two `never` columns are "not at all".
  console.log('  info when the floor pulls, focused play, median over 200 seeds');
  for (const row of rows) {
    const f = row.focus;
    console.log(
      `  info ${THREAT_DEFS[row.threat].label.padEnd(14)}` +
        ` the floor becomes the run's clock at turn ${pad(f.committed)} (n=${200 - f.neverCommitted} of 200),` +
        ` and it does it with ${turns(f.warning)} of warning — ${Math.round(f.warningShare * 100)}% of the run`,
    );
    console.log(
      `  info ${''.padEnd(14)} ${pad(f.neverFelt)}/200 never came near it, ${pad(f.neverCommitted)}/200 never committed to it`,
    );
  }

  // The width of the band, measured rather than asserted: the runs above re-read
  // at every candidate width, in the units the rows above print them in. The
  // trade is "warns on every city" against "the warning is not the state of the
  // game", and this is the only table it can be made on. `*` is the width the
  // game ships with.
  console.log('  info candidate widths, focused play: commit turn / warning turns / share of run / never committed');
  for (let c = 0; c < CANDIDATE_NIGHTS.length; c += 1) {
    const nights = CANDIDATE_NIGHTS[c]!;
    const width = `${nights} ${nights === 1 ? 'night' : 'nights'}${nights === WARNING_NIGHTS ? ' *' : ''}`;
    const cells = rows.map((row) => {
      const shape = row.focus.candidates[c]!;
      return (
        `${THREAT_DEFS[row.threat].label.padEnd(14)}` +
        `${pad(shape.committed)}/${pad(shape.warning)}/${String(Math.round(shape.warningShare * 100)).padStart(3)}%/${String(shape.neverCommitted).padStart(3)}`
      );
    });
    console.log(`  info ${width.padEnd(9)} ${cells.join(' ')}`);
  }

  // Both halves of the choice, in the units the table prints them in. A width
  // that does not warn is the bug the band was widened for, and a width that
  // leaves the meter amber for the whole run is the warning having become the
  // state of the game instead of a change in it.
  //
  // Easy is left out of the first on purpose: its floor ends 3 of 200 focused
  // runs, so there is nothing there to warn about, and pinning a warning to a
  // clock that never fires would only pin down a number. Backbreaking is left
  // out of the second because its meter *should* start amber — it forgives one
  // point per guardian, the band is two nights of movement, and the floor is
  // what ends 194 of its runs. It is the one city where the band is not the
  // notice; it is the run.
  for (const row of rows) {
    // A quarter of the city's focused runs ending on the floor is the line
    // between "the floor is this city's clock" and "the floor is an accident",
    // and only a clock can be warned about. Easy fires on 3 of 200.
    if (row.focus.onTrust >= 50) {
      check(
        `${onCity(row.threat)} is warned before the floor ends its runs`,
        row.focus.warningShare >= 0.03,
        `${Math.round(row.focus.warningShare * 100)}% of the run, ${turns(row.focus.warning)}`,
      );
    }
    if (row.threat !== 'backbreaking') {
      check(
        `the warning stays a warning on ${onCity(row.threat)}`,
        row.focus.warningShare < 0.5,
        `${Math.round(row.focus.warningShare * 100)}% of the run spent inside the band`,
      );
    }
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

  // The floor column's claim in the only units it can be honest in. The table it
  // comes from says a harder city asks for its debt back sooner, and the floor
  // being higher is not that: a floor can arrive late and still be high. These are
  // the two ways to say it that survive the runs getting shorter, and the print
  // above is the shape behind them.
  for (let i = 1; i < rows.length; i += 1) {
    const here = rows[i]!;
    const before = rows[i - 1]!;
    check(
      `more of the run is spent under the floor's thumb on ${onCity(here.threat)} than on ${onCity(before.threat)}`,
      here.focus.warningShare > before.focus.warningShare,
      `${Math.round(before.focus.warningShare * 100)}% -> ${Math.round(here.focus.warningShare * 100)}%`,
    );
    check(
      `focused play commits to the floor more often on ${onCity(here.threat)} than on ${onCity(before.threat)}`,
      here.focus.neverCommitted <= before.focus.neverCommitted,
      `${before.focus.neverCommitted}/200 -> ${here.focus.neverCommitted}/200`,
    );
  }

  // The claim the whole design rests on has to survive the knob. If focusing
  // stops beating aimless play somewhere on the ladder, the setting has broken
  // the game rather than scaled it, and no amount of monotone run lengths makes
  // that acceptable.
  for (const row of rows) {
    check(`focusing still beats spreading on ${onCity(row.threat)}`, row.focus.avg > row.spread.avg, `${row.focus.avg} vs ${row.spread.avg}`);
    check(`focusing still beats doing nothing on ${onCity(row.threat)}`, row.focus.avg > row.neglect.avg, `${row.focus.avg} vs ${row.neglect.avg}`);
    // The per-city turn band this replaces was a fixed +10 on every city, and ten
    // turns means something completely different on a run of 19 than on a run of
    // 220. It was also asserting the wrong half of the claim, because aimless
    // play does buy time where the trust clock is what ends the run: attending
    // any incident at all stops it expiring, and expiring is what spends the
    // city's patience. What aimless play never buys is a run it survives, which
    // is the half that matters and is asserted here instead. The turn band
    // survives on the Average city above, which is the city DESIGN 10.4 measures
    // it on.
    check(
      `aimless intervention never survives a run on ${onCity(row.threat)}`,
      row.spread.survived === 0,
      `${row.spread.survived}/200 survived`,
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

  // The band and the countdown beside it have to be the same sentence in
  // different units, or the meter can promise two nights and mean one.
  check(
    'the warning band reads as nights of nobody answering',
    unansweredNights(trustWarningBand(4), 4) === WARNING_NIGHTS,
    `${trustWarningBand(4)} points on a roster of 4 is ${unansweredNights(trustWarningBand(4), 4)} nights`,
  );
  // The bug the band was widened for: one night of movement is what the band is
  // measured against, so anything at or under it is crossed in the same turn it
  // opens. The ladder measures what each width costs; this is the rule under it.
  check(
    'the warning band is wider than a night of movement, on every roster',
    [1, 3, 4, 6].every((roster) => trustWarningBand(roster) > roster),
    [1, 3, 4, 6].map((roster) => `${trustWarningBand(roster)}>${roster}`).join(', '),
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
