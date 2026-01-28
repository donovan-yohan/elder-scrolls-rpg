import { describe, it, expect } from 'vitest'
import { rollToSuccesses } from './initiative.util'

describe('rollToSuccesses', () => {
  it('returns 0 for rolls below 13', () => {
    expect(rollToSuccesses(12)).toBe(0)
    expect(rollToSuccesses(1)).toBe(0)
    expect(rollToSuccesses(0)).toBe(0)
  })

  it('returns 1 for rolls 13-19', () => {
    expect(rollToSuccesses(13)).toBe(1)
    expect(rollToSuccesses(15)).toBe(1)
    expect(rollToSuccesses(19)).toBe(1)
  })

  it('returns 2 for rolls 20-29', () => {
    expect(rollToSuccesses(20)).toBe(2)
    expect(rollToSuccesses(25)).toBe(2)
    expect(rollToSuccesses(29)).toBe(2)
  })

  it('returns 3 for rolls 30+', () => {
    expect(rollToSuccesses(30)).toBe(3)
    expect(rollToSuccesses(35)).toBe(3)
    expect(rollToSuccesses(100)).toBe(3)
  })

  it('adds 1 for critical', () => {
    expect(rollToSuccesses(12, true)).toBe(1) // 0 + 1 = 1
    expect(rollToSuccesses(13, true)).toBe(2) // 1 + 1 = 2
    expect(rollToSuccesses(20, true)).toBe(3) // 2 + 1 = 3
    expect(rollToSuccesses(30, true)).toBe(4) // 3 + 1 = 4
  })

  it('defaults isCritical to false', () => {
    expect(rollToSuccesses(13)).toBe(1)
    expect(rollToSuccesses(13, false)).toBe(1)
  })
})
