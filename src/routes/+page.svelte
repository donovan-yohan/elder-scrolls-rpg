<script lang="ts">
	import { playersStore, versionResetOccurred } from '$lib/stores/persisted.store'
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton'
	import { createImportHandler, createExportHandler } from '$lib/util/importExportHandlers'
	import { onMount } from 'svelte'

	let showVersionWarning = false

	onMount(() => {
		if ($versionResetOccurred) {
			showVersionWarning = true
		}
	})

	function dismissVersionWarning() {
		showVersionWarning = false
		versionResetOccurred.set(false)
	}

	const modalStore = getModalStore()
	const toastStore = getToastStore()

	// Reactively update players list when store changes
	$: players = Object.values($playersStore)

	// File input reference for import
	let fileInput: HTMLInputElement

	// Create import/export handlers using shared utilities
	// forceNewIdOnConflict: true ensures we don't accidentally overwrite existing characters
	const handleFileSelect = createImportHandler({
		toastStore,
		modalStore,
		playersStore,
		forceNewIdOnConflict: true,
	})

	const handleExportAll = createExportHandler({
		toastStore,
		playersStore,
	})
</script>

<!-- Hidden file input for import -->
<input
	type="file"
	accept=".esrpg,.json"
	class="hidden"
	bind:this={fileInput}
	on:change={handleFileSelect}
/>

<div class="container h-full mx-auto flex justify-center items-center">
	<div class="space-y-10 text-center flex flex-col items-center">
		<h2 class="h2">Welcome to Skyrim RPG.</h2>
		<div class="flex justify-center space-x-2">
			<a
				href="/create"
				class="btn variant-filled-secondary"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Create Character
			</a>
			<button
				class="btn variant-filled-tertiary"
				on:click={() => fileInput.click()}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
				</svg>
				Import Character
			</button>
		</div>

		<!-- Character List -->
		{#if players.length > 0}
			<div class="w-full max-w-md space-y-3">
				<h3 class="h4 text-surface-600-300-token">Your Characters</h3>
				{#each players as player}
					<a href={`/${player.id}`} class="block">
						<div class="card p-4 variant-soft-surface hover:variant-filled-surface transition-all duration-200 flex items-center justify-between group">
							<div class="text-left">
								<div class="font-semibold group-hover:text-primary-500 transition-colors">
									{player.characterName || 'Unnamed Character'}
								</div>
								<div class="text-sm text-surface-500">
									Level {player.level} {player.race} {player.archetype}
								</div>
							</div>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-surface-400 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</a>
				{/each}
			</div>

			<!-- Backup Section -->
			<div class="pt-4 border-t border-surface-300-600-token">
				<button
					class="btn variant-ghost-surface btn-sm"
					on:click={handleExportAll}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					Backup All Characters
				</button>
			</div>
		{:else}
			<p class="text-surface-500">No characters yet. Create one to get started!</p>
		{/if}
	</div>

	<!-- Version Reset Warning Modal -->
	{#if showVersionWarning}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<div class="card p-6 max-w-md w-full space-y-4 variant-filled-warning">
				<h3 class="h3">Characters Reset</h3>
				<p>
					Your saved characters were created with an older version and have been removed.
					Please create new characters.
				</p>
				<div class="flex justify-end">
					<button
						class="btn variant-filled"
						on:click={dismissVersionWarning}
					>
						OK
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
