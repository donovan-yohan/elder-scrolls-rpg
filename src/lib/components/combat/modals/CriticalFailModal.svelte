<script lang="ts">
	import type { DiceRoll } from '$lib/models/combat'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		roll: DiceRoll
		rollContext: string // e.g., "Attack Roll", "Dodge Check", "Spell Cast"
		currentMisfortune: number
		onAcceptCritFail: () => void
		onStoreMisfortune: () => void
		onCancel: () => void
	}

	let { isOpen, roll, rollContext, currentMisfortune, onAcceptCritFail, onStoreMisfortune, onCancel }: Props = $props()
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="mb-4">
				<h2 class="h3 text-error-500 font-bold">Critical Failure!</h2>
				<p class="text-sm opacity-75">{rollContext}</p>
			</header>

			<!-- Show the roll result -->
			<div class="mb-6">
				<RollResult {roll} />
			</div>

			<!-- Explanation -->
			<div class="card variant-soft-error p-4 mb-6">
				<p class="text-sm mb-2">
					You rolled a <strong class="text-error-500">critical failure</strong>. You have a choice:
				</p>
				<ul class="text-sm list-disc list-inside space-y-1 opacity-90">
					<li><strong>Accept:</strong> The action fails with critical failure effects</li>
					<li><strong>Store Misfortune:</strong> The action counts as a normal failure, but the party gains 1 Misfortune point</li>
				</ul>
			</div>

			<!-- Current Misfortune Display -->
			<div class="flex justify-center mb-6">
				<div class="badge variant-filled-error px-4 py-2 text-lg">
					Party Misfortune: {currentMisfortune}
				</div>
			</div>

			<!-- Choice Buttons -->
			<div class="grid grid-cols-2 gap-4">
				<button
					type="button"
					class="btn variant-filled-error h-auto py-4 flex-col"
					onclick={onAcceptCritFail}
				>
					<span class="font-bold">Accept Critical Fail</span>
					<span class="text-xs opacity-75">Full crit fail effects</span>
				</button>

				<button
					type="button"
					class="btn variant-filled-warning h-auto py-4 flex-col"
					onclick={onStoreMisfortune}
				>
					<span class="font-bold">Store Misfortune</span>
					<span class="text-xs opacity-75">Normal failure + 1 Misfortune</span>
				</button>
			</div>

			<footer class="flex justify-end mt-6">
				<button type="button" class="btn variant-ghost" onclick={onCancel}>
					Cancel (Re-roll or Reconsider)
				</button>
			</footer>
		</div>
	</div>
{/if}
