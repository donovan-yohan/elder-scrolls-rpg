import type { PlayerData, Equipment } from '$lib/models/player'

export interface CombatResult {
	health: number
	magicka: number
	equipment: Equipment
	currentSpiritPoints: number
	fortunePoints: number
	misfortunePoints: number
}

/**
 * Sync combat results back to player data after combat ends.
 * Updates health, magicka, equipment, fortune/misfortune points, and the updatedAt timestamp.
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
		currentSpiritPoints: combatResult.currentSpiritPoints,
		fortunePoints: combatResult.fortunePoints,
		misfortunePoints: combatResult.misfortunePoints,
		updatedAt: new Date().toISOString()
	}
}
