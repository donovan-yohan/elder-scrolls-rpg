<script lang="ts">
	import '../app.postcss'
	import {
		AppBar,
		AppShell,
		initializeStores,
		Modal,
		Toast,
		type ModalComponent,
		storePopup,
		getModalStore,
		getToastStore,
	} from '@skeletonlabs/skeleton'

	// Floating UI for Popups
	import { arrow, autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
	import ArchetypesModal from '$lib/modals/ArchetypesModal.svelte'
	import RaceModal from '$lib/modals/RaceModal.svelte'
	import BirthSignModal from '$lib/modals/BirthSignModal.svelte'
	import ImportPreviewModal from '$lib/modals/ImportPreviewModal.svelte'

	// Import/Export utilities
	import { playersStore } from '$lib/stores/persisted.store'
	import { createImportHandler, createExportHandler } from '$lib/util/importExport.util'

	initializeStores()

	const modalStore = getModalStore()
	const toastStore = getToastStore()

	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow })

	const modalRegistry: Record<string, ModalComponent> = {
		archetypesModal: { ref: ArchetypesModal },
		raceModal: { ref: RaceModal },
		birthSignModal: { ref: BirthSignModal },
		importPreviewModal: { ref: ImportPreviewModal },
	}

	// File input reference for import
	let fileInput: HTMLInputElement

	// Create import/export handlers using shared utilities
	const handleFileSelect = createImportHandler({
		toastStore,
		modalStore,
		playersStore,
		forceNewIdOnConflict: false,
	})

	const handleExportAll = createExportHandler({
		toastStore,
		playersStore,
	})

	// Check if there are any characters to export
	$: hasCharacters = Object.keys($playersStore).length > 0
</script>

<!-- Hidden file input for import -->
<input
	type="file"
	accept=".esrpg,.json"
	class="hidden"
	bind:this={fileInput}
	on:change={handleFileSelect}
/>

<Toast />
<Modal components={modalRegistry} />
<!-- App Shell -->
<AppShell>
	<svelte:fragment slot="header">
		<!-- App Bar -->
		<AppBar>
			<svelte:fragment slot="lead">
				<a href="/">
					<strong class="text-xl uppercase">Skyrim RPG</strong>
				</a>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<button
					class="btn btn-sm variant-filled"
					on:click={() => fileInput.click()}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
					</svg>
					Import
				</button>
				<button
					class="btn btn-sm variant-filled"
					on:click={handleExportAll}
					disabled={!hasCharacters}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					Export All
				</button>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
</AppShell>
