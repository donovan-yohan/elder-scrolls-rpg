<script lang="ts">
	import type { PlayerData, InventoryItem } from '$lib/models/player'
	import { getItemById, ItemType, type Item } from '$lib/data/items'

	interface Props {
		isOpen: boolean
		player: PlayerData
		currentAP: number
		onUseItem: (itemId: string) => void
		onClose: () => void
	}

	let { isOpen, player, currentAP, onUseItem, onClose }: Props = $props()

	// Filter to consumable items only (Potions and Consumables with quantity > 0)
	let consumables = $derived(
		(player.inventory ?? []).filter((inv) => {
			const item = getItemById(inv.itemId)
			if (!item) return false
			const isConsumable = item.type === ItemType.Potion || item.type === ItemType.Consumable
			return isConsumable && inv.quantity > 0
		})
	)

	let selectedItemId = $state<string | null>(null)

	const AP_COST = 1
	let canAfford = $derived(currentAP >= AP_COST)

	function getItemDisplay(inv: InventoryItem): { item: Item; quantity: number } | null {
		const item = getItemById(inv.itemId)
		if (!item) return null
		return { item, quantity: inv.quantity }
	}

	function handleUseItem() {
		if (selectedItemId && canAfford) {
			onUseItem(selectedItemId)
		}
	}

	function resetState() {
		selectedItemId = null
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Use Item</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-warning">AP: {currentAP}</span>
					<span class="badge variant-filled">Cost: {AP_COST} AP</span>
				</div>
			</header>

			{#if !canAfford}
				<p class="text-error-500 mb-4">Not enough AP to use an item.</p>
			{:else if consumables.length === 0}
				<p class="text-surface-500 mb-4">No consumable items in inventory.</p>
			{:else}
				<div class="space-y-4">
					<p class="text-sm opacity-75">Select an item to use:</p>

					<div class="flex flex-col gap-2 max-h-64 overflow-y-auto">
						{#each consumables as inv}
							{@const display = getItemDisplay(inv)}
							{#if display}
								<button
									type="button"
									class="btn w-full justify-between text-left"
									class:variant-filled-primary={selectedItemId === inv.itemId}
									class:variant-soft-surface={selectedItemId !== inv.itemId}
									onclick={() => (selectedItemId = inv.itemId)}
								>
									<div>
										<p class="font-semibold">{display.item.name}</p>
										<p class="text-xs opacity-75">{display.item.description ?? ''}</p>
									</div>
									<span class="badge variant-filled">x{display.quantity}</span>
								</button>
							{/if}
						{/each}
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						class:opacity-50={!selectedItemId}
						disabled={!selectedItemId}
						onclick={handleUseItem}
					>
						Use Item
					</button>
				</div>
			{/if}

			<footer class="flex justify-end mt-4">
				<button type="button" class="btn variant-ghost" onclick={onClose}>
					Cancel
				</button>
			</footer>
		</div>
	</div>
{/if}
