import { BirthSignName } from './birthSign'
import { DamageType } from './element'
import {
  EffectTrigger,
  EffectConditionType,
  EffectActionType,
  EffectSourceType,
  type Effect,
  type EffectSource,
} from '$lib/models/effect'

function createBirthSignSource(id: BirthSignName): EffectSource {
  return {
    type: EffectSourceType.BirthSign,
    id,
    name: `${id} Birth Sign`,
  }
}

// Lord: Regen level HP each round if magicka full, fire vulnerability
export const LordEffects: Effect[] = [
  {
    id: 'lord-hp-regen',
    name: 'Trollkin Regeneration',
    description: 'Regenerate HP equal to your level when magicka is full',
    source: createBirthSignSource(BirthSignName.Lord),
    trigger: EffectTrigger.TurnStart,
    conditions: [
      { type: EffectConditionType.MagickaFull },
    ],
    actions: [
      {
        type: EffectActionType.Heal,
        usesLevel: true,
      },
    ],
    priority: 10,
  },
  {
    id: 'lord-fire-save-disadvantage',
    name: 'Fire Weakness (Saves)',
    description: 'Disadvantage on all saves against fire',
    source: createBirthSignSource(BirthSignName.Lord),
    trigger: EffectTrigger.OnSavingThrow,
    conditions: [
      { type: EffectConditionType.DamageType, damageType: DamageType.Fire },
    ],
    actions: [
      {
        type: EffectActionType.GrantDisadvantage,
        advantageCount: 1,
      },
    ],
  },
  {
    id: 'lord-fire-damage-double',
    name: 'Fire Weakness (Damage)',
    description: 'Take double damage from fire',
    source: createBirthSignSource(BirthSignName.Lord),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.DamageType, damageType: DamageType.Fire },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        multiplier: 2.0,
      },
    ],
    priority: 5,
  },
]

// Atronach: 50% spell absorb, no natural regen
export const AtronachEffects: Effect[] = [
  {
    id: 'atronach-spell-absorb',
    name: 'Spell Absorption',
    description: '50% chance to absorb spell MP cost when targeted',
    source: createBirthSignSource(BirthSignName.Atronach),
    trigger: EffectTrigger.OnSpellTargeted,
    conditions: [
      { type: EffectConditionType.Random, chance: 50 },
    ],
    actions: [
      {
        type: EffectActionType.AbsorbSpellMP,
      },
    ],
  },
  {
    id: 'atronach-no-regen',
    name: 'Magicka Stagnation',
    description: 'Do not regenerate magicka naturally',
    source: createBirthSignSource(BirthSignName.Atronach),
    trigger: EffectTrigger.TurnStart,
    conditions: [],
    actions: [
      {
        type: EffectActionType.PreventAction,
        message: 'Natural MP regen prevented (Atronach Birth Sign)',
      },
    ],
    priority: 1,
  },
]

// Apprentice: Spell advantage/disadvantage
export const ApprenticeEffects: Effect[] = [
  {
    id: 'apprentice-spell-attack-advantage',
    name: 'Magical Affinity',
    description: 'Advantage on all spell attacks',
    source: createBirthSignSource(BirthSignName.Apprentice),
    trigger: EffectTrigger.OnSpellCast,
    conditions: [],
    actions: [
      {
        type: EffectActionType.GrantAdvantage,
        advantageCount: 1,
      },
    ],
  },
  {
    id: 'apprentice-spell-defense-disadvantage',
    name: 'Magical Vulnerability',
    description: 'Disadvantage on saves against spells',
    source: createBirthSignSource(BirthSignName.Apprentice),
    trigger: EffectTrigger.OnSpellTargeted,
    conditions: [],
    actions: [
      {
        type: EffectActionType.GrantDisadvantage,
        advantageCount: 1,
      },
    ],
  },
]

// Tower: Reflect damage on block
export const TowerEffects: Effect[] = [
  {
    id: 'tower-reflect-damage',
    name: 'Reflective Shield',
    description: 'Reflect damage equal to block margin on successful block',
    source: createBirthSignSource(BirthSignName.Tower),
    trigger: EffectTrigger.OnBlock,
    conditions: [],
    actions: [
      {
        type: EffectActionType.ReflectDamage,
      },
    ],
  },
]

// Serpent: Fortune gambling
export const SerpentEffects: Effect[] = [
  {
    id: 'serpent-fortune-gamble',
    name: "Serpent's Luck",
    description: 'Gamble fortune points on critical success',
    source: createBirthSignSource(BirthSignName.Serpent),
    trigger: EffectTrigger.OnCritical,
    conditions: [],
    actions: [
      {
        type: EffectActionType.LogMessage,
        message: "Serpent's Luck: You may gamble to keep the critical success",
      },
    ],
  },
]

// Empty arrays for signs with only typed benefits
export const RitualEffects: Effect[] = []
export const LoverEffects: Effect[] = []

// Master export
export const BirthSignEffects: Record<BirthSignName, Effect[]> = {
  [BirthSignName.Lord]: LordEffects,
  [BirthSignName.Atronach]: AtronachEffects,
  [BirthSignName.Apprentice]: ApprenticeEffects,
  [BirthSignName.Tower]: TowerEffects,
  [BirthSignName.Serpent]: SerpentEffects,
  [BirthSignName.Ritual]: RitualEffects,
  [BirthSignName.Lover]: LoverEffects,
  [BirthSignName.Lady]: [],
  [BirthSignName.Mage]: [],
  [BirthSignName.Shadow]: [],
  [BirthSignName.Steed]: [],
  [BirthSignName.Thief]: [],
  [BirthSignName.Warrior]: [],
}

export function getBirthSignEffects(birthSign: BirthSignName): Effect[] {
  return BirthSignEffects[birthSign] ?? []
}
