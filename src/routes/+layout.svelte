<script lang="ts">
	import '../app.postcss';
	import { AppBar, AppShell, storePopup } from '@skeletonlabs/skeleton';

	// Floating UI for Popups
	import { arrow, autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';

	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
</script>

<!-- App Shell -->
<AppShell>
	<svelte:fragment slot="header">
		<!-- App Bar -->
		<AppBar>
			<svelte:fragment slot="lead">
				<strong class="text-xl uppercase">Skyrim RPG</strong>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<a
					class="btn btn-sm variant-filled"
					href="/create"
				>
					Create
				</a>
				<a
					class="btn btn-sm variant-filled"
					href="https://skeleton.dev/"
				>
					Import
				</a>
				<a
					class="btn btn-sm variant-filled"
					href="https://skeleton.dev/"
				>
					Export
				</a>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot />
</AppShell>
