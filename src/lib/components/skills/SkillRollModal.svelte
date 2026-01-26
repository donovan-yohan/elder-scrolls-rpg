<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { Skill } from '$lib/data/skill'
	import type { DiceRoll } from '$lib/models/combat'
	import { BirthSigns } from '$lib/data/birthSign'
	import { calculateSkillBonus } from '$lib/util/stats.util'
	import { camelToTitleCase } from '$lib/util/string.util'
	import DiceRoller from '$lib/components/combat/DiceRoller/DiceRoller.svelte'

	interface Props {
		player: PlayerData
		skill: Skill
		onClose?: () => void
		onRolled?: (data: { roll: DiceRoll; success: boolean; margin: number }) => void
	}

	let { player, skill, onClose, onRolled }: Props = $props()

	// Calculate skill bonus
	let skillBonus = $derived(calculateSkillBonus(player, skill))

	// Determine skill level
	let skillLevel = $derived(player.majorSkills.includes(skill)
		? 'Major'
		: player.minorSkills.includes(skill)
			? 'Minor'
			: 'Untrained')

	// Get birth sign data and check for advantages/disadvantages
	let birthSignData = $derived(BirthSigns[player.birthSign])
	let hasAdvantage = $derived(birthSignData?.skillAdvantages?.includes(skill) ?? false)
	let hasDisadvantage = $derived(birthSignData?.skillDisadvantages?.includes(skill) ?? false)
	let advantageCount = $derived(hasAdvantage ? 1 : hasDisadvantage ? -1 : 0)

	function handleRoll(roll: DiceRoll, success: boolean, margin: number) {
		onRolled?.({ roll, success, margin })
	}

	function handleClose() {
		onClose?.()
	}
</script>

<div class="card p-6 w-full max-w-lg">
	<header class="mb-4">
		<div class="flex items-center gap-3">
			<h3 class="h3 font-bold">{camelToTitleCase(skill)}</h3>
			<span
				class="badge"
				class:variant-filled-primary={skillLevel === 'Major'}
				class:variant-filled-secondary={skillLevel === 'Minor'}
				class:variant-filled-surface={skillLevel === 'Untrained'}
			>
				{skillLevel}
			</span>
		</div>
		{#if hasAdvantage}
			<p class="text-sm text-success-500 mt-1">Advantage from {player.birthSign}</p>
		{:else if hasDisadvantage}
			<p class="text-sm text-error-500 mt-1">Disadvantage from {player.birthSign}</p>
		{/if}
	</header>

	<!-- Bonus Breakdown -->
	<div class="card variant-soft-surface p-3 mb-4">
		<h4 class="text-sm font-semibold mb-2">Bonus Breakdown</h4>
		<ul class="text-sm space-y-1">
			<li class="flex justify-between">
				<span>{skillLevel} Skill Bonus:</span>
				<span class="font-mono">+{skillBonus}</span>
			</li>
			{#if hasAdvantage}
				<li class="flex justify-between text-success-500">
					<span>Birth Sign Advantage:</span>
					<span>Roll twice, take highest</span>
				</li>
			{:else if hasDisadvantage}
				<li class="flex justify-between text-error-500">
					<span>Birth Sign Disadvantage:</span>
					<span>Roll twice, take lowest</span>
				</li>
			{/if}
		</ul>
	</div>

	<!-- Dice Roller -->
	<DiceRoller
		onRoll={handleRoll}
		{skillBonus}
		bonuses={[]}
		playerLevel={player.level}
		subSkills={player.subSkills}
		{advantageCount}
		label="Roll {camelToTitleCase(skill)}"
	/>

	<footer class="flex justify-end mt-6">
		<button type="button" class="btn variant-ghost" onclick={handleClose}>Close</button>
	</footer>
</div>
