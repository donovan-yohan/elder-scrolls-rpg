import type { PlayerData } from '$lib/models/player'
import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { migratePlayerData } from '$lib/util/migration.util'
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'

/**
 * Flag indicating whether characters were cleared due to version mismatch.
 * Homepage subscribes to this to show warning modal.
 */
export const versionResetOccurred = writable<boolean>(false)

// Load and migrate player data from localStorage
function loadPlayers(): Record<string, PlayerData> {
	if (!browser) return {}

	let raw: Record<string, PlayerData>
	try {
		raw = JSON.parse(localStorage.getItem('players') ?? '{}') as Record<string, PlayerData>
	} catch {
		localStorage.removeItem('players')
		return {}
	}

	// TODO [v1.0.0]: Replace this deletion logic with proper per-character migrations.
	// Currently we wipe all characters on version mismatch during pre-release development.
	// When we reach v1.0.0, implement migration functions that upgrade character data
	// from older schema versions to the current version instead of deleting.
	const hasVersionMismatch = Object.values(raw).some(
		(player) => player.schemaVersion !== CHARACTER_SCHEMA_VERSION
	)

	if (hasVersionMismatch && Object.keys(raw).length > 0) {
		// Clear localStorage and signal reset occurred
		localStorage.removeItem('players')
		versionResetOccurred.set(true)
		return {}
	}

	// Migrate each player's data to the latest format
	return Object.fromEntries(
		Object.entries(raw).map(([id, player]) => [id, migratePlayerData(player)])
	)
}

export const playersStore = writable<Record<string, PlayerData>>(loadPlayers())

playersStore.subscribe((players) => {
	if (browser) localStorage.setItem('players', JSON.stringify(players))
})
