import { describe, it, expect } from 'vitest'
import { validateImport, preparePlayerForImport } from './import.util'
import { BirthSignName } from '$lib/data/birthSign'
import { ArchetypeName } from '$lib/data/archetype'
import { RaceName } from '$lib/data/race'
import type { PlayerData } from '$lib/models/player'

// Helper to create minimal valid player data for testing
function createValidPlayerData(overrides: Partial<PlayerData> = {}): PlayerData {
	return {
		id: 'test-id',
		level: 5,
		playerName: 'Test Player',
		characterName: 'Test Hero',
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
		createdAt: '2024-01-01',
		updatedAt: '2024-01-01',
		...overrides,
	}
}

describe('Import validation - ownedWeapons', () => {
	describe('single character import', () => {
		it('should accept import with valid ownedWeapons field', () => {
			const importData = {
				version: '1.0.0',
				exportedAt: new Date().toISOString(),
				player: createValidPlayerData({
					ownedWeapons: [
						{ weaponId: 'iron-sword', materialId: null },
						{ weaponId: 'steel-dagger', materialId: 'steel' },
					],
				}),
			}

			const result = validateImport(importData)

			expect(result.success).toBe(true)
			expect(result.player).toBeDefined()
			expect(result.player?.ownedWeapons).toHaveLength(2)
			expect(result.player?.ownedWeapons[0].weaponId).toBe('iron-sword')
			expect(result.player?.ownedWeapons[1].materialId).toBe('steel')
		})

		it('should default ownedWeapons to empty array for legacy imports', () => {
			const playerWithoutOwnedWeapons = createValidPlayerData()
			// Remove ownedWeapons to simulate legacy data
			delete (playerWithoutOwnedWeapons as Partial<PlayerData>).ownedWeapons

			const legacyImportData = {
				version: '1.0.0',
				exportedAt: new Date().toISOString(),
				player: playerWithoutOwnedWeapons,
			}

			const result = validateImport(legacyImportData)

			expect(result.success).toBe(true)
			expect(result.player).toBeDefined()
			expect(result.player?.ownedWeapons).toBeDefined()
			expect(result.player?.ownedWeapons).toEqual([])
		})

		it('should reject import when ownedWeapons is not an array', () => {
			const importData = {
				version: '1.0.0',
				exportedAt: new Date().toISOString(),
				player: {
					...createValidPlayerData(),
					ownedWeapons: 'invalid-not-array',
				},
			}

			const result = validateImport(importData)

			expect(result.success).toBe(false)
			expect(result.error).toContain('ownedWeapons')
		})

		it('should reject import when ownedWeapons item has invalid weaponId', () => {
			const importData = {
				version: '1.0.0',
				exportedAt: new Date().toISOString(),
				player: {
					...createValidPlayerData(),
					ownedWeapons: [{ weaponId: 123, materialId: null }],
				},
			}

			const result = validateImport(importData)

			expect(result.success).toBe(false)
			expect(result.error).toContain('weaponId')
		})

		it('should reject import when ownedWeapons item has invalid materialId', () => {
			const importData = {
				version: '1.0.0',
				exportedAt: new Date().toISOString(),
				player: {
					...createValidPlayerData(),
					ownedWeapons: [{ weaponId: 'iron-sword', materialId: 123 }],
				},
			}

			const result = validateImport(importData)

			expect(result.success).toBe(false)
			expect(result.error).toContain('materialId')
		})
	})

	describe('multiple character import (backup)', () => {
		it('should accept backup import with valid ownedWeapons', () => {
			const importData = {
				version: '1.0.0',
				exportedAt: new Date().toISOString(),
				players: [
					createValidPlayerData({
						id: 'player-1',
						ownedWeapons: [{ weaponId: 'iron-sword', materialId: null }],
					}),
					createValidPlayerData({
						id: 'player-2',
						ownedWeapons: [{ weaponId: 'steel-dagger', materialId: 'steel' }],
					}),
				],
			}

			const result = validateImport(importData)

			expect(result.success).toBe(true)
			expect(result.isMultiple).toBe(true)
			expect(result.players).toHaveLength(2)
			expect(result.players?.[0].ownedWeapons).toHaveLength(1)
			expect(result.players?.[1].ownedWeapons).toHaveLength(1)
		})

		it('should default ownedWeapons to empty array for legacy backup imports', () => {
			const player1 = createValidPlayerData({ id: 'player-1' })
			const player2 = createValidPlayerData({ id: 'player-2' })
			// Remove ownedWeapons to simulate legacy data
			delete (player1 as Partial<PlayerData>).ownedWeapons
			delete (player2 as Partial<PlayerData>).ownedWeapons

			const importData = {
				version: '1.0.0',
				exportedAt: new Date().toISOString(),
				players: [player1, player2],
			}

			const result = validateImport(importData)

			expect(result.success).toBe(true)
			expect(result.players?.[0].ownedWeapons).toEqual([])
			expect(result.players?.[1].ownedWeapons).toEqual([])
		})

		it('should reject backup import when any player has invalid ownedWeapons', () => {
			const importData = {
				version: '1.0.0',
				exportedAt: new Date().toISOString(),
				players: [
					createValidPlayerData({
						id: 'player-1',
						ownedWeapons: [{ weaponId: 'valid', materialId: null }],
					}),
					{
						...createValidPlayerData({ id: 'player-2' }),
						ownedWeapons: 'invalid-not-array',
					},
				],
			}

			const result = validateImport(importData)

			expect(result.success).toBe(false)
			expect(result.error).toContain('ownedWeapons')
		})
	})
})

describe('preparePlayerForImport - ownedWeapons', () => {
	it('should preserve ownedWeapons when preparing player for import', () => {
		const player = createValidPlayerData({
			ownedWeapons: [
				{ weaponId: 'iron-sword', materialId: null },
				{ weaponId: 'steel-dagger', materialId: 'steel' },
			],
		})

		const prepared = preparePlayerForImport(player)

		expect(prepared.ownedWeapons).toEqual(player.ownedWeapons)
	})
})
