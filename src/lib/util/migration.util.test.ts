import { describe, it, expect } from 'vitest'
import { migratePlayerData, migratePlayerEquipment } from './migration.util'
import type { PlayerData } from '$lib/models/player'
import { BirthSignName } from '$lib/data/birthSign'
import { ArchetypeName } from '$lib/data/archetype'
import { RaceName } from '$lib/data/race'

// Helper to create minimal valid player data for testing
function createTestPlayerData(overrides: Partial<PlayerData> = {}): PlayerData {
	return {
		id: 'test-id',
		level: 1,
		playerName: 'Test Player',
		characterName: 'Test Character',
		maxHealth: 100,
		health: 100,
		maxActionPoints: 10,
		actionPoints: 10,
		maxMagicka: 50,
		magicka: 50,
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
			delete (playerWithoutOwnedWeapons as Partial<PlayerData> & { ownedWeapons?: string[] })
				.ownedWeapons

			const result = migratePlayerData(playerWithoutOwnedWeapons)

			expect(result.ownedWeapons).toEqual([])
		})

		it('preserves existing ownedWeapons array', () => {
			const existingWeapons = ['iron-sword', 'steel-dagger', 'ebony-bow']
			const playerWithOwnedWeapons = createTestPlayerData({
				ownedWeapons: existingWeapons,
			} as Partial<PlayerData>)

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
})
