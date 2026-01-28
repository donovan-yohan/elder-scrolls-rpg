<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import { getSpellById, SpellDC } from '$lib/data/spells'
	import type { DiceRoll } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'
	import { getSkillBonus } from '$lib/util/combat.util'

	interface Props {
		player: PlayerData
		action: AvailableAction
		onComplete: (result: { mpSpent: number; isCritical: boolean; apCost: number; success: boolean }) => void
		onCancel: () => void
	}

	let { player, action, onComplete, onCancel }: Props = $props()

	// Get spell from action
	let spell = $derived(action.spellId ? getSpellById(action.spellId) : null)

	let step = $state<'skillCheck' | 'result'>('skillCheck')
	let skillCheckRoll = $state<DiceRoll | undefined>(undefined)
	let spellSuccess = $state(false)

	let skillBonus = $derived(spell ? getSkillBonus(player, spell.skill) : 0)
	let spellDC = $derived(spell ? SpellDC[spell.level] : 10)

	function handleSkillCheck(roll: DiceRoll, success: boolean) {
		skillCheckRoll = roll
		spellSuccess = success
		step = 'result'
	}

	function handleConfirm() {
		onComplete({
			mpSpent: spell?.mpCost ?? 0,
			isCritical: skillCheckRoll?.isCritical ?? false,
			apCost: action.apCost,
			success: spellSuccess
		})
	}
</script>

<div class="card p-6 w-full max-w-lg">
	<header class="mb-4">
		<h3 class="h3 font-bold">Cast {spell?.name ?? 'Unknown Spell'}</h3>
		<p class="text-sm text-surface-600-300-token">{spell?.description ?? ''}</p>
	</header>

	<div class="mb-4 flex gap-2">
		<span class="badge variant-filled-warning">{spell?.apCost ?? 0} AP</span>
		<span class="badge variant-filled-tertiary">{spell?.mpCost ?? 0} MP</span>
		<span class="badge variant-soft">DC {spellDC}</span>
	</div>

	{#if step === 'skillCheck'}
		<DiceRoller
			onRoll={handleSkillCheck}
			{skillBonus}
			targetDC={spellDC}
			playerLevel={player.level}
			label="Roll Skill Check"
		/>
	{:else}
		<div class="space-y-4">
			{#if skillCheckRoll}
				<RollResult roll={skillCheckRoll} targetDC={spellDC} />
			{/if}

			{#if spellSuccess}
				<div class="card variant-soft-success p-4">
					<div class="text-lg font-bold text-success-500 mb-2">Spell Cast!</div>
					{#if skillCheckRoll?.isCritical}
						<div class="text-sm text-warning-500 font-semibold mb-2">
							Critical! Refund {Math.floor(action.apCost / 2)} AP + full MP + 1 Party Initiative
						</div>
					{/if}
					<div class="text-sm">
						{#if spell?.effects}
							{#each spell.effects as effect}
								<p>{effect.description}</p>
							{/each}
						{/if}
					</div>
				</div>
			{:else}
				<div class="card variant-soft-error p-4 text-center">
					<div class="text-lg font-bold text-error-500">Spell Failed!</div>
					<p class="text-sm opacity-75">MP is still spent</p>
				</div>
			{/if}
		</div>
	{/if}

	<footer class="flex justify-end gap-2 mt-6">
		<button type="button" class="btn variant-ghost" onclick={onCancel}>Cancel</button>
		{#if step === 'result'}
			<button type="button" class="btn variant-filled-primary" onclick={handleConfirm}
				>Apply Result</button
			>
		{/if}
	</footer>
</div>
