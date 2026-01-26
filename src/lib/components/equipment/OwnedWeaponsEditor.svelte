<script lang="ts">
	import type { OwnedWeapon } from '$lib/models/player'
	import { Weapons, getWeaponById, WeaponRange } from '$lib/data/weapons'
	import { Materials } from '$lib/data/materials'

	interface Props {
		ownedWeapons: OwnedWeapon[]
		onOwnedWeaponsChange: (weapons: OwnedWeapon[]) => void
	}

	let { ownedWeapons, onOwnedWeaponsChange }: Props = $props()

	let showAddPanel = $state(false)

	// Get weapons not already owned (excluding ammunition)
	let availableWeapons = $derived(
		Weapons.filter((w) => !w.isAmmunition && !ownedWeapons.some((ow) => ow.weaponId === w.id))
	)

	// Get weapon materials (excludes armor-only)
	const weaponMaterials = Materials.filter((m) => !m.isArmorOnly)

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

	function addWeapon(weaponId: string) {
		onOwnedWeaponsChange([...ownedWeapons, { weaponId, materialId: null }])
		showAddPanel = false
	}

	function removeWeapon(weaponId: string) {
		onOwnedWeaponsChange(ownedWeapons.filter((ow) => ow.weaponId !== weaponId))
	}

	function updateMaterial(weaponId: string, materialId: string | null) {
		onOwnedWeaponsChange(
			ownedWeapons.map((ow) => (ow.weaponId === weaponId ? { ...ow, materialId } : ow))
		)
	}
</script>

<div class="owned-weapons-editor">
	<div class="flex justify-between items-center mb-4">
		<h4 class="font-bold">Owned Weapons & Shields</h4>
		<button
			type="button"
			class="btn btn-sm variant-soft-primary"
			onclick={() => (showAddPanel = !showAddPanel)}
		>
			{showAddPanel ? 'Cancel' : 'Add Weapon'}
		</button>
	</div>

	{#if showAddPanel}
		<div class="card p-4 variant-soft mb-4 max-h-60 overflow-y-auto">
			<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
				{#each availableWeapons as weapon}
					<button
						type="button"
						class="card p-3 text-left hover:bg-surface-600/50 transition-all"
						onclick={() => addWeapon(weapon.id)}
					>
						<span class="font-medium block text-sm">{weapon.name}</span>
						<div class="flex gap-1 mt-1">
							<span class="badge variant-soft text-xs">
								{weapon.baseDamageLethal ?? weapon.baseDamageBlunted} Dmg
							</span>
							<span class="badge variant-soft-tertiary text-xs">
								{formatRange(weapon.range)}
							</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if ownedWeapons.length === 0}
		<p class="text-surface-400 text-sm text-center py-4">
			No weapons owned. Add weapons to your inventory.
		</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each ownedWeapons as ow}
				{@const weapon = getWeaponById(ow.weaponId)}
				{#if weapon}
					<div class="card p-4 variant-soft flex flex-col gap-3">
						<div class="flex justify-between items-start">
							<div>
								<span class="font-medium">{weapon.name}</span>
								<div class="flex gap-2 mt-1">
									<span class="badge variant-soft text-xs">
										{weapon.baseDamageLethal ?? weapon.baseDamageBlunted} Dmg
									</span>
									<span class="badge variant-soft-warning text-xs">
										{weapon.apCost} AP
									</span>
									<span class="badge variant-soft-tertiary text-xs">
										{formatRange(weapon.range)}
									</span>
								</div>
							</div>
							<button
								type="button"
								class="btn-icon btn-icon-sm variant-soft-error"
								aria-label="Remove {weapon.name}"
								onclick={() => removeWeapon(ow.weaponId)}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						<div class="flex items-center gap-2">
							<label class="text-sm text-surface-400" for="material-{ow.weaponId}">
								Material:
							</label>
							<select
								id="material-{ow.weaponId}"
								aria-label="Material for {weapon.name}"
								class="select select-sm flex-1"
								value={ow.materialId ?? ''}
								onchange={(e) => updateMaterial(ow.weaponId, e.currentTarget.value || null)}
							>
								<option value="">None</option>
								{#each weaponMaterials as material}
									<option value={material.id}>{material.name}</option>
								{/each}
							</select>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
