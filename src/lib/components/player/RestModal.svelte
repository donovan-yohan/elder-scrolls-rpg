<script lang="ts">
	import { calculateMaxSpiritPoints } from '$lib/util/spiritPoints.util'

	interface Props {
		level: number
		currentSpiritPoints: number
		currentHealth: number
		maxHealth: number
		currentMagicka: number
		maxMagicka: number
		onrest: (restResult: {
			spiritPoints: number
			health: number
			magicka: number
		}) => void
		oncancel: () => void
	}

	let {
		level,
		currentSpiritPoints,
		currentHealth,
		maxHealth,
		currentMagicka,
		maxMagicka,
		onrest,
		oncancel
	}: Props = $props()

	let maxSpiritPoints = $derived(calculateMaxSpiritPoints(level))
	let canRestoreSpiritPoint = $derived(currentSpiritPoints < maxSpiritPoints)
	let needsHealing = $derived(currentHealth < maxHealth)
	let needsMagicka = $derived(currentMagicka < maxMagicka)

	function handleRest() {
		const newSpiritPoints = Math.min(currentSpiritPoints + 1, maxSpiritPoints)
		onrest({
			spiritPoints: newSpiritPoints,
			health: maxHealth,
			magicka: maxMagicka
		})
	}
</script>

<div class="card p-6 w-full max-w-md">
	<header class="mb-4 text-center">
		<h3 class="h3 font-bold">Rest for the Night</h3>
	</header>

	<div class="space-y-4 mb-6">
		<p class="text-center text-surface-400">
			A full night's rest with food and comfort will restore your body and spirit.
		</p>

		<div class="bg-surface-700 rounded-lg p-4 space-y-3">
			<h4 class="font-semibold text-center">Rest Effects</h4>

			{#if canRestoreSpiritPoint}
				<div class="flex justify-between items-center">
					<span class="text-primary-400">Spirit Points</span>
					<span>
						{currentSpiritPoints} <span class="text-success-400">+1</span>
						<span class="text-surface-500">/ {maxSpiritPoints}</span>
					</span>
				</div>
			{:else}
				<div class="flex justify-between items-center text-surface-500">
					<span>Spirit Points</span>
					<span>{currentSpiritPoints} / {maxSpiritPoints} (Full)</span>
				</div>
			{/if}

			{#if needsHealing}
				<div class="flex justify-between items-center">
					<span class="text-error-400">Health</span>
					<span>
						{currentHealth} <span class="text-success-400">-> {maxHealth}</span>
					</span>
				</div>
			{:else}
				<div class="flex justify-between items-center text-surface-500">
					<span>Health</span>
					<span>{currentHealth} / {maxHealth} (Full)</span>
				</div>
			{/if}

			{#if needsMagicka}
				<div class="flex justify-between items-center">
					<span class="text-tertiary-400">Magicka</span>
					<span>
						{currentMagicka} <span class="text-success-400">-> {maxMagicka}</span>
					</span>
				</div>
			{:else}
				<div class="flex justify-between items-center text-surface-500">
					<span>Magicka</span>
					<span>{currentMagicka} / {maxMagicka} (Full)</span>
				</div>
			{/if}
		</div>

		<p class="text-xs text-surface-500 text-center italic">
			Note: Resting requires food and comfortable shelter. Roughing it in a bad tent with thin stew won't count!
		</p>
	</div>

	<footer class="flex justify-center gap-3">
		<button type="button" class="btn variant-ghost" onclick={oncancel}>
			Cancel
		</button>
		<button type="button" class="btn variant-filled-primary" onclick={handleRest}>
			Rest
		</button>
	</footer>
</div>
