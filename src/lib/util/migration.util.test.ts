import { describe, it, expect } from 'vitest'
import { migratePlayerData, migratePlayerEquipment } from './migration.util'
import type { PlayerData } from '$lib/models/player'
import { BirthSignName } from '$lib/data/birthSign'
import { ArchetypeName } from '$lib/data/archetype'
import { RaceName } from '$lib/data/race'
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'

// Helper to create minimal valid player data for testing
function createTestPlayerData(overrides: Partial<PlayerData> = {}): PlayerData {
	return {
		id: 'test-id',
		schemaVersion: CHARACTER_SCHEMA_VERSION,
		level: 1,
		playerName: 'Test Player',
		characterName: 'Test Character',
		maxHealth: 100,
		health: 100,
		maxActionPoints: 10,
		actionPoints: 10,
		maxMagicka: 50,
		magicka: 50,
		currentSpiritPoints: 1,
		birthSign: BirthSignName.Warrior,
		archetype: ArchetypeName.Warrior,
		majorSkills: [],
		minorSkills: [],
		subSkills: [],
		race: RaceName.Nord,
		knownSpells: [],
		equipment: {
			weapon: { id: null, materialId: null },
			offhand: { id: null, materialId: null },
			armor: { id: null, materialId: null },
			accessories: [],
		},
		inventory: [],
		ownedWeapons: [],
		notes: '',
		createdAt: '2024-01-01',
		updatedAt: '2024-01-01',
		...overrides,
	}
}

describe('migratePlayerEquipment', () => {
	it('migrates legacy string equipment to new format', () => {
		const legacyEquipment = {
			weapon: 'iron-sword',
			offhand: null,
			armor: 'iron-cuirass',
			accessories: [],
		}

		const result = migratePlayerEquipment(legacyEquipment)

		expect(result).toEqual({
			weapon: { id: 'iron-sword', materialId: null },
			offhand: { id: null, materialId: null },
			armor: { id: 'iron-cuirass', materialId: null },
			accessories: [],
		})
	})

	it('preserves already migrated equipment', () => {
		const newEquipment = {
			weapon: { id: 'iron-sword', materialId: 'steel' },
			offhand: { id: null, materialId: null },
			armor: { id: 'iron-cuirass', materialId: null },
			accessories: ['ring-of-strength'],
		}

		const result = migratePlayerEquipment(newEquipment)

		expect(result).toEqual(newEquipment)
	})
})

describe('migratePlayerData', () => {
	describe('ownedWeapons migration', () => {
		it('adds empty ownedWeapons array if missing', () => {
			// Create player data without ownedWeapons property
			const playerWithoutOwnedWeapons = createTestPlayerData()
			// Explicitly remove ownedWeapons to simulate legacy data
			delete (playerWithoutOwnedWeapons as Partial<PlayerData>).ownedWeapons

			const result = migratePlayerData(playerWithoutOwnedWeapons)

			expect(result.ownedWeapons).toEqual([])
		})

		it('preserves existing ownedWeapons array', () => {
			const existingWeapons = [
				{ weaponId: 'iron-sword', materialId: null },
				{ weaponId: 'steel-dagger', materialId: 'steel' },
				{ weaponId: 'ebony-bow', materialId: 'ebony' },
			]
			const playerWithOwnedWeapons = createTestPlayerData({
				ownedWeapons: existingWeapons,
			})

			const result = migratePlayerData(playerWithOwnedWeapons)

			expect(result.ownedWeapons).toEqual(existingWeapons)
		})
	})

	it('migrates equipment in player data', () => {
		const playerWithLegacyEquipment = {
			...createTestPlayerData(),
			equipment: {
				weapon: 'iron-sword',
				offhand: null,
				armor: null,
				accessories: [],
			},
		}

		const result = migratePlayerData(playerWithLegacyEquipment as unknown as PlayerData)

		expect(result.equipment.weapon).toEqual({ id: 'iron-sword', materialId: null })
	})

	describe('Spirit Points Migration', () => {
		it('should add currentSpiritPoints based on level if missing', () => {
			const legacyPlayer = {
				id: 'test-id',
				level: 8, // Should have max 2 spirit points
				playerName: 'Test',
				characterName: 'Hero',
				equipment: {
					weapon: { id: null, materialId: null },
					offhand: { id: null, materialId: null },
					armor: { id: null, materialId: null },
					accessories: []
				},
				inventory: [],
				ownedWeapons: []
				// Note: no currentSpiritPoints field
			} as unknown as PlayerData

			const migrated = migratePlayerData(legacyPlayer)

			expect(migrated.currentSpiritPoints).toBeDefined()
			expect(migrated.currentSpiritPoints).toBe(2) // max for level 8
		})

		it('should preserve existing currentSpiritPoints', () => {
			const player = {
				id: 'test-id',
				level: 12, // Max 3 spirit points
				currentSpiritPoints: 1, // Player has only 1 remaining
				equipment: {
					weapon: { id: null, materialId: null },
					offhand: { id: null, materialId: null },
					armor: { id: null, materialId: null },
					accessories: []
				},
				inventory: [],
				ownedWeapons: []
			} as unknown as PlayerData

			const migrated = migratePlayerData(player)

			expect(migrated.currentSpiritPoints).toBe(1)
		})

		it('should cap currentSpiritPoints to max if over limit', () => {
			const player = {
				id: 'test-id',
				level: 4, // Max 1 spirit point
				currentSpiritPoints: 5, // Invalid - over max
				equipment: {
					weapon: { id: null, materialId: null },
					offhand: { id: null, materialId: null },
					armor: { id: null, materialId: null },
					accessories: []
				},
				inventory: [],
				ownedWeapons: []
			} as unknown as PlayerData

			const migrated = migratePlayerData(player)

			expect(migrated.currentSpiritPoints).toBe(1) // Capped to max
		})
	})
})
