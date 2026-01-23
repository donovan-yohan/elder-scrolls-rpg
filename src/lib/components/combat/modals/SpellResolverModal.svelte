<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { PlayerData } from '$lib/models/player'
	import { getSpellById, SpellDC } from '$lib/data/spells'
	import type { DiceRoll } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'
	import { getSkillBonus } from '$lib/util/initiative.util'

	export let player: PlayerData
	export let action: AvailableAction

	const dispatch = createEventDispatcher<{
		complete: { mpSpent: number }
		cancel: void
	}>()

	// Get spell from action
	$: spell = action.spellId ? getSpellById(action.spellId) : null

	let step: 'skillCheck' | 'result' = 'skillCheck'
	let skillCheckRoll: DiceRoll | undefined
	let spellSuccess = false

	$: skillBonus = spell ? getSkillBonus(player, spell.skill) : 0
	$: spellDC = spell ? SpellDC[spell.level] : 10

	function handleSkillCheck(roll: DiceRoll, success: boolean) {
		skillCheckRoll = roll
		spellSuccess = success
		step = 'result'
	}

	function handleConfirm() {
		dispatch('complete', { mpSpent: spell?.mpCost ?? 0 })
	}

	function handleCancel() {
		dispatch('cancel')
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
		<button type="button" class="btn variant-ghost" on:click={handleCancel}>Cancel</button>
		{#if step === 'result'}
			<button type="button" class="btn variant-filled-primary" on:click={handleConfirm}
				>Apply Result</button
			>
		{/if}
	</footer>
</div>
