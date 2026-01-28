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
		level: 8, // Max 2 spirit points
		health: 100,
		maxHealth: 100,
		magicka: 50,
		maxMagicka: 50,
		actionPoints: 5,
		maxActionPoints: 5,
		currentSpiritPoints: 2,
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

describe('Combat Store - Spirit Points', () => {
	const mockEquipment: Equipment = {
		weapon: { id: 'iron-sword', materialId: null },
		offhand: { id: 'iron-shield', materialId: null },
		armor: { id: 'leather', materialId: null },
		accessories: []
	}

	const mockPlayerData = {
		id: 'player-1',
		level: 8, // Max 2 spirit points
		health: 100,
		maxHealth: 100,
		magicka: 50,
		maxMagicka: 50,
		actionPoints: 5,
		maxActionPoints: 5,
		currentSpiritPoints: 2,
		equipment: mockEquipment
	}

	beforeEach(() => {
		localStorageMock.clear()
		combatStore.endCombat('player-1')
	})

	it('should store current spirit points when combat starts', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.currentSpiritPoints).toBe(2)
	})

	it('should store max spirit points based on level when combat starts', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.maxSpiritPoints).toBe(2) // Level 8 = floor(8/4) = 2
	})

	it('should return spirit points state when combat ends', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const result = combatStore.endCombat('player-1')

		expect(result).toBeDefined()
		expect(result!.currentSpiritPoints).toBe(2)
	})

	it('should spend spirit point and reset resources via spendSpiritPoint', () => {
		const mockPlayer = {
			...mockPlayerData,
			currentSpiritPoints: 2,
			maxHealth: 100,
			maxMagicka: 50,
			maxActionPoints: 5
		}
		combatStore.startCombat('player-1', 3, 2, mockPlayer as any)

		// Simulate damage to 0 HP
		combatStore.takeDamage('player-1', 100)

		// Verify HP is 0
		expect(get(combatStore)['player-1'].currentHP).toBe(0)

		// Spend spirit point to recover
		combatStore.spendSpiritPoint('player-1', mockPlayer as any)

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.currentSpiritPoints).toBe(1) // 2 - 1 = 1
		expect(session.currentHP).toBe(100) // Reset to max
		expect(session.currentMP).toBe(50) // Reset to max
		expect(session.currentAP).toBe(5) // Reset to max
	})

	it('should add log entry when spirit point spent', () => {
		const mockPlayer = {
			...mockPlayerData,
			currentSpiritPoints: 1
		}
		combatStore.startCombat('player-1', 3, 2, mockPlayer as any)

		const initialLogLength = get(combatStore)['player-1'].log.length

		combatStore.spendSpiritPoint('player-1', mockPlayer as any)

		const state = get(combatStore)
		const logEntry = state['player-1'].log[state['player-1'].log.length - 1]

		expect(state['player-1'].log.length).toBeGreaterThan(initialLogLength)
		expect(logEntry.description).toContain('spirit point')
	})

	it('should not spend spirit point when none available', () => {
		const mockPlayer = {
			...mockPlayerData,
			currentSpiritPoints: 0
		}
		combatStore.startCombat('player-1', 3, 2, mockPlayer as any)

		const stateBefore = get(combatStore)['player-1']

		combatStore.spendSpiritPoint('player-1', mockPlayer as any)

		const stateAfter = get(combatStore)['player-1']
		expect(stateAfter.currentSpiritPoints).toBe(0)
	})
})

describe('Combat Store - Fortune System', () => {
	const mockPlayerData = {
		id: 'player-1',
		level: 8,
		health: 100,
		magicka: 50,
		maxActionPoints: 5,
		currentSpiritPoints: 2,
		fortunePoints: 2,
		misfortunePoints: 1,
	}

	beforeEach(() => {
		localStorageMock.clear()
		combatStore.endCombat('player-1')
	})

	it('should initialize fortune points from player data', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.fortunePoints).toBe(2)
		expect(session.misfortunePoints).toBe(1)
	})

	it('should default fortune points to 0 if not provided', () => {
		combatStore.startCombat('player-1', 3, 2, {
			level: 8,
			health: 100,
			magicka: 50,
			maxActionPoints: 5,
			currentSpiritPoints: 2,
		} as any)

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.fortunePoints).toBe(0)
		expect(session.misfortunePoints).toBe(0)
	})

	it('should gain fortune points', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		combatStore.gainFortune('player-1')

		const state = get(combatStore)
		expect(state['player-1'].fortunePoints).toBe(3)
	})

	it('should spend fortune points', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		const spent = combatStore.spendFortune('player-1')

		const state = get(combatStore)
		expect(spent).toBe(true)
		expect(state['player-1'].fortunePoints).toBe(1)
	})

	it('should not spend fortune when none available', () => {
		combatStore.startCombat('player-1', 3, 2, { ...mockPlayerData, fortunePoints: 0 } as any)
		const spent = combatStore.spendFortune('player-1')

		expect(spent).toBe(false)
	})

	it('should gain misfortune points', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		combatStore.gainMisfortune('player-1')

		const state = get(combatStore)
		expect(state['player-1'].misfortunePoints).toBe(2)
	})

	it('should spend misfortune points', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		const spent = combatStore.spendMisfortune('player-1')

		const state = get(combatStore)
		expect(spent).toBe(true)
		expect(state['player-1'].misfortunePoints).toBe(0)
	})

	it('should not spend misfortune when none available', () => {
		combatStore.startCombat('player-1', 3, 2, { ...mockPlayerData, misfortunePoints: 0 } as any)
		const spent = combatStore.spendMisfortune('player-1')

		expect(spent).toBe(false)
	})

	it('should return fortune in endCombat result', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		combatStore.gainFortune('player-1')
		combatStore.gainMisfortune('player-1')

		const result = combatStore.endCombat('player-1')

		expect(result).toBeDefined()
		expect(result!.fortunePoints).toBe(3)
		expect(result!.misfortunePoints).toBe(2)
	})

	it('should log fortune transactions', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		const initialLogLength = get(combatStore)['player-1'].log.length

		combatStore.gainFortune('player-1')

		const state = get(combatStore)
		expect(state['player-1'].log.length).toBe(initialLogLength + 1)
		expect(state['player-1'].log[state['player-1'].log.length - 1].description).toContain('Fortune')
	})

	it('should log misfortune transactions', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		const initialLogLength = get(combatStore)['player-1'].log.length

		combatStore.gainMisfortune('player-1')

		const state = get(combatStore)
		expect(state['player-1'].log.length).toBe(initialLogLength + 1)
		expect(state['player-1'].log[state['player-1'].log.length - 1].description).toContain('Misfortune')
	})
})
