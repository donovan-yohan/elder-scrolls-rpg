<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { DiceRoll } from '$lib/models/combat'
	import { getWeaponById } from '$lib/data/weapons'
	import { getSkillBonus } from '$lib/util/combat.util'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		player: PlayerData
		weaponId: string | null
		currentAP: number
		onFocus: (result: { success: boolean; isCritical: boolean }) => void
		onClose: () => void
	}

	let { isOpen, player, weaponId, currentAP, onFocus, onClose }: Props = $props()

	let weapon = $derived(weaponId ? getWeaponById(weaponId) : null)
	let focusDC = $derived(weapon ? 10 + (weapon.focusCost ?? 2) : 12)
	let skillBonus = $derived(weapon ? getSkillBonus(player, weapon.relatedSkill) : 0)

	let step = $state<'roll' | 'result'>('roll')
	let focusRoll = $state<DiceRoll | undefined>(undefined)
	let focusSuccess = $state(false)

	const AP_COST = 1

	function handleFocusRoll(roll: DiceRoll, success: boolean) {
		focusRoll = roll
		focusSuccess = success
		step = 'result'
	}

	function handleConfirm() {
		onFocus({
			success: focusSuccess,
			isCritical: focusRoll?.isCritical ?? false
		})
	}

	function resetState() {
		step = 'roll'
		focusRoll = undefined
		focusSuccess = false
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Focus Attack</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-warning">AP: {currentAP}</span>
					<span class="badge variant-filled">Cost: {AP_COST} AP</span>
				</div>
			</header>

			{#if currentAP < AP_COST}
				<p class="text-error-500 mb-4">Not enough AP to focus.</p>
			{:else if !weapon}
				<p class="text-error-500 mb-4">No weapon equipped.</p>
			{:else if step === 'roll'}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<p class="text-sm opacity-75 mb-2">Focusing with: <strong>{weapon.name}</strong></p>
						<p class="text-sm">Roll a skill check to focus your attack. Success grants double base damage on your next attack with this weapon.</p>
					</div>

					<DiceRoller
						onRoll={handleFocusRoll}
						skillBonus={skillBonus}
						targetDC={focusDC}
						playerLevel={player.level}
						label="Roll Focus Check"
					/>
				</div>
			{:else}
				<div class="space-y-4">
					{#if focusRoll}
						<RollResult roll={focusRoll} targetDC={focusDC} />
					{/if}

					{#if focusSuccess}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Focus Achieved!</p>
							<p class="text-sm opacity-75">
								{#if focusRoll?.isCritical}
									Critical! All attacks this round deal double damage with advantage.
								{:else}
									Your next attack with {weapon.name} deals double base damage.
								{/if}
							</p>
						</div>
					{:else}
						<div class="card variant-soft-error p-4 text-center">
							<p class="font-bold text-error-500">Focus Failed</p>
							<p class="text-sm opacity-75">
								{#if focusRoll?.isCriticalFail}
									Critical fail! You are disoriented. Party loses 1 initiative, enemy gains 1.
								{:else}
									You become disoriented. Spend 2 AP to Resteady before focusing again.
								{/if}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<footer class="flex justify-end gap-2 mt-6">
				<button type="button" class="btn variant-ghost" onclick={onClose}>Cancel</button>
				{#if step === 'result'}
					<button type="button" class="btn variant-filled-primary" onclick={handleConfirm}>
						Apply Result
					</button>
				{/if}
			</footer>
		</div>
	</div>
{/if}
