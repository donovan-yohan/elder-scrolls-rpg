import type { PlayerData } from '$lib/models/player'
import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { migratePlayerData } from '$lib/util/migration.util'

// Load and migrate player data from localStorage
function loadPlayers(): Record<string, PlayerData> {
	if (!browser) return {}
	const raw = JSON.parse(localStorage.getItem('players') ?? '{}') as Record<string, PlayerData>
	// Migrate each player's data to the latest format
	return Object.fromEntries(
		Object.entries(raw).map(([id, player]) => [id, migratePlayerData(player)])
	)
}

export const playersStore = writable<Record<string, PlayerData>>(loadPlayers())

playersStore.subscribe((players) => {
	if (browser) localStorage.setItem('players', JSON.stringify(players))
})
