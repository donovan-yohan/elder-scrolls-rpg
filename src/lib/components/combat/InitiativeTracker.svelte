<script lang="ts">
	import type { InitiativePool } from '$lib/models/combat'

	export let partyPool: InitiativePool
	export let enemyPool: InitiativePool
	export let onAdjustParty: (delta: number) => void
	export let onAdjustEnemy: (delta: number) => void
</script>

<div class="initiative-tracker card p-4 variant-soft-surface">
	<h4 class="font-semibold text-center mb-4">Initiative</h4>

	<div class="grid grid-cols-2 gap-4">
		<!-- Party Initiative -->
		<div class="text-center">
			<div class="text-xs uppercase tracking-wide opacity-75 mb-1">Party</div>
			<div class="text-4xl font-bold text-primary-500">
				{partyPool.current}
			</div>
			<div class="text-sm opacity-60 mb-2">/ {partyPool.max}</div>
			<div class="flex justify-center gap-1">
				<button
					type="button"
					class="btn btn-sm variant-ghost-error"
					on:click={() => onAdjustParty(-1)}
					disabled={partyPool.current <= 0}
				>
					-
				</button>
				<button
					type="button"
					class="btn btn-sm variant-ghost-success"
					on:click={() => onAdjustParty(1)}
					disabled={partyPool.current >= partyPool.max}
				>
					+
				</button>
			</div>
		</div>

		<!-- Enemy Initiative -->
		<div class="text-center">
			<div class="text-xs uppercase tracking-wide opacity-75 mb-1">Enemy</div>
			<div class="text-4xl font-bold text-error-500">
				{enemyPool.current}
			</div>
			<div class="text-sm opacity-60 mb-2">/ {enemyPool.max}</div>
			<div class="flex justify-center gap-1">
				<button
					type="button"
					class="btn btn-sm variant-ghost-error"
					on:click={() => onAdjustEnemy(-1)}
					disabled={enemyPool.current <= 0}
				>
					-
				</button>
				<button
					type="button"
					class="btn btn-sm variant-ghost-success"
					on:click={() => onAdjustEnemy(1)}
					disabled={enemyPool.current >= enemyPool.max}
				>
					+
				</button>
			</div>
		</div>
	</div>

	<!-- Advantage Indicator -->
	<div class="mt-4 pt-3 border-t border-surface-500/20 text-center text-sm">
		{#if partyPool.current > enemyPool.current}
			<span class="text-primary-500 font-semibold">Party has initiative advantage!</span>
		{:else if enemyPool.current > partyPool.current}
			<span class="text-error-500 font-semibold">Enemy has initiative advantage!</span>
		{:else}
			<span class="opacity-75">Initiative is tied</span>
		{/if}
	</div>

	<!-- Warning when initiative is low -->
	{#if partyPool.current <= 2 && partyPool.current > 0}
		<div class="mt-2 text-center text-warning-500 text-xs">
			Warning: Low initiative! If it reaches 0, enemy gets a bonus attack.
		</div>
	{/if}
</div>
