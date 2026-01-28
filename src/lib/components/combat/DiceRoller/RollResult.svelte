<script lang="ts">
	import type { DiceRoll } from '$lib/models/combat'

	interface Props {
		roll: DiceRoll
		targetDC?: number
		showBreakdown?: boolean
	}

	let { roll, targetDC = undefined, showBreakdown = true }: Props = $props()

	let success = $derived(targetDC !== undefined ? (roll.total >= targetDC || roll.isCritical) : undefined)
	let margin = $derived(targetDC !== undefined ? roll.total - targetDC : undefined)
</script>

<div class="roll-result p-4 rounded-lg" class:variant-soft-success={success === true} class:variant-soft-error={success === false} class:variant-soft-surface={success === undefined}>
	<!-- Magicka Burst Indicator -->
	{#if roll.isMagickaBurst}
		<div class="text-center mb-2">
			<span class="badge variant-filled-tertiary text-xs">Magicka Burst</span>
		</div>
	{/if}

	<!-- Main Result -->
	<div class="text-center mb-2">
		<span class="text-3xl font-bold" class:text-success-500={roll.isCritical} class:text-error-500={roll.isCriticalFail}>
			{roll.total}
		</span>
		{#if roll.isCritical}
			<span class="badge variant-filled-success ml-2">CRITICAL!</span>
		{/if}
		{#if roll.isCriticalFail}
			<span class="badge variant-filled-error ml-2">FUMBLE!</span>
		{/if}
		{#if roll.wasDowngradedFromCrit}
			<span class="badge variant-soft-warning ml-2 text-xs">Crit Suppressed</span>
		{/if}
	</div>

	<!-- Success/Failure vs DC -->
	{#if targetDC !== undefined}
		<div class="text-center text-sm mb-2">
			vs DC {targetDC}:
			{#if success}
				<span class="text-success-500 font-semibold">Success (+{margin})</span>
			{:else}
				<span class="text-error-500 font-semibold">Failure ({margin})</span>
			{/if}
		</div>
	{/if}

	<!-- Breakdown -->
	{#if showBreakdown}
		<div class="text-sm text-surface-600-300-token text-center">
			<span class="font-mono">d20({roll.baseRoll})</span>
			{#each roll.bonuses as bonus}
				<span class="font-mono"> {bonus.value >= 0 ? '+' : ''}{bonus.value} <span class="text-xs opacity-75">({bonus.source})</span></span>
			{/each}
		</div>
		{#if roll.advantageCount !== 0}
			<div class="text-xs text-center mt-1 opacity-75">
				{roll.advantageCount > 0 ? `${roll.advantageCount} advantage` : `${Math.abs(roll.advantageCount)} disadvantage`}
			</div>
		{/if}
	{/if}
</div>
