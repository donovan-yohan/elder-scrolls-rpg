<script lang="ts">
	import WizardStep from '../WizardStep.svelte'
	import { wizardStore } from '$lib/stores/wizard.store'
	import { onMount } from 'svelte'
	import type { Equipment, InventoryItem } from '$lib/models/player'
	import { TabGroup, Tab } from '@skeletonlabs/skeleton'
	import classNames from 'classnames'
	import {
		Weapons,
		WeaponSkill,
		WeaponRange,
		getWeaponById,
		type Weapon,
	} from '$lib/data/weapons'
	import { ArmorTypes, ArmorCategory, type ArmorType } from '$lib/data/armor'
	import { Items, ItemType, getItemById, type Item } from '$lib/data/items'

	export let stepIndex: number = 4

	// Maximum starting items
	const MAX_STARTING_ITEMS = 5

	// Initialize equipment from store
	let equipment: Equipment = $wizardStore.formData.equipment || {
		weapon: null,
		offhand: null,
		armor: null,
		accessories: [],
	}

	let inventory: InventoryItem[] = $wizardStore.formData.inventory || []

	// Tab tracking
	let selectedTabIndex: number = 0

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

	// Check if selected weapon is one-handed
	$: selectedWeapon = equipment.weapon ? getWeaponById(equipment.weapon) : null
	$: isOneHandedWeapon = selectedWeapon && !selectedWeapon.isTwoHanded && !selectedWeapon.isShield

	// Can select offhand only if main weapon is one-handed
	$: canSelectOffhand = isOneHandedWeapon

	// Get offhand options (shields + one-handed weapons for dual wield)
	function getOffhandOptions(): Weapon[] {
		return [...getShields(), ...getOneHandedWeapons()]
	}

	// Select weapon
	function selectWeapon(weaponId: string | null): void {
		equipment.weapon = weaponId
		// Clear offhand if switching to two-handed or no weapon
		const weapon = weaponId ? getWeaponById(weaponId) : null
		if (!weapon || weapon.isTwoHanded) {
			equipment.offhand = null
		}
		equipment = equipment
	}

	// Select offhand
	function selectOffhand(weaponId: string | null): void {
		equipment.offhand = weaponId
		equipment = equipment
	}

	// Select armor
	function selectArmor(armorId: string | null): void {
		equipment.armor = armorId
		equipment = equipment
	}

	// Get starting consumables (potions and basic items)
	function getStartingItems(): Item[] {
		return Items.filter(
			(item) =>
				(item.type === ItemType.Potion && item.name.includes('Lesser')) ||
				item.type === ItemType.Consumable
		)
	}

	// Get item count in inventory
	function getItemQuantity(itemId: string): number {
		const item = inventory.find((i) => i.itemId === itemId)
		return item?.quantity || 0
	}

	// Get total items count
	$: totalItemsCount = inventory.reduce((sum, item) => sum + item.quantity, 0)

	// Add item to inventory
	function addItem(itemId: string): void {
		if (totalItemsCount >= MAX_STARTING_ITEMS) return

		const item = getItemById(itemId)
		if (!item) return

		const existingIndex = inventory.findIndex((i) => i.itemId === itemId)
		const existingItem = inventory[existingIndex]
		if (existingIndex >= 0 && existingItem) {
			const maxStack = item.maxStack || 1
			if (existingItem.quantity < maxStack) {
				existingItem.quantity++
				inventory = [...inventory]
			}
		} else {
			inventory = [...inventory, { itemId, quantity: 1 }]
		}
	}

	// Remove item from inventory
	function removeItem(itemId: string): void {
		const existingIndex = inventory.findIndex((i) => i.itemId === itemId)
		const existingItem = inventory[existingIndex]
		if (existingIndex >= 0 && existingItem) {
			if (existingItem.quantity > 1) {
				existingItem.quantity--
				inventory = [...inventory]
			} else {
				inventory = inventory.filter((i) => i.itemId !== itemId)
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

	// Get weapon skill color
	function getWeaponSkillColor(skill: WeaponSkill): string {
		switch (skill) {
			case WeaponSkill.OneHanded:
				return 'variant-soft-primary'
			case WeaponSkill.TwoHanded:
				return 'variant-soft-secondary'
			case WeaponSkill.Marksmanship:
				return 'variant-soft-success'
			case WeaponSkill.Blocking:
				return 'variant-soft-warning'
			default:
				return 'variant-soft'
		}
	}

	// Get selected armor type
	$: selectedArmorType = equipment.armor
		? ArmorTypes.find((a) => a.id === equipment.armor)
		: null

	// Get selected offhand weapon
	$: selectedOffhand = equipment.offhand ? getWeaponById(equipment.offhand) : null

	// This step is always valid (equipment is optional for character creation)
	$: {
		wizardStore.updateFormData({
			equipment,
			inventory,
		})
		wizardStore.setStepValid(stepIndex, true)
	}

	onMount(() => {
		wizardStore.setStepValid(stepIndex, true)
	})
</script>

<WizardStep
	title="Equipment"
	description="Select your starting weapons, armor, and items."
	{stepIndex}
>
	<div class="flex flex-col gap-6">
		<!-- Info Box -->
		<div class="card p-4 variant-soft-secondary">
			<div class="flex items-start gap-3">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-secondary-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
				</svg>
				<div>
					<p class="font-semibold">Starting Equipment</p>
					<p class="text-sm text-surface-400 mt-1">
						Choose your starting gear. All equipment is optional - you can begin your adventure with nothing if you prefer.
						One-handed weapons allow you to equip a shield or second weapon in your off-hand.
					</p>
				</div>
			</div>
		</div>

		<!-- Equipment Summary -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<!-- Weapon Slot -->
			<div class={classNames('p-3 rounded-lg border-2 text-center', {
				'border-primary-500 bg-primary-500/10': equipment.weapon,
				'border-surface-600 bg-surface-700/50': !equipment.weapon,
			})}>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mx-auto mb-1 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
				</svg>
				<span class="block text-xs text-surface-400">Weapon</span>
				<span class="block text-sm font-medium truncate">
					{selectedWeapon?.name || 'None'}
				</span>
			</div>

			<!-- Offhand Slot -->
			<div class={classNames('p-3 rounded-lg border-2 text-center', {
				'border-secondary-500 bg-secondary-500/10': equipment.offhand,
				'border-surface-600 bg-surface-700/50': !equipment.offhand,
				'opacity-50': !canSelectOffhand,
			})}>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mx-auto mb-1 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
				</svg>
				<span class="block text-xs text-surface-400">Offhand</span>
				<span class="block text-sm font-medium truncate">
					{selectedOffhand?.name || (canSelectOffhand ? 'None' : 'N/A')}
				</span>
			</div>

			<!-- Armor Slot -->
			<div class={classNames('p-3 rounded-lg border-2 text-center', {
				'border-tertiary-500 bg-tertiary-500/10': equipment.armor,
				'border-surface-600 bg-surface-700/50': !equipment.armor,
			})}>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mx-auto mb-1 text-tertiary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
				</svg>
				<span class="block text-xs text-surface-400">Armor</span>
				<span class="block text-sm font-medium truncate">
					{selectedArmorType?.name || 'None'}
				</span>
			</div>

			<!-- Items Slot -->
			<div class={classNames('p-3 rounded-lg border-2 text-center', {
				'border-success-500 bg-success-500/10': totalItemsCount > 0,
				'border-surface-600 bg-surface-700/50': totalItemsCount === 0,
			})}>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mx-auto mb-1 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
				</svg>
				<span class="block text-xs text-surface-400">Items</span>
				<span class="block text-sm font-medium">
					{totalItemsCount}/{MAX_STARTING_ITEMS}
				</span>
			</div>
		</div>

		<!-- Equipment Tabs -->
		<TabGroup>
			<Tab bind:group={selectedTabIndex} name="weapons" value={0}>
				<span class="flex items-center gap-2">
					<span>Weapons</span>
					{#if equipment.weapon}
						<span class="badge variant-filled-primary text-xs">1</span>
					{/if}
				</span>
			</Tab>
			<Tab bind:group={selectedTabIndex} name="offhand" value={1}>
				<span class="flex items-center gap-2">
					<span>Offhand</span>
					{#if equipment.offhand}
						<span class="badge variant-filled-secondary text-xs">1</span>
					{/if}
					{#if !canSelectOffhand}
						<span class="badge variant-soft text-xs">Locked</span>
					{/if}
				</span>
			</Tab>
			<Tab bind:group={selectedTabIndex} name="armor" value={2}>
				<span class="flex items-center gap-2">
					<span>Armor</span>
					{#if equipment.armor}
						<span class="badge variant-filled-tertiary text-xs">1</span>
					{/if}
				</span>
			</Tab>
			<Tab bind:group={selectedTabIndex} name="items" value={3}>
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
						<!-- Clear Selection Button -->
						{#if equipment.weapon}
							<button
								type="button"
								class="btn variant-soft-error self-start"
								on:click={() => selectWeapon(null)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
								<span>Clear Weapon Selection</span>
							</button>
						{/if}

						<!-- One-Handed Weapons -->
						<div class="flex flex-col gap-3">
							<h4 class="font-semibold flex items-center gap-2">
								<span>One-Handed Weapons</span>
								<span class="badge variant-soft-primary text-xs">Allows Offhand</span>
							</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
								{#each getOneHandedWeapons() as weapon}
									{@const isSelected = equipment.weapon === weapon.id}
									<button
										type="button"
										class={classNames('card p-4 text-left transition-all', {
											'ring-2 ring-primary-500 bg-primary-500/10': isSelected,
											'hover:bg-surface-600/50': !isSelected,
										})}
										on:click={() => selectWeapon(isSelected ? null : weapon.id)}
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
												{weapon.baseDamageLethal !== null ? weapon.baseDamageLethal : weapon.baseDamageBlunted} Dmg
											</span>
											<span class="badge variant-soft-warning">{weapon.apCost} AP</span>
											<span class="badge variant-soft-tertiary">{formatRange(weapon.range)}</span>
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
									{@const isSelected = equipment.weapon === weapon.id}
									<button
										type="button"
										class={classNames('card p-4 text-left transition-all', {
											'ring-2 ring-secondary-500 bg-secondary-500/10': isSelected,
											'hover:bg-surface-600/50': !isSelected,
										})}
										on:click={() => selectWeapon(isSelected ? null : weapon.id)}
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
												{weapon.baseDamageLethal !== null ? weapon.baseDamageLethal : weapon.baseDamageBlunted} Dmg
											</span>
											<span class="badge variant-soft-warning">{weapon.apCost} AP</span>
											<span class="badge variant-soft-tertiary">{formatRange(weapon.range)}</span>
										</div>
									</button>
								{/each}
							</div>
						</div>

						<!-- Marksmanship Weapons -->
						<div class="flex flex-col gap-3">
							<h4 class="font-semibold flex items-center gap-2">
								<span>Ranged Weapons</span>
								<span class="badge variant-soft-success text-xs">Marksmanship</span>
							</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
								{#each getRangedWeapons() as weapon}
									{@const isSelected = equipment.weapon === weapon.id}
									<button
										type="button"
										class={classNames('card p-4 text-left transition-all', {
											'ring-2 ring-success-500 bg-success-500/10': isSelected,
											'hover:bg-surface-600/50': !isSelected,
										})}
										on:click={() => selectWeapon(isSelected ? null : weapon.id)}
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

				<!-- Offhand Panel -->
				{#if selectedTabIndex === 1}
					<div class="flex flex-col gap-6 mt-4">
						{#if !canSelectOffhand}
							<div class="card p-6 variant-soft-warning text-center">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-warning-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
								<p class="font-semibold">Offhand Slot Locked</p>
								<p class="text-sm text-surface-400 mt-2">
									{#if !equipment.weapon}
										Select a one-handed weapon first to unlock the offhand slot.
									{:else}
										Two-handed weapons require both hands. Select a one-handed weapon to use an offhand.
									{/if}
								</p>
							</div>
						{:else}
							<!-- Clear Selection Button -->
							{#if equipment.offhand}
								<button
									type="button"
									class="btn variant-soft-error self-start"
									on:click={() => selectOffhand(null)}
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
									<span>Clear Offhand Selection</span>
								</button>
							{/if}

							<!-- Shields -->
							<div class="flex flex-col gap-3">
								<h4 class="font-semibold flex items-center gap-2">
									<span>Shields</span>
									<span class="badge variant-soft-warning text-xs">Blocking</span>
								</h4>
								<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
									{#each getShields() as shield}
										{@const isSelected = equipment.offhand === shield.id}
										<button
											type="button"
											class={classNames('card p-4 text-left transition-all', {
												'ring-2 ring-warning-500 bg-warning-500/10': isSelected,
												'hover:bg-surface-600/50': !isSelected,
											})}
											on:click={() => selectOffhand(isSelected ? null : shield.id)}
										>
											<div class="flex items-start justify-between gap-2 mb-2">
												<h5 class="font-semibold">{shield.name}</h5>
												<div
													class={classNames('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', {
														'border-warning-500 bg-warning-500': isSelected,
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
												<span class="badge variant-soft">{shield.baseDamageBlunted} Bash Dmg</span>
												<span class="badge variant-soft-warning">{shield.apCost} AP</span>
												<span class="badge variant-soft-tertiary">{shield.weight} lbs</span>
											</div>
										</button>
									{/each}
								</div>
							</div>

							<!-- Dual Wield -->
							<div class="flex flex-col gap-3">
								<h4 class="font-semibold flex items-center gap-2">
									<span>Dual Wield</span>
									<span class="badge variant-soft-primary text-xs">One-Handed</span>
								</h4>
								<p class="text-sm text-surface-400">
									Equip a second one-handed weapon for dual wielding.
								</p>
								<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
									{#each getOneHandedWeapons() as weapon}
										{@const isSelected = equipment.offhand === weapon.id}
										{@const isSameAsMain = equipment.weapon === weapon.id}
										<button
											type="button"
											class={classNames('card p-4 text-left transition-all', {
												'ring-2 ring-primary-500 bg-primary-500/10': isSelected,
												'hover:bg-surface-600/50': !isSelected && !isSameAsMain,
												'opacity-50': isSameAsMain,
											})}
											disabled={isSameAsMain}
											on:click={() => selectOffhand(isSelected ? null : weapon.id)}
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
												{#if isSameAsMain}
													<span class="badge variant-soft-surface">Main Weapon</span>
												{:else}
													<span class="badge variant-soft">
														{weapon.baseDamageLethal !== null ? weapon.baseDamageLethal : weapon.baseDamageBlunted} Dmg
													</span>
													<span class="badge variant-soft-warning">{weapon.apCost} AP</span>
												{/if}
											</div>
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Armor Panel -->
				{#if selectedTabIndex === 2}
					<div class="flex flex-col gap-4 mt-4">
						<p class="text-sm text-surface-400">
							Choose an armor category. This determines your base AC, dodge bonuses, and movement characteristics.
						</p>

						<!-- Clear Selection Button -->
						{#if equipment.armor}
							<button
								type="button"
								class="btn variant-soft-error self-start"
								on:click={() => selectArmor(null)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
								<span>Clear Armor Selection</span>
							</button>
						{/if}

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each ArmorTypes as armor}
								{@const isSelected = equipment.armor === armor.id}
								<button
									type="button"
									class={classNames('card p-4 text-left transition-all', {
										'ring-2 ring-tertiary-500 bg-tertiary-500/10': isSelected,
										'hover:bg-surface-600/50': !isSelected,
									})}
									on:click={() => selectArmor(isSelected ? null : armor.id)}
								>
									<div class="flex items-start justify-between gap-2 mb-3">
										<div>
											<h5 class="font-semibold text-lg">{armor.name}</h5>
											<span class={classNames('badge text-xs mt-1', getArmorCategoryColor(armor.category))}>
												{armor.category}
											</span>
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
				{/if}

				<!-- Items Panel -->
				{#if selectedTabIndex === 3}
					<div class="flex flex-col gap-4 mt-4">
						<div class="flex items-center justify-between">
							<p class="text-sm text-surface-400">
								Select up to {MAX_STARTING_ITEMS} starting items. Lesser potions and basic supplies are available.
							</p>
							<span class={classNames('badge', {
								'variant-filled-success': totalItemsCount === MAX_STARTING_ITEMS,
								'variant-soft': totalItemsCount < MAX_STARTING_ITEMS,
							})}>
								{totalItemsCount}/{MAX_STARTING_ITEMS}
							</span>
						</div>

						<!-- Clear All Items -->
						{#if inventory.length > 0}
							<button
								type="button"
								class="btn variant-soft-error self-start"
								on:click={() => inventory = []}
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
								<span>Clear All Items</span>
							</button>
						{/if}

						<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
							{#each getStartingItems() as item}
								{@const quantity = getItemQuantity(item.id)}
								{@const canAdd = totalItemsCount < MAX_STARTING_ITEMS && (!item.maxStack || quantity < item.maxStack)}

								<div class={classNames('card p-4 transition-all', {
									'ring-2 ring-success-500 bg-success-500/10': quantity > 0,
								})}>
									<div class="flex items-start justify-between gap-2 mb-2">
										<div class="flex-1">
											<h5 class="font-semibold">{item.name}</h5>
											<span class={classNames('badge text-xs', {
												'variant-soft-primary': item.type === ItemType.Potion,
												'variant-soft-secondary': item.type === ItemType.Consumable,
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
										</div>

										<div class="flex items-center gap-2">
											{#if quantity > 0}
												<button
													type="button"
													class="btn-icon btn-icon-sm variant-soft-error"
													on:click={() => removeItem(item.id)}
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
												on:click={() => addItem(item.id)}
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
												</svg>
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</svelte:fragment>
		</TabGroup>

		<!-- Selected Equipment Summary -->
		{#if equipment.weapon || equipment.offhand || equipment.armor || inventory.length > 0}
			<div class="card p-4 variant-soft">
				<h4 class="font-semibold mb-3">Selected Equipment</h4>
				<div class="flex flex-wrap gap-2">
					{#if selectedWeapon}
						<span class="badge variant-filled-primary">
							{selectedWeapon.name}
							<button
								type="button"
								class="ml-1 hover:text-error-300"
								on:click={() => selectWeapon(null)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</span>
					{/if}
					{#if selectedOffhand}
						<span class="badge variant-filled-secondary">
							{selectedOffhand.name} (Offhand)
							<button
								type="button"
								class="ml-1 hover:text-error-300"
								on:click={() => selectOffhand(null)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</span>
					{/if}
					{#if selectedArmorType}
						<span class="badge variant-filled-tertiary">
							{selectedArmorType.name}
							<button
								type="button"
								class="ml-1 hover:text-error-300"
								on:click={() => selectArmor(null)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</span>
					{/if}
					{#each inventory as invItem}
						{@const item = getItemById(invItem.itemId)}
						{#if item}
							<span class="badge variant-filled-success">
								{item.name} x{invItem.quantity}
								<button
									type="button"
									class="ml-1 hover:text-error-300"
									on:click={() => {
										inventory = inventory.filter((i) => i.itemId !== invItem.itemId)
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
	</div>
</WizardStep>
