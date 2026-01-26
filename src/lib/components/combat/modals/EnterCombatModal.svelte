<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { PlayerData } from '$lib/models/player'
	import {
		getPlayerInitiativeModifiers,
		calculatePlayerInitiativeContribution,
		type InitiativeModifiers,
		type InitiativeRollResult
	} from '$lib/util/initiative.util'
	import { rollD20 } from '$lib/util/dice.util'

	export let player: PlayerData

	const dispatch = createEventDispatcher<{
		start: { partyInit: number; enemyInit: number }
		cancel: void
	}>()

	let partyInitiative = 0
	let enemyInitiative = 0
	let playerRollResult: InitiativeRollResult | null = null
	let enemyRoll: number | null = null

	const initiativeModifiers: InitiativeModifiers = getPlayerInitiativeModifiers(player)

	function rollPlayerInitiative() {
		playerRollResult = calculatePlayerInitiativeContribution(initiativeModifiers)
		partyInitiative = playerRollResult.total
	}

	function rollEnemyInitiative() {
		enemyRoll = rollD20()
		enemyInitiative = enemyRoll
	}

	function rollAllInitiative() {
		rollPlayerInitiative()
		rollEnemyInitiative()
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
		<!-- Initiative Modifiers Display -->
		<div class="card variant-soft p-3">
			<h4 class="font-semibold text-sm mb-2">Your Initiative Modifiers</h4>
			<div class="text-sm space-y-1">
				<div class="flex justify-between">
					<span>Advantage Dice (d6):</span>
					<span class="font-medium">{initiativeModifiers.d6Count}</span>
				</div>
				<div class="flex justify-between">
					<span>Flat Bonus:</span>
					<span class="font-medium">+{initiativeModifiers.flatBonus}</span>
				</div>
			</div>
		</div>

		<!-- Roll Initiative Button -->
		<div class="text-center">
			<button type="button" class="btn variant-filled-primary" on:click={rollAllInitiative}>
				Roll All Initiative
			</button>
		</div>

		<!-- Player Roll Results -->
		{#if playerRollResult}
			<div class="card variant-soft p-3">
				<h4 class="font-semibold text-sm mb-2">Player Initiative Breakdown</h4>
				<div class="text-sm space-y-1">
					<div class="flex justify-between">
						<span>d20 Roll:</span>
						<span class="font-medium">{playerRollResult.d20Roll}</span>
					</div>
					<div class="flex justify-between">
						<span>d6 Advantage Roll:</span>
						<span class="font-medium">+{playerRollResult.d6AdvantageRoll}</span>
					</div>
					<div class="flex justify-between">
						<span>Flat Bonus:</span>
						<span class="font-medium">+{playerRollResult.flatBonus}</span>
					</div>
					<div class="border-t border-surface-400-500-token pt-1 mt-1">
						<div class="flex justify-between font-bold">
							<span>Total:</span>
							<span class="text-primary-500">{playerRollResult.total}</span>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Enemy Roll Results -->
		{#if enemyRoll !== null}
			<div class="card variant-soft p-3">
				<h4 class="font-semibold text-sm mb-2">Enemy Initiative</h4>
				<div class="text-sm space-y-1">
					<div class="flex justify-between">
						<span>d20 Roll:</span>
						<span class="font-medium">{enemyRoll}</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Party Initiative -->
		<label class="label">
			<span>Party Initiative Total</span>
			<input type="number" class="input" bind:value={partyInitiative} min="0" />
		</label>

		<!-- Enemy Initiative -->
		<label class="label">
			<span>Enemy Initiative Total</span>
			<input type="number" class="input" bind:value={enemyInitiative} min="0" />
		</label>
	</div>

	<footer class="flex justify-end gap-2 mt-6">
		<button type="button" class="btn variant-ghost" on:click={handleCancel}>Cancel</button>
		<button type="button" class="btn variant-filled-primary" on:click={handleConfirm}
			>Start Combat</button
		>
	</footer>
</div>
