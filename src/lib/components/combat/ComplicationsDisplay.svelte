<script lang="ts">
	import type { Complication, Equipment } from '$lib/models/player'
	import { getWeaponById } from '$lib/data/weapons'
	import { ArmorTypes } from '$lib/data/armor'

	interface Props {
		complications: Complication[]
		equipment: Equipment
		onHeal?: (complicationId: string) => void
	}

	let { complications, equipment, onHeal }: Props = $props()

	// Count complications by type
	let hpReduction = $derived(complications.filter(c => c.type === 'hp').length)
	let apReduction = $derived(complications.filter(c => c.type === 'ap').length)
	let mpReduction = $derived(complications.filter(c => c.type === 'mp').length)
	let equipmentDamage = $derived(complications.filter(c => c.type === 'equipment'))

	function getEquipmentName(slot: 'weapon' | 'offhand' | 'armor' | undefined): string {
		if (!slot) return 'Unknown'

		switch (slot) {
			case 'weapon':
				const weaponId = equipment.weapon.id
				const weapon = weaponId ? getWeaponById(weaponId) : null
				return weapon?.name ?? 'Weapon'
			case 'offhand':
				const offhandId = equipment.offhand.id
				const offhand = offhandId ? getWeaponById(offhandId) : null
				return offhand?.name ?? 'Off-Hand'
			case 'armor':
				const armorId = equipment.armor.id
				const armor = armorId ? ArmorTypes.find(a => a.id === armorId) : null
				return armor?.name ?? 'Armor'
		}
	}

	function getComplicationLabel(c: Complication): string {
		switch (c.type) {
			case 'hp': return '-1 HP Max'
			case 'ap': return '-1 AP Max'
			case 'mp': return '-1 MP Max'
			case 'equipment': return `${getEquipmentName(c.equipmentSlot)} Damaged`
		}
	}

	function getComplicationColor(type: string): string {
		switch (type) {
			case 'hp': return 'variant-filled-error'
			case 'ap': return 'variant-filled-warning'
			case 'mp': return 'variant-filled-primary'
			case 'equipment': return 'variant-filled-surface'
			default: return 'variant-filled'
		}
	}

	function formatDate(timestamp: string): string {
		return new Date(timestamp).toLocaleDateString()
	}
</script>

<div class="complications-display">
	{#if complications.length === 0}
		<p class="text-surface-500 text-sm italic">No active complications</p>
	{:else}
		<!-- Summary -->
		<div class="flex flex-wrap gap-2 mb-3">
			{#if hpReduction > 0}
				<span class="badge variant-filled-error">HP: -{hpReduction}</span>
			{/if}
			{#if apReduction > 0}
				<span class="badge variant-filled-warning">AP: -{apReduction}</span>
			{/if}
			{#if mpReduction > 0}
				<span class="badge variant-filled-primary">MP: -{mpReduction}</span>
			{/if}
			{#if equipmentDamage.length > 0}
				<span class="badge variant-filled-surface">{equipmentDamage.length} Damaged Item(s)</span>
			{/if}
		</div>

		<!-- Detailed list -->
		<div class="space-y-2">
			{#each complications as complication}
				<div class="flex items-center justify-between p-2 rounded bg-surface-500/10">
					<div class="flex items-center gap-2">
						<span class="badge {getComplicationColor(complication.type)}">
							{getComplicationLabel(complication)}
						</span>
						<span class="text-xs opacity-50">{formatDate(complication.timestamp)}</span>
					</div>
					{#if onHeal}
						<button
							type="button"
							class="btn btn-sm variant-soft-success"
							onclick={() => onHeal(complication.id)}
							title="Heal this complication"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
							</svg>
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
