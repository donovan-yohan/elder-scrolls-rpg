<script lang="ts">
	import type { SvelteComponent } from 'svelte'
	import { getModalStore } from '@skeletonlabs/skeleton'
	import type { PlayerData } from '$lib/models/player'

	/** Exposes parent props to this component. */
	export let parent: SvelteComponent

	const modalStore = getModalStore()

	// Get data from modal meta
	$: importData = $modalStore[0]?.meta as {
		player?: PlayerData
		players?: PlayerData[]
		isMultiple: boolean
		existingIds: string[]
	}

	$: characters = importData?.isMultiple
		? (importData?.players ?? [])
		: importData?.player
			? [importData.player]
			: []

	$: hasConflicts = characters.some((p) => importData?.existingIds?.includes(p.id))

	// Track which characters to import and how
	let importMode: 'new' | 'replace' = 'new'

	function onImport(): void {
		if ($modalStore[0]?.response) {
			$modalStore[0].response({
				action: 'import',
				mode: importMode,
				characters,
			})
		}
		modalStore.close()
	}

	const cBase = 'card p-6 w-modal shadow-xl space-y-4'
	const cHeader = 'text-2xl font-bold'
</script>

{#if $modalStore[0]}
	<div class={cBase}>
		<header class={cHeader}>
			Import {importData?.isMultiple ? 'Characters' : 'Character'}
		</header>

		<article class="space-y-4">
			<!-- Character Preview -->
			<div class="space-y-2">
				<h3 class="font-semibold text-surface-600-300-token">
					{characters.length === 1 ? 'Character to Import:' : `${characters.length} Characters to Import:`}
				</h3>

				<div class="max-h-60 overflow-y-auto space-y-2">
					{#each characters as character}
						<div class="card p-3 variant-ghost-surface flex items-center justify-between">
							<div>
								<div class="font-medium">
									{character.characterName || 'Unnamed Character'}
								</div>
								<div class="text-sm text-surface-500">
									Level {character.level} {character.race} {character.archetype}
								</div>
							</div>
							{#if importData?.existingIds?.includes(character.id)}
								<span class="badge variant-filled-warning text-xs">
									ID Exists
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Conflict Resolution -->
			{#if hasConflicts}
				<div class="card p-4 variant-soft-warning space-y-2">
					<div class="flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<span class="font-semibold">Character ID Conflict</span>
					</div>
					<p class="text-sm">
						One or more characters have IDs that already exist in your character list.
					</p>
					<div class="flex flex-col gap-2 mt-3">
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								class="radio"
								type="radio"
								bind:group={importMode}
								value="new"
							/>
							<span>Import as new characters (generate new IDs)</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								class="radio"
								type="radio"
								bind:group={importMode}
								value="replace"
							/>
							<span>Replace existing characters</span>
						</label>
					</div>
				</div>
			{/if}
		</article>

		<footer class="modal-footer {parent.regionFooter}">
			<button class="btn {parent.buttonNeutral}" on:click={parent.onClose}>
				{parent.buttonTextCancel}
			</button>
			<button class="btn {parent.buttonPositive}" on:click={onImport}>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
				</svg>
				Import {characters.length === 1 ? 'Character' : `${characters.length} Characters`}
			</button>
		</footer>
	</div>
{/if}
