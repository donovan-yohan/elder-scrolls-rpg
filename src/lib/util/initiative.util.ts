import type { PlayerData } from '$lib/models/player'
import type { Skill } from '$lib/data/skill'
import { Level } from '$lib/data/level'

export interface InitiativeSkillInfo {
  skill: Skill
  isMajor: boolean
  isMinor: boolean
  advantageCount: number  // 1 for major skills, 0 otherwise
  flatBonus: number       // Level-based bonus for minor skills
}

/**
 * Get initiative skill information for a player
 * Major skills get advantage, minor skills get flat bonus
 */
export function getInitiativeSkills(player: PlayerData): InitiativeSkillInfo[] {
  const levelData = Level[player.level]
  const majorBonus = levelData?.majorSkillBonus ?? 0
  const minorBonus = levelData?.minorSkillBonus ?? 0

  const result: InitiativeSkillInfo[] = []

  // Add major skills
  for (const skill of player.majorSkills) {
    result.push({
      skill,
      isMajor: true,
      isMinor: false,
      advantageCount: 1,  // Major skills roll with advantage
      flatBonus: majorBonus
    })
  }

  // Add minor skills
  for (const skill of player.minorSkills) {
    result.push({
      skill,
      isMajor: false,
      isMinor: true,
      advantageCount: 0,
      flatBonus: minorBonus
    })
  }

  return result
}

/**
 * Calculate initiative successes from a single skill roll total
 * 13-19 = 1 success, 20-29 = 2 successes, 30+ = 3 successes
 */
export function calculateSuccessesFromRoll(rollTotal: number): number {
  if (rollTotal >= 30) return 3
  if (rollTotal >= 20) return 2
  if (rollTotal >= 13) return 1
  return 0
}

/**
 * Calculate total initiative contribution from skill rolls
 * @param rollResults Array of {total, isCritical} for each skill rolled
 */
export function calculateInitiativeContribution(
  rollResults: { total: number; isCritical: boolean }[]
): number {
  let totalSuccesses = 0

  for (const result of rollResults) {
    totalSuccesses += calculateSuccessesFromRoll(result.total)

    // Critical hit adds +1 bonus success
    if (result.isCritical) {
      totalSuccesses += 1
    }
  }

  return totalSuccesses
}

/**
 * Get the skill bonus for a specific skill based on player's skill levels
 */
export function getSkillBonus(player: PlayerData, skill: Skill): number {
  const levelData = Level[player.level]
  if (!levelData) return 0

  if (player.majorSkills.includes(skill)) {
    return levelData.majorSkillBonus
  }
  if (player.minorSkills.includes(skill)) {
    return levelData.minorSkillBonus
  }
  return 0  // Untrained
}
