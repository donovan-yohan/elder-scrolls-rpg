import { describe, it, expect } from 'vitest'
import { defaultPlayerData, type OwnedWeapon, type PlayerData } from './player'

describe('OwnedWeapon interface', () => {
	it('should allow creating an OwnedWeapon with weaponId and materialId', () => {
		const ownedWeapon: OwnedWeapon = {
			weaponId: 'iron-sword',
			materialId: 'iron',
		}

		expect(ownedWeapon.weaponId).toBe('iron-sword')
		expect(ownedWeapon.materialId).toBe('iron')
	})

	it('should allow materialId to be null', () => {
		const ownedWeapon: OwnedWeapon = {
			weaponId: 'hand-to-hand',
			materialId: null,
		}

		expect(ownedWeapon.weaponId).toBe('hand-to-hand')
		expect(ownedWeapon.materialId).toBeNull()
	})
})

describe('defaultPlayerData', () => {
	it('should have ownedWeapons defined as an empty array', () => {
		expect(defaultPlayerData.ownedWeapons).toBeDefined()
		expect(defaultPlayerData.ownedWeapons).toEqual([])
		expect(Array.isArray(defaultPlayerData.ownedWeapons)).toBe(true)
	})
})

describe('PlayerData type', () => {
	it('should include ownedWeapons array in the type', () => {
		// Type check - if this compiles, the type is correct
		const playerData: Partial<PlayerData> = {
			ownedWeapons: [
				{ weaponId: 'steel-dagger', materialId: 'steel' },
				{ weaponId: 'bow', materialId: null },
			],
		}

		expect(playerData.ownedWeapons).toHaveLength(2)
	})
})
