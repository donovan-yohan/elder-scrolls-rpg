<script lang="ts">
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton'
	import type { DiceRoll, DiceRollBonus } from '$lib/models/combat'
	import { rollD20, isCriticalSuccess, isCriticalFailure, performSkillCheck } from '$lib/util/dice.util'
	import RollResult from './RollResult.svelte'
	import ManualEntry from './ManualEntry.svelte'

	export let onRoll: (roll: DiceRoll, success: boolean, margin: number) => void
	export let skillBonus: number = 0
	export let bonuses: DiceRollBonus[] = []
	export let targetDC: number | undefined = undefined
	export let advantageCount: number = 0
	export let playerLevel: number = 1
	export let disabled: boolean = false
	export let label: string = 'Roll'

	let mode: 'digital' | 'manual' = 'digital'
	let lastRoll: DiceRoll | undefined = undefined
	let lastSuccess: boolean | undefined = undefined
	let isRolling: boolean = false

	async function handleDigitalRoll() {
		if (disabled || isRolling) return

		isRolling = true
		lastRoll = undefined

		// Brief animation delay
		await new Promise(r => setTimeout(r, 500))

		const baseRoll = rollD20(advantageCount)
		const result = performSkillCheck(baseRoll, skillBonus, bonuses, targetDC ?? 0, playerLevel, advantageCount)

		lastRoll = result.roll
		lastSuccess = targetDC !== undefined ? result.success : undefined
		isRolling = false

		onRoll(result.roll, result.success, result.margin)
	}

	function handleManualRoll(value: number) {
		const allBonuses: DiceRollBonus[] = [
			{ source: 'Skill', value: skillBonus },
			...bonuses
		]
		const total = value + allBonuses.reduce((sum, b) => sum + b.value, 0)

		const roll: DiceRoll = {
			baseRoll: value,
			bonuses: allBonuses,
			advantageCount: 0,
			total,
			isCritical: isCriticalSuccess(value, playerLevel),
			isCriticalFail: isCriticalFailure(value, playerLevel)
		}

		const success = targetDC !== undefined ? (total >= targetDC || roll.isCritical) : true
		const margin = targetDC !== undefined ? total - targetDC : 0

		lastRoll = roll
		lastSuccess = targetDC !== undefined ? success : undefined

		onRoll(roll, success, margin)
	}

	function reset() {
		lastRoll = undefined
		lastSuccess = undefined
	}
</script>

<div class="dice-roller card p-4 variant-soft-surface">
	<!-- Mode Toggle -->
	<div class="mb-4">
		<RadioGroup>
			<RadioItem bind:group={mode} name="roll-mode" value="digital">
				Roll In-App
			</RadioItem>
			<RadioItem bind:group={mode} name="roll-mode" value="manual">
				Enter Roll
			</RadioItem>
		</RadioGroup>
	</div>

	<!-- Roll Info -->
	{#if targetDC !== undefined}
		<div class="text-sm text-center mb-2">
			Target DC: <span class="font-bold">{targetDC}</span>
		</div>
	{/if}

	{#if skillBonus !== 0 || bonuses.length > 0}
		<div class="text-xs text-center mb-2 opacity-75">
			Modifiers: +{skillBonus} skill
			{#each bonuses as bonus}
				{bonus.value >= 0 ? '+' : ''}{bonus.value} ({bonus.source})
			{/each}
		</div>
	{/if}

	<!-- Roll Controls -->
	<div class="flex justify-center mb-4">
		{#if mode === 'digital'}
			<button
				type="button"
				class="btn variant-filled-primary"
				on:click={handleDigitalRoll}
				disabled={disabled || isRolling}
			>
				{#if isRolling}
					<span class="animate-spin mr-2">🎲</span> Rolling...
				{:else}
					🎲 {label}
				{/if}
			</button>
		{:else}
			<ManualEntry onSubmit={handleManualRoll} {disabled} />
		{/if}
	</div>

	<!-- Result Display -->
	{#if lastRoll}
		<RollResult roll={lastRoll} {targetDC} />
		<div class="text-center mt-2">
			<button type="button" class="btn btn-sm variant-ghost" on:click={reset}>
				Roll Again
			</button>
		</div>
	{/if}
</div>
