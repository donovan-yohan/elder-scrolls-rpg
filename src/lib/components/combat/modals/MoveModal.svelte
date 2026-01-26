<script lang="ts">
	interface Props {
		isOpen: boolean
		currentAP: number
		onMove: (apCost: number) => void
		onClose: () => void
	}

	let { isOpen, currentAP, onMove, onClose }: Props = $props()

	const movementOptions = [
		{ label: 'Immediate ↔ Adjacent', cost: 1 },
		{ label: 'Adjacent ↔ Close', cost: 1 },
		{ label: 'Close ↔ Short', cost: 1 },
		{ label: 'Short ↔ Medium', cost: 2 },
		{ label: 'Medium ↔ Long', cost: 2 },
		{ label: 'Long ↔ Extreme', cost: 3 }
	]

	const rangeReference = [
		{ range: 'Immediate', melee: 'Disadv', reach: 'No', ranged: 'No', penalty: '—' },
		{ range: 'Adjacent', melee: 'Normal', reach: 'Disadv', ranged: 'Disadv', penalty: '—' },
		{ range: 'Close', melee: 'No', reach: 'Normal', ranged: 'Normal', penalty: '—' },
		{ range: 'Short', melee: 'No', reach: 'No', ranged: 'Normal', penalty: '—' },
		{ range: 'Medium', melee: 'No', reach: 'No', ranged: 'Normal', penalty: '-5' },
		{ range: 'Long', melee: 'No', reach: 'No', ranged: 'Normal', penalty: '-10' },
		{ range: 'Extreme', melee: 'No', reach: 'No', ranged: 'Normal', penalty: '-15' }
	]

	let showRangeReference = $state(false)

	function handleSelect(cost: number) {
		if (currentAP >= cost) {
			onMove(cost)
			onClose()
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Movement</h2>
				<span class="badge variant-filled-primary">AP: {currentAP}</span>
			</header>

			<div class="flex flex-col gap-2 mb-4">
				{#each movementOptions as option}
					{@const canAfford = currentAP >= option.cost}
					<button
						type="button"
						class="btn flex justify-between items-center w-full"
						class:variant-soft-primary={canAfford}
						class:variant-soft-surface={!canAfford}
						class:opacity-50={!canAfford}
						disabled={!canAfford}
						onclick={() => handleSelect(option.cost)}
					>
						<span>{option.label}</span>
						<span class="badge variant-filled">{option.cost} AP</span>
					</button>
				{/each}
			</div>

			<button
				type="button"
				class="btn variant-soft w-full mb-4"
				onclick={() => showRangeReference = !showRangeReference}
			>
				{showRangeReference ? 'Hide' : 'Show'} Weapon Ranges
			</button>

			{#if showRangeReference}
				<div class="overflow-x-auto mb-4">
					<table class="table table-compact w-full">
						<thead>
							<tr>
								<th>Range</th>
								<th>Melee</th>
								<th>Reach</th>
								<th>Ranged</th>
								<th>Penalty</th>
							</tr>
						</thead>
						<tbody>
							{#each rangeReference as row}
								<tr>
									<td class="font-medium">{row.range}</td>
									<td>{row.melee}</td>
									<td>{row.reach}</td>
									<td>{row.ranged}</td>
									<td>{row.penalty}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<footer class="flex justify-end">
				<button type="button" class="btn variant-soft" onclick={onClose}>
					Cancel
				</button>
			</footer>
		</div>
	</div>
{/if}
