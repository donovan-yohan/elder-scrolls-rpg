<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import { getWeaponById } from '$lib/data/weapons'
	import type { DiceRoll } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'
	import { calculateWeaponDamage, getSkillBonus } from '$lib/util/combat.util'

	interface Props {
		player: PlayerData
		action: AvailableAction
		onComplete: (result: { damage: number; isCritical: boolean; apCost: number }) => void
		onCancel: () => void
	}

	let { player, action, onComplete, onCancel }: Props = $props()

	// Get weapon from action
	let weapon = $derived(action.weaponId ? getWeaponById(action.weaponId) : null)

	let step = $state<'attack' | 'damage' | 'complete'>('attack')
	let targetAC = $state(10)
	let attackRoll = $state<DiceRoll | undefined>(undefined)
	let attackSuccess = $state(false)
	let damageResult = $state<{ baseDamage: number; bonusDamage: number; total: number } | undefined>(undefined)

	let skillBonus = $derived(weapon ? getSkillBonus(player, weapon.relatedSkill) : 0)

	function handleAttackRoll(roll: DiceRoll, success: boolean) {
		attackRoll = roll
		attackSuccess = success
		if (success && weapon) {
			damageResult = calculateWeaponDamage(weapon, roll.total, targetAC, roll.isCritical)
		}
		step = 'damage'
	}

	function handleConfirm() {
		onComplete({
			damage: attackSuccess ? damageResult?.total ?? 0 : 0,
			isCritical: attackRoll?.isCritical ?? false,
			apCost: action.apCost
		})
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
					{#if attackRoll?.isCritical}
						<div class="text-sm text-warning-500 font-semibold mt-2">
							Critical! Refund {Math.floor(action.apCost / 2)} AP + 1 Party Initiative
						</div>
					{/if}
				</div>
			{:else}
				<div class="card variant-soft-error p-4 text-center">
					<div class="text-xl font-bold text-error-500">Miss!</div>
				</div>
			{/if}
		</div>
	{/if}

	<footer class="flex justify-end gap-2 mt-6">
		<button type="button" class="btn variant-ghost" onclick={onCancel}>Cancel</button>
		{#if step === 'damage'}
			<button type="button" class="btn variant-filled-primary" onclick={handleConfirm}
				>Apply Result</button
			>
		{/if}
	</footer>
</div>
