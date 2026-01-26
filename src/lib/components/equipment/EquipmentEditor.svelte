<script lang="ts">
	import { TabGroup, Tab } from '@skeletonlabs/skeleton'
	import classNames from 'classnames'
	import type { Equipment, InventoryItem, EquipmentSlot } from '$lib/models/player'
	import {
		Weapons,
		WeaponSkill,
		WeaponRange,
		getWeaponById,
		type Weapon,
	} from '$lib/data/weapons'
	import { ArmorTypes, ArmorCategory, type ArmorType } from '$lib/data/armor'
	import { Items, ItemType, getItemById, type Item } from '$lib/data/items'
	import { getMaterialById } from '$lib/data/materials'
	import { MaterialSelector } from '$lib/components/equipment'
	import {
		createEmptySlot,
		createEquipmentSlot,
		getEquippedWeapon,
		getEquippedArmor,
		DEFAULT_ARMOR_VALUE,
		DEFAULT_ARMOR_WEIGHT,
	} from '$lib/util/equipment.util'

	interface Props {
		equipment: Equipment
		inventory: InventoryItem[]
		onEquipmentChange: (equipment: Equipment) => void
		onInventoryChange: (inventory: InventoryItem[]) => void
	}

	let { equipment, inventory, onEquipmentChange, onInventoryChange }: Props = $props()

	// Tab tracking
	let selectedTabIndex = $state(0)

	// Get weapons by skill category (excluding ammunition)
	function getWeaponsByCategory(skill: WeaponSkill): Weapon[] {
		return Weapons.filter((w) => w.skill === skill && !w.isAmmunition)
	}

	// Get one-handed weapons (non-shields)
	function getOneHandedWeapons(): Weapon[] {
		return getWeaponsByCategory(WeaponSkill.OneHanded)
	}

	// Get two-handed weapons
	function getTwoHandedWeapons(): Weapon[] {
		return getWeaponsByCategory(WeaponSkill.TwoHanded)
	}

	// Get ranged weapons
	function getRangedWeapons(): Weapon[] {
		return getWeaponsByCategory(WeaponSkill.Marksmanship)
	}

	// Get shields
	function getShields(): Weapon[] {
		return Weapons.filter((w) => w.isShield)
	}

	// Use utility functions to get equipped items with material adjustments
	let equippedWeapon = $derived(getEquippedWeapon(equipment.weapon))
	let selectedWeapon = $derived(equippedWeapon?.weapon ?? null)
	let isTwoHandedWeapon = $derived(selectedWeapon?.isTwoHanded ?? false)
	let isOneHandedWeapon = $derived(
		selectedWeapon && !selectedWeapon.isTwoHanded && !selectedWeapon.isShield
	)
	let weaponAdjustedValue = $derived(equippedWeapon?.adjustedValue ?? 0)
	let weaponAdjustedWeight = $derived(equippedWeapon?.adjustedWeight ?? 0)

	// Offhand weapon using utility function
	let equippedOffhand = $derived(getEquippedWeapon(equipment.offhand))
	let selectedOffhand = $derived(equippedOffhand?.weapon ?? null)
	let offhandAdjustedValue = $derived(equippedOffhand?.adjustedValue ?? 0)
	let offhandAdjustedWeight = $derived(equippedOffhand?.adjustedWeight ?? 0)

	// Armor using utility function
	let equippedArmor = $derived(getEquippedArmor(equipment.armor))
	let selectedArmor = $derived(equippedArmor?.armor ?? null)
	let armorAdjustedValue = $derived(equippedArmor?.adjustedValue ?? DEFAULT_ARMOR_VALUE)
	let armorAdjustedWeight = $derived(equippedArmor?.adjustedWeight ?? DEFAULT_ARMOR_WEIGHT)

	// Select weapon
	function selectWeapon(weaponId: string | null): void {
		const newEquipment = { ...equipment }
		if (weaponId) {
			newEquipment.weapon = createEquipmentSlot(weaponId)
			// Clear offhand if switching to two-handed weapon
			const weapon = getWeaponById(weaponId)
			if (weapon?.isTwoHanded) {
				newEquipment.offhand = createEmptySlot()
			}
		} else {
			newEquipment.weapon = createEmptySlot()
		}
		onEquipmentChange(newEquipment)
	}

	// Update weapon material
	function updateWeaponMaterial(materialId: string | null): void {
		const newEquipment = { ...equipment }
		newEquipment.weapon = { ...equipment.weapon, materialId }
		onEquipmentChange(newEquipment)
	}

	// Select offhand
	function selectOffhand(weaponId: string | null): void {
		const newEquipment = { ...equipment }
		newEquipment.offhand = weaponId ? createEquipmentSlot(weaponId) : createEmptySlot()
		onEquipmentChange(newEquipment)
	}

	// Update offhand material
	function updateOffhandMaterial(materialId: string | null): void {
		const newEquipment = { ...equipment }
		newEquipment.offhand = { ...equipment.offhand, materialId }
		onEquipmentChange(newEquipment)
	}

	// Select armor
	function selectArmor(armorId: string | null): void {
		const newEquipment = { ...equipment }
		newEquipment.armor = armorId ? createEquipmentSlot(armorId) : createEmptySlot()
		onEquipmentChange(newEquipment)
	}

	// Update armor material
	function updateArmorMaterial(materialId: string | null): void {
		const newEquipment = { ...equipment }
		newEquipment.armor = { ...equipment.armor, materialId }
		onEquipmentChange(newEquipment)
	}

	// Get item quantity in inventory
	function getItemQuantity(itemId: string): number {
		const item = inventory.find((i) => i.itemId === itemId)
		return item?.quantity ?? 0
	}

	// Add item to inventory
	function addItem(itemId: string): void {
		const item = getItemById(itemId)
		if (!item) return

		const existingIndex = inventory.findIndex((i) => i.itemId === itemId)
		const existingItem = inventory[existingIndex]

		if (existingIndex >= 0 && existingItem) {
			const maxStack = item.maxStack ?? 1
			if (existingItem.quantity < maxStack) {
				const newInventory = [...inventory]
				newInventory[existingIndex] = { ...existingItem, quantity: existingItem.quantity + 1 }
				onInventoryChange(newInventory)
			}
		} else {
			onInventoryChange([...inventory, { itemId, quantity: 1 }])
		}
	}

	// Remove item from inventory
	function removeItem(itemId: string): void {
		const existingIndex = inventory.findIndex((i) => i.itemId === itemId)
		const existingItem = inventory[existingIndex]

		if (existingIndex >= 0 && existingItem) {
			if (existingItem.quantity > 1) {
				const newInventory = [...inventory]
				newInventory[existingIndex] = { ...existingItem, quantity: existingItem.quantity - 1 }
				onInventoryChange(newInventory)
			} else {
				onInventoryChange(inventory.filter((i) => i.itemId !== itemId))
			}
		}
	}

	// Format weapon range
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

	// Get armor modifier display
	function getModifierDisplay(modifier: string): string {
		switch (modifier) {
			case 'advantage':
				return 'Advantage'
			case 'disadvantage':
				return 'Disadvantage'
			case 'disadvantage2':
				return '2x Disadvantage'
			case 'none':
				return 'None'
			default:
				return modifier
		}
	}

	// Get armor category color
	function getArmorCategoryColor(category: ArmorCategory): string {
		switch (category) {
			case ArmorCategory.Unarmored:
				return 'variant-soft-tertiary'
			case ArmorCategory.Light:
				return 'variant-soft-success'
			case ArmorCategory.Medium:
				return 'variant-soft-warning'
			case ArmorCategory.Heavy:
				return 'variant-soft-error'
			default:
				return 'variant-soft'
		}
	}

	// Unarmored option
	let unarmoredArmor = $derived(ArmorTypes.find((a) => a.category === ArmorCategory.Unarmored))

	// Total items count
	let totalItemsCount = $derived(inventory.reduce((sum, item) => sum + item.quantity, 0))
