<script lang="ts">
	import type { DiceRoll } from '$lib/models/combat'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		roll: DiceRoll
		targetDC?: number
		rollType: string // e.g., "Attack", "Spell", "Dodge"
		onKeepCrit: () => void
		onStoreFortune: () => void
	}

	let { isOpen, roll, targetDC, rollType, onKeepCrit, onStoreFortune }: Props = $props()

	// Calculate if the roll would still succeed without the crit bonus
	let wouldSucceedNormally = $derived.by(() => {
		if (targetDC === undefined) return true
		return roll.total >= targetDC
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="mb-4">
				<h2 class="h3 text-warning-500">Critical Success!</h2>
				<p class="text-sm opacity-75">{rollType} Roll</p>
			</header>

			<div class="space-y-4">
				<!-- Show the roll result -->
				<RollResult {roll} {targetDC} />

				<div class="card variant-soft-warning p-4">
					<p class="text-sm mb-2">You rolled a critical success! Choose one:</p>
				</div>

				<div class="grid grid-cols-1 gap-3">
					<!-- Keep Critical Option -->
					<button
						type="button"
						class="btn variant-filled-success w-full text-left p-4 h-auto"
						onclick={onKeepCrit}
					>
						<div class="flex flex-col items-start">
							<span class="font-bold text-lg">Keep Critical Success</span>
							<span class="text-sm opacity-90">
								Gain the full critical benefits for this {rollType.toLowerCase()}
							</span>
						</div>
					</button>

					<!-- Store Fortune Option -->
					<button
						type="button"
						class="btn variant-filled-tertiary w-full text-left p-4 h-auto"
						onclick={onStoreFortune}
					>
						<div class="flex flex-col items-start">
							<span class="font-bold text-lg">Store Fortune Point</span>
							<span class="text-sm opacity-90">
								{#if wouldSucceedNormally}
									Roll succeeds normally (no crit bonus). Gain 1 Fortune point.
								{:else}
									Roll fails normally. Gain 1 Fortune point for later.
								{/if}
							</span>
						</div>
					</button>
				</div>

				<div class="card variant-soft-surface p-3 text-xs">
					<p class="font-semibold mb-1">Fortune Points:</p>
					<p>Can be spent before or after any roll to convert it into a critical success.</p>
				</div>
			</div>
		</div>
	</div>
{/if}
