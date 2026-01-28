<script lang="ts">
	interface Props {
		currentSpiritPoints: number
		maxSpiritPoints: number
		characterName: string
		onspend: () => void
		onfall: () => void
	}

	let { currentSpiritPoints, maxSpiritPoints, characterName, onspend, onfall }: Props = $props()

	let hasSpiritPoints = $derived(currentSpiritPoints > 0)
</script>

<div class="card p-6 w-full max-w-md">
	<header class="mb-4 text-center">
		<div class="text-6xl mb-2">💀</div>
		<h3 class="h3 font-bold text-error-500">{characterName} has fallen!</h3>
	</header>

	<div class="space-y-4 mb-6">
		{#if hasSpiritPoints}
			<p class="text-center">
				Your HP has dropped to zero, but your spirit endures.
			</p>
			<div class="bg-surface-700 rounded-lg p-4 text-center">
				<div class="text-sm text-surface-400">Spirit Points</div>
				<div class="text-2xl font-bold text-primary-400">
					{currentSpiritPoints} / {maxSpiritPoints}
				</div>
				<div class="text-sm text-surface-400 mt-1">
					{currentSpiritPoints} spirit point{currentSpiritPoints !== 1 ? 's' : ''} remaining
				</div>
			</div>
			<p class="text-sm text-surface-400 text-center">
				Spend a spirit point to reset HP, MP, and AP to maximum and continue fighting!
			</p>
		{:else}
			<p class="text-center text-error-400">
				You are <strong>unconscious and dying</strong>.
			</p>
			<div class="bg-surface-700 rounded-lg p-4 text-center">
				<div class="text-sm text-surface-400">Spirit Points</div>
				<div class="text-2xl font-bold text-error-400">
					0 / {maxSpiritPoints}
				</div>
				<div class="text-sm text-surface-400 mt-1">
					No spirit points remaining
				</div>
			</div>
			<p class="text-sm text-surface-400 text-center">
				An ally must succeed a healing check to stabilize you.
			</p>
		{/if}
	</div>

	<div class="bg-warning-900/30 border border-warning-500/50 rounded-lg p-3 mb-6">
		<p class="text-sm text-warning-300 text-center">
			<strong>Complication Roll Required!</strong><br/>
			Roll 1d10 to determine what stat is reduced.
		</p>
	</div>

	<footer class="flex justify-center gap-3">
		<button
			type="button"
			class="btn variant-filled-primary"
			disabled={!hasSpiritPoints}
			onclick={onspend}
		>
			Rise Again
		</button>
		<button
			type="button"
			class="btn variant-ghost-error"
			onclick={onfall}
		>
			Fall Unconscious
		</button>
	</footer>
</div>
