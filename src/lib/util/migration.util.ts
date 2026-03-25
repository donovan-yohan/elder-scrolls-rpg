import type { Equipment, EquipmentSlot, PlayerData } from '$lib/models/player'
import { calculateMaxSpiritPoints } from './spiritPoints.util'

// Type for the old equipment format
interface LegacyEquipment {
	weapon: string | null
	offhand: string | null
	armor: string | null
	accessories: string[]
}

// Type guard to check if equipment is in legacy format
function isLegacyEquipment(equipment: Equipment | LegacyEquipment): equipment is LegacyEquipment {
	// New format always has an object with 'id' property
	// Legacy format has weapon as string | null directly
	return (
		equipment.weapon === null ||
		typeof equipment.weapon === 'string' ||
		(typeof equipment.weapon === 'object' && !('id' in equipment.weapon))
	)
}

// Migrate a single slot from string|null to EquipmentSlot
function migrateEquipmentSlot(value: string | null | EquipmentSlot): EquipmentSlot {
	if (value === null || typeof value === 'string') {
		return { id: value, materialId: null }
	}
	return value
}

// Migrate full equipment object
export function migratePlayerEquipment(equipment: Equipment | LegacyEquipment): Equipment {
	if (!isLegacyEquipment(equipment)) {
		return equipment
	}

	return {
		weapon: migrateEquipmentSlot(equipment.weapon),
		offhand: migrateEquipmentSlot(equipment.offhand),
		armor: migrateEquipmentSlot(equipment.armor),
		accessories: equipment.accessories,
	}
}

// Migrate full player data
export function migratePlayerData(player: PlayerData): PlayerData {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const playerAny = player as any

	const ownedWeapons = playerAny.ownedWeapons ?? []

	const maxSpiritPoints = calculateMaxSpiritPoints(player.level)
	let currentSpiritPoints = playerAny.currentSpiritPoints
	if (currentSpiritPoints === undefined) {
		currentSpiritPoints = maxSpiritPoints
	} else {
		currentSpiritPoints = Math.min(currentSpiritPoints, maxSpiritPoints)
	}

	const complications = playerAny.complications ?? []

	const fortunePoints = playerAny.fortunePoints ?? 0
	const misfortunePoints = playerAny.misfortunePoints ?? 0

	const knownShouts = playerAny.knownShouts ?? []

	return {
		...player,
		equipment: migratePlayerEquipment(player.equipment as Equipment | LegacyEquipment),
		ownedWeapons,
		currentSpiritPoints,
		complications,
		fortunePoints,
		misfortunePoints,
		knownShouts,
	}
}
