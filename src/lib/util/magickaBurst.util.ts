import { isCriticalSuccess, isCriticalFailure } from './dice.util'

export interface MagickaBurstState {
  isActive: boolean
  previousRollWasCritFail: boolean
  misfortuneAccepted: boolean
}

export interface MagickaBurstCost {
  mpCost: number
  hpCost: number
  isBurn: boolean
}

export interface MagickaBurstRollResult {
  isCritical: boolean
  isCriticalFail: boolean
  success: boolean
  wasDowngradedFromCrit: boolean
}

/**
 * Check if player can use Magicka Burst to reroll
 * Requires either MP > 0 or HP > 0 (to take burn damage)
 * Cannot reroll if completely burned out (HP = 0)
 */
export function canUseMagickaBurst(currentMP: number, currentHP: number): boolean {
  return currentMP > 0 || currentHP > 0
}

/**
 * Get the cost of using Magicka Burst
 * Returns MP cost if available, otherwise HP cost (burn damage)
 */
export function getMagickaBurstCost(
  currentMP: number,
  currentHP: number
): MagickaBurstCost | null {
  if (!canUseMagickaBurst(currentMP, currentHP)) {
    return null
  }

  if (currentMP > 0) {
    return { mpCost: 1, hpCost: 0, isBurn: false }
  }

  // No MP - take burn damage
  return { mpCost: 0, hpCost: 1, isBurn: true }
}

/**
 * Process a roll that was made via Magicka Burst
 * - Downgrades critical successes to normal successes
 * - Critical failures are still allowed
 */
export function processMagickaBurstRoll(
  roll: number,
  targetDC: number,
  playerLevel: number,
  isMagickaBurst: boolean
): MagickaBurstRollResult {
  const wouldBeCrit = isCriticalSuccess(roll, playerLevel)
  const isCritFail = isCriticalFailure(roll, playerLevel)

  if (isMagickaBurst) {
    return {
      isCritical: false,
      isCriticalFail: isCritFail,
      success: roll >= targetDC,
      wasDowngradedFromCrit: wouldBeCrit,
    }
  }

  return {
    isCritical: wouldBeCrit,
    isCriticalFail: isCritFail,
    success: roll >= targetDC || wouldBeCrit,
    wasDowngradedFromCrit: false,
  }
}

/**
 * Create initial magicka burst state
 */
export function createMagickaBurstState(): MagickaBurstState {
  return {
    isActive: false,
    previousRollWasCritFail: false,
    misfortuneAccepted: false,
  }
}
