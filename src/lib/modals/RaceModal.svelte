<script lang="ts">
	import type { SvelteComponent } from 'svelte';

	// Stores
	import { Accordion, AccordionItem, getModalStore } from '@skeletonlabs/skeleton';
	import { playersStore } from '$lib/stores/persisted.store';
	import { Race, RaceName } from '$lib/data/race';

	// Props
	/** Exposes parent props to this component. */
	export let parent: SvelteComponent

	const modalStore = getModalStore()

	let selectedRace = $playersStore[$modalStore[0]?.meta.playerId]?.race

	function onFormSubmit(): void {
		if ($modalStore[0]?.response) $modalStore[0].response(selectedRace)
		modalStore.close()
	}



	// Base Classes
	const cBase = 'card p-4 w-modal-wide overflow-scroll max-h-[90vh] shadow-xl space-y-4'
	const cHeader = 'text-2xl font-bold'
</script>

{#if $modalStore[0]}
	<div class="modal-example-form {cBase}">
		<header class={cHeader}>Race</header>
		<article>
			<Accordion>
				{#each Object.values(RaceName) as race}
					<AccordionItem>
						<svelte:fragment slot="summary">
							<span class="text-lg flex items-center space-x-2">
								<input
									class="radio"
									type="radio"
									bind:group={selectedRace}
									name={race}
									value={RaceName[race]}
									on:click|stopPropagation
								/>
								<span>{race}</span>
							</span>
						</svelte:fragment>
						<svelte:fragment slot="content">
							<div class="bg-surface-700">
								{#each Race[race].description.split('\n') as line}
									<p>{line}</p>
								{/each}
							</div>
						</svelte:fragment>
					</AccordionItem>
				{/each}
			</Accordion>
		</article>

		<footer class="modal-footer {parent.regionFooter}">
			<button class="btn {parent.buttonNeutral}" on:click={parent.onClose}
				>{parent.buttonTextCancel}</button
			>
			<button class="btn {parent.buttonPositive}" on:click={onFormSubmit}
				>{parent.buttonTextSubmit}</button
			>
		</footer>
	</div>
{/if}
