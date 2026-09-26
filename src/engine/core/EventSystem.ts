import type { HeroData, DistrictData, IncidentData, LogKind, PendingChoice, PendingEvent, Resources, SecretKind, Stats } from './types';
import { Random } from './Random';

export interface EventContext {
  api: SessionApi;
}

export interface SessionApi {
  readonly rng: Random;
  readonly turn: number;
  log(text: string, kind?: LogKind): void;
  res(): Readonly<Resources>;
  adjust(patch: Partial<Resources>): void;
  heroes(): readonly HeroData[];
  heroById(id: string): HeroData | undefined;
  available(): HeroData[];
  districts(): readonly DistrictData[];
  district(id: string): DistrictData | undefined;
  adjustDistrict(id: string, patch: Partial<Omit<DistrictData, 'id'>>): void;
  worstDistrict(): DistrictData;
  incidents(): readonly IncidentData[];
  openIncidents(): IncidentData[];
  canRecruit(): boolean;
  recruit(): boolean;
  setPending(p: PendingEvent | null): void;
  flag(key: string): number;
  bumpFlag(key: string, amount: number): number;
  stat<K extends keyof Stats>(key: K, amount: number): void;
  setStatus(id: string, status: HeroData['status']): void;
  adjustHero(id: string, patch: Partial<Omit<HeroData, 'id'>>): void;
  setSecret(id: string, secret: SecretKind | null): void;
  resolveIncident(id: string, resolution: string, good: boolean): void;
}

export interface ChoiceSpec {
  label: string;
  hint?: string;
  when?: (ctx: EventContext) => boolean;
  effect: (ctx: EventContext) => void;
}

export interface EventSpec {
  id: string;
  pack: string;
  title: string;
  text: (ctx: EventContext) => string;
  weight: number;
  minTurn?: number;
  when: (ctx: EventContext) => boolean;
  effect?: (ctx: EventContext) => void;
  choices: readonly ChoiceSpec[];
}

export class EventRegistry {
  private readonly specs = new Map<string, EventSpec>();

  constructor(packs: readonly EventSpec[]) {
    for (const spec of packs) this.specs.set(spec.id, spec);
  }

  readonly size = (): number => this.specs.size;

  byId(id: string): EventSpec {
    const spec = this.specs.get(id);
    if (!spec) throw new Error(`unknown event ${id}`);
    return spec;
  }

  roll(api: SessionApi): EventSpec | null {
    const candidates = [...this.specs.values()].filter((e) => !e.minTurn || api.turn >= e.minTurn);
    const live = candidates.filter((e) => e.when({ api }));
    if (live.length === 0) return null;
    return api.rng.weighted(live.map((e) => ({ item: e, weight: e.weight })));
  }

  buildPending(spec: EventSpec, api: SessionApi): PendingEvent {
    const choices: PendingChoice[] = spec.choices.map((c) => {
      const ok = c.when ? c.when({ api }) : true;
      return {
        label: c.label,
        hint: c.hint ?? '',
        enabled: ok,
        disabledReason: ok ? '' : 'This path is no longer available.',
      };
    });
    return { id: spec.id, title: spec.title, text: spec.text({ api }), choices };
  }
}
