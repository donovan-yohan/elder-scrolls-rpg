import type { PlayerData } from './player'
import type { CombatSession, DiceRoll } from './combat'

// EffectTrigger enum - when effects fire
export enum EffectTrigger {
  TurnStart = 'TurnStart',
  TurnEnd = 'TurnEnd',
  OnDamageTaken = 'OnDamageTaken',
  OnDamageDealt = 'OnDamageDealt',
  OnSavingThrow = 'OnSavingThrow',
  OnSkillCheck = 'OnSkillCheck',
  OnAttack = 'OnAttack',
  OnSpellCast = 'OnSpellCast',
  OnSpellTargeted = 'OnSpellTargeted',
  OnBlock = 'OnBlock',
  OnDodge = 'OnDodge',
  OnConcentrationCheck = 'OnConcentrationCheck',
  OnDeath = 'OnDeath',
  OnCritical = 'OnCritical',
  OnCriticalFail = 'OnCriticalFail',
}

// EffectConditionType enum - prerequisites for effect activation
export enum EffectConditionType {
  Always = 'Always',
  MagickaFull = 'MagickaFull',
  MagickaEmpty = 'MagickaEmpty',
  HealthBelow = 'HealthBelow',
  HealthAbove = 'HealthAbove',
  HasCondition = 'HasCondition',
  LacksCondition = 'LacksCondition',
  DamageType = 'DamageType',
  SkillType = 'SkillType',
  SpellSchool = 'SpellSchool',
  WeaponType = 'WeaponType',
  IsConcentrating = 'IsConcentrating',
  Random = 'Random',
}

// EffectActionType enum - what happens when effect triggers
export enum EffectActionType {
  Heal = 'Heal',
  Damage = 'Damage',
  RestoreMP = 'RestoreMP',
  DrainMP = 'DrainMP',
  ModifyAP = 'ModifyAP',
  ModifyIncomingDamage = 'ModifyIncomingDamage',
  ModifyOutgoingDamage = 'ModifyOutgoingDamage',
  GrantAdvantage = 'GrantAdvantage',
  GrantDisadvantage = 'GrantDisadvantage',
  ApplyCondition = 'ApplyCondition',
  RemoveCondition = 'RemoveCondition',
  AbsorbSpellMP = 'AbsorbSpellMP',
  ReflectDamage = 'ReflectDamage',
  ModifyMovementCost = 'ModifyMovementCost',
  PreventAction = 'PreventAction',
  LogMessage = 'LogMessage',
}

// EffectSourceType enum - where effects come from
export enum EffectSourceType {
  BirthSign = 'BirthSign',
  Race = 'Race',
  Condition = 'Condition',
  Spell = 'Spell',
  Equipment = 'Equipment',
  Item = 'Item',
  Ability = 'Ability',
}

// EffectCondition interface
export interface EffectCondition {
  type: EffectConditionType
  threshold?: number // For HealthBelow/Above (percentage 0-100)
  conditionType?: string // For HasCondition/LacksCondition
  damageType?: string // For DamageType (Element value)
  skillType?: string // For SkillType (Skill value)
  spellSchool?: string // For SpellSchool
  weaponType?: string // For WeaponType
  chance?: number // For Random (0-100 percentage)
}

// EffectAction interface
export interface EffectAction {
  type: EffectActionType
  value?: number // Flat amount for Heal, Damage, etc.
  multiplier?: number // For ModifyDamage (2.0 = double)
  usesLevel?: boolean // If true, value = player level
  conditionType?: string // For ApplyCondition/RemoveCondition
  conditionLevel?: number // Level to apply
  conditionDuration?: number // Duration in rounds
  damageType?: string // Element type for damage
  advantageCount?: number // Number of advantage/disadvantage dice
  skillType?: string // For skill-specific effects
  message?: string // For LogMessage
}

// EffectSource interface - tracks where effect came from
export interface EffectSource {
  type: EffectSourceType
  id: string // e.g., 'lord', 'nord', 'burning'
  name: string // Human-readable: "Lord Birth Sign"
}

// Effect interface - the main effect definition
export interface Effect {
  id: string
  name: string
  description: string
  source: EffectSource
  trigger: EffectTrigger
  conditions: EffectCondition[] // All must be true (AND logic)
  actions: EffectAction[]
  priority?: number // Lower = executes first
}

// EffectContext - runtime context for effect evaluation
export interface EffectContext {
  player: PlayerData
  session: CombatSession
  damageAmount?: number
  damageType?: string
  healAmount?: number
  skill?: string
  spellId?: string
  spellMPCost?: number
  attackRoll?: DiceRoll
  isCritical?: boolean
  weaponId?: string
  blockMargin?: number
}

// ActionResult - result of processing one action
export interface ActionResult {
  action: EffectAction
  applied: boolean
  value?: number
  message: string
}

// EffectResult - result of processing one effect
export interface EffectResult {
  effect: Effect
  success: boolean
  actions: ActionResult[]
}
