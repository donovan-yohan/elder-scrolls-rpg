<script lang="ts">
	import type { DiceRoll } from '$lib/models/combat'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		fortunePoints: number
		roll?: DiceRoll
		targetDC?: number
		rollType: string
		isCriticalFail: boolean
		onUseFortune: () => void
		onDecline: () => void
	}

	let { isOpen, fortunePoints, roll, targetDC, rollType, isCriticalFail, onUseFortune, onDecline }: Props = $props()
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="mb-4">
				<h2 class="h3">Use Fortune Point?</h2>
				<div class="flex gap-2 mt-2">
					<span class="badge variant-filled-tertiary">Fortune: {fortunePoints}</span>
				</div>
			</header>

			<div class="space-y-4">
				{#if roll}
					<RollResult {roll} {targetDC} />
				{/if}

				<div class="card variant-soft-tertiary p-4">
					<p class="text-sm">
						{#if isCriticalFail}
							Replace this critical failure with a critical success?
							<span class="text-warning-500 font-semibold">
								Warning: This will also store 1 Misfortune point.
							</span>
						{:else}
							Replace this roll with a critical success?
						{/if}
					</p>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<button
						type="button"
						class="btn variant-filled-tertiary"
						onclick={onUseFortune}
					>
						{#if isCriticalFail}
							Use Fortune (+Misfortune)
						{:else}
							Use Fortune
						{/if}
					</button>

					<button
						type="button"
						class="btn variant-ghost"
						onclick={onDecline}
					>
						Keep Roll
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
