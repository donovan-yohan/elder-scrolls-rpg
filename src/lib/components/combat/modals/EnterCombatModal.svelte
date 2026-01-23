<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { PlayerData } from '$lib/models/player'
	import { getInitiativeSkills, calculateInitiativeContribution } from '$lib/util/initiative.util'
	import { rollD20, isCriticalSuccess } from '$lib/util/dice.util'

	export let player: PlayerData

	const dispatch = createEventDispatcher<{
		start: { partyInit: number; enemyInit: number }
		cancel: void
	}>()

	let partyInitiative = 0
	let enemyInitiative = 0
	let playerGoesFirst = true
	let rollResults: { skill: string; total: number; isCritical: boolean }[] = []

	const initiativeSkills = getInitiativeSkills(player)

	function rollAllInitiative() {
		rollResults = initiativeSkills.map((info) => {
			const baseRoll = rollD20(info.advantageCount)
			const total = baseRoll + info.flatBonus
			const isCritical = isCriticalSuccess(baseRoll, player.level)
			return { skill: info.skill, total, isCritical }
		})

		partyInitiative = calculateInitiativeContribution(rollResults)
	}

	function handleConfirm() {
		dispatch('start', { partyInit: partyInitiative, enemyInit: enemyInitiative })
	}

	function handleCancel() {
		dispatch('cancel')
	}
</script>

<div class="card p-6 w-full max-w-lg">
	<header class="mb-4">
		<h3 class="h3 font-bold">Enter Combat</h3>
		<p class="text-surface-600-300-token">Roll initiative to begin combat</p>
	</header>

	<div class="space-y-4">
		<!-- Roll Initiative Button -->
		<div class="text-center">
			<button type="button" class="btn variant-filled-primary" on:click={rollAllInitiative}>
				Roll All Initiative ({initiativeSkills.length} skills)
			</button>
		</div>

		<!-- Roll Results -->
		{#if rollResults.length > 0}
			<div class="card variant-soft p-3 max-h-40 overflow-y-auto">
				{#each rollResults as result}
					<div class="flex justify-between text-sm py-1">
						<span>{result.skill}</span>
						<span class:text-success-500={result.isCritical}>
							{result.total} {result.isCritical ? '(CRIT!)' : ''}
						</span>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Party Initiative -->
		<label class="label">
			<span>Party Initiative (Successes)</span>
			<input type="number" class="input" bind:value={partyInitiative} min="0" />
		</label>

		<!-- Enemy Initiative -->
		<label class="label">
			<span>Enemy Initiative</span>
			<input type="number" class="input" bind:value={enemyInitiative} min="0" />
		</label>

		<!-- Who Goes First -->
		<div class="space-y-2">
			<span class="text-sm font-medium">Who goes first?</span>
			<div class="flex gap-4">
				<label class="flex items-center gap-2">
					<input type="radio" class="radio" bind:group={playerGoesFirst} value={true} />
					<span>Party</span>
				</label>
				<label class="flex items-center gap-2">
					<input type="radio" class="radio" bind:group={playerGoesFirst} value={false} />
					<span>Enemy</span>
				</label>
			</div>
		</div>
	</div>

	<footer class="flex justify-end gap-2 mt-6">
		<button type="button" class="btn variant-ghost" on:click={handleCancel}>Cancel</button>
		<button type="button" class="btn variant-filled-primary" on:click={handleConfirm}
			>Start Combat</button
		>
	</footer>
</div>
