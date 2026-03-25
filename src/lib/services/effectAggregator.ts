// src/lib/services/effectAggregator.ts
import type { PlayerData } from '$lib/models/player'
import type { CombatSession } from '$lib/models/combat'
import type { Effect, EffectContext, EffectResult } from '$lib/models/effect'
import { EffectTrigger } from '$lib/models/effect'
import { getBirthSignEffects } from '$lib/data/birthSignEffects'
import { getRaceEffects } from '$lib/data/raceEffects'
import { getConditionEffects } from '$lib/data/conditionEffects'
import { getEffectsForTrigger, processEffects } from '$lib/util/effect.util'

// Collect all effects applicable to a player
export function getPlayerEffects(player: PlayerData, session: CombatSession): Effect[] {
  const effects: Effect[] = []

  // Birth sign effects
  if (player.birthSign) {
    effects.push(...getBirthSignEffects(player.birthSign))
  }

  // Race effects
  if (player.race) {
    effects.push(...getRaceEffects(player.race))
  }

  // Condition effects from active conditions
  for (const condition of session.conditions) {
    effects.push(...getConditionEffects(condition.type, condition.level))
  }

  // TODO: Equipment effects
  // TODO: Spell buff effects

  return effects
}

// Effect execution functions
export function executeTurnStartEffects(
  player: PlayerData,
  session: CombatSession
): EffectResult[] {
  const effects = getEffectsForTrigger(getPlayerEffects(player, session), EffectTrigger.TurnStart)
  const context: EffectContext = { player, session }
  return processEffects(effects, context)
}

export function executeTurnEndEffects(
  player: PlayerData,
  session: CombatSession
): EffectResult[] {
  const effects = getEffectsForTrigger(getPlayerEffects(player, session), EffectTrigger.TurnEnd)
  const context: EffectContext = { player, session }
  return processEffects(effects, context)
}

export function executeDamageTakenEffects(
  player: PlayerData,
  session: CombatSession,
  damageAmount: number,
  damageType?: string
): EffectResult[] {
  const effects = getEffectsForTrigger(getPlayerEffects(player, session), EffectTrigger.OnDamageTaken)
  const context: EffectContext = { player, session, damageAmount, damageType }
  return processEffects(effects, context)
}

export function executeSpellTargetedEffects(
  player: PlayerData,
  session: CombatSession,
  spellId: string,
  spellMPCost: number
): EffectResult[] {
  const effects = getEffectsForTrigger(getPlayerEffects(player, session), EffectTrigger.OnSpellTargeted)
  const context: EffectContext = { player, session, spellId, spellMPCost }
  return processEffects(effects, context)
}

export function executeBlockEffects(
  player: PlayerData,
  session: CombatSession,
  blockMargin: number
): EffectResult[] {
  const effects = getEffectsForTrigger(getPlayerEffects(player, session), EffectTrigger.OnBlock)
  const context: EffectContext = { player, session, blockMargin }
  return processEffects(effects, context)
}

export function executeSkillCheckEffects(
  player: PlayerData,
  session: CombatSession,
  skill: string
): EffectResult[] {
  const effects = getEffectsForTrigger(getPlayerEffects(player, session), EffectTrigger.OnSkillCheck)
  const context: EffectContext = { player, session, skill }
  return processEffects(effects, context)
}
