<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton'
	import type { PlayerData } from '$lib/models/player'
	import {
		getPlayerInitiativeModifiers,
		calculatePlayerInitiativeContribution,
		calculateManualInitiative,
		type InitiativeModifiers,
		type InitiativeRollResult
	} from '$lib/util/initiative.util'
	import { camelToTitleCase } from '$lib/util/string.util'

	export let player: PlayerData

	const dispatch = createEventDispatcher<{
		start: { partyInit: number; enemyInit: number }
		cancel: void
	}>()

	// State
	let rollMode: 'digital' | 'manual' = 'digital'
	let playerRollResult: InitiativeRollResult | null = null
	let isRolling = false

	// Manual entry state
	let manualD20: number = 10
	let manualD6Values: number[] = []

	// Enemy initiative (always manual entry)
	let enemyInitiative: number | null = null

	// Get modifiers with skill tracking
	const initiativeModifiers: InitiativeModifiers = getPlayerInitiativeModifiers(player)

	// Initialize manual d6 array based on d6Count
	$: {
		if (manualD6Values.length !== initiativeModifiers.d6Count) {
			manualD6Values = Array(initiativeModifiers.d6Count).fill(1)
		}
	}

	// Derived: can start combat
	$: canStartCombat = playerRollResult !== null && enemyInitiative !== null

	async function handleDigitalRoll() {
		if (isRolling) return
		isRolling = true

		// Brief animation delay
		await new Promise((r) => setTimeout(r, 500))

		playerRollResult = calculatePlayerInitiativeContribution(initiativeModifiers)
		isRolling = false
	}

	function handleManualSubmit() {
		playerRollResult = calculateManualInitiative(
			manualD20,
			manualD6Values,
			initiativeModifiers.flatBonus
		)
	}

	function resetRoll() {
		playerRollResult = null
	}

	function handleConfirm() {
		if (!playerRollResult || enemyInitiative === null) return
		dispatch('start', {
			partyInit: playerRollResult.total,
			enemyInit: enemyInitiative
		})
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
		<!-- Initiative Modifiers with Skill Chips -->
		<div class="card variant-soft p-3">
			<h4 class="font-semibold text-sm mb-3">Your Initiative Modifiers</h4>

			<!-- Advantage Dice (d6) from Major Skills -->
			<div class="mb-3">
				<div class="flex items-center gap-2 mb-1">
					<span class="text-sm">Advantage Dice (d6):</span>
					<span class="font-bold">{initiativeModifiers.d6Count}</span>
				</div>
				{#if initiativeModifiers.d6Skills.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each initiativeModifiers.d6Skills as skill}
							<span class="badge variant-filled-primary text-xs">
								{camelToTitleCase(skill)}
							</span>
						{/each}
					</div>
				{:else}
					<span class="text-xs text-surface-500">No major initiative skills</span>
				{/if}
			</div>

			<!-- Flat Bonus from Minor Skills -->
			<div>
				<div class="flex items-center gap-2 mb-1">
					<span class="text-sm">Flat Bonus:</span>
					<span class="font-bold">+{initiativeModifiers.flatBonus}</span>
				</div>
				{#if initiativeModifiers.flatBonusSkills.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each initiativeModifiers.flatBonusSkills as skill}
							<span class="badge variant-filled-secondary text-xs">
								{camelToTitleCase(skill)}
							</span>
						{/each}
					</div>
				{:else}
					<span class="text-xs text-surface-500">No minor initiative skills</span>
				{/if}
			</div>
		</div>

		<!-- Player Initiative Rolling Section -->
		<div class="card variant-soft p-3">
			<h4 class="font-semibold text-sm mb-3">Player Initiative</h4>

			<!-- Mode Toggle -->
			<div class="mb-4">
				<RadioGroup>
					<RadioItem bind:group={rollMode} name="roll-mode" value="digital">
						Roll In-App
					</RadioItem>
					<RadioItem bind:group={rollMode} name="roll-mode" value="manual">
						Enter Roll
					</RadioItem>
				</RadioGroup>
			</div>

			{#if !playerRollResult}
				<!-- Roll Controls -->
				{#if rollMode === 'digital'}
					<div class="text-center">
						<button
							type="button"
							class="btn variant-filled-primary"
							on:click={handleDigitalRoll}
							disabled={isRolling}
						>
							{#if isRolling}
								<span class="animate-spin mr-2">🎲</span> Rolling...
							{:else}
								🎲 Roll Initiative
							{/if}
						</button>
						<div class="text-xs text-surface-500 mt-1">
							1d20 + {initiativeModifiers.d6Count}d6 (highest) + {initiativeModifiers.flatBonus}
						</div>
					</div>
				{:else}
					<!-- Manual Entry -->
					<div class="space-y-3">
						<div class="flex items-center gap-2">
							<label class="flex-1">
								<span class="text-xs">d20 Roll</span>
								<input
									type="number"
									class="input"
									bind:value={manualD20}
									min="1"
									max="20"
								/>
							</label>
						</div>

						{#if initiativeModifiers.d6Count > 0}
							<div>
								<span class="text-xs">d6 Rolls (enter each die)</span>
								<div class="flex gap-2 mt-1">
									{#each manualD6Values as _, i}
										<input
											type="number"
											class="input w-16 text-center"
											bind:value={manualD6Values[i]}
											min="1"
											placeholder="d6"
										/>
									{/each}
								</div>
								<div class="text-xs text-surface-500 mt-1">
									Tip: Enter 6+ if the die exploded (e.g., rolled 6 then 4 = enter 10)
								</div>
							</div>
						{/if}

						<div class="text-center">
							<button
								type="button"
								class="btn variant-filled-primary"
								on:click={handleManualSubmit}
							>
								Use These Values
							</button>
						</div>
					</div>
				{/if}
			{:else}
				<!-- Roll Result Breakdown -->
				<div class="card variant-soft-primary p-3 mb-3">
					<h5 class="text-xs uppercase tracking-wide opacity-75 mb-2">Roll Breakdown</h5>

					<div class="space-y-2 text-sm">
						<!-- d20 Roll -->
						<div class="flex justify-between">
							<span>d20 Roll:</span>
							<span class="font-bold">{playerRollResult.d20Roll}</span>
						</div>

						<!-- d6 Rolls (show each die) -->
						{#if playerRollResult.d6Rolls.length > 0}
							<div class="flex justify-between items-start">
								<span>d6 Rolls:</span>
								<div class="text-right">
									<div class="flex gap-1 justify-end mb-1">
										{#each playerRollResult.d6Rolls as roll}
											<span
												class="badge text-xs"
												class:variant-filled-primary={roll === playerRollResult.d6AdvantageRoll}
												class:variant-soft={roll !== playerRollResult.d6AdvantageRoll}
											>
												{roll}
											</span>
										{/each}
									</div>
									<span class="text-xs opacity-75">
										Best: +{playerRollResult.d6AdvantageRoll}
									</span>
								</div>
							</div>
						{/if}

						<!-- Flat Bonus -->
						<div class="flex justify-between">
							<span>Flat Bonus:</span>
							<span class="font-bold">+{playerRollResult.flatBonus}</span>
						</div>

						<!-- Total -->
						<div class="border-t border-surface-400-500-token pt-2 mt-2">
							<div class="flex justify-between font-bold">
								<span>Total:</span>
								<span class="text-primary-500 text-xl">{playerRollResult.total}</span>
							</div>
						</div>
					</div>
				</div>

				<div class="text-center">
					<button type="button" class="btn btn-sm variant-ghost" on:click={resetRoll}>
						Roll Again
					</button>
				</div>
			{/if}
		</div>

		<!-- Enemy Initiative (always manual entry) -->
		<div class="card variant-soft p-3">
			<h4 class="font-semibold text-sm mb-2">Enemy Initiative</h4>
			<p class="text-xs text-surface-500 mb-2">
				Enter the enemy's initiative as rolled by the GM
			</p>
			<input
				type="number"
				class="input"
				bind:value={enemyInitiative}
				min="0"
				placeholder="Enter enemy initiative..."
			/>
		</div>
	</div>

	<footer class="flex justify-end gap-2 mt-6">
		<button type="button" class="btn variant-ghost" on:click={handleCancel}>Cancel</button>
		<button
			type="button"
			class="btn variant-filled-primary"
			on:click={handleConfirm}
			disabled={!canStartCombat}
		>
			Start Combat
		</button>
	</footer>
</div>
