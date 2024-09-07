import type { Player } from '$lib/models/player'
import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export const playersStore = writable<Record<string, Player>>(
	browser ? JSON.parse(localStorage.getItem('players') ?? '{}') : {},
)

playersStore.subscribe((players) => {
	if (browser) localStorage.setItem('players', JSON.stringify(players))
})
