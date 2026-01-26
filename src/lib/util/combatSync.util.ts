import type { PlayerData, Equipment } from '$lib/models/player'

export interface CombatResult {
	health: number
	magicka: number
	equipment: Equipment
}

/**
 * Sync combat results back to player data after combat ends.
 * Updates health, magicka, equipment, and the updatedAt timestamp.
 */
export function syncCombatResultToPlayer(
	player: PlayerData,
	combatResult: CombatResult
): PlayerData {
	return {
		...player,
		health: combatResult.health,
		magicka: combatResult.magicka,
		equipment: combatResult.equipment,
		updatedAt: new Date().toISOString()
	}
}
