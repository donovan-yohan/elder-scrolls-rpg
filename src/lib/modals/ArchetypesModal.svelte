<script lang="ts">
	import type { SvelteComponent } from 'svelte';

	// Stores
	import { getModalStore, RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
	import { ArchetypeName, Archetypes } from '$lib/data/archetype';
	import { playersStore } from '$lib/stores/persisted.store';
	import { camelToTitleCase } from '$lib/util/string.util';

	// Props
	/** Exposes parent props to this component. */
	export let parent: SvelteComponent

	const modalStore = getModalStore()

	let selectedArchetype = $playersStore[$modalStore[0]?.meta.playerId]?.archetype

	$: if (selectedArchetype && Archetypes[selectedArchetype] === undefined) selectedArchetype = ArchetypeName.Warrior

	function onFormSubmit(): void {
		if ($modalStore[0]?.response) $modalStore[0].response(selectedArchetype)
		modalStore.close()
	}

	// Base Classes
	const cBase = 'card p-4 w-modal-wide overflow-scroll max-h-[90vh] shadow-xl space-y-4'
	const cHeader = 'text-2xl font-bold'
</script>

<!-- @component This example creates a simple form modal. -->

{#if $modalStore[0]}
	<div class="modal-example-form {cBase}">
		<header class={cHeader}>Archetype</header>
		<article class="flex flex-col gap-4">
			<RadioGroup display="flex">
				{#each Object.values(ArchetypeName) as archetype}
					<RadioItem bind:group={selectedArchetype} name={archetype} value={ArchetypeName[archetype]}>
						{archetype}
					</RadioItem>
				{/each}
			</RadioGroup>
			{#if selectedArchetype}
				<div class="flex">
					<div class="min-w-[33%] flex flex-col">
						<strong>Health</strong>
						<span>{camelToTitleCase(Archetypes[selectedArchetype].maxHealth)}</span>
					</div>
					<div class="min-w-[33%] flex flex-col">
						<strong>Magicka</strong>
						<span>{camelToTitleCase(Archetypes[selectedArchetype].maxMagicka)}</span>
					</div>
					<div class="min-w-[33%] flex flex-col">
						<strong>Action Points</strong>
						<span>{camelToTitleCase(Archetypes[selectedArchetype].maxActionPoints)}</span>
					</div>
				</div>
			{/if}
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
