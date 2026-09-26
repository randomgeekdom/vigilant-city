import type { EventSpec } from '../core/EventSystem';
import { stableHero, nameOf } from './helpers';

export const PACK_PRESS: readonly EventSpec[] = [
  {
    id: 'press_feature',
    pack: 'press',
    title: 'A Magazine Wants Your Roster',
    text: (ctx) => {
      const hero = stableHero(ctx, (h) => h.status === 'active' && h.fame > 30);
      return `A national weekly wants four thousand words on ${nameOf(hero)} and the ethics of the arrangement. The commissioning editor is not stupid, which means the questions will be good and the quotes will be quoted.`;
    },
    weight: 9,
    minTurn: 5,
    when: (ctx) => ctx.api.heroes().some((h) => h.status === 'active' && h.fame > 30),
    choices: [
      {
        label: 'Grant the access. Full access.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 3 });
          const pool = ctx.api.heroes().filter((h) => h.status === 'active' && h.fame > 30);
          const hero = pool[ctx.api.turn % pool.length];
          if (hero) ctx.api.adjustHero(hero.id, { fame: Math.min(100, hero.fame + 10) });
          ctx.api.log('The feature runs. It is sympathetic, which nobody had promised.', 'press');
        },
      },
      {
        label: 'Grant a controlled interview. No access.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 1, funding: 2 });
          ctx.api.log('A short interview, heavily prepared. It reads as a non-story.', 'press');
        },
      },
      {
        label: 'Decline. Feed them a rival instead.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -2, intel: 2 });
          ctx.api.bumpFlag('fedRival', 1);
          ctx.api.log('You point them at a costumed nuisance instead. They buy it.', 'press');
        },
      },
    ],
  },
  {
    id: 'press_poll',
    pack: 'press',
    title: 'The Poll',
    text: (ctx) => {
      const trust = Math.round(ctx.api.res().trust);
      return `The quarterly approval poll is out. Trust: ${trust}. The number is moving in the same direction as everything else, which is the worst way it can move.`;
    },
    weight: 8,
    minTurn: 8,
    when: (ctx) => ctx.api.turn % 6 === 0 || ctx.api.turn === 8,
    choices: [
      {
        label: 'Publish the full methodology.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 3 });
          ctx.api.log('Methodology published. The pollsters are annoyed, the public is slightly less so.', 'press');
        },
      },
      {
        label: 'Commission your own poll.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -1, funding: -8 });
          ctx.api.log('Your own poll shows you winning by nine. Your own poll is on the record.', 'press');
        },
      },
      {
        label: 'Say nothing and go to work.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 1, funding: 1 });
          ctx.api.log('No statement. The roster works. It is the least controversial available strategy.', 'press');
        },
      },
    ],
  },
  {
    id: 'press_leak',
    pack: 'press',
    title: 'Something Slipped',
    text: (ctx) => {
      return 'A document from inside the agency is with three outlets. It is not classified, which means it is embarrassing rather than treasonous, which means the only available strategy is to decide who sees it first.';
    },
    weight: 10,
    minTurn: 6,
    when: (ctx) => ctx.api.turn >= 6,
    choices: [
      {
        label: 'Call the outlets and get ahead of it.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -2 });
          ctx.api.bumpFlag('leaked', 1);
          ctx.api.log('You brief all three at once. It runs small and late, which is a kind of winning.', 'press');
        },
      },
      {
        label: 'Find the leak.',
        effect: (ctx) => {
          ctx.api.adjust({ intel: 4, trust: 1 });
          const pool = ctx.api.heroes().filter((h) => h.status === 'active');
          const suspect = pool[ctx.api.turn % pool.length];
          ctx.api.log(suspect ? `The paper trail points somewhere uncomfortable. ${suspect.callsign} has been re-tasked to filing.` : 'The paper trail goes cold.', 'secret');
        },
      },
      {
        label: 'Let it run and get ahead of the next one.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -4 });
          ctx.api.log('It runs. It is a smaller story than the leak implied, but stories compound.', 'press');
        },
      },
    ],
  },
  {
    id: 'press_ceremony',
    pack: 'press',
    title: 'The Annual Ceremony',
    text: (ctx) => {
      const hero = stableHero(ctx, (h) => h.status === 'active' && h.fame > 45);
      return `The city wants to give out a commendation. The front-runner is ${nameOf(hero)}, who is also the one least able to attend without it becoming the story.`;
    },
    weight: 7,
    minTurn: 11,
    when: (ctx) => ctx.api.heroes().some((h) => h.status === 'active' && h.fame > 45),
    choices: [
      {
        label: 'Accept on the roster’s behalf. Full ceremony.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 5, funding: 4 });
          for (const hero of ctx.api.heroes()) {
            if (hero.status !== 'active') continue;
            ctx.api.adjustHero(hero.id, { morale: Math.min(100, hero.morale + 7) });
          }
          ctx.api.log('The ceremony is tasteful. Everyone is in a good mood for a week.', 'good');
        },
      },
      {
        label: 'Decline the ceremony. Credit the city workers instead.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 3 });
          ctx.api.log('The commendation goes to transit staff. It is the better call and it costs you nothing.', 'press');
        },
      },
      {
        label: 'Skip it entirely. The roster is working.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -2 });
          ctx.api.log('Nobody came. The empty chair got the photograph.', 'press');
        },
      },
    ],
  },
  {
    id: 'press_rival_network',
    pack: 'press',
    title: 'Somebody Else Is on TV',
    text: (ctx) => {
      return 'There is a costumed figure operating outside your jurisdiction and the coverage is excellent. Better than yours. The network has, with great subtlety, started running a segment called "Elsewhere" whose clips undercut every time your roster is mentioned.';
    },
    weight: 9,
    minTurn: 13,
    when: (ctx) => ctx.api.heroes().some((h) => h.status === 'active'),
    choices: [
      {
        label: 'Extend your mandate to cover it.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -4, funding: 14 });
          ctx.api.bumpFlag('extendedMandate', 1);
          ctx.api.log('Your mandate is extended. You have jurisdiction and a much larger problem.', 'crisis');
        },
      },
      {
        label: 'Coordinate quietly. Do not perform a rivalry.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 2, intel: 5 });
          ctx.api.bumpFlag('rivalryQuiet', 1);
          ctx.api.log('A quiet handshake is arranged. The network hates it; it gets a four-second clip.', 'press');
        },
      },
      {
        label: 'Let them have the segment.',
        effect: (ctx) => {
          const pool = ctx.api.heroes().filter((h) => h.status === 'active');
          for (const hero of pool) ctx.api.adjustHero(hero.id, { fame: Math.max(0, hero.fame - 3), morale: Math.max(0, hero.morale - 4) });
          ctx.api.log('You say nothing about them. Your roster notices the nothing.', 'bad');
        },
      },
    ],
  },
  {
    id: 'press_vigilante_ethics',
    pack: 'press',
    title: 'A Philosopher Wants an Interview',
    text: () => {
      return 'An ethics professor has written an essay asking whether your roster is public servants or private citizens with permission. It is sympathetic, which is worse. It argues that the arrangement is unstable, and the argument is good, and now it is in a book.';
    },
    weight: 6,
    minTurn: 16,
    when: (ctx) => ctx.api.turn >= 16,
    choices: [
      {
        label: 'Engage properly. Help write the answer.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 4 });
          ctx.api.bumpFlag('engaged', 1);
          ctx.api.log('You do a long interview about mandate and accountability. Two outlets run it. It is the best week the roster has had.', 'good');
        },
      },
      {
        label: 'Decline. You do not take lessons from a civilian.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -3, intel: 2 });
          ctx.api.log('You decline. The essay becomes the text it would have been anyway.', 'press');
        },
      },
    ],
  },
];
