import { describe, it, expect } from 'vitest'
import { calculateMaxSpiritPoints } from './spiritPoints.util'

describe('Spirit Points Utility', () => {
	describe('calculateMaxSpiritPoints', () => {
		it('should return 1 for level 1', () => {
			expect(calculateMaxSpiritPoints(1)).toBe(1)
		})

		it('should return 1 for levels 1-4 (minimum is 1)', () => {
			expect(calculateMaxSpiritPoints(1)).toBe(1)
			expect(calculateMaxSpiritPoints(2)).toBe(1)
			expect(calculateMaxSpiritPoints(3)).toBe(1)
			expect(calculateMaxSpiritPoints(4)).toBe(1)
		})

		it('should return 1 for levels 5-7 (floor of 5/4 = 1)', () => {
			expect(calculateMaxSpiritPoints(5)).toBe(1)
			expect(calculateMaxSpiritPoints(6)).toBe(1)
			expect(calculateMaxSpiritPoints(7)).toBe(1)
		})

		it('should return 2 for levels 8-11', () => {
			expect(calculateMaxSpiritPoints(8)).toBe(2)
			expect(calculateMaxSpiritPoints(9)).toBe(2)
			expect(calculateMaxSpiritPoints(10)).toBe(2)
			expect(calculateMaxSpiritPoints(11)).toBe(2)
		})

		it('should return 3 for levels 12-15', () => {
			expect(calculateMaxSpiritPoints(12)).toBe(3)
			expect(calculateMaxSpiritPoints(13)).toBe(3)
			expect(calculateMaxSpiritPoints(14)).toBe(3)
			expect(calculateMaxSpiritPoints(15)).toBe(3)
		})

		it('should return 4 for levels 16-19', () => {
			expect(calculateMaxSpiritPoints(16)).toBe(4)
			expect(calculateMaxSpiritPoints(17)).toBe(4)
			expect(calculateMaxSpiritPoints(18)).toBe(4)
			expect(calculateMaxSpiritPoints(19)).toBe(4)
		})

		it('should return 5 for level 20', () => {
			expect(calculateMaxSpiritPoints(20)).toBe(5)
		})

		it('should handle edge case of level 0 (return minimum 1)', () => {
			expect(calculateMaxSpiritPoints(0)).toBe(1)
		})
	})
})
