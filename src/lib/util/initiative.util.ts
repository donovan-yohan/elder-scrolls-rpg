import type { PlayerData } from '$lib/models/player'
import { InitiativeSkills, type Skill } from '$lib/data/skill'
import { rollD20, rollD6AdvantageWithDetails } from '$lib/util/dice.util'

export interface InitiativeModifiers {
  d6Count: number    // Number of d6 advantage dice (from major skills)
  flatBonus: number  // Flat bonus (from minor skills)
  d6Skills: Skill[]      // Skills contributing d6 advantage dice
  flatBonusSkills: Skill[] // Skills contributing flat bonus
}

export interface InitiativeRollResult {
  d20Roll: number
  d6Rolls: number[]        // Individual d6 results
  d6AdvantageRoll: number  // Highest of d6Rolls (or 0 if none)
  flatBonus: number
  total: number
}

/**
 * Get initiative modifiers for a player based on their skills
 * Major initiative skills grant +1 d6 advantage die each
 * Minor initiative skills grant +1 flat bonus each
 */
export function getPlayerInitiativeModifiers(player: PlayerData): InitiativeModifiers {
  const d6Skills: Skill[] = []
  const flatBonusSkills: Skill[] = []

  for (const skill of player.majorSkills) {
    if (InitiativeSkills.includes(skill)) {
      d6Skills.push(skill)
    }
  }

  for (const skill of player.minorSkills) {
    if (InitiativeSkills.includes(skill)) {
      flatBonusSkills.push(skill)
    }
  }

  return {
    d6Count: d6Skills.length,
    flatBonus: flatBonusSkills.length,
    d6Skills,
    flatBonusSkills,
  }
}

/**
 * Calculate a player's initiative contribution
 * Rolls d20 + d6 advantage (from major skills) + flat bonus (from minor skills)
 */
export function calculatePlayerInitiativeContribution(
  modifiers: InitiativeModifiers
): InitiativeRollResult {
  const d20Roll = rollD20()
  const d6Details = rollD6AdvantageWithDetails(modifiers.d6Count)
  const { flatBonus } = modifiers
  const total = d20Roll + d6Details.highest + flatBonus

  return {
    d20Roll,
    d6Rolls: d6Details.rolls,
    d6AdvantageRoll: d6Details.highest,
    flatBonus,
    total,
  }
}

/**
 * Calculate initiative from manually entered dice values
 */
export function calculateManualInitiative(
  d20Value: number,
  d6Values: number[],
  flatBonus: number
): InitiativeRollResult {
  const d6AdvantageRoll = d6Values.length > 0 ? Math.max(...d6Values) : 0
  const total = d20Value + d6AdvantageRoll + flatBonus

  return {
    d20Roll: d20Value,
    d6Rolls: d6Values,
    d6AdvantageRoll,
    flatBonus,
    total,
  }
}

/**
 * Converts a roll total to initiative successes per Combat 2.0 rules
 * - Roll 13+ = 1 success
 * - Roll 20+ = 2 successes
 * - Roll 30+ = 3 successes
 * - Critical = +1 extra success
 */
export function rollToSuccesses(rollTotal: number, isCritical: boolean = false): number {
  let successes = 0
  if (rollTotal >= 30) successes = 3
  else if (rollTotal >= 20) successes = 2
  else if (rollTotal >= 13) successes = 1

  if (isCritical) successes += 1
  return successes
}
