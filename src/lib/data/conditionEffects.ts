// src/lib/data/conditionEffects.ts
import { ConditionType } from '$lib/models/combat'
import { DamageType } from './element'
import {
  EffectTrigger,
  EffectConditionType,
  EffectActionType,
  EffectSourceType,
  type Effect,
  type EffectSource,
} from '$lib/models/effect'

function createConditionSource(type: ConditionType | string, level?: number): EffectSource {
  return {
    type: EffectSourceType.Condition,
    id: String(type),
    name: level ? `${type} (Level ${level})` : String(type),
  }
}

// Burning damage by level: 1/3/6/10
const BURNING_DAMAGE = [0, 1, 3, 6, 10]

export function createBurningEffects(level: number): Effect[] {
  const damage = BURNING_DAMAGE[Math.min(level, 4)] ?? 10
  return [
    {
      id: `burning-dot-${level}`,
      name: 'Burning',
      description: `Take ${damage} fire damage at start of turn`,
      source: createConditionSource(ConditionType.Burning, level),
      trigger: EffectTrigger.TurnStart,
      conditions: [
        { type: EffectConditionType.HasCondition, conditionType: ConditionType.Burning },
      ],
      actions: [
        {
          type: EffectActionType.Damage,
          value: damage,
          damageType: DamageType.Fire,
        },
      ],
      priority: 5,
    },
  ]
}

// Slowed AP reduction: 25%/50%/75%/100%
const SLOWED_AP_MULTIPLIER = [1, 0.75, 0.5, 0.25, 0]

export function createSlowedEffects(level: number): Effect[] {
  const multiplier = SLOWED_AP_MULTIPLIER[Math.min(level, 4)] ?? 0
  return [
    {
      id: `slowed-ap-${level}`,
      name: 'Slowed',
      description: `AP reduced to ${multiplier * 100}%`,
      source: createConditionSource(ConditionType.Slowed, level),
      trigger: EffectTrigger.TurnStart,
      conditions: [
        { type: EffectConditionType.HasCondition, conditionType: ConditionType.Slowed },
      ],
      actions: [
        {
          type: EffectActionType.ModifyAP,
          multiplier,
        },
        {
          type: EffectActionType.ModifyMovementCost,
          multiplier: 2,
        },
      ],
      priority: 3,
    },
  ]
}

// Wet: 2x cold damage, 0.5x fire damage
export const WetEffects: Effect[] = [
  {
    id: 'wet-cold-vulnerability',
    name: 'Wet (Cold Vulnerability)',
    description: 'Take double cold/electric damage while wet',
    source: createConditionSource(ConditionType.Wet),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Wet },
      { type: EffectConditionType.DamageType, damageType: DamageType.Frost },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        multiplier: 2,
      },
    ],
    priority: 5,
  },
  {
    id: 'wet-fire-resist',
    name: 'Wet (Fire Resistance)',
    description: 'Take half fire damage while wet',
    source: createConditionSource(ConditionType.Wet),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Wet },
      { type: EffectConditionType.DamageType, damageType: DamageType.Fire },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        multiplier: 0.5,
      },
    ],
    priority: 5,
  },
]

// Prone: 3x movement cost, melee vulnerability
export const ProneEffects: Effect[] = [
  {
    id: 'prone-movement-penalty',
    name: 'Prone (Movement)',
    description: 'Movement costs tripled while prone',
    source: createConditionSource(ConditionType.Prone),
    trigger: EffectTrigger.TurnStart,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Prone },
    ],
    actions: [
      {
        type: EffectActionType.ModifyMovementCost,
        multiplier: 3,
      },
    ],
  },
  {
    id: 'prone-melee-vulnerability',
    name: 'Prone (Melee Vulnerability)',
    description: 'Melee attacks against you have +2 advantage',
    source: createConditionSource(ConditionType.Prone),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Prone },
    ],
    actions: [
      {
        type: EffectActionType.LogMessage,
        message: 'Attacker gains +2 advantage (target is Prone)',
      },
    ],
  },
]

// Frozen: Slowed 4 + 3x bludgeon damage
export const FrozenEffects: Effect[] = [
  {
    id: 'frozen-paralysis',
    name: 'Frozen (Paralysis)',
    description: 'Receive Slowed 4 while frozen',
    source: createConditionSource(ConditionType.Frozen),
    trigger: EffectTrigger.TurnStart,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Frozen },
    ],
    actions: [
      {
        type: EffectActionType.ApplyCondition,
        conditionType: ConditionType.Slowed,
        conditionLevel: 4,
      },
    ],
    priority: 2,
  },
  {
    id: 'frozen-bludgeon-vulnerability',
    name: 'Frozen (Shatter)',
    description: 'Take triple bludgeoning damage while frozen',
    source: createConditionSource(ConditionType.Frozen),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Frozen },
      { type: EffectConditionType.DamageType, damageType: 'Bludgeoning' },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        multiplier: 3,
      },
    ],
    priority: 5,
  },
]

// Lookup function
export function getConditionEffects(type: ConditionType | string, level?: number): Effect[] {
  switch (type) {
    case ConditionType.Burning:
      return createBurningEffects(level ?? 1)
    case ConditionType.Slowed:
      return createSlowedEffects(level ?? 1)
    case ConditionType.Wet:
      return WetEffects
    case ConditionType.Prone:
      return ProneEffects
    case ConditionType.Frozen:
      return FrozenEffects
    default:
      return []
  }
}
