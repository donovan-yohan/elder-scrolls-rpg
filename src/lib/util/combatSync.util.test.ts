import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { syncCombatResultToPlayer, type CombatResult } from './combatSync.util'
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
		ownedWeapons: [],
		notes: '',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
	}
}

describe('syncCombatResultToPlayer', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2024-06-15T12:30:00.000Z'))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('updates player health from combat result', () => {
		const player = createTestPlayerData({ health: 100 })
		const combatResult: CombatResult = {
			health: 75,
			magicka: 50,
			equipment: player.equipment,
		}

		const result = syncCombatResultToPlayer(player, combatResult)

		expect(result.health).toBe(75)
	})

	it('updates player magicka from combat result', () => {
		const player = createTestPlayerData({ magicka: 50 })
		const combatResult: CombatResult = {
			health: 100,
			magicka: 25,
			equipment: player.equipment,
		}

		const result = syncCombatResultToPlayer(player, combatResult)

		expect(result.magicka).toBe(25)
	})

	it('updates player equipment from combat result', () => {
		const player = createTestPlayerData()
		const newEquipment = {
			weapon: { id: 'iron-sword', materialId: 'steel' },
			offhand: { id: 'iron-shield', materialId: null },
			armor: { id: 'leather-armor', materialId: null },
			accessories: ['ring-of-strength'],
		}
		const combatResult: CombatResult = {
			health: 100,
			magicka: 50,
			equipment: newEquipment,
		}

		const result = syncCombatResultToPlayer(player, combatResult)

		expect(result.equipment).toEqual(newEquipment)
	})

	it('updates updatedAt timestamp', () => {
		const player = createTestPlayerData({ updatedAt: '2024-01-01T00:00:00.000Z' })
		const combatResult: CombatResult = {
			health: 100,
			magicka: 50,
			equipment: player.equipment,
		}

		const result = syncCombatResultToPlayer(player, combatResult)

		expect(result.updatedAt).toBe('2024-06-15T12:30:00.000Z')
	})

	it('preserves other player data fields', () => {
		const player = createTestPlayerData({
			playerName: 'John',
			characterName: 'Dragonborn',
			level: 5,
			maxHealth: 150,
			notes: 'Some notes',
		})
		const combatResult: CombatResult = {
			health: 80,
			magicka: 30,
			equipment: player.equipment,
		}

		const result = syncCombatResultToPlayer(player, combatResult)

		expect(result.playerName).toBe('John')
		expect(result.characterName).toBe('Dragonborn')
		expect(result.level).toBe(5)
		expect(result.maxHealth).toBe(150)
		expect(result.notes).toBe('Some notes')
	})
})
