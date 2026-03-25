import type { ModalStore, ToastStore } from '@skeletonlabs/skeleton'
import type { Writable } from 'svelte/store'
import type { PlayerData } from '$lib/models/player'
import { exportAllCharacters } from '$lib/util/export.util'
import { importFromFile, preparePlayerForImport } from '$lib/util/import.util'
import { get } from 'svelte/store'

/**
 * Options for creating an import handler
 */
interface CreateImportHandlerOptions {
	toastStore: ToastStore
	modalStore: ModalStore
	playersStore: Writable<Record<string, PlayerData>>
	/**
	 * When true, generates new ID if character ID already exists in store.
	 * Used on the main page to prevent accidental overwrites.
	 */
	forceNewIdOnConflict?: boolean
}

/**
 * Options for creating an export handler
 */
interface CreateExportHandlerOptions {
	toastStore: ToastStore
	playersStore: Writable<Record<string, PlayerData>>
}

/**
 * Creates an async file selection handler for importing characters.
 * Returns a function that can be used as an event handler for file input changes.
 */
export function createImportHandler(options: CreateImportHandlerOptions) {
	const { toastStore, modalStore, playersStore, forceNewIdOnConflict = false } = options

	return async function handleFileSelect(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement
		const file = input.files?.[0]

		if (!file) return

		// Reset input so the same file can be selected again
		input.value = ''

		const result = await importFromFile(file)

		if (!result.success) {
			toastStore.trigger({
				message: result.error,
				background: 'variant-filled-error',
				timeout: 5000,
			})
			return
		}

		// Get existing player IDs
		const existingIds = Object.keys(get(playersStore))

		// Show preview modal
		modalStore.trigger({
			type: 'component',
			component: 'importPreviewModal',
			meta: {
				player: result.isMultiple ? undefined : result.player,
				players: result.isMultiple ? result.players : undefined,
				isMultiple: result.isMultiple,
				existingIds,
			},
			response: (response: { action: string; mode: string; characters: PlayerData[] } | null) => {
				if (!response || response.action === 'cancel') return

				const { mode, characters } = response

				// Import characters
				let importedCount = 0
				playersStore.update((players) => {
					for (const character of characters) {
						// Determine if we need a new ID:
						// - Always new if mode is 'new'
						// - If forceNewIdOnConflict is true, also generate new ID when ID exists
						const needsNewId = mode === 'new' || (forceNewIdOnConflict && existingIds.includes(character.id))
						const prepared = preparePlayerForImport(character, needsNewId)
						players[prepared.id] = prepared
						importedCount++
					}
					return players
				})

				toastStore.trigger({
					message: `Successfully imported ${importedCount} character${importedCount !== 1 ? 's' : ''}`,
					background: 'variant-filled-success',
					timeout: 3000,
				})
			},
		})
	}
}

/**
 * Creates an export handler for exporting all characters.
 * Returns a function that exports all characters from the store.
 */
export function createExportHandler(options: CreateExportHandlerOptions) {
	const { toastStore, playersStore } = options

	return function handleExportAll(): void {
		const players = get(playersStore)
		const playerCount = Object.keys(players).length

		if (playerCount === 0) {
			toastStore.trigger({
				message: 'No characters to export',
				background: 'variant-filled-warning',
				timeout: 3000,
			})
			return
		}

		try {
			exportAllCharacters(players)
			toastStore.trigger({
				message: `Exported ${playerCount} character${playerCount !== 1 ? 's' : ''} successfully`,
				background: 'variant-filled-success',
				timeout: 3000,
			})
		} catch (error) {
			toastStore.trigger({
				message: error instanceof Error ? error.message : 'Failed to export characters',
				background: 'variant-filled-error',
				timeout: 5000,
			})
		}
	}
}
