<script lang="ts">
	import type { OwnedWeapon, Equipment } from '$lib/models/player'
	import { getWeaponById, type Weapon, WeaponRange } from '$lib/data/weapons'
	import { getMaterialById } from '$lib/data/materials'

	interface Props {
		isOpen: boolean
		ownedWeapons: OwnedWeapon[]
		currentEquipment: Equipment
		currentAP: number
		onSwap: (data: { weaponId: string; materialId: string | null; slot: 'weapon' | 'offhand' }) => void
		onClose: () => void
	}

	let { isOpen, ownedWeapons, currentEquipment, currentAP, onSwap, onClose }: Props = $props()

	const SWAP_COST = 1

	let selectedWeapon = $state<OwnedWeapon | null>(null)
	let showSlotSelection = $state(false)

	// Filter out currently equipped weapons
	let availableWeapons = $derived(
		ownedWeapons.filter((ow) => {
			const isMainHand = currentEquipment.weapon.id === ow.weaponId
			const isOffhand = currentEquipment.offhand.id === ow.weaponId
			return !isMainHand && !isOffhand
		})
	)

	function getWeaponDisplay(ow: OwnedWeapon): { weapon: Weapon; materialName: string | null } | null {
		const weapon = getWeaponById(ow.weaponId)
		if (!weapon) return null
		const material = ow.materialId ? getMaterialById(ow.materialId) : null
		return { weapon, materialName: material?.name ?? null }
	}

	function formatRange(range: WeaponRange): string {
		switch (range) {
			case WeaponRange.Immediate:
				return 'Immediate'
			case WeaponRange.Adjacent:
				return 'Adjacent'
			case WeaponRange.Large:
				return 'Large'
			case WeaponRange.Reach:
				return 'Reach'
			case WeaponRange.Short:
				return 'Short'
			case WeaponRange.Ranged:
				return 'Ranged'
			default:
				return range
		}
	}

	function handleWeaponClick(ow: OwnedWeapon) {
		if (currentAP < SWAP_COST) return

		const display = getWeaponDisplay(ow)
		if (!display) return

		if (display.weapon.isShield || !display.weapon.isTwoHanded) {
			// Can go in either slot
			selectedWeapon = ow
			showSlotSelection = true
		} else {
			// Two-handed goes to main hand only
			onSwap({ weaponId: ow.weaponId, materialId: ow.materialId, slot: 'weapon' })
			onClose()
		}
	}

	function handleSlotSelect(slot: 'weapon' | 'offhand') {
		if (selectedWeapon) {
			onSwap({ weaponId: selectedWeapon.weaponId, materialId: selectedWeapon.materialId, slot })
			selectedWeapon = null
			showSlotSelection = false
			onClose()
		}
	}

	function handleCancel() {
		selectedWeapon = null
		showSlotSelection = false
		onClose()
	}
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Swap Weapon</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-warning">{SWAP_COST} AP</span>
					<span class="badge variant-filled-primary">AP: {currentAP}</span>
				</div>
			</header>

			{#if showSlotSelection && selectedWeapon}
				{@const display = getWeaponDisplay(selectedWeapon)}
				<div class="mb-4">
					<p class="text-sm text-surface-400 mb-3">
						Equip {display?.weapon.name} to which slot?
					</p>
					<div class="flex gap-2">
						<button
							type="button"
							class="btn variant-soft-primary flex-1"
							onclick={() => handleSlotSelect('weapon')}
						>
							Main Hand
						</button>
						<button
							type="button"
							class="btn variant-soft-secondary flex-1"
							onclick={() => handleSlotSelect('offhand')}
						>
							Off Hand
						</button>
					</div>
				</div>
			{:else}
				<div class="flex flex-col gap-2 mb-4 max-h-80 overflow-y-auto">
					{#each availableWeapons as ow}
						{@const display = getWeaponDisplay(ow)}
						{#if display}
							{@const canAfford = currentAP >= SWAP_COST}
							<button
								type="button"
								class="btn flex justify-between items-center w-full"
								class:variant-soft-primary={canAfford}
								class:variant-soft-surface={!canAfford}
								class:opacity-50={!canAfford}
								disabled={!canAfford}
								onclick={() => handleWeaponClick(ow)}
							>
								<div class="flex flex-col items-start">
									<span class="font-medium">
										{display.materialName ? `${display.materialName} ` : ''}{display.weapon.name}
									</span>
									<span class="text-xs text-surface-400">
										{display.weapon.baseDamageLethal ?? display.weapon.baseDamageBlunted} Dmg
									</span>
								</div>
								<div class="flex gap-2">
									<span class="badge variant-soft-tertiary">{formatRange(display.weapon.range)}</span>
									<span class="badge variant-soft-warning">{display.weapon.apCost} AP</span>
								</div>
							</button>
						{/if}
					{/each}

					{#if availableWeapons.length === 0}
						<p class="text-center text-surface-400 py-4">No other weapons available</p>
					{/if}
				</div>
			{/if}

			<footer class="flex justify-end">
				<button type="button" class="btn variant-soft" onclick={handleCancel}>
					Cancel
				</button>
			</footer>
		</div>
	</div>
{/if}
