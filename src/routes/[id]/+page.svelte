<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { Level } from '$lib/data/level';
	import { Archetypes } from '$lib/data/archetype';
	import { playersStore } from '$lib/stores/persisted.store';

	export let data

	const modalStore = getModalStore()
</script>

<div class="container p-12">
	{#if $playersStore[data.id] !== undefined}
		<div class="flex flex-col gap-8">
			<div class="flex flex-row gap-4">
				<label>
					<span>Level</span>
					<input
						class="input"
						type="number"
						name="id"
						bind:value={$playersStore[data.id].level}
						min="1"
						max="20"
					/>
				</label>
				<label>
					<span>Character Name</span>
					<input class="input" name="id" bind:value={$playersStore[data.id].characterName} />
				</label>
				<label>
					<span>Archetype</span>
					<select
						class="select"
						on:click|preventDefault={() =>
							modalStore.trigger({
								type: 'component',
								component: 'archetypesModal',
								meta: { playerId: $playersStore[data.id].id },
								response: (newArchetype) => {
									if (newArchetype) $playersStore[data.id].archetype = newArchetype
								},
							})}
					>
						<option value={$playersStore[data.id].archetype}>{$playersStore[data.id].archetype}</option>
					</select>
				</label>
				<label>
					<span>Race</span>
					<select
						class="select"
						on:click|preventDefault={() =>
							modalStore.trigger({
								type: 'component',
								component: 'raceModal',
								meta: { playerId: $playersStore[data.id].id },
								response: (newRace) => {
									if (newRace) $playersStore[data.id].race = newRace
								},
							})}
					>
						<option value={$playersStore[data.id].race}>{$playersStore[data.id].race}</option>
					</select>
				</label>
				<label>
					<span>Birth Sign</span>
					<select
						class="select"
						on:click|preventDefault={() =>
							modalStore.trigger({
								type: 'component',
								component: 'birthSignModal',
								meta: { playerId: $playersStore[data.id].id },
								response: (newBirthSign) => {
									if (newBirthSign) $playersStore[data.id].birthSign = newBirthSign
								},
							})}
					>
						<option value={$playersStore[data.id].birthSign}>{$playersStore[data.id].birthSign}</option>
					</select>
				</label>
			</div>
			<div class="flex flex-row justify-between">
				<div>
					<div class="text-4xl font-bold">HP</div>
					<div class="text-2xl">
						{$playersStore[data.id].maxHealth +
							(Level[$playersStore[data.id].level]?.[Archetypes[$playersStore[data.id].archetype]?.maxHealth] ?? 0)}
					</div>
				</div>
				<div>
					<div class="text-4xl font-bold">Magicka</div>
					<div class="text-2xl">
						{$playersStore[data.id].maxMagicka +
							(Level[$playersStore[data.id].level]?.[Archetypes[$playersStore[data.id].archetype]?.maxMagicka] ?? 0)}
					</div>
				</div>
				<div>
					<div class="text-4xl font-bold">AP</div>
					<div class="text-2xl">
						{$playersStore[data.id].maxActionPoints +
							(Level[$playersStore[data.id].level]?.[Archetypes[$playersStore[data.id].archetype]?.maxActionPoints] ?? 0)}
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div>Player not found</div>
	{/if}
</div>
