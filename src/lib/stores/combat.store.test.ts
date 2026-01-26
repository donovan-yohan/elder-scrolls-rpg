import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'

// Mock localStorage
const localStorageMock = {
	store: {} as Record<string, string>,
	getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
	setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value }),
	clear: vi.fn(() => { localStorageMock.store = {} })
}

vi.stubGlobal('localStorage', localStorageMock)

// Must import after mocking
import { combatStore } from './combat.store'
import type { Equipment } from '$lib/models/player'

describe('Combat Store - Equipment State', () => {
	const mockEquipment: Equipment = {
		weapon: { id: 'iron-sword', materialId: null },
		offhand: { id: 'iron-shield', materialId: null },
		armor: { id: 'leather', materialId: null },
		accessories: []
	}

	const mockPlayerData = {
		id: 'player-1',
		health: 100,
		maxHealth: 100,
		magicka: 50,
		maxMagicka: 50,
		actionPoints: 5,
		maxActionPoints: 5,
		equipment: mockEquipment
	}

	beforeEach(() => {
		localStorageMock.clear()
		combatStore.endCombat('player-1') // Clean up any existing session
	})

	it('should store equipment snapshot when combat starts', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.combatEquipment).toBeDefined()
		expect(session.combatEquipment.weapon.id).toBe('iron-sword')
		expect(session.combatEquipment.offhand.id).toBe('iron-shield')
	})

	it('should update combat equipment when swapping weapon', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-sword',
			materialId: 'steel',
			slot: 'weapon'
		})

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.combatEquipment.weapon.id).toBe('steel-sword')
		expect(session.combatEquipment.weapon.materialId).toBe('steel')
	})

	it('should spend AP when swapping weapon', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const initialAP = get(combatStore)['player-1'].currentAP

		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-sword',
			materialId: null,
			slot: 'weapon'
		})

		const finalAP = get(combatStore)['player-1'].currentAP
		expect(finalAP).toBe(initialAP - 1)
	})

	it('should persist equipment changes to localStorage', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-sword',
			materialId: null,
			slot: 'weapon'
		})

		expect(localStorageMock.setItem).toHaveBeenCalled()

		const savedData = JSON.parse(localStorageMock.store['combat-sessions'])
		expect(savedData['player-1'].combatEquipment.weapon.id).toBe('steel-sword')
	})

	it('should return final equipment state when combat ends', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-sword',
			materialId: 'steel',
			slot: 'weapon'
		})

		const result = combatStore.endCombat('player-1')

		expect(result).toBeDefined()
		expect(result!.equipment.weapon.id).toBe('steel-sword')
		expect(result!.equipment.weapon.materialId).toBe('steel')
	})

	it('should not swap weapon when AP is insufficient', () => {
		combatStore.startCombat('player-1', 3, 2, { ...mockPlayerData, maxActionPoints: 0 } as any)

		const stateBefore = get(combatStore)
		const initialWeapon = stateBefore['player-1'].combatEquipment.weapon.id

		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-sword',
			materialId: null,
			slot: 'weapon'
		})

		const stateAfter = get(combatStore)
		expect(stateAfter['player-1'].combatEquipment.weapon.id).toBe(initialWeapon)
	})

	it('should add log entry when swapping weapon', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const initialLogLength = get(combatStore)['player-1'].log.length

		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-sword',
			materialId: null,
			slot: 'weapon'
		})

		const state = get(combatStore)
		expect(state['player-1'].log.length).toBe(initialLogLength + 1)
		expect(state['player-1'].log[state['player-1'].log.length - 1].type).toBe('action')
	})
})
