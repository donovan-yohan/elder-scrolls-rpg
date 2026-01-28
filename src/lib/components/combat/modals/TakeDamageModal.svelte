<script lang="ts">
	import { DamageType } from '$lib/data/element'

	interface Props {
		isOpen: boolean
		onTakeDamage: (amount: number, damageType: DamageType, isMagicSource: boolean) => void
		onClose: () => void
	}

	let { isOpen, onTakeDamage, onClose }: Props = $props()

	let damageAmount = $state(1)
	let selectedDamageType = $state<DamageType>(DamageType.Physical)
	let isMagicSource = $state(false)

	const damageTypes = Object.values(DamageType)

	// Group damage types for better UI
	const damageTypeGroups = {
		Elemental: [DamageType.Fire, DamageType.Frost, DamageType.Shock],
		Status: [DamageType.Poison, DamageType.Disease],
		Physical: [DamageType.Physical, DamageType.Slashing, DamageType.Piercing, DamageType.Bludgeoning],
		Magical: [DamageType.Magic],
	}

	function handleSubmit() {
		if (damageAmount > 0) {
			onTakeDamage(damageAmount, selectedDamageType, isMagicSource)
			// Reset for next use
			damageAmount = 1
			selectedDamageType = DamageType.Physical
			isMagicSource = false
		}
	}

	function handleClose() {
		damageAmount = 1
		selectedDamageType = DamageType.Physical
		isMagicSource = false
		onClose()
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
		<div class="card p-6 w-full max-w-md variant-filled-surface">
			<header class="mb-4">
				<h3 class="h3 font-bold">Take Damage</h3>
				<p class="text-sm text-surface-600-300-token">
					Enter damage amount and type. Racial resistances will be applied automatically.
				</p>
			</header>

			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
				<!-- Damage Amount -->
				<label class="label">
					<span class="text-sm font-semibold">Damage Amount</span>
					<input
						type="number"
						class="input"
						min="1"
						bind:value={damageAmount}
					/>
				</label>

				<!-- Damage Type Selection -->
				<div class="space-y-2">
					<span class="text-sm font-semibold">Damage Type</span>

					{#each Object.entries(damageTypeGroups) as [groupName, types]}
						<div class="space-y-1">
							<span class="text-xs text-surface-500">{groupName}</span>
							<div class="flex flex-wrap gap-2">
								{#each types as dtype}
									<button
										type="button"
										class="chip {selectedDamageType === dtype ? 'variant-filled-primary' : 'variant-soft-surface'}"
										onclick={() => selectedDamageType = dtype}
									>
										{dtype}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<!-- Magic Source Toggle -->
				<label class="flex items-center gap-3">
					<input
						type="checkbox"
						class="checkbox"
						bind:checked={isMagicSource}
					/>
					<div>
						<span class="text-sm font-semibold">Magic Source</span>
						<p class="text-xs text-surface-500">Check if damage is from a spell (applies spell resistance)</p>
					</div>
				</label>

				<!-- Actions -->
				<div class="flex gap-2 pt-4">
					<button
						type="button"
						class="btn variant-ghost-surface flex-1"
						onclick={handleClose}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn variant-filled-error flex-1"
						disabled={damageAmount <= 0}
					>
						Take {damageAmount} Damage
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
