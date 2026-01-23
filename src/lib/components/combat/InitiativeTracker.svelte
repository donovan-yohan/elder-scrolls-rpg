<script lang="ts">
	export let partyInitiative: number
	export let enemyInitiative: number
	export let onAdjustParty: (delta: number) => void
	export let onAdjustEnemy: (delta: number) => void
</script>

<div class="initiative-tracker card p-4 variant-soft-surface">
	<h4 class="font-semibold text-center mb-4">Initiative</h4>

	<div class="grid grid-cols-2 gap-4">
		<!-- Party Initiative -->
		<div class="text-center">
			<div class="text-xs uppercase tracking-wide opacity-75 mb-1">Party</div>
			<div class="text-4xl font-bold text-primary-500 mb-2">{partyInitiative}</div>
			<div class="flex justify-center gap-1">
				<button
					type="button"
					class="btn btn-sm variant-ghost-error"
					on:click={() => onAdjustParty(-1)}
					disabled={partyInitiative <= 0}
				>
					-
				</button>
				<button
					type="button"
					class="btn btn-sm variant-ghost-success"
					on:click={() => onAdjustParty(1)}
				>
					+
				</button>
			</div>
		</div>

		<!-- Enemy Initiative -->
		<div class="text-center">
			<div class="text-xs uppercase tracking-wide opacity-75 mb-1">Enemy</div>
			<div class="text-4xl font-bold text-error-500 mb-2">{enemyInitiative}</div>
			<div class="flex justify-center gap-1">
				<button
					type="button"
					class="btn btn-sm variant-ghost-error"
					on:click={() => onAdjustEnemy(-1)}
					disabled={enemyInitiative <= 0}
				>
					-
				</button>
				<button
					type="button"
					class="btn btn-sm variant-ghost-success"
					on:click={() => onAdjustEnemy(1)}
				>
					+
				</button>
			</div>
		</div>
	</div>

	<!-- Advantage Indicator -->
	<div class="mt-4 pt-3 border-t border-surface-500/20 text-center text-sm">
		{#if partyInitiative > enemyInitiative}
			<span class="text-primary-500 font-semibold">Party has initiative advantage!</span>
		{:else if enemyInitiative > partyInitiative}
			<span class="text-error-500 font-semibold">Enemy has initiative advantage!</span>
		{:else}
			<span class="opacity-75">Initiative is tied</span>
		{/if}
	</div>
</div>
