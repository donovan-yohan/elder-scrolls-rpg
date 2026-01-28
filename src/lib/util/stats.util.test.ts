import { describe, it, expect } from 'vitest'
import {
	calculateMaxSpiritPoints,
	calculateEffectiveMaxHealth,
	calculateEffectiveMaxMagicka,
	calculateEffectiveMaxAP,
	countComplications,
	isEquipmentDamaged,
	getDamagedEquipmentSlots,
} from './stats.util'
import type { PlayerData, Complication } from '$lib/models/player'
import { defaultPlayerData } from '$lib/models/player'
import { ArchetypeName } from '$lib/data/archetype'
import { BirthSignName } from '$lib/data/birthSign'
import { RaceName } from '$lib/data/race'

// Helper to create a test player
function createTestPlayer(overrides: Partial<PlayerData> = {}): PlayerData {
	return {
		...defaultPlayerData,
		id: 'test-player',
		level: 4,
		archetype: ArchetypeName.Warrior,
		birthSign: BirthSignName.Warrior,
		race: RaceName.Nord,
		majorSkills: [],
		minorSkills: [],
		subSkills: [],
		complications: [],
		...overrides,
	} as PlayerData
}

// Helper to create a complication
function createComplication(type: 'hp' | 'ap' | 'mp' | 'equipment', slot?: 'weapon' | 'offhand' | 'armor'): Complication {
	return {
		id: crypto.randomUUID(),
		type,
		equipmentSlot: slot,
		timestamp: new Date().toISOString(),
	}
}

describe('calculateMaxSpiritPoints', () => {
	it('returns 1 for levels 1-3', () => {
		expect(calculateMaxSpiritPoints(1)).toBe(1)
		expect(calculateMaxSpiritPoints(2)).toBe(1)
		expect(calculateMaxSpiritPoints(3)).toBe(1)
	})

	it('returns floor(level/4) for higher levels', () => {
		expect(calculateMaxSpiritPoints(4)).toBe(1)
		expect(calculateMaxSpiritPoints(8)).toBe(2)
		expect(calculateMaxSpiritPoints(12)).toBe(3)
		expect(calculateMaxSpiritPoints(16)).toBe(4)
		expect(calculateMaxSpiritPoints(20)).toBe(5)
	})
})

describe('countComplications', () => {
	it('counts complications by type', () => {
		const complications: Complication[] = [
			createComplication('hp'),
			createComplication('hp'),
			createComplication('ap'),
			createComplication('mp'),
			createComplication('equipment', 'weapon'),
		]

		const counts = countComplications(complications)
		expect(counts.hp).toBe(2)
		expect(counts.ap).toBe(1)
		expect(counts.mp).toBe(1)
		expect(counts.equipment).toBe(1)
	})

	it('returns zeros for empty array', () => {
		const counts = countComplications([])
		expect(counts.hp).toBe(0)
		expect(counts.ap).toBe(0)
		expect(counts.mp).toBe(0)
		expect(counts.equipment).toBe(0)
	})
})

describe('isEquipmentDamaged', () => {
	it('returns true when slot has equipment damage', () => {
		const complications: Complication[] = [
			createComplication('equipment', 'weapon'),
		]
		expect(isEquipmentDamaged(complications, 'weapon')).toBe(true)
	})

	it('returns false when slot is not damaged', () => {
		const complications: Complication[] = [
			createComplication('equipment', 'weapon'),
		]
		expect(isEquipmentDamaged(complications, 'armor')).toBe(false)
	})

	it('returns false for stat complications', () => {
		const complications: Complication[] = [
			createComplication('hp'),
			createComplication('ap'),
		]
		expect(isEquipmentDamaged(complications, 'weapon')).toBe(false)
	})
})

describe('getDamagedEquipmentSlots', () => {
	it('returns all damaged slots', () => {
		const complications: Complication[] = [
			createComplication('equipment', 'weapon'),
			createComplication('equipment', 'armor'),
			createComplication('hp'),
		]
		const slots = getDamagedEquipmentSlots(complications)
		expect(slots).toContain('weapon')
		expect(slots).toContain('armor')
		expect(slots).not.toContain('offhand')
		expect(slots.length).toBe(2)
	})
})

describe('effective stat calculations', () => {
	it('calculateEffectiveMaxHealth reduces by HP complications', () => {
		const player = createTestPlayer({
			complications: [
				createComplication('hp'),
				createComplication('hp'),
			],
		})

		const baseMax = calculateEffectiveMaxHealth({ ...player, complications: [] })
		const effectiveMax = calculateEffectiveMaxHealth(player)

		expect(effectiveMax).toBe(baseMax - 2)
	})

	it('calculateEffectiveMaxHealth has minimum of 1', () => {
		const player = createTestPlayer({
			complications: Array(100).fill(null).map(() => createComplication('hp')),
		})

		expect(calculateEffectiveMaxHealth(player)).toBe(1)
	})

	it('calculateEffectiveMaxAP reduces by AP complications', () => {
		const player = createTestPlayer({
			complications: [createComplication('ap')],
		})

		const baseMax = calculateEffectiveMaxAP({ ...player, complications: [] })
		const effectiveMax = calculateEffectiveMaxAP(player)

		expect(effectiveMax).toBe(baseMax - 1)
	})

	it('calculateEffectiveMaxMagicka reduces by MP complications', () => {
		const player = createTestPlayer({
			complications: [
				createComplication('mp'),
				createComplication('mp'),
				createComplication('mp'),
			],
		})

		const baseMax = calculateEffectiveMaxMagicka({ ...player, complications: [] })
		const effectiveMax = calculateEffectiveMaxMagicka(player)

		expect(effectiveMax).toBe(baseMax - 3)
	})
})
