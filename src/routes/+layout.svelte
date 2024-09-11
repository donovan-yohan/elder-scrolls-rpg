<script lang="ts">
	import '../app.postcss';
	import { AppBar, AppShell, initializeStores, Modal, type ModalComponent, storePopup } from '@skeletonlabs/skeleton';

	// Floating UI for Popups
	import { arrow, autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
	import ArchetypesModal from '$lib/modals/ArchetypesModal.svelte';
	import RaceModal from '$lib/modals/RaceModal.svelte';
	import BirthSignModal from '$lib/modals/BirthSignModal.svelte';

	initializeStores()

	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow })

	const modalRegistry: Record<string, ModalComponent> = {
		archetypesModal: { ref: ArchetypesModal },
		raceModal: { ref: RaceModal },
		birthSignModal: { ref: BirthSignModal },
	}
</script>

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
				<button class="btn btn-sm variant-filled" disabled> Import </button>
				<button class="btn btn-sm variant-filled" disabled> Export </button>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
</AppShell>
