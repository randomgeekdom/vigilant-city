import type { EventSpec } from '../core/EventSystem';

export const PACK_CITY: readonly EventSpec[] = [
  {
    id: 'city_budget_audit',
    pack: 'city',
    title: 'The Audit',
    text: (ctx) => {
      const funding = Math.round(ctx.api.res().funding);
      return `The comptroller has finished her review. She is a decent auditor and a worse adversary. Current balance: ${funding}. She would like to talk about the payroll, the equipment line, and the phrase "discretionary hero retention" which she found in last year's ledger.`;
    },
    weight: 11,
    minTurn: 5,
    when: (ctx) => ctx.api.turn >= 5,
    choices: [
      {
        label: 'Show her everything. Full transparency.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 4, funding: -6 });
          ctx.api.bumpFlag('openBooks', 1);
          ctx.api.log('The books are open. The comptroller is impressed and the mayor is not.', 'city');
        },
      },
      {
        label: 'Show her a version she can sign off on.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 1, funding: 4 });
          ctx.api.bumpFlag('cookedBooks', 1);
          ctx.api.log('She signs it. The phrase is still in the ledger; it is just spelled differently now.', 'secret');
        },
      },
      {
        label: 'Reclassify the roster as emergency services.',
        hint: 'Raises the ceiling on funding permanently. Costs trust now.',
        when: (ctx) => ctx.api.turn >= 10,
        effect: (ctx) => {
          ctx.api.adjust({ trust: -6, funding: 30 });
          ctx.api.bumpFlag('emergencyDesignation', 1);
          ctx.api.log('The reclassification sticks. You have bought yourself a larger budget and a smaller mandate.', 'city');
        },
      },
    ],
  },
  {
    id: 'city_district_crisis',
    pack: 'city',
    title: 'The District Is Not Coping',
    text: (ctx) => {
      const worst = ctx.api.worstDistrict();
      return `${worst.name} is at ${Math.round(worst.unrest)} unrest and climbing. The precinct there has stopped filing reports, which is not the same as there being nothing to file. A sustained deployment would cost you time you may not have.`;
    },
    weight: 12,
    minTurn: 4,
    when: (ctx) => ctx.api.worstDistrict().unrest > 45,
    choices: [
      {
        label: 'Send a full team and a community fund.',
        hint: 'Costs funding. Heavily reduces that district unrest.',
        when: (ctx) => ctx.api.res().funding >= 25,
        effect: (ctx) => {
          ctx.api.adjust({ funding: -25, trust: 3 });
          const worst = ctx.api.worstDistrict();
          ctx.api.adjustDistrict(worst.id, { unrest: worst.unrest - 22 });
          ctx.api.log(`A full team works ${worst.name} for a fortnight. The streets are quieter and the precinct files again.`, 'city');
        },
      },
      {
        label: 'Task the roster around it and hope it is weather.',
        effect: (ctx) => {
          const worst = ctx.api.worstDistrict();
          ctx.api.adjustDistrict(worst.id, { unrest: worst.unrest - 8 });
          ctx.api.adjust({ trust: -2 });
          ctx.api.log('It was not weather.', 'city');
        },
      },
      {
        label: 'Let the mayor own it. You have bigger problems.',
        effect: (ctx) => {
          const worst = ctx.api.worstDistrict();
          ctx.api.adjustDistrict(worst.id, { unrest: worst.unrest + 10 });
          ctx.api.adjust({ trust: -5, funding: 8 });
          ctx.api.log('The mayor owns it. The mayor remembers being given this one.', 'city');
        },
      },
    ],
  },
  {
    id: 'city_council_ask',
    pack: 'city',
    title: 'The Council Wants a Seat',
    text: (ctx) => {
      return 'A council subcommittee has been reconstituted with oversight of superhero response. They want a liaison who is not you, a published incident taxonomy, and monthly reporting. Three of those are reasonable and one of them is a leash.';
    },
    weight: 9,
    minTurn: 9,
    when: (ctx) => ctx.api.turn >= 9,
    choices: [
      {
        label: 'Give them all three.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 6, funding: 10 });
          ctx.api.bumpFlag('oversight', 1);
          ctx.api.log('The subcommittee is satisfied. They will be back in four months with a spreadsheet.', 'city');
        },
      },
      {
        label: 'Give them reporting, refuse the liaison.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 2, funding: 4 });
          ctx.api.bumpFlag('reporting', 1);
          ctx.api.log('You publish. You do not staff it. The chair notes the distinction each month.', 'city');
        },
      },
      {
        label: 'Refuse all three.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -7, funding: -10 });
          ctx.api.bumpFlag('defiant', 1);
          ctx.api.log('You decline in writing. The letter is very short and very widely circulated.', 'city');
        },
      },
    ],
  },
  {
    id: 'city_hospital_burnout',
    pack: 'city',
    title: 'The Hospitals Are Full',
    text: () => {
      return 'Every hospital in the city is running at over ninety percent. None of it is your fault, which is a thing people will say to you while they are also saying it is your fault. The triage lead would like to know whether the roster can be deprioritised for non-critical trauma for one quarter.';
    },
    weight: 8,
    minTurn: 7,
    when: (ctx) => ctx.api.openIncidents().length >= 3,
    choices: [
      {
        label: 'Agree. Redirect the roster to critical only.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 7, intel: 2 });
          ctx.api.bumpFlag('criticalOnly', 1);
          ctx.api.log('The board goes to critical calls only. Incidents will queue. Everyone understands that.', 'city');
        },
      },
      {
        label: 'Refuse. The city needs both.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -4 });
          ctx.api.bumpFlag('refusedTriage', 1);
          ctx.api.log('You refuse. The triage lead does not raise it again, which is not the same as accepting it.', 'city');
        },
      },
    ],
  },
  {
    id: 'city_supply_request',
    pack: 'city',
    title: 'A Request From a School',
    text: () => {
      return 'A high school has written to ask whether one of the roster will come and speak at assembly. They have written to you because they were told they cannot write to the hero directly. Somebody on the staff has strong opinions about that.';
    },
    weight: 6,
    when: (ctx) => ctx.api.turn >= 6,
    choices: [
      {
        label: 'Send someone. One hour, no press, no photos.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 4, funding: 1 });
          ctx.api.bumpFlag('schools', 1);
          ctx.api.log('A hero spends an hour with four hundred children. No photographs, as promised.', 'good');
        },
      },
      {
        label: 'Send a recorded message instead.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 2 });
          ctx.api.log('The recording plays over the intercom. It is fine. It is very fine.', 'city');
        },
      },
      {
        label: 'Decline. The roster cannot be a curriculum item.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -3 });
          ctx.api.log('The school was told the roster is unavailable for assemblies.', 'city');
        },
      },
    ],
  },
  {
    id: 'city_rogue_cult',
    pack: 'city',
    title: 'The Group in the Unit',
    text: (ctx) => {
      return 'Intelligence has surfaced a cell operating out of a residential block. Eleven people, one shared ideology, and a mailing list that has the agency address on it. They are not dangerous in the way the newspapers mean. They are dangerous in the way you mean.';
    },
    weight: 7,
    minTurn: 14,
    when: (ctx) => ctx.api.res().intel >= 30,
    choices: [
      {
        label: 'Raid it. Quietly, with a legal warrant.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: -3, intel: 8 });
          ctx.api.bumpFlag('raided', 1);
          ctx.api.log('The unit is cleared out. The warrant is valid. Two lawyers are already on television.', 'crisis');
        },
      },
      {
        label: 'Feed them. Make the list go somewhere useful.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 3, intel: 6 });
          ctx.api.bumpFlag('infiltration', 1);
          ctx.api.log('You let them keep writing. You read every word.', 'secret');
        },
      },
      {
        label: 'Do nothing. A raid would make eleven martyrs.',
        effect: (ctx) => {
          ctx.api.adjust({ trust: 2 });
          ctx.api.log('You leave the unit alone. The list keeps arriving and you keep not opening it.', 'city');
        },
      },
    ],
  },
];
