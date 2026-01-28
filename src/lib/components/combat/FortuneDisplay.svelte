<script lang="ts">
	interface Props {
		fortunePoints: number
		misfortunePoints: number
		onSpendMisfortune?: () => void
	}

	let { fortunePoints, misfortunePoints, onSpendMisfortune }: Props = $props()
</script>

<div class="fortune-display card p-4 variant-soft-surface">
	<h3 class="h4 mb-3">Fortune & Misfortune</h3>

	<div class="grid grid-cols-2 gap-4">
		<!-- Fortune Points -->
		<div class="text-center">
			<div class="text-3xl font-bold text-tertiary-500">{fortunePoints}</div>
			<div class="text-sm opacity-75">Fortune</div>
			<div class="text-xs mt-1 opacity-50">Use on any roll</div>
		</div>

		<!-- Misfortune Points -->
		<div class="text-center">
			<div class="text-3xl font-bold text-warning-500">{misfortunePoints}</div>
			<div class="text-sm opacity-75">Misfortune</div>
			{#if misfortunePoints > 0 && onSpendMisfortune}
				<button
					type="button"
					class="btn btn-sm variant-ghost-warning mt-1"
					onclick={onSpendMisfortune}
				>
					GM Spend
				</button>
			{:else}
				<div class="text-xs mt-1 opacity-50">GM controlled</div>
			{/if}
		</div>
	</div>
</div>
