import { describe, it, expect } from 'vitest'
import { getCritFailConsequences } from './criticalFail.util'

describe('criticalFail.util', () => {
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
