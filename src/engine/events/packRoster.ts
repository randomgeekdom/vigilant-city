import type { EventSpec } from '../core/EventSystem';
import { stableHero, nameOf, secretText } from './helpers';

export const PACK_ROSTER: readonly EventSpec[] = [
  {
    id: 'roster_burnout',
    pack: 'roster',
    title: 'The Long Watch',
    text: (ctx) => {
      const hero = stableHero(ctx, (h) => h.status === 'active' && h.morale < 45);
      return `${nameOf(hero)} has been on the board for eleven weeks straight. She has stopped answering texts. Her landing gear is still in the workshop, which is how you know she went out again.`;
    },
    weight: 10,
    when: (ctx) => ctx.api.heroes().some((h) => h.status === 'active' && h.morale < 45),
    choices: [
      {
        label: 'Force a rotation. Pull someone off the board for a month.',
        hint: 'Costs funding. Restores morale across the roster.',
        effect: (ctx) => {
          ctx.api.adjust({ funding: -12, trust: 1 });
          for (const hero of ctx.api.heroes()) {
            if (hero.status !== 'active') continue;
            ctx.api.adjustHero(hero.id, { morale: Math.min(100, hero.morale + 14) });
          }
          ctx.api.log('The whole board is stood down for a rotation. The mayor calls it prudent.', 'hero');
        },
      },
      {
        label: 'Give them the week anyway.',
        hint: 'Free. Morale of the worst hero falls further.',
        effect: (ctx) => {
          const hero = stableHero(ctx, (h) => h.status === 'active' && h.morale < 45);
          if (hero) ctx.api.adjustHero(hero.id, { morale: Math.max(0, hero.morale - 10) });
          ctx.api.log('You let it run. Somebody writes the op-ed.', 'hero');
        },
      },
      {
        label: 'Commission a proper support programme.',
        hint: 'Expensive. Permanent morale drift improvement.',
        when: (ctx) => ctx.api.res().funding >= 40,
        effect: (ctx) => {
          ctx.api.adjust({ funding: -40 });
          ctx.api.bumpFlag('moraleProgramme', 1);
          ctx.api.log('A support programme is in place. It is not a magic fix, but it is something.', 'good');
        },
      },
    ],
  },
  {
    id: 'roster_secret_pressure',
    pack: 'roster',
    title: 'A File Gets Thicker',
    text: (ctx) => {
      const hero = stableHero(ctx, (h) => h.secret !== null && h.secretPressure > 35);
      return `Someone has been asking about ${nameOf(hero)}. Nothing actionable yet. The subject of the asking is ${secretText(hero)}, and there is a version of this where it is a headline instead of a rumour.`;
    },
    weight: 12,
    minTurn: 8,
    when: (ctx) => ctx.api.heroes().some((h) => h.secret !== null && h.secretPressure > 35),
    choices: [
      {
        label: 'Buy the quiet.',
        hint: 'Costs funding. Resets the pressure.',
        effect: (ctx) => {
          const hero = stableHero(ctx, (h) => h.secret !== null && h.secretPressure > 35);
          if (hero) ctx.api.adjustHero(hero.id, { secretPressure: 0 });
          ctx.api.adjust({ funding: -20 });
          ctx.api.log('Somebody is made whole. The questions stop, at least this month.', 'secret');
        },
      },
      {
        label: 'Get ahead of it. Release it yourself.',
        hint: 'Costs trust. Clears the secret. Buys you control of the story.',
        effect: (ctx) => {
          const hero = stableHero(ctx, (h) => h.secret !== null && h.secretPressure > 35);
          if (hero) ctx.api.setSecret(hero.id, null);
          ctx.api.adjust({ trust: -4, funding: 6 });
          ctx.api.log('You broke the story yourself. It reads as composure, mostly.', 'secret');
        },
      },
      {
        label: 'Say nothing and hope.',
        effect: (ctx) => {
          const hero = stableHero(ctx, (h) => h.secret !== null && h.secretPressure > 35);
          if (hero) ctx.api.adjustHero(hero.id, { secretPressure: Math.min(100, hero.secretPressure + 20) });
          ctx.api.log('You say nothing. The file stays open.', 'secret');
        },
      },
    ],
  },
  {
    id: 'roster_rivalry',
    pack: 'roster',
    title: 'Two Colds, One Award',
    text: (ctx) => {
      const hero = stableHero(ctx, (h) => h.status === 'active' && h.fame > 40);
      return `${nameOf(hero)} has been taking credit for work done in pairs. There is a version of the roster where this is a personality clash and a version where it becomes a schism.`;
    },
    weight: 8,
    minTurn: 6,
    when: (ctx) => ctx.api.heroes().filter((h) => h.status === 'active' && h.fame > 40).length >= 2,
    choices: [
      {
        label: 'Publicly credit the whole board.',
        effect: (ctx) => {
          for (const hero of ctx.api.heroes()) {
            if (hero.status !== 'active') continue;
            ctx.api.adjustHero(hero.id, { morale: Math.min(100, hero.morale + 6) });
          }
          ctx.api.log('Credit goes to the roster. Nobody is thrilled and everybody is slightly less insufferable.', 'hero');
        },
      },
      {
        label: 'Back the favourite. Publicly.',
        effect: (ctx) => {
          const pool = ctx.api.heroes().filter((h) => h.status === 'active' && h.fame > 40);
          const fav = pool[ctx.api.turn % pool.length];
          if (fav) {
            ctx.api.adjustHero(fav.id, { fame: Math.min(100, fav.fame + 8), morale: Math.min(100, fav.morale + 8) });
          }
          for (const hero of pool) {
            if (fav && hero.id === fav.id) continue;
            ctx.api.adjustHero(hero.id, { morale: Math.max(0, hero.morale - 9) });
          }
          ctx.api.log('You picked a side. The building knows by morning.', 'hero');
        },
      },
      {
        label: 'Split the teams so they cannot compete.',
        effect: (ctx) => {
          ctx.api.adjust({ intel: 3 });
          ctx.api.log('Pairings reshuffled. The rivalry now has a commute.', 'hero');
        },
      },
    ],
  },
  {
    id: 'roster_scout',
    pack: 'roster',
    title: 'Someone Is Applying',
    text: (ctx) => {
      const hero = stableHero(ctx, (h) => h.status === 'active');
      return `A walk-in is waiting in the lobby. She watched ${nameOf(hero)} work once, from a rooftop, and decided that was a job description. She is good. She is also nineteen and has not read the insurance rider.`;
    },
    weight: 7,
    minTurn: 4,
    when: (ctx) => ctx.api.canRecruit(),
    choices: [
      {
        label: 'Hire her.',
        hint: 'Costs funding. Adds to the roster.',
        effect: (ctx) => {
          ctx.api.recruit();
        },
      },
      {
        label: 'Put her on a retainer instead.',
        hint: 'Cheaper. No roster slot, no voting weight.',
        effect: (ctx) => {
          ctx.api.adjust({ funding: -12, intel: 2 });
          ctx.api.log('She takes the retainer. She is in the building more than she should be.', 'hero');
        },
      },
      {
        label: 'Send her to a community programme.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 2, funding: -3 });
          ctx.api.log('She is furious. Three years from now she will be a name you had to look up.', 'hero');
        },
      },
    ],
  },
  {
    id: 'roster_quirk_incident',
    pack: 'roster',
    title: 'A Quirk With Consequences',
    text: (ctx) => {
      const hero = stableHero(ctx, (h) => h.status === 'active' && h.quirks.length > 0);
      const quirk = hero?.quirks[0] ?? 'a habit nobody predicted';
      return `${nameOf(hero)} walked into a press conference with "${quirk}" written all over the outcome. The press have made it a meme. The rest of the roster is not laughing.`;
    },
    weight: 6,
    minTurn: 10,
    when: (ctx) => ctx.api.heroes().some((h) => h.status === 'active' && h.quirks.length > 0),
    choices: [
      {
        label: 'Buy them a media coach.',
        effect: (ctx) => {
          ctx.api.adjust({ funding: -10, trust: 1 });
          ctx.api.log('Coaching is arranged. It reads as investment in the roster.', 'hero');
        },
      },
      {
        label: 'Lean into it. Make the quirks part of the brand.',
        effect: (ctx) => {
          for (const hero of ctx.api.heroes()) {
            if (hero.status !== 'active') continue;
            ctx.api.adjustHero(hero.id, { fame: Math.min(100, hero.fame + 5) });
          }
          ctx.api.adjust({ trust: 2 });
          ctx.api.log('The city decides it likes them exactly as they are. Mostly.', 'hero');
        },
      },
      {
        label: 'Issue a code of conduct on press contact.',
        effect: (ctx) => {
          ctx.api.bumpFlag('pressProtocol', 1);
          ctx.api.adjust({ trust: -2, funding: 2 });
          ctx.api.log('A protocol goes out. It is enforced exactly as strictly as you expect.', 'city');
        },
      },
    ],
  },
  {
    id: 'roster_identity_leak',
    pack: 'roster',
    title: 'The Wrong Photograph',
    text: (ctx) => {
      const hero = stableHero(ctx, (h) => h.status === 'active' && h.fame > 50);
      return `A photograph from a charity gala is circulating. The face in it belongs to ${nameOf(hero)} — civilian, unmasked, mid-conversation with someone who is now a very interesting witness.`;
    },
    weight: 9,
    minTurn: 12,
    when: (ctx) => ctx.api.heroes().some((h) => h.status === 'active' && h.fame > 50),
    choices: [
      {
        label: 'Relocate the witness and make it boring.',
        effect: (ctx) => {
          ctx.api.adjust({ funding: -18, trust: 1 });
          ctx.api.bumpFlag('movedWitnesses', 1);
          ctx.api.log('The witness has a transfer and a lawyer. Nothing further is going to happen.', 'secret');
        },
      },
      {
        label: 'Decoy protocol. Send someone else in the mask.',
        hint: 'Costs intel. Protects the identity going forward.',
        when: (ctx) => ctx.api.res().intel >= 10,
        effect: (ctx) => {
          ctx.api.adjust({ intel: -10, trust: 2 });
          ctx.api.bumpFlag('decoyProtocol', 1);
          ctx.api.log('A decoy takes the photograph. The city is very interested in the decoy now.', 'hero');
        },
      },
      {
        label: 'Do nothing. There is no story in a gala photo.',
        effect: (ctx) => {
          const pool = ctx.api.heroes().filter((h) => h.status === 'active' && h.fame > 50);
          const hero = pool[ctx.api.turn % pool.length];
          if (hero) ctx.api.adjustHero(hero.id, { fame: Math.max(0, hero.fame - 6) });
          ctx.api.log('You say there is no story. There is now a story about a city with a story.', 'secret');
        },
      },
    ],
  },
];
