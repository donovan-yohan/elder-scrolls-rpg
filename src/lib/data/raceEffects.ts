import { RaceName } from './race'
import {
  EffectTrigger,
  EffectConditionType,
  EffectActionType,
  EffectSourceType,
  type Effect,
  type EffectSource,
} from '$lib/models/effect'

function createRaceSource(id: RaceName): EffectSource {
  return {
    type: EffectSourceType.Race,
    id,
    name: `${id} Race`,
  }
}

// Breton: +1 MP regen per round
export const BretonEffects: Effect[] = [
  {
    id: 'breton-mp-regen',
    name: 'Magical Blood',
    description: 'Regenerate +1 MP per round',
    source: createRaceSource(RaceName.Breton),
    trigger: EffectTrigger.TurnStart,
    conditions: [],
    actions: [
      {
        type: EffectActionType.RestoreMP,
        value: 1,
      },
    ],
    priority: 20,
  },
]

// Nord: Frost resist +10
export const NordEffects: Effect[] = [
  {
    id: 'nord-frost-resist',
    name: 'Nordic Resilience',
    description: 'Natural frost spell resistance +10',
    source: createRaceSource(RaceName.Nord),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.DamageType, damageType: 'Frost' },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        value: -10,
      },
    ],
    priority: 1,
  },
]

// Dunmer: Fire resist +10
export const DunmerEffects: Effect[] = [
  {
    id: 'dunmer-fire-resist',
    name: 'Ashen Blood',
    description: 'Natural fire spell resistance +10',
    source: createRaceSource(RaceName.Dunmer),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.DamageType, damageType: 'Fire' },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        value: -10,
      },
    ],
    priority: 1,
  },
]

// Altmer: Spell weakness -5
export const AltmerEffects: Effect[] = [
  {
    id: 'altmer-spell-weakness',
    name: 'Magical Sensitivity',
    description: 'Spell weakness -5',
    source: createRaceSource(RaceName.Altmer),
    trigger: EffectTrigger.OnSpellTargeted,
    conditions: [],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        value: 5,
      },
    ],
    priority: 50,
  },
]

// Empty arrays for races with passive benefits (not combat triggers)
export const RedguardEffects: Effect[] = []
export const BosmerEffects: Effect[] = []
export const OrsimerEffects: Effect[] = []
export const ArgonianEffects: Effect[] = []
export const ImperialEffects: Effect[] = []
export const KhajiitEffects: Effect[] = []

// Master export
export const RaceEffects: Record<RaceName, Effect[]> = {
  [RaceName.Breton]: BretonEffects,
  [RaceName.Nord]: NordEffects,
  [RaceName.Dunmer]: DunmerEffects,
  [RaceName.Altmer]: AltmerEffects,
  [RaceName.Redguard]: RedguardEffects,
  [RaceName.Bosmer]: BosmerEffects,
  [RaceName.Orsimer]: OrsimerEffects,
  [RaceName.Argonian]: ArgonianEffects,
  [RaceName.Imperial]: ImperialEffects,
  [RaceName.Khajiit]: KhajiitEffects,
}

export function getRaceEffects(race: RaceName): Effect[] {
  return RaceEffects[race] ?? []
}
