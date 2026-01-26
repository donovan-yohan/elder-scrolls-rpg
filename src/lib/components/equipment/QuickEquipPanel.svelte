<script lang="ts">
	import type { Equipment, OwnedWeapon } from '$lib/models/player'
	import { getWeaponById, WeaponRange } from '$lib/data/weapons'
	import { getMaterialById } from '$lib/data/materials'

	interface Props {
		equipment: Equipment
		ownedWeapons: OwnedWeapon[]
		onEquipmentChange: (equipment: Equipment) => void
	}

	let { equipment, ownedWeapons, onEquipmentChange }: Props = $props()

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

	function getWeaponDisplay(ow: OwnedWeapon) {
		const weapon = getWeaponById(ow.weaponId)
		if (!weapon) return null
		const material = ow.materialId ? getMaterialById(ow.materialId) : null
		return { weapon, materialName: material?.name ?? null }
	}

	function isEquipped(weaponId: string): boolean {
		return equipment.weapon.id === weaponId || equipment.offhand.id === weaponId
	}

	function equipWeapon(ow: OwnedWeapon) {
		const display = getWeaponDisplay(ow)
		if (!display) return

		const newEquipment = { ...equipment }

		if (display.weapon.isTwoHanded) {
			// Two-handed: main hand, clear offhand
			newEquipment.weapon = { id: ow.weaponId, materialId: ow.materialId }
			newEquipment.offhand = { id: null, materialId: null }
		} else if (display.weapon.isShield) {
			// Shield: offhand
			newEquipment.offhand = { id: ow.weaponId, materialId: ow.materialId }
		} else {
			// One-handed: main hand
			newEquipment.weapon = { id: ow.weaponId, materialId: ow.materialId }
		}

		onEquipmentChange(newEquipment)
	}

	function unequipWeapon(slot: 'weapon' | 'offhand') {
		const newEquipment = { ...equipment }
		newEquipment[slot] = { id: null, materialId: null }
		onEquipmentChange(newEquipment)
	}

	let equippedWeapon = $derived(
		equipment.weapon.id
			? getWeaponDisplay({ weaponId: equipment.weapon.id, materialId: equipment.weapon.materialId })
			: null
	)

	let equippedOffhand = $derived(
		equipment.offhand.id
			? getWeaponDisplay({
					weaponId: equipment.offhand.id,
					materialId: equipment.offhand.materialId
				})
			: null
	)

	let unequippedWeapons = $derived(ownedWeapons.filter((ow) => !isEquipped(ow.weaponId)))
</script>

<div class="quick-equip-panel card p-4">
	<h4 class="font-bold mb-3">Equipment</h4>

	<!-- Currently Equipped -->
	<div class="flex flex-col gap-2 mb-4">
		<div class="text-sm text-surface-400">Currently Equipped:</div>

		{#if equippedWeapon}
			<div class="flex justify-between items-center p-2 rounded variant-soft-primary">
				<div>
					<span class="font-medium">
						{equippedWeapon.materialName
							? `${equippedWeapon.materialName} `
							: ''}{equippedWeapon.weapon.name}
					</span>
					<span class="badge variant-soft text-xs ml-2">Main Hand</span>
					<span class="badge variant-filled-success text-xs ml-1">Equipped</span>
				</div>
				<button
					type="button"
					class="btn btn-sm variant-soft-error"
					onclick={() => unequipWeapon('weapon')}
				>
					Unequip
				</button>
			</div>
		{:else}
			<div class="text-surface-500 text-sm p-2">No main hand weapon</div>
		{/if}

		{#if equippedOffhand}
			<div class="flex justify-between items-center p-2 rounded variant-soft-secondary">
				<div>
					<span class="font-medium">
						{equippedOffhand.materialName
							? `${equippedOffhand.materialName} `
							: ''}{equippedOffhand.weapon.name}
					</span>
					<span class="badge variant-soft text-xs ml-2">Off Hand</span>
					<span class="badge variant-filled-success text-xs ml-1">Equipped</span>
				</div>
				<button
					type="button"
					class="btn btn-sm variant-soft-error"
					onclick={() => unequipWeapon('offhand')}
				>
					Unequip
				</button>
			</div>
		{/if}
	</div>

	<!-- Available Weapons -->
	{#if unequippedWeapons.length > 0}
		<div class="text-sm text-surface-400 mb-2">Available:</div>
		<div class="flex flex-col gap-2">
			{#each unequippedWeapons as ow}
				{@const display = getWeaponDisplay(ow)}
				{#if display}
					<button
						type="button"
						class="flex justify-between items-center p-2 rounded variant-soft hover:variant-soft-primary transition-all text-left w-full"
						onclick={() => equipWeapon(ow)}
					>
						<div>
							<span class="font-medium">
								{display.materialName ? `${display.materialName} ` : ''}{display.weapon.name}
							</span>
							<div class="flex gap-1 mt-1">
								<span class="badge variant-soft text-xs">
									{display.weapon.baseDamageLethal ?? display.weapon.baseDamageBlunted} Dmg
								</span>
								<span class="badge variant-soft-tertiary text-xs">
									{formatRange(display.weapon.range)}
								</span>
							</div>
						</div>
						<span class="btn btn-sm variant-soft-success">Equip</span>
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>
