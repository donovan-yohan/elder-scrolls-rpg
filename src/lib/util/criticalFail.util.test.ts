import { describe, it, expect } from 'vitest'
import type { DiceRoll } from '$lib/models/combat'
import { shouldShowCritFailModal, getCritFailConsequences } from './criticalFail.util'

describe('criticalFail.util', () => {
	describe('shouldShowCritFailModal', () => {
		it('should return true for critical failure roll', () => {
			const roll: DiceRoll = {
				baseRoll: 1,
				bonuses: [],
				advantageCount: 0,
				total: 5,
				isCritical: false,
				isCriticalFail: true,
			}
			expect(shouldShowCritFailModal(roll)).toBe(true)
		})

		it('should return false for normal roll', () => {
			const roll: DiceRoll = {
				baseRoll: 10,
				bonuses: [],
				advantageCount: 0,
				total: 14,
				isCritical: false,
				isCriticalFail: false,
			}
			expect(shouldShowCritFailModal(roll)).toBe(false)
		})

		it('should return false for critical success', () => {
			const roll: DiceRoll = {
				baseRoll: 20,
				bonuses: [],
				advantageCount: 0,
				total: 24,
				isCritical: true,
				isCriticalFail: false,
			}
			expect(shouldShowCritFailModal(roll)).toBe(false)
		})
	})

	describe('getCritFailConsequences', () => {
		it('should return attack consequences for attack context', () => {
			const result = getCritFailConsequences('attack')
			expect(result.acceptConsequences).toContain('damage')
			expect(result.storedConsequences).toContain('miss')
		})

		it('should return spell consequences for spell context', () => {
			const result = getCritFailConsequences('spell')
			expect(result.acceptConsequences).toContain('fizzle')
		})

		it('should return dodge consequences for dodge context', () => {
			const result = getCritFailConsequences('dodge')
			expect(result.acceptConsequences).toContain('disoriented')
		})

		it('should return generic consequences for unknown context', () => {
			const result = getCritFailConsequences('unknown')
			expect(result.acceptConsequences).toBeDefined()
			expect(result.storedConsequences).toBeDefined()
		})
	})
})
