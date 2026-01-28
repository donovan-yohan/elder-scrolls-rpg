<script lang="ts">
	import type { PlayerData, Equipment, Complication } from '$lib/models/player'
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton'

	interface Props {
		isOpen: boolean
		player: PlayerData
		equipment: Equipment
		onComplete: (complication: Complication) => void
		onCancel: () => void
	}

	let { isOpen, player, equipment, onComplete, onCancel }: Props = $props()

	type RollMode = 'digital' | 'manual'
	let mode: RollMode = $state('digital')

	type Step = 'roll' | 'equipment-select' | 'result'
	let step = $state<Step>('roll')

	let rollValue = $state<number | null>(null)
	let manualInput = $state('')
	let isRolling = $state(false)
	let selectedEquipmentSlot = $state<'weapon' | 'offhand' | 'armor' | null>(null)
	let rerollMessage = $state<string | null>(null)

	// Determine complication type from roll
	let complicationType = $derived.by(() => {
		if (rollValue === null) return null
		if (rollValue >= 1 && rollValue <= 3) return 'hp'
		if (rollValue >= 4 && rollValue <= 6) return 'ap'
		if (rollValue >= 7 && rollValue <= 9) return 'mp'
		if (rollValue === 10) return 'equipment'
		return null
	})

	// Get available equipment slots for damage
	let availableSlots = $derived.by(() => {
		const slots: { slot: 'weapon' | 'offhand' | 'armor'; name: string; equipped: boolean }[] = []

		if (equipment.weapon.id) {
			slots.push({ slot: 'weapon', name: 'Main Weapon', equipped: true })
		}
		if (equipment.offhand.id) {
			slots.push({ slot: 'offhand', name: 'Off-Hand', equipped: true })
		}
		if (equipment.armor.id) {
			slots.push({ slot: 'armor', name: 'Armor', equipped: true })
		}

		return slots
	})

	async function handleDigitalRoll() {
		if (isRolling) return
		isRolling = true

		// Brief animation delay
		await new Promise(r => setTimeout(r, 500))

		// Roll 1d10
		rollValue = Math.floor(Math.random() * 10) + 1
		isRolling = false

		if (rollValue === 10 && availableSlots.length > 0) {
			step = 'equipment-select'
		} else if (rollValue === 10 && availableSlots.length === 0) {
			// No equipment to damage - reroll to 1-9
			rollValue = Math.floor(Math.random() * 9) + 1
			step = 'result'
		} else {
			step = 'result'
		}
	}

	function handleManualSubmit() {
		const value = parseInt(manualInput)
		if (isNaN(value) || value < 1 || value > 10) return

		rollValue = value

		if (rollValue === 10 && availableSlots.length > 0) {
			step = 'equipment-select'
		} else if (rollValue === 10 && availableSlots.length === 0) {
			// No equipment - inform user and ask for reroll
			rollValue = null
			manualInput = ''
			rerollMessage = 'You rolled 10 but have no equipment to damage. Please reroll 1-9.'
			step = 'roll'
		} else {
			step = 'result'
		}
	}

	function handleEquipmentSelect(slot: 'weapon' | 'offhand' | 'armor') {
		selectedEquipmentSlot = slot
		step = 'result'
	}

	function handleConfirm() {
		if (complicationType === null) return

		const complication: Complication = {
			id: crypto.randomUUID(),
			type: complicationType as 'hp' | 'ap' | 'mp' | 'equipment',
			equipmentSlot: complicationType === 'equipment' ? selectedEquipmentSlot ?? undefined : undefined,
			timestamp: new Date().toISOString(),
		}

		onComplete(complication)
	}

	function resetState() {
		step = 'roll'
		rollValue = null
		manualInput = ''
		isRolling = false
		selectedEquipmentSlot = null
		rerollMessage = null
	}

	$effect(() => {
		if (!isOpen) resetState()
	})

	function getComplicationDescription(type: string | null): string {
		switch (type) {
			case 'hp': return 'Your maximum HP is reduced by 1.'
			case 'ap': return 'Your maximum AP is reduced by 1.'
			case 'mp': return 'Your maximum MP is reduced by 1.'
			case 'equipment': return 'A piece of your equipment becomes damaged.'
			default: return ''
		}
	}

	function getComplicationColor(type: string | null): string {
		switch (type) {
			case 'hp': return 'variant-filled-error'
			case 'ap': return 'variant-filled-warning'
			case 'mp': return 'variant-filled-primary'
			case 'equipment': return 'variant-filled-surface'
			default: return 'variant-filled'
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-md bg-surface-800">
			<header class="mb-4">
				<h2 class="h3 text-error-500 font-bold">Complication!</h2>
				<p class="text-sm opacity-75 mt-1">
					You've been reduced to 0 HP. Roll 1d10 to determine your complication.
				</p>
			</header>

			{#if step === 'roll'}
				<div class="space-y-4">
					{#if rerollMessage}
						<div class="card variant-soft-warning p-3 text-center">
							<p class="text-sm text-warning-500">{rerollMessage}</p>
						</div>
					{/if}

					<div class="mb-4">
						<RadioGroup>
							<RadioItem bind:group={mode} name="roll-mode" value="digital">
								Roll In-App
							</RadioItem>
							<RadioItem bind:group={mode} name="roll-mode" value="manual">
								Enter Roll
							</RadioItem>
						</RadioGroup>
					</div>

					<div class="card variant-soft-surface p-4 text-sm">
						<div class="font-semibold mb-2">Complication Table (1d10)</div>
						<div class="grid grid-cols-2 gap-2">
							<div><span class="badge variant-soft-error">1-3</span> -1 HP Max</div>
							<div><span class="badge variant-soft-warning">4-6</span> -1 AP Max</div>
							<div><span class="badge variant-soft-primary">7-9</span> -1 MP Max</div>
							<div><span class="badge variant-soft-surface">10</span> Equipment Damaged</div>
						</div>
					</div>

					{#if mode === 'digital'}
						<button
							type="button"
							class="btn variant-filled-error w-full"
							onclick={handleDigitalRoll}
							disabled={isRolling}
						>
							{#if isRolling}
								<span class="animate-spin mr-2">&#127922;</span> Rolling...
							{:else}
								&#127922; Roll 1d10
							{/if}
						</button>
					{:else}
						<div class="flex gap-2">
							<input
								type="number"
								class="input flex-1"
								placeholder="Enter 1-10"
								min="1"
								max="10"
								bind:value={manualInput}
							/>
							<button
								type="button"
								class="btn variant-filled-error"
								onclick={handleManualSubmit}
								disabled={!manualInput}
							>
								Submit
							</button>
						</div>
					{/if}
				</div>

			{:else if step === 'equipment-select'}
				<div class="space-y-4">
					<div class="card variant-soft-warning p-4 text-center">
						<div class="text-2xl font-bold mb-2">Rolled: {rollValue}</div>
						<p class="text-sm">Equipment damage! Choose which item becomes damaged:</p>
					</div>

					<div class="space-y-2">
						{#each availableSlots as { slot, name }}
							<button
								type="button"
								class="btn variant-soft-surface w-full justify-start"
								onclick={() => handleEquipmentSelect(slot)}
							>
								<span class="font-semibold">{name}</span>
							</button>
						{/each}
					</div>
				</div>

			{:else if step === 'result'}
				<div class="space-y-4">
					<div class="card variant-soft-error p-4 text-center">
						<div class="text-4xl font-bold mb-2">{rollValue}</div>
						<span class="badge {getComplicationColor(complicationType)} text-lg px-4 py-2">
							{#if complicationType === 'hp'}
								-1 HP Maximum
							{:else if complicationType === 'ap'}
								-1 AP Maximum
							{:else if complicationType === 'mp'}
								-1 MP Maximum
							{:else if complicationType === 'equipment'}
								Equipment Damaged
							{/if}
						</span>
					</div>

					<div class="card variant-ghost-surface p-4">
						<p class="text-sm">{getComplicationDescription(complicationType)}</p>
						{#if complicationType === 'equipment' && selectedEquipmentSlot}
							<p class="text-sm mt-2 font-semibold">
								Damaged: {selectedEquipmentSlot === 'weapon' ? 'Main Weapon' : selectedEquipmentSlot === 'offhand' ? 'Off-Hand' : 'Armor'}
							</p>
						{/if}
						<p class="text-xs mt-2 opacity-75">
							This complication persists until healed through rest or medical treatment.
						</p>
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						onclick={handleConfirm}
					>
						Apply Complication
					</button>
				</div>
			{/if}

			<footer class="flex justify-end mt-4">
				{#if step === 'roll'}
					<button type="button" class="btn variant-ghost" onclick={onCancel}>
						Cancel
					</button>
				{/if}
			</footer>
		</div>
	</div>
{/if}
