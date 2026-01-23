import { Level } from '$lib/data/level'
import type { DiceRoll, DiceRollBonus } from '$lib/models/combat'

/**
 * Roll a single d20
 */
function rollSingleD20(): number {
  return Math.floor(Math.random() * 20) + 1
}

/**
 * Roll d20 with advantage or disadvantage
 * @param advantageCount positive = advantage (roll multiple, take highest),
 *                       negative = disadvantage (roll multiple, take lowest),
 *                       0 = normal single roll
 */
export function rollD20(advantageCount: number = 0): number {
  if (advantageCount === 0) {
    return rollSingleD20()
  }

  const rolls: number[] = []
  const rollCount = Math.abs(advantageCount) + 1

  for (let i = 0; i < rollCount; i++) {
    rolls.push(rollSingleD20())
  }

  return advantageCount > 0 ? Math.max(...rolls) : Math.min(...rolls)
}

/**
 * Check if roll is a critical success based on player level
 * Level data has 'critical' field - roll >= critical is crit success
 */
export function isCriticalSuccess(roll: number, playerLevel: number): boolean {
  const levelData = Level[playerLevel]
  if (!levelData) return roll === 20
  return roll >= levelData.critical
}

/**
 * Check if roll is a critical failure based on player level
 * Level data has 'criticalFail' field - roll <= criticalFail is crit fail
 */
export function isCriticalFailure(roll: number, playerLevel: number): boolean {
  const levelData = Level[playerLevel]
  if (!levelData) return roll === 1
  return roll <= levelData.criticalFail
}

/**
 * Perform a skill check with bonuses against a target DC
 */
export function performSkillCheck(
  baseRoll: number,
  skillBonus: number,
  bonuses: DiceRollBonus[],
  targetDC: number,
  playerLevel: number,
  advantageCount: number = 0
): { roll: DiceRoll; success: boolean; margin: number } {
  const allBonuses: DiceRollBonus[] = [{ source: 'Skill', value: skillBonus }, ...bonuses]

  const total = baseRoll + allBonuses.reduce((sum, b) => sum + b.value, 0)

  const roll: DiceRoll = {
    baseRoll,
    bonuses: allBonuses,
    advantageCount,
    total,
    isCritical: isCriticalSuccess(baseRoll, playerLevel),
    isCriticalFail: isCriticalFailure(baseRoll, playerLevel),
  }

  return {
    roll,
    success: total >= targetDC || roll.isCritical,
    margin: total - targetDC,
  }
}

/**
 * Create a DiceRoll object from a manual d20 entry
 * Used when player rolls physical dice
 */
export function createManualRoll(
  manualValue: number,
  skillBonus: number,
  bonuses: DiceRollBonus[],
  playerLevel: number
): DiceRoll {
  const allBonuses: DiceRollBonus[] = [{ source: 'Skill', value: skillBonus }, ...bonuses]

  const total = manualValue + allBonuses.reduce((sum, b) => sum + b.value, 0)

  return {
    baseRoll: manualValue,
    bonuses: allBonuses,
    advantageCount: 0, // Manual entry doesn't track advantage
    total,
    isCritical: isCriticalSuccess(manualValue, playerLevel),
    isCriticalFail: isCriticalFailure(manualValue, playerLevel),
  }
}

/**
 * Calculate total bonus from array of bonuses
 */
export function calculateTotalBonus(bonuses: DiceRollBonus[]): number {
  return bonuses.reduce((sum, b) => sum + b.value, 0)
}
