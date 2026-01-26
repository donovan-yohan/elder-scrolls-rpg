import type { PlayerData } from '$lib/models/player'
import { InitiativeSkills } from '$lib/data/skill'
import { rollD20, rollD6Advantage } from '$lib/util/dice.util'

export interface InitiativeModifiers {
  d6Count: number    // Number of d6 advantage dice (from major skills)
  flatBonus: number  // Flat bonus (from minor skills)
}

export interface InitiativeRollResult {
  d20Roll: number
  d6AdvantageRoll: number
  flatBonus: number
  total: number
}

/**
 * Get initiative modifiers for a player based on their skills
 * Major initiative skills grant +1 d6 advantage die each
 * Minor initiative skills grant +1 flat bonus each
 */
export function getPlayerInitiativeModifiers(player: PlayerData): InitiativeModifiers {
  let d6Count = 0
  let flatBonus = 0

  for (const skill of player.majorSkills) {
    if (InitiativeSkills.includes(skill)) {
      d6Count++
    }
  }

  for (const skill of player.minorSkills) {
    if (InitiativeSkills.includes(skill)) {
      flatBonus++
    }
  }

  return { d6Count, flatBonus }
}

/**
 * Calculate a player's initiative contribution
 * Rolls d20 + d6 advantage (from major skills) + flat bonus (from minor skills)
 */
export function calculatePlayerInitiativeContribution(
  modifiers: InitiativeModifiers
): InitiativeRollResult {
  const d20Roll = rollD20()
  const d6AdvantageRoll = rollD6Advantage(modifiers.d6Count)
  const { flatBonus } = modifiers
  const total = d20Roll + d6AdvantageRoll + flatBonus

  return {
    d20Roll,
    d6AdvantageRoll,
    flatBonus,
    total,
  }
}
