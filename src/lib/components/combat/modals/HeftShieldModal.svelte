<script lang="ts">
	import { getWeaponById, getShieldHeftCost, type WeaponType } from '$lib/data/weapons'

	interface Props {
		isOpen: boolean
		currentAP: number
		shieldId: string | null
		hasHeftedShield: boolean
		onHeft: (apCost: number) => void
		onClose: () => void
	}

	let { isOpen, currentAP, shieldId, hasHeftedShield, onHeft, onClose }: Props = $props()

	let shield = $derived(shieldId ? getWeaponById(shieldId) : null)
	let heftCost = $derived(shield ? getShieldHeftCost(shield.type as WeaponType) : 0)
	let canAfford = $derived(currentAP >= heftCost)

	function handleHeft() {
		if (canAfford && !hasHeftedShield) {
			onHeft(heftCost)
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-md bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Heft Shield</h2>
				<span class="badge variant-filled-warning">AP: {currentAP}</span>
			</header>

			{#if !shield}
				<p class="text-error-500 mb-4">No shield equipped in offhand.</p>
			{:else if hasHeftedShield}
				<div class="card variant-soft-success p-4 mb-4">
					<p class="text-success-500 font-semibold">Shield Already Hefted</p>
					<p class="text-sm opacity-75">Your {shield.name} is ready for blocking.</p>
				</div>
			{:else}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<div class="flex justify-between items-center">
							<div>
								<p class="font-semibold">{shield.name}</p>
								<p class="text-sm opacity-75">Ready your shield for blocking</p>
							</div>
							<span class="badge variant-filled">{heftCost} AP</span>
						</div>
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						class:opacity-50={!canAfford}
						disabled={!canAfford}
						onclick={handleHeft}
					>
						{#if canAfford}
							Heft Shield
						{:else}
							Not Enough AP
						{/if}
					</button>
				</div>
			{/if}

			<footer class="flex justify-end mt-4">
				<button type="button" class="btn variant-ghost" onclick={onClose}>
					{hasHeftedShield || !shield ? 'Close' : 'Cancel'}
				</button>
			</footer>
		</div>
	</div>
{/if}
