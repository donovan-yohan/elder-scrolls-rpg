<script lang="ts">
	import type { DiceRoll } from '$lib/models/combat'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		roll: DiceRoll
		targetDC?: number
		rollType: string
		onAcceptCritFail: () => void
		onStoreMisfortune: () => void
	}

	let { isOpen, roll, targetDC, rollType, onAcceptCritFail, onStoreMisfortune }: Props = $props()
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="mb-4">
				<h2 class="h3 text-error-500">Critical Failure!</h2>
				<p class="text-sm opacity-75">{rollType} Roll</p>
			</header>

			<div class="space-y-4">
				<!-- Show the roll result -->
				<RollResult {roll} {targetDC} />

				<div class="card variant-soft-error p-4">
					<p class="text-sm mb-2">You rolled a critical failure! Choose one:</p>
				</div>

				<div class="grid grid-cols-1 gap-3">
					<!-- Accept Critical Failure Option -->
					<button
						type="button"
						class="btn variant-filled-error w-full text-left p-4 h-auto"
						onclick={onAcceptCritFail}
					>
						<div class="flex flex-col items-start">
							<span class="font-bold text-lg">Accept Critical Failure</span>
							<span class="text-sm opacity-90">
								Suffer the full critical failure consequences
							</span>
						</div>
					</button>

					<!-- Store Misfortune Option -->
					<button
						type="button"
						class="btn variant-filled-warning w-full text-left p-4 h-auto"
						onclick={onStoreMisfortune}
					>
						<div class="flex flex-col items-start">
							<span class="font-bold text-lg">Store Misfortune Point</span>
							<span class="text-sm opacity-90">
								Roll counts as normal failure. GM gains 1 Misfortune point to use later.
							</span>
						</div>
					</button>
				</div>

				<div class="card variant-soft-surface p-3 text-xs">
					<p class="font-semibold mb-1">Misfortune Points:</p>
					<p>The GM tracks these and can invoke them at dramatically appropriate moments.</p>
				</div>
			</div>
		</div>
	</div>
{/if}
