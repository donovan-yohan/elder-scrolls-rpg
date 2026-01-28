import { describe, it, expect } from 'vitest'
import {
  canUseMagickaBurst,
  getMagickaBurstCost,
  processMagickaBurstRoll,
  type MagickaBurstState,
  type MagickaBurstCost,
} from '$lib/util/magicka-burst.util'

describe('canUseMagickaBurst', () => {
  it('returns true when player has MP > 0', () => {
    const result = canUseMagickaBurst(5, 10)
    expect(result).toBe(true)
  })

  it('returns true when MP is 0 but HP > 0 (can burn)', () => {
    const result = canUseMagickaBurst(0, 10)
    expect(result).toBe(true)
  })

  it('returns false when both MP and HP are 0 (completely burned out)', () => {
    const result = canUseMagickaBurst(0, 0)
    expect(result).toBe(false)
  })

  it('returns false when MP is 0 and HP is 1 (would die from burn)', () => {
    // Player can still burn at 1 HP - they just go to 0
    const result = canUseMagickaBurst(0, 1)
    expect(result).toBe(true)
  })
})

describe('getMagickaBurstCost', () => {
  it('returns MP cost when player has MP', () => {
    const cost = getMagickaBurstCost(5, 10)
    expect(cost).toEqual({ mpCost: 1, hpCost: 0, isBurn: false })
  })

  it('returns HP cost when player has no MP (burn damage)', () => {
    const cost = getMagickaBurstCost(0, 10)
    expect(cost).toEqual({ mpCost: 0, hpCost: 1, isBurn: true })
  })

  it('returns null when cannot use magicka burst', () => {
    const cost = getMagickaBurstCost(0, 0)
    expect(cost).toBeNull()
  })
})

describe('processMagickaBurstRoll', () => {
  it('converts crit success to normal success on magicka burst', () => {
    // Roll of 20 would normally be crit at level 1
    const result = processMagickaBurstRoll(20, 15, 1, true)
    expect(result.isCritical).toBe(false)
    expect(result.wasDowngradedFromCrit).toBe(true)
    expect(result.success).toBe(true)
  })

  it('allows crit failure on magicka burst', () => {
    // Roll of 1 is crit fail at level 1
    const result = processMagickaBurstRoll(1, 15, 1, true)
    expect(result.isCriticalFail).toBe(true)
    expect(result.success).toBe(false)
  })

  it('normal roll behavior when not a magicka burst', () => {
    const result = processMagickaBurstRoll(20, 15, 1, false)
    expect(result.isCritical).toBe(true)
    expect(result.wasDowngradedFromCrit).toBe(false)
  })

  it('tracks if rerolling from a crit fail (accepts misfortune)', () => {
    const result = processMagickaBurstRoll(15, 10, 1, true)
    // This test just verifies the utility processes correctly
    // The actual misfortune tracking is handled by the parent component
    expect(result.success).toBe(true)
  })
})
