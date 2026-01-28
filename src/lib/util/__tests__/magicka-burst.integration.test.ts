import { describe, it, expect, beforeEach } from 'vitest'
import { combatStore } from '$lib/stores/combat.store'

describe('Magicka Burst Integration', () => {
  const playerId = 'test-player'

  beforeEach(() => {
    combatStore.endCombat(playerId)
    combatStore.startCombat(playerId, 10, 5, {
      health: 20,
      magicka: 10,
      maxActionPoints: 4,
    })
  })

  it('spends MP when using magicka burst', () => {
    const before = combatStore.getSession(playerId)
    expect(before?.currentMP).toBe(10)

    combatStore.spendMP(playerId, 1)

    const after = combatStore.getSession(playerId)
    expect(after?.currentMP).toBe(9)
  })

  it('takes burn damage when using magicka burst with 0 MP', () => {
    // Drain all MP first
    combatStore.spendMP(playerId, 10)
    const beforeBurn = combatStore.getSession(playerId)
    expect(beforeBurn?.currentMP).toBe(0)
    expect(beforeBurn?.currentHP).toBe(20)

    combatStore.takeMagickaBurnDamage(playerId)

    const afterBurn = combatStore.getSession(playerId)
    expect(afterBurn?.currentHP).toBe(19)
  })

  it('logs magicka burst usage', () => {
    combatStore.logMagickaBurst(playerId, false, false)

    const session = combatStore.getSession(playerId)
    const lastLog = session?.log[session.log.length - 1]
    expect(lastLog?.description).toContain('Magicka Burst')
  })

  it('logs magicka burst with misfortune', () => {
    combatStore.logMagickaBurst(playerId, false, true)

    const session = combatStore.getSession(playerId)
    const lastLog = session?.log[session.log.length - 1]
    expect(lastLog?.description).toContain('Misfortune accepted')
  })

  it('logs magicka burst with burn damage', () => {
    combatStore.logMagickaBurst(playerId, true, false)

    const session = combatStore.getSession(playerId)
    const lastLog = session?.log[session.log.length - 1]
    expect(lastLog?.description).toContain('burn damage')
  })

  it('logs burn damage in combat log', () => {
    combatStore.takeMagickaBurnDamage(playerId)

    const session = combatStore.getSession(playerId)
    const damageLog = session?.log.find(l => l.description.includes('magicka burn damage'))
    expect(damageLog).toBeDefined()
    expect(damageLog?.damage).toBe(1)
  })

  it('does not reduce HP below 0 on burn damage', () => {
    // Set HP to 1 and drain all MP
    combatStore.takeDamage(playerId, 19) // HP is now 1
    combatStore.spendMP(playerId, 10) // MP is now 0

    const beforeBurn = combatStore.getSession(playerId)
    expect(beforeBurn?.currentHP).toBe(1)
    expect(beforeBurn?.currentMP).toBe(0)

    combatStore.takeMagickaBurnDamage(playerId)

    const afterBurn = combatStore.getSession(playerId)
    expect(afterBurn?.currentHP).toBe(0) // HP goes to 0, not negative
  })
})
