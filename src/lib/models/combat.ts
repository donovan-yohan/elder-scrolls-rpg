import type { Equipment } from './player'

export enum CombatDistance {
  Immediate = 'Immediate', // Same space
  Adjacent = 'Adjacent', // 1-5 feet
  Close = 'Close', // 6-10 feet
  Short = 'Short', // 11-25 feet
  Medium = 'Medium', // 26-50 feet
  Long = 'Long', // 51-100 feet
  Extreme = 'Extreme', // 100+ feet
}

export enum ActionType {
  Attack = 'Attack',
  CastSpell = 'CastSpell',
  Move = 'Move',
  SwapWeapon = 'SwapWeapon',
  Heft = 'Heft', // Ready shield
  Limber = 'Limber', // Unready shield
  Resteady = 'Resteady', // Re-ready two-handed weapon
  UseItem = 'UseItem',
  Dodge = 'Dodge',
  Block = 'Block',
}

export enum ReactionType {
  Block = 'Block',
  Dodge = 'Dodge',
}

export enum ConditionType {
  Stunned = 'Stunned',
  Prone = 'Prone',
  Grappled = 'Grappled',
  Frightened = 'Frightened',
  Poisoned = 'Poisoned',
  Burning = 'Burning',
  Frozen = 'Frozen',
  Bleeding = 'Bleeding',
  Concentrating = 'Concentrating',
  Chilled = 'Chilled',
  Slowed = 'Slowed',
  Alacrity = 'Alacrity',
  Wet = 'Wet',
  Flying = 'Flying',
  Concealment = 'Concealment',
  Blindness = 'Blindness',
  Slowfall = 'Slowfall',
  Encumbrance = 'Encumbrance',
  Sickened = 'Sickened',
  SoulTrapped = 'SoulTrapped',
}

export interface DiceRollBonus {
  source: string
  value: number
}

export interface DiceRoll {
  baseRoll: number
  bonuses: DiceRollBonus[]
  advantageCount: number // positive = advantage, negative = disadvantage
  total: number
  isCritical: boolean
  isCriticalFail: boolean
}

export type CombatLogEntryType = 'action' | 'damage' | 'healing' | 'condition' | 'turn' | 'initiative' | 'system'

export interface CombatLogEntry {
  id: string
  timestamp: string
  type: CombatLogEntryType
  description: string
  roll?: DiceRoll
  damage?: number
  healing?: number
  actor?: string
  target?: string
}

export interface ActiveCondition {
  type: ConditionType
  level?: number // For conditions with levels/intensity
  duration?: number // Rounds remaining, undefined = permanent until removed
  source?: string // What caused this condition
}

export interface InitiativePool {
  current: number
  max: number
}

export interface CombatSession {
  id: string
  playerId: string
  round: number
  isPlayerTurn: boolean
  partyInitiativePool: InitiativePool
  enemyInitiativePool: InitiativePool
  currentHP: number
  currentMP: number
  currentAP: number
  maxAP: number
  currentSpiritPoints: number
  maxSpiritPoints: number
  conditions: ActiveCondition[]
  log: CombatLogEntry[]
  distance: CombatDistance
  concentrationSpellId?: string
  isConcentrationBroken: boolean
  combatEquipment: Equipment
}

export function createCombatLogEntry(
  type: CombatLogEntryType,
  description: string,
  extra?: Partial<Omit<CombatLogEntry, 'id' | 'timestamp' | 'type' | 'description'>>
): CombatLogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    description,
    ...extra,
  }
}