</script>

<div class="equipment-editor">
	<TabGroup>
		<Tab bind:group={selectedTabIndex} name="weapons" value={0}>
			<span class="flex items-center gap-2">
				<span>Weapons</span>
				{#if equipment.weapon.id}
					<span class="badge variant-filled-primary text-xs">1</span>
				{/if}
			</span>
		</Tab>
		<Tab bind:group={selectedTabIndex} name="armor" value={1}>
			<span class="flex items-center gap-2">
				<span>Armor</span>
				{#if equipment.armor.id}
					<span class="badge variant-filled-tertiary text-xs">1</span>
				{/if}
			</span>
		</Tab>
		<Tab bind:group={selectedTabIndex} name="items" value={2}>
			<span class="flex items-center gap-2">
				<span>Items</span>
				{#if totalItemsCount > 0}
					<span class="badge variant-filled-success text-xs">{totalItemsCount}</span>
				{/if}
			</span>
		</Tab>

		<svelte:fragment slot="panel">
			<!-- Weapons Panel -->
			{#if selectedTabIndex === 0}
				<div class="flex flex-col gap-6 mt-4">
					<!-- Selected Weapon Summary -->
					{#if selectedWeapon}
						<div class="card p-4 variant-soft-primary">
							<div class="flex justify-between items-start mb-3">
								<div>
									<h4 class="font-bold text-lg">{selectedWeapon.name}</h4>
									<div class="flex flex-wrap gap-2 mt-1">
										<span class="badge variant-soft">
											{selectedWeapon.baseDamageLethal ?? selectedWeapon.baseDamageBlunted} Dmg
										</span>
										<span class="badge variant-soft-warning">{selectedWeapon.apCost} AP</span>
										<span class="badge variant-soft-tertiary">{formatRange(selectedWeapon.range)}</span>
									</div>
								</div>
								<button
									type="button"
									class="btn btn-sm variant-soft-error"
									onclick={() => selectWeapon(null)}
								>
									Clear
								</button>
							</div>

							<MaterialSelector
								selectedMaterialId={equipment.weapon.materialId}
								onSelect={updateWeaponMaterial}
								excludeArmorOnly={true}
							/>

							{#if equipment.weapon.materialId}
								<div class="mt-3 flex gap-4 text-sm">
									<span>
										<span class="text-surface-400">Value:</span>
										<span class="font-medium">{weaponAdjustedValue}g</span>
										<span class="text-surface-500">(base: {selectedWeapon.value}g)</span>
									</span>
									<span>
										<span class="text-surface-400">Weight:</span>
										<span class="font-medium">{weaponAdjustedWeight} lbs</span>
										<span class="text-surface-500">(base: {selectedWeapon.weight} lbs)</span>
									</span>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Off-Hand Section -->
					{#if isOneHandedWeapon}
						<div class="card p-4 variant-soft-secondary">
							<h4 class="font-bold mb-3">Off-Hand (Shields / Dual Wield)</h4>

							{#if selectedOffhand}
								<div class="flex justify-between items-start mb-3">
									<div>
										<span class="font-medium">{selectedOffhand.name}</span>
										<div class="flex flex-wrap gap-2 mt-1">
											<span class="badge variant-soft">
												{selectedOffhand.baseDamageBlunted} {selectedOffhand.isShield ? 'Bash' : 'Dmg'}
											</span>
											<span class="badge variant-soft-warning">{selectedOffhand.apCost} AP</span>
										</div>
									</div>
									<button
										type="button"
										class="btn btn-sm variant-soft-error"
										onclick={() => selectOffhand(null)}
									>
										Clear
									</button>
								</div>

								<MaterialSelector
									selectedMaterialId={equipment.offhand.materialId}
									onSelect={updateOffhandMaterial}
									excludeArmorOnly={true}
								/>

								{#if equipment.offhand.materialId}
									<div class="mt-3 flex gap-4 text-sm">
										<span>
											<span class="text-surface-400">Value:</span>
											<span class="font-medium">{offhandAdjustedValue}g</span>
										</span>
										<span>
											<span class="text-surface-400">Weight:</span>
											<span class="font-medium">{offhandAdjustedWeight} lbs</span>
										</span>
									</div>
								{/if}
							{:else}
								<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
									{#each [...getShields(), ...getOneHandedWeapons()] as item}
										{@const isSameAsMain = equipment.weapon.id === item.id}
										<button
											type="button"
											class={classNames('card p-3 text-left transition-all text-sm', {
												'hover:bg-surface-600/50': !isSameAsMain,
												'opacity-50 cursor-not-allowed': isSameAsMain,
											})}
											disabled={isSameAsMain}
											onclick={() => selectOffhand(item.id)}
										>
											<span class="font-medium block">{item.name}</span>
											{#if item.isShield}
												<span class="text-xs text-surface-400">Shield</span>
											{:else}
												<span class="text-xs text-surface-400">Dual Wield</span>
											{/if}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{:else if isTwoHandedWeapon}
						<div class="card p-4 variant-soft-warning">
							<p class="text-sm text-warning-700 dark:text-warning-300">
								Two-handed weapons require both hands. Off-hand slot is disabled.
							</p>
						</div>
					{/if}

					<!-- One-Handed Weapons -->
					<div class="flex flex-col gap-3">
						<h4 class="font-semibold flex items-center gap-2">
							<span>One-Handed Weapons</span>
							<span class="badge variant-soft-primary text-xs">Allows Offhand</span>
						</h4>
						<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
							{#each getOneHandedWeapons() as weapon}
								{@const isSelected = equipment.weapon.id === weapon.id}
								<button
									type="button"
									class={classNames('card p-4 text-left transition-all', {
										'ring-2 ring-primary-500 bg-primary-500/10': isSelected,
										'hover:bg-surface-600/50': !isSelected,
									})}
									onclick={() => selectWeapon(isSelected ? null : weapon.id)}
								>
									<div class="flex items-start justify-between gap-2 mb-2">
										<h5 class="font-semibold">{weapon.name}</h5>
										<div
											class={classNames('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', {
												'border-primary-500 bg-primary-500': isSelected,
												'border-surface-500': !isSelected,
											})}
										>
											{#if isSelected}
												<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
											{/if}
										</div>
									</div>
									<div class="flex flex-wrap gap-2 text-xs">
										<span class="badge variant-soft">
											{weapon.baseDamageLethal ?? weapon.baseDamageBlunted} Dmg
										</span>
										<span class="badge variant-soft-warning">{weapon.apCost} AP</span>
										<span class="badge variant-soft-tertiary">{formatRange(weapon.range)}</span>
										<span class="badge variant-soft-surface">{weapon.value}g / {weapon.weight}lbs</span>
									</div>
								</button>
							{/each}
						</div>
					</div>

					<!-- Two-Handed Weapons -->
					<div class="flex flex-col gap-3">
						<h4 class="font-semibold flex items-center gap-2">
							<span>Two-Handed Weapons</span>
							<span class="badge variant-soft-secondary text-xs">No Offhand</span>
						</h4>
						<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
							{#each getTwoHandedWeapons() as weapon}
								{@const isSelected = equipment.weapon.id === weapon.id}
								<button
									type="button"
									class={classNames('card p-4 text-left transition-all', {
										'ring-2 ring-secondary-500 bg-secondary-500/10': isSelected,
										'hover:bg-surface-600/50': !isSelected,
									})}
									onclick={() => selectWeapon(isSelected ? null : weapon.id)}
								>
									<div class="flex items-start justify-between gap-2 mb-2">
										<h5 class="font-semibold">{weapon.name}</h5>
										<div
											class={classNames('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', {
												'border-secondary-500 bg-secondary-500': isSelected,
												'border-surface-500': !isSelected,
											})}
										>
											{#if isSelected}
												<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
											{/if}
										</div>
									</div>
									<div class="flex flex-wrap gap-2 text-xs">
										<span class="badge variant-soft">
											{weapon.baseDamageLethal ?? weapon.baseDamageBlunted} Dmg
										</span>
										<span class="badge variant-soft-warning">{weapon.apCost} AP</span>
										<span class="badge variant-soft-tertiary">{formatRange(weapon.range)}</span>
										<span class="badge variant-soft-surface">{weapon.value}g / {weapon.weight}lbs</span>
									</div>
								</button>
							{/each}
						</div>
					</div>

					<!-- Ranged Weapons -->
					<div class="flex flex-col gap-3">
						<h4 class="font-semibold flex items-center gap-2">
							<span>Ranged Weapons</span>
							<span class="badge variant-soft-success text-xs">Marksmanship</span>
						</h4>
						<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
							{#each getRangedWeapons() as weapon}
								{@const isSelected = equipment.weapon.id === weapon.id}
								<button
									type="button"
									class={classNames('card p-4 text-left transition-all', {
										'ring-2 ring-success-500 bg-success-500/10': isSelected,
										'hover:bg-surface-600/50': !isSelected,
									})}
									onclick={() => selectWeapon(isSelected ? null : weapon.id)}
								>
									<div class="flex items-start justify-between gap-2 mb-2">
										<div class="flex-1">
											<h5 class="font-semibold">{weapon.name}</h5>
											{#if weapon.isTwoHanded}
												<span class="text-xs text-surface-400">Two-Handed</span>
											{/if}
										</div>
										<div
											class={classNames('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', {
												'border-success-500 bg-success-500': isSelected,
												'border-surface-500': !isSelected,
											})}
										>
											{#if isSelected}
												<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
											{/if}
										</div>
									</div>
									<div class="flex flex-wrap gap-2 text-xs">
										<span class="badge variant-soft">
											{weapon.baseDamageBlunted} Blunt Dmg
										</span>
										<span class="badge variant-soft-warning">{weapon.apCost} AP</span>
										{#if weapon.apReload}
											<span class="badge variant-soft-error">{weapon.apReload} Reload</span>
										{/if}
										<span class="badge variant-soft-tertiary">{formatRange(weapon.range)}</span>
									</div>
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Armor Panel -->
			{#if selectedTabIndex === 1}
				<div class="flex flex-col gap-4 mt-4">
					<!-- Selected Armor Summary -->
					{#if selectedArmor}
						<div class="card p-4 variant-soft-tertiary">
							<div class="flex justify-between items-start mb-3">
								<div>
									<h4 class="font-bold text-lg">{selectedArmor.name}</h4>
									<span class={classNames('badge text-xs mt-1', getArmorCategoryColor(selectedArmor.category))}>
										{selectedArmor.category}
									</span>
								</div>
								<button
									type="button"
									class="btn btn-sm variant-soft-error"
									onclick={() => selectArmor(null)}
								>
									Clear
								</button>
							</div>

							<MaterialSelector
								selectedMaterialId={equipment.armor.materialId}
								onSelect={updateArmorMaterial}
							/>

							{#if equipment.armor.materialId}
								<div class="mt-3 flex gap-4 text-sm">
									<span>
										<span class="text-surface-400">Value:</span>
										<span class="font-medium">{armorAdjustedValue}g</span>
										<span class="text-surface-500">(base: {DEFAULT_ARMOR_VALUE}g)</span>
									</span>
									<span>
										<span class="text-surface-400">Weight:</span>
										<span class="font-medium">{armorAdjustedWeight} lbs</span>
										<span class="text-surface-500">(base: {DEFAULT_ARMOR_WEIGHT} lbs)</span>
									</span>
								</div>
							{/if}
						</div>
					{/if}

					<p class="text-sm text-surface-400">
						Choose an armor category. This determines your base AC, dodge bonuses, and movement characteristics.
					</p>

					<!-- Armor by Category -->
					{#each [ArmorCategory.Light, ArmorCategory.Medium, ArmorCategory.Heavy] as category}
						{@const categoryArmors = ArmorTypes.filter((a) => a.category === category)}
						<div class="flex flex-col gap-3">
							<h4 class="font-semibold flex items-center gap-2">
								<span>{category} Armor</span>
								<span class={classNames('badge text-xs', getArmorCategoryColor(category))}>
									{category}
								</span>
							</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								{#each categoryArmors as armor}
									{@const isSelected = equipment.armor.id === armor.id}
									<button
										type="button"
										class={classNames('card p-4 text-left transition-all', {
											'ring-2 ring-tertiary-500 bg-tertiary-500/10': isSelected,
											'hover:bg-surface-600/50': !isSelected,
										})}
										onclick={() => selectArmor(isSelected ? null : armor.id)}
									>
										<div class="flex items-start justify-between gap-2 mb-3">
											<div>
												<h5 class="font-semibold text-lg">{armor.name}</h5>
											</div>
											<div
												class={classNames('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0', {
													'border-tertiary-500 bg-tertiary-500': isSelected,
													'border-surface-500': !isSelected,
												})}
											>
												{#if isSelected}
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
													</svg>
												{/if}
											</div>
										</div>

										<div class="grid grid-cols-2 gap-2 text-sm">
											<div class="flex items-center gap-2">
												<span class="text-surface-400">AC Bonus:</span>
												<span class="font-medium text-primary-400">+{armor.acBonus}</span>
											</div>
											<div class="flex items-center gap-2">
												<span class="text-surface-400">Dodge:</span>
												<span class={classNames('font-medium', {
													'text-success-400': armor.dodgeBonus > 0,
													'text-error-400': armor.dodgeBonus < 0,
													'text-surface-300': armor.dodgeBonus === 0,
												})}>
													{armor.dodgeBonus > 0 ? '+' : ''}{armor.dodgeBonus}
												</span>
											</div>
											<div class="flex items-center gap-2">
												<span class="text-surface-400">Magicka:</span>
												<span class={classNames('font-medium text-xs', {
													'text-success-400': armor.magickaCastModifier === 'advantage',
													'text-warning-400': armor.magickaCastModifier === 'disadvantage',
													'text-error-400': armor.magickaCastModifier === 'disadvantage2',
													'text-surface-300': armor.magickaCastModifier === 'none',
												})}>
													{getModifierDisplay(armor.magickaCastModifier)}
												</span>
											</div>
											<div class="flex items-center gap-2">
												<span class="text-surface-400">Movement:</span>
												<span class={classNames('font-medium text-xs', {
													'text-success-400': armor.movementModifier === 'advantage',
													'text-warning-400': armor.movementModifier === 'disadvantage',
													'text-error-400': armor.movementModifier === 'disadvantage2',
													'text-surface-300': armor.movementModifier === 'none',
												})}>
													{getModifierDisplay(armor.movementModifier)}
												</span>
											</div>
										</div>

										{#if armor.handToHandDamageBonus > 0}
											<div class="mt-3 pt-3 border-t border-surface-600">
												<span class="text-xs text-surface-400">Hand-to-Hand:</span>
												<span class="text-xs font-medium ml-1">
													+{armor.handToHandDamageBonus} {armor.handToHandDamageType} dmg, +{armor.handToHandApBonus} AP cost
												</span>
											</div>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/each}

					<!-- Unarmored Option -->
					<div class="flex flex-col gap-3">
						<h4 class="font-semibold">Unarmored</h4>
						{#if unarmoredArmor}
							{@const isSelected = equipment.armor.id === unarmoredArmor.id}
							<button
								type="button"
								class={classNames('card p-4 text-left transition-all', {
									'ring-2 ring-tertiary-500 bg-tertiary-500/10': isSelected,
									'hover:bg-surface-600/50': !isSelected,
								})}
								onclick={() => selectArmor(isSelected ? null : unarmoredArmor.id)}
							>
								<div class="flex items-start justify-between gap-2 mb-3">
									<h5 class="font-semibold text-lg">{unarmoredArmor.name}</h5>
									<div
										class={classNames('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0', {
											'border-tertiary-500 bg-tertiary-500': isSelected,
											'border-surface-500': !isSelected,
										})}
									>
										{#if isSelected}
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</div>
								</div>
								<div class="grid grid-cols-2 gap-2 text-sm">
									<div>
										<span class="text-surface-400">Dodge Bonus:</span>
										<span class="font-medium text-success-400">+{unarmoredArmor.dodgeBonus}</span>
									</div>
									<div>
										<span class="text-surface-400">Magicka:</span>
										<span class="font-medium text-success-400">{getModifierDisplay(unarmoredArmor.magickaCastModifier)}</span>
									</div>
								</div>
							</button>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Items Panel -->
			{#if selectedTabIndex === 2}
				<div class="flex flex-col gap-4 mt-4">
					<div class="flex items-center justify-between">
						<p class="text-sm text-surface-400">
							Add items to your inventory. Use the +/- buttons to adjust quantities.
						</p>
						<span class="badge variant-soft">
							{totalItemsCount} items
						</span>
					</div>

					<!-- Current Inventory Summary -->
					{#if inventory.length > 0}
						<div class="card p-4 variant-soft-success">
							<h4 class="font-bold mb-3">Current Inventory</h4>
							<div class="flex flex-wrap gap-2">
								{#each inventory as invItem}
									{@const item = getItemById(invItem.itemId)}
									{#if item}
										<span class="badge variant-filled-success">
											{item.name} x{invItem.quantity}
											<button
												type="button"
												class="ml-1 hover:text-error-300"
												aria-label="Remove {item.name} from inventory"
												onclick={() => {
													onInventoryChange(inventory.filter((i) => i.itemId !== invItem.itemId))
												}}
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										</span>
									{/if}
								{/each}
							</div>
						</div>
					{/if}

					<!-- Items Grid -->
					<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
						{#each Items as item}
							{@const quantity = getItemQuantity(item.id)}
							{@const maxStack = item.maxStack ?? 1}
							{@const canAdd = !item.stackable ? quantity < 1 : quantity < maxStack}

							<div class={classNames('card p-4 transition-all', {
								'ring-2 ring-success-500 bg-success-500/10': quantity > 0,
							})}>
								<div class="flex items-start justify-between gap-2 mb-2">
									<div class="flex-1">
										<h5 class="font-semibold">{item.name}</h5>
										<span class={classNames('badge text-xs', {
											'variant-soft-primary': item.type === ItemType.Potion,
											'variant-soft-secondary': item.type === ItemType.Consumable,
											'variant-soft-tertiary': item.type === ItemType.Material,
											'variant-soft': item.type === ItemType.Misc,
										})}>
											{item.type}
										</span>
									</div>
								</div>

								<p class="text-xs text-surface-400 mb-3 line-clamp-2">{item.description}</p>

								<div class="flex items-center justify-between">
									<div class="flex gap-2 text-xs">
										<span class="badge variant-soft">{item.value}g</span>
										<span class="badge variant-soft-warning">{item.apToUse} AP</span>
										<span class="badge variant-soft-surface">{item.weight} lbs</span>
									</div>

									<div class="flex items-center gap-2">
										{#if quantity > 0}
											<button
												type="button"
												class="btn-icon btn-icon-sm variant-soft-error"
												aria-label="Remove one {item.name}"
												onclick={() => removeItem(item.id)}
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
												</svg>
											</button>
										{/if}

										<span class={classNames('w-8 text-center font-medium', {
											'text-success-400': quantity > 0,
											'text-surface-500': quantity === 0,
										})}>
											{quantity}
										</span>

										<button
											type="button"
											class="btn-icon btn-icon-sm variant-soft-success"
											disabled={!canAdd}
											aria-label="Add one {item.name}"
											onclick={() => addItem(item.id)}
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
											</svg>
										</button>
									</div>
								</div>

								{#if item.stackable && item.maxStack}
									<div class="mt-2 text-xs text-surface-500 text-right">
										Max: {item.maxStack}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</svelte:fragment>
	</TabGroup>
</div>
