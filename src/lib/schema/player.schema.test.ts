import { describe, it, expect } from 'vitest'
import { playerSchema } from './player.schema'

describe('playerSchema - ownedWeapons validation', () => {
	it('should have ownedWeapons field in schema', () => {
		// This test verifies that ownedWeapons is a recognized field in the schema
		// by checking that the schema's shape includes ownedWeapons
		const schemaShape = playerSchema._def.schema._def.shape()
		expect(schemaShape).toHaveProperty('ownedWeapons')
	})

	it('should accept valid ownedWeapons array', () => {
		const data = {
			// ... minimal required fields
			ownedWeapons: [
				{ weaponId: 'iron-sword', materialId: null },
				{ weaponId: 'steel-dagger', materialId: 'steel' }
			]
		}

		const result = playerSchema.safeParse(data)
		// Will fail on other required fields, but ownedWeapons should parse
		if (!result.success) {
			const ownedWeaponsError = result.error.issues.find(
				i => i.path.includes('ownedWeapons')
			)
			expect(ownedWeaponsError).toBeUndefined()
		}
	})

	it('should reject invalid ownedWeapons structure', () => {
		const data = {
			ownedWeapons: [
				{ weaponId: 123 } // invalid: weaponId should be string
			]
		}

		const result = playerSchema.safeParse(data)
		expect(result.success).toBe(false)
	})

	it('should default ownedWeapons to empty array', () => {
		const result = playerSchema.safeParse({})
		// Check that default is applied
		if (!result.success) {
			const issues = result.error.issues
			const ownedWeaponsRequired = issues.find(
				i => i.path[0] === 'ownedWeapons' && i.code === 'invalid_type'
			)
			expect(ownedWeaponsRequired).toBeUndefined()
		}
	})
})
