<script lang="ts">
	import type { SvelteComponent } from 'svelte';

	// Stores
	import { Accordion, AccordionItem, getModalStore } from '@skeletonlabs/skeleton';
	import { playersStore } from '$lib/stores/persisted.store';
	import { camelToTitleCase } from '$lib/util/string.util';
	import { BirthSignName, BirthSigns } from '$lib/data/birthSign';

	// Props
	/** Exposes parent props to this component. */
	export let parent: SvelteComponent

	const modalStore = getModalStore()

	let selectedBirthSign = $playersStore[$modalStore[0]?.meta.playerId]?.birthSign

	function onFormSubmit(): void {
		if ($modalStore[0]?.response) $modalStore[0].response(selectedBirthSign)
		modalStore.close()
	}

	// Base Classes
	const cBase = 'card p-4 w-modal-wide overflow-scroll max-h-[90vh] shadow-xl space-y-4'
	const cHeader = 'text-2xl font-bold'
</script>

{#if $modalStore[0]}
	<div class="modal-example-form {cBase}">
		<header class={cHeader}>Birth Sign</header>
		<article>
			<Accordion>
				{#each Object.values(BirthSignName) as sign}
					<AccordionItem>
						<svelte:fragment slot="summary">
							<span class="text-lg flex items-center space-x-2">
								<input
									class="radio"
									type="radio"
									bind:group={selectedBirthSign}
									name={sign}
									value={BirthSignName[sign]}
									on:click|stopPropagation
								/>
								<span>{sign}</span>
							</span>
						</svelte:fragment>
						<svelte:fragment slot="content">
							<div class="bg-surface-700 flex flex-col gap-4">
								{#each Object.entries(BirthSigns[sign]) as [key, value]}
									<div class="flex">
										<span class="font-bold min-w-[25%]">{camelToTitleCase(key)}</span>
										<span class="shrink">{value}</span>
									</div>
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
