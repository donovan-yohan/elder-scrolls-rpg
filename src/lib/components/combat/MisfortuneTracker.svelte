<script lang="ts">
	interface Props {
		misfortunePoints: number
		isGMMode?: boolean
		onSpendMisfortune?: (amount: number) => void
		onAddMisfortune?: (amount: number) => void
	}

	let { misfortunePoints, isGMMode = false, onSpendMisfortune, onAddMisfortune }: Props = $props()

	let spendAmount = $state(1)

	function handleSpend() {
		if (onSpendMisfortune && spendAmount > 0 && spendAmount <= misfortunePoints) {
			onSpendMisfortune(spendAmount)
			spendAmount = 1
		}
	}

	function handleAdd() {
		if (onAddMisfortune && spendAmount > 0) {
			onAddMisfortune(spendAmount)
			spendAmount = 1
		}
	}
</script>

<div class="card p-4 variant-soft-error">
	<header class="flex justify-between items-center mb-3">
		<h3 class="h4 font-bold text-error-500">Misfortune</h3>
		<span class="badge variant-filled-error text-lg px-4 py-1">
			{misfortunePoints}
		</span>
	</header>

	<!-- Visual representation -->
	<div class="flex flex-wrap gap-1 mb-3 min-h-[24px]">
		{#each Array(Math.min(misfortunePoints, 10)) as _, i}
			<div
				class="w-5 h-5 rounded-full bg-error-500 shadow-md"
				title="Misfortune Point"
			></div>
		{/each}
		{#if misfortunePoints > 10}
			<span class="text-sm text-error-500 self-center ml-1">+{misfortunePoints - 10} more</span>
		{/if}
		{#if misfortunePoints === 0}
			<span class="text-sm opacity-50 italic">No misfortune accumulated</span>
		{/if}
	</div>

	<!-- GM Controls -->
	{#if isGMMode && (onSpendMisfortune || onAddMisfortune)}
		<div class="border-t border-surface-500 pt-3 mt-3">
			<p class="text-xs opacity-75 mb-2">GM Controls</p>
			<div class="flex items-center gap-2">
				<label class="label flex-1">
					<span class="sr-only">Amount</span>
					<input
						type="number"
						class="input input-sm"
						min="1"
						max={Math.max(misfortunePoints, 10)}
						bind:value={spendAmount}
					/>
				</label>
				{#if onSpendMisfortune}
					<button
						type="button"
						class="btn btn-sm variant-filled-error"
						disabled={misfortunePoints < spendAmount || spendAmount < 1}
						onclick={handleSpend}
					>
						Spend
					</button>
				{/if}
				{#if onAddMisfortune}
					<button
						type="button"
						class="btn btn-sm variant-ghost-error"
						disabled={spendAmount < 1}
						onclick={handleAdd}
					>
						Add
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
