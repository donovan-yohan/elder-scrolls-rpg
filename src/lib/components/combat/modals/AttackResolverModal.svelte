<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { PlayerData } from '$lib/models/player'
	import type { Weapon } from '$lib/data/weapons'
	import { getWeaponById } from '$lib/data/weapons'
	import type { DiceRoll } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'
	import { calculateWeaponDamage, getSkillBonus } from '$lib/util/combat.util'

	export let player: PlayerData
	export let action: AvailableAction

	const dispatch = createEventDispatcher<{
		complete: { damage: number }
		cancel: void
	}>()

	// Get weapon from action
	$: weapon = action.weaponId ? getWeaponById(action.weaponId) : null

	let step: 'attack' | 'damage' | 'complete' = 'attack'
	let targetAC = 10
	let attackRoll: DiceRoll | undefined
	let attackSuccess = false
	let damageResult: { baseDamage: number; bonusDamage: number; total: number } | undefined

	$: skillBonus = weapon ? getSkillBonus(player, weapon.relatedSkill) : 0

	function handleAttackRoll(roll: DiceRoll, success: boolean) {
		attackRoll = roll
		attackSuccess = success
		if (success && weapon) {
			damageResult = calculateWeaponDamage(weapon, roll.total, targetAC, roll.isCritical)
		}
		step = 'damage'
	}

	function handleConfirm() {
		dispatch('complete', { damage: attackSuccess ? damageResult?.total ?? 0 : 0 })
	}

	function handleCancel() {
		dispatch('cancel')
	}
</script>

<div class="card p-6 w-full max-w-lg">
	<header class="mb-4">
		<h3 class="h3 font-bold">Attack with {weapon?.name ?? 'Unknown Weapon'}</h3>
	</header>

	{#if step === 'attack'}
		<div class="space-y-4">
			<label class="label">
				<span>Target AC</span>
				<input type="number" class="input" bind:value={targetAC} min="1" />
			</label>

			<DiceRoller
				onRoll={handleAttackRoll}
				{skillBonus}
				targetDC={targetAC}
				playerLevel={player.level}
				label="Roll Attack"
			/>
		</div>
	{:else}
		<div class="space-y-4">
			{#if attackRoll}
				<RollResult roll={attackRoll} targetDC={targetAC} />
			{/if}

			{#if attackSuccess && damageResult}
				<div class="card variant-soft-success p-4 text-center">
					<div class="text-sm opacity-75">Damage</div>
					<div class="text-3xl font-bold text-success-500">{damageResult.total}</div>
					<div class="text-xs opacity-75">
						{damageResult.baseDamage} base + {damageResult.bonusDamage} bonus
					</div>
				</div>
			{:else}
				<div class="card variant-soft-error p-4 text-center">
					<div class="text-xl font-bold text-error-500">Miss!</div>
				</div>
			{/if}
		</div>
	{/if}

	<footer class="flex justify-end gap-2 mt-6">
		<button type="button" class="btn variant-ghost" on:click={handleCancel}>Cancel</button>
		{#if step === 'damage'}
			<button type="button" class="btn variant-filled-primary" on:click={handleConfirm}
				>Apply Result</button
			>
		{/if}
	</footer>
</div>
