<script lang="ts">
	interface Props {
		current: number
		max: number
		onSpend?: () => void
		disabled?: boolean
	}

	let { current, max, onSpend, disabled = false }: Props = $props()

	let canSpend = $derived(current > 0 && !disabled)
</script>

<div class="spirit-tracker card p-4 variant-soft-secondary">
	<div class="flex justify-between items-center mb-2">
		<h4 class="font-bold text-secondary-700 dark:text-secondary-300">Spirit Points</h4>
		<span class="text-lg font-bold">{current} / {max}</span>
	</div>

	<div class="flex gap-1 mb-3">
		{#each Array(max) as _, i}
			<div
				class="w-8 h-8 rounded-full flex items-center justify-center transition-colors {i < current ? 'bg-secondary-500' : 'bg-surface-500/30'}"
			>
				{#if i < current}
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
					</svg>
				{/if}
			</div>
		{/each}
	</div>

	{#if onSpend}
		<button
			type="button"
			class="btn btn-sm variant-filled-secondary w-full"
			onclick={onSpend}
			disabled={!canSpend}
		>
			{#if canSpend}
				Spend Spirit Point (Revive)
			{:else if current === 0}
				No Spirit Points Remaining
			{:else}
				Cannot Spend
			{/if}
		</button>
	{/if}

	<p class="text-xs opacity-75 mt-2">
		Spend when HP reaches 0 to revive with a complication.
	</p>
</div>
