import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { get } from 'svelte/store'

// Mock localStorage
const localStorageMock = {
	store: {} as Record<string, string>,
	getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
	setItem: vi.fn((key: string, value: string) => {
		localStorageMock.store[key] = value
	}),
	clear: vi.fn(() => {
		localStorageMock.store = {}
	}),
}

vi.stubGlobal('localStorage', localStorageMock)

// Must import after mocking
import { combatStore } from '$lib/stores/combat.store'
import { syncCombatResultToPlayer } from '$lib/util/combatSync.util'
import type { PlayerData, Equipment } from '$lib/models/player'
import { BirthSignName } from '$lib/data/birthSign'
import { ArchetypeName } from '$lib/data/archetype'
import { RaceName } from '$lib/data/race'

describe('Combat Actions Integration', () => {
	const mockEquipment: Equipment = {
		weapon: { id: 'iron-sword', materialId: null },
		offhand: { id: null, materialId: null },
		armor: { id: null, materialId: null },
		accessories: [],
	}

	function createMockPlayer(overrides: Partial<PlayerData> = {}): PlayerData {
		return {
			id: 'player-1',
			schemaVersion: '0.2.0',
			level: 1,
			playerName: 'Test Player',
			characterName: 'Test Character',
			maxHealth: 100,
			health: 100,
			maxActionPoints: 5,
			actionPoints: 5,
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
			equipment: mockEquipment,
			inventory: [],
			ownedWeapons: [
				{ weaponId: 'iron-sword', materialId: null },
				{ weaponId: 'steel-dagger', materialId: 'steel' },
				{ weaponId: 'iron-shield', materialId: null },
			],
			notes: '',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
			...overrides,
		}
	}

	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2024-06-15T12:30:00.000Z'))
		localStorageMock.clear()
		// Clean up any existing combat session
		combatStore.endCombat('player-1')
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe('Full Combat Flow with Equipment Changes', () => {
		it('should complete full combat flow with equipment changes', () => {
			const player = createMockPlayer()

			// 1. Start combat
			combatStore.startCombat('player-1', 10, 8, {
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: player.maxActionPoints,
				equipment: player.equipment,
				level: player.level,
				currentSpiritPoints: player.currentSpiritPoints,
			})

			let state = get(combatStore)
			expect(state['player-1']).toBeDefined()
			expect(state['player-1'].combatEquipment.weapon.id).toBe('iron-sword')
			expect(state['player-1'].currentAP).toBe(5)

			// 2. Swap main weapon to steel dagger
			combatStore.swapWeapon('player-1', {
				weaponId: 'steel-dagger',
				materialId: 'steel',
				slot: 'weapon',
			})

			state = get(combatStore)
			expect(state['player-1'].combatEquipment.weapon.id).toBe('steel-dagger')
			expect(state['player-1'].combatEquipment.weapon.materialId).toBe('steel')
			expect(state['player-1'].currentAP).toBe(4) // AP spent

			// 3. Equip shield to offhand
			combatStore.swapWeapon('player-1', {
				weaponId: 'iron-shield',
				materialId: null,
				slot: 'offhand',
			})

			state = get(combatStore)
			expect(state['player-1'].combatEquipment.offhand.id).toBe('iron-shield')
			expect(state['player-1'].currentAP).toBe(3) // AP spent again

			// 4. Take damage
			combatStore.takeDamage('player-1', 25)

			state = get(combatStore)
			expect(state['player-1'].currentHP).toBe(75)

			// 5. End combat and get result
			const combatResult = combatStore.endCombat('player-1')

			// 6. Verify equipment changes in result
			expect(combatResult).not.toBeNull()
			expect(combatResult!.health).toBe(75)
			expect(combatResult!.equipment.weapon.id).toBe('steel-dagger')
			expect(combatResult!.equipment.weapon.materialId).toBe('steel')
			expect(combatResult!.equipment.offhand.id).toBe('iron-shield')

			// 7. Sync to player and verify
			const updatedPlayer = syncCombatResultToPlayer(player, combatResult!)

			expect(updatedPlayer.health).toBe(75)
			expect(updatedPlayer.equipment.weapon.id).toBe('steel-dagger')
			expect(updatedPlayer.equipment.weapon.materialId).toBe('steel')
			expect(updatedPlayer.equipment.offhand.id).toBe('iron-shield')
			expect(updatedPlayer.updatedAt).toBe('2024-06-15T12:30:00.000Z')

			// Original player should not be mutated
			expect(player.health).toBe(100)
			expect(player.equipment.weapon.id).toBe('iron-sword')
		})

		it('should track multiple weapon swaps correctly', () => {
			const player = createMockPlayer()

			combatStore.startCombat('player-1', 10, 8, {
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: player.maxActionPoints,
				equipment: player.equipment,
				level: player.level,
				currentSpiritPoints: player.currentSpiritPoints,
			})

			// First swap: main weapon
			combatStore.swapWeapon('player-1', {
				weaponId: 'steel-dagger',
				materialId: 'steel',
				slot: 'weapon',
			})

			// Second swap: offhand
			combatStore.swapWeapon('player-1', {
				weaponId: 'iron-shield',
				materialId: null,
				slot: 'offhand',
			})

			// Third swap: change main weapon again
			combatStore.swapWeapon('player-1', {
				weaponId: 'iron-sword',
				materialId: null,
				slot: 'weapon',
			})

			const state = get(combatStore)
			expect(state['player-1'].combatEquipment.weapon.id).toBe('iron-sword')
			expect(state['player-1'].combatEquipment.offhand.id).toBe('iron-shield')
			expect(state['player-1'].currentAP).toBe(2) // 3 swaps = 3 AP

			const result = combatStore.endCombat('player-1')
			expect(result!.equipment.weapon.id).toBe('iron-sword')
			expect(result!.equipment.offhand.id).toBe('iron-shield')
		})

		it('should not mutate original equipment when combat starts', () => {
			const originalEquipment: Equipment = {
				weapon: { id: 'iron-sword', materialId: null },
				offhand: { id: null, materialId: null },
				armor: { id: null, materialId: null },
				accessories: [],
			}
			const player = createMockPlayer({ equipment: originalEquipment })

			combatStore.startCombat('player-1', 10, 8, {
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: player.maxActionPoints,
				equipment: player.equipment,
				level: player.level,
				currentSpiritPoints: player.currentSpiritPoints,
			})

			// Swap weapon in combat
			combatStore.swapWeapon('player-1', {
				weaponId: 'steel-dagger',
				materialId: 'steel',
				slot: 'weapon',
			})

			// Original equipment should not be modified
			expect(originalEquipment.weapon.id).toBe('iron-sword')
			expect(player.equipment.weapon.id).toBe('iron-sword')
		})
	})

	describe('localStorage Persistence', () => {
		it('should persist combat state across simulated page reloads', () => {
			const player = createMockPlayer()

			// Start combat and make changes
			combatStore.startCombat('player-1', 10, 8, {
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: player.maxActionPoints,
				equipment: player.equipment,
				level: player.level,
				currentSpiritPoints: player.currentSpiritPoints,
			})

			combatStore.swapWeapon('player-1', {
				weaponId: 'steel-dagger',
				materialId: 'steel',
				slot: 'weapon',
			})

			combatStore.takeDamage('player-1', 30)

			// Verify localStorage has been updated
			expect(localStorageMock.setItem).toHaveBeenCalled()

			const savedData = JSON.parse(localStorageMock.store['combat-sessions'])
			expect(savedData['player-1']).toBeDefined()
			expect(savedData['player-1'].combatEquipment.weapon.id).toBe('steel-dagger')
			expect(savedData['player-1'].currentHP).toBe(70)
		})

		it('should persist multiple equipment changes to localStorage', () => {
			const player = createMockPlayer()

			combatStore.startCombat('player-1', 10, 8, {
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: player.maxActionPoints,
				equipment: player.equipment,
				level: player.level,
				currentSpiritPoints: player.currentSpiritPoints,
			})

			// Make several equipment changes
			combatStore.swapWeapon('player-1', {
				weaponId: 'steel-dagger',
				materialId: 'steel',
				slot: 'weapon',
			})

			combatStore.swapWeapon('player-1', {
				weaponId: 'iron-shield',
				materialId: null,
				slot: 'offhand',
			})

			// Verify final state in localStorage
			const savedData = JSON.parse(localStorageMock.store['combat-sessions'])
			expect(savedData['player-1'].combatEquipment.weapon.id).toBe('steel-dagger')
			expect(savedData['player-1'].combatEquipment.weapon.materialId).toBe('steel')
			expect(savedData['player-1'].combatEquipment.offhand.id).toBe('iron-shield')
		})

		it('should remove combat session from localStorage when combat ends', () => {
			const player = createMockPlayer()

			combatStore.startCombat('player-1', 10, 8, {
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: player.maxActionPoints,
				equipment: player.equipment,
				level: player.level,
				currentSpiritPoints: player.currentSpiritPoints,
			})

			// Verify session exists
			let savedData = JSON.parse(localStorageMock.store['combat-sessions'])
			expect(savedData['player-1']).toBeDefined()

			// End combat
			combatStore.endCombat('player-1')

			// Verify session is removed
			savedData = JSON.parse(localStorageMock.store['combat-sessions'])
			expect(savedData['player-1']).toBeUndefined()
		})
	})

	describe('Combat State Integrity', () => {
		it('should maintain combat log throughout combat flow', () => {
			const player = createMockPlayer()

			combatStore.startCombat('player-1', 10, 8, {
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: player.maxActionPoints,
				equipment: player.equipment,
				level: player.level,
				currentSpiritPoints: player.currentSpiritPoints,
			})

			combatStore.swapWeapon('player-1', {
				weaponId: 'steel-dagger',
				materialId: 'steel',
				slot: 'weapon',
			})

			combatStore.takeDamage('player-1', 10)

			const state = get(combatStore)
			const log = state['player-1'].log

			// Should have: start message + swap message + damage message
			expect(log.length).toBeGreaterThanOrEqual(3)
			expect(log.some((entry) => entry.type === 'system')).toBe(true)
			expect(log.some((entry) => entry.type === 'action')).toBe(true)
			expect(log.some((entry) => entry.type === 'damage')).toBe(true)
		})

		it('should prevent weapon swap when AP is insufficient', () => {
			const player = createMockPlayer()

			// Start with 1 AP
			combatStore.startCombat('player-1', 10, 8, {
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: 1,
				equipment: player.equipment,
				level: player.level,
				currentSpiritPoints: player.currentSpiritPoints,
			})

			// First swap should succeed
			combatStore.swapWeapon('player-1', {
				weaponId: 'steel-dagger',
				materialId: 'steel',
				slot: 'weapon',
			})

			let state = get(combatStore)
			expect(state['player-1'].combatEquipment.weapon.id).toBe('steel-dagger')
			expect(state['player-1'].currentAP).toBe(0)

			// Second swap should fail due to insufficient AP
			combatStore.swapWeapon('player-1', {
				weaponId: 'iron-shield',
				materialId: null,
				slot: 'offhand',
			})

			state = get(combatStore)
			expect(state['player-1'].combatEquipment.offhand.id).toBeNull()
			expect(state['player-1'].currentAP).toBe(0)
		})

		it('should sync all combat changes to player correctly', () => {
			const player = createMockPlayer({
				health: 100,
				magicka: 50,
			})

			combatStore.startCombat('player-1', 10, 8, {
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: player.maxActionPoints,
				equipment: player.equipment,
				level: player.level,
				currentSpiritPoints: player.currentSpiritPoints,
			})

			// Make comprehensive changes
			combatStore.swapWeapon('player-1', {
				weaponId: 'steel-dagger',
				materialId: 'steel',
				slot: 'weapon',
			})

			combatStore.swapWeapon('player-1', {
				weaponId: 'iron-shield',
				materialId: null,
				slot: 'offhand',
			})

			combatStore.takeDamage('player-1', 40)
			combatStore.spendMP('player-1', 20)

			const result = combatStore.endCombat('player-1')
			const updatedPlayer = syncCombatResultToPlayer(player, result!)

			// Verify all changes are synced
			expect(updatedPlayer.health).toBe(60)
			expect(updatedPlayer.magicka).toBe(30)
			expect(updatedPlayer.equipment.weapon.id).toBe('steel-dagger')
			expect(updatedPlayer.equipment.weapon.materialId).toBe('steel')
			expect(updatedPlayer.equipment.offhand.id).toBe('iron-shield')

			// Verify unchanged fields remain intact
			expect(updatedPlayer.id).toBe(player.id)
			expect(updatedPlayer.playerName).toBe(player.playerName)
			expect(updatedPlayer.characterName).toBe(player.characterName)
			expect(updatedPlayer.level).toBe(player.level)
			expect(updatedPlayer.ownedWeapons).toEqual(player.ownedWeapons)
		})
	})
})
