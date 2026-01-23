import type { PlayerData } from '$lib/models/player'
import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export const playersStore = writable<Record<string, PlayerData>>(
	browser ? JSON.parse(localStorage.getItem('players') ?? '{}') : {},
)

playersStore.subscribe((players) => {
	if (browser) localStorage.setItem('players', JSON.stringify(players))
})
