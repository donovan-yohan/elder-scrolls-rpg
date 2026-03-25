<script lang="ts">
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton'
	import type { DiceRoll, DiceRollBonus } from '$lib/models/combat'
	import type { SubSkill } from '$lib/models/subskill'
	import { rollD20, isCriticalSuccess, isCriticalFailure, performSkillCheck } from '$lib/util/dice.util'
	import { getSubskillBonus } from '$lib/util/stats.util'
	import {
		canUseMagickaBurst,
		getMagickaBurstCost,
		processMagickaBurstRoll,
		type MagickaBurstCost,
	} from '$lib/util/magickaBurst.util'
	import RollResult from './RollResult.svelte'
	import ManualEntry from './ManualEntry.svelte'
	import SubskillPicker from '$lib/components/subskills/SubskillPicker.svelte'
	import CriticalFailModal from '../modals/CriticalFailModal.svelte'

	interface Props {
		onRoll: (roll: DiceRoll, success: boolean, margin: number) => void
		skillBonus?: number
		bonuses?: DiceRollBonus[]
		targetDC?: number
		advantageCount?: number
		playerLevel?: number
		disabled?: boolean
		label?: string
		subSkills?: SubSkill[]
		// Fortune integration
		fortunePoints?: number
		onUseFortune?: () => void
		showFortuneOption?: boolean
		// Critical fail handling
		rollContext?: string  // e.g., 'attack', 'spell', 'dodge'
		currentMisfortune?: number
		onCritFailChoice?: (choice: 'accept' | 'store', roll: DiceRoll) => void
		enableCritFailModal?: boolean
		// Magicka burst support
		currentMP?: number
		currentHP?: number
		onMagickaBurst?: (cost: MagickaBurstCost, previousRollWasCritFail: boolean) => void
		showMagickaBurst?: boolean
	}

	let {
		onRoll,
		skillBonus = 0,
		bonuses = [],
		targetDC,
		advantageCount = 0,
		playerLevel = 1,
		disabled = false,
		label = 'Roll',
		subSkills = [],
		// Fortune
		fortunePoints = 0,
		onUseFortune,
		showFortuneOption = false,
		// Critical fail
		rollContext = 'skill-check',
		currentMisfortune = 0,
		onCritFailChoice,
		enableCritFailModal = false,
		// Magicka burst props
		currentMP = 0,
		currentHP = 0,
		onMagickaBurst,
		showMagickaBurst = false,
	}: Props = $props()

	let mode: 'digital' | 'manual' = $state('digital')
	let lastRoll: DiceRoll | undefined = $state(undefined)
	let lastSuccess: boolean | undefined = $state(undefined)
	let isRolling: boolean = $state(false)
	let selectedSubskill: SubSkill | null = $state(null)

	// Critical fail modal state
	let showCritFailModal = $state(false)
	let pendingRoll: DiceRoll | undefined = $state(undefined)
	let pendingSuccess = $state(false)
	let pendingMargin = $state(0)

	// Magicka burst state
	let isMagickaBurstRoll: boolean = $state(false)
	let previousRollWasCritFail: boolean = $state(false)

	let subskillBonus = $derived(selectedSubskill ? getSubskillBonus(playerLevel) : 0)

	// Can the player use magicka burst?
	let canBurst = $derived(showMagickaBurst && canUseMagickaBurst(currentMP, currentHP))
	let burstCost = $derived(canBurst ? getMagickaBurstCost(currentMP, currentHP) : null)

	// Fortune pre-roll option
	let showFortunePreRoll = $state(false)

	function handleUseFortunePreRoll() {
		if (onUseFortune && fortunePoints > 0) {
			onUseFortune()
			showFortunePreRoll = false
		}
	}

	function handleRollResult(roll: DiceRoll, success: boolean, margin: number) {
		// Check if we should show crit fail modal (but not for magicka burst rerolls)
		if (enableCritFailModal && onCritFailChoice && roll.isCriticalFail && !isMagickaBurstRoll) {
			pendingRoll = roll
			pendingSuccess = success
			pendingMargin = margin
			showCritFailModal = true
			lastRoll = roll
			lastSuccess = success
		} else {
			// Normal flow - call onRoll immediately
			lastRoll = roll
			lastSuccess = targetDC !== undefined ? success : undefined
			onRoll(roll, success, margin)
		}
	}

	async function handleDigitalRoll(magickaBurst: boolean = false) {
		if (disabled || isRolling) return

		isRolling = true
		isMagickaBurstRoll = magickaBurst

		// Track if previous roll was crit fail (for misfortune)
		if (magickaBurst && lastRoll?.isCriticalFail) {
			previousRollWasCritFail = true
		} else if (magickaBurst) {
			previousRollWasCritFail = false
		}

		lastRoll = undefined

		// Brief animation delay
		await new Promise(r => setTimeout(r, 500))

		// Combine bonuses with subskill bonus if selected
		const allBonuses: DiceRollBonus[] = [
			...bonuses,
			...(selectedSubskill ? [{ source: selectedSubskill.name, value: subskillBonus }] : []),
		]

		const baseRoll = rollD20(advantageCount)
		const result = performSkillCheck(baseRoll, skillBonus, allBonuses, targetDC ?? 0, playerLevel, advantageCount)

		// If magicka burst, process the roll to downgrade crits
		if (magickaBurst && targetDC !== undefined) {
			const burstResult = processMagickaBurstRoll(baseRoll, targetDC, playerLevel, true)

			// Override the roll's critical status
			result.roll.isCritical = burstResult.isCritical
			result.roll.isMagickaBurst = true
			result.roll.wasDowngradedFromCrit = burstResult.wasDowngradedFromCrit
			result.success = burstResult.success
		}

		isRolling = false

		// Notify parent about magicka burst cost
		if (magickaBurst && burstCost && onMagickaBurst) {
			onMagickaBurst(burstCost, previousRollWasCritFail)
		}

		handleRollResult(result.roll, result.success, result.margin)
	}

	function handleManualRoll(value: number) {
		const allBonuses: DiceRollBonus[] = [
			{ source: 'Skill', value: skillBonus },
			...bonuses,
			...(selectedSubskill ? [{ source: selectedSubskill.name, value: subskillBonus }] : []),
		]
		const total = value + allBonuses.reduce((sum, b) => sum + b.value, 0)

		const roll: DiceRoll = {
			baseRoll: value,
			bonuses: allBonuses,
			advantageCount: 0,
			total,
			isCritical: isCriticalSuccess(value, playerLevel),
			isCriticalFail: isCriticalFailure(value, playerLevel)
		}

		const success = targetDC !== undefined ? (total >= targetDC || roll.isCritical) : true
		const margin = targetDC !== undefined ? total - targetDC : 0

		handleRollResult(roll, success, margin)
	}

	function handleAcceptCritFail() {
		showCritFailModal = false
		if (pendingRoll && onCritFailChoice) {
			onCritFailChoice('accept', pendingRoll)
		}
		if (pendingRoll) {
			onRoll(pendingRoll, pendingSuccess, pendingMargin)
		}
		pendingRoll = undefined
	}

	function handleStoreMisfortune() {
		showCritFailModal = false
		if (pendingRoll && onCritFailChoice) {
			onCritFailChoice('store', pendingRoll)
		}
		if (pendingRoll) {
			// When storing misfortune, the roll is treated as a normal failure
			// Create a modified roll that's not a critical fail for downstream handling
			const modifiedRoll: DiceRoll = {
				...pendingRoll,
				isCriticalFail: false, // Downgrade to normal failure
			}
			onRoll(modifiedRoll, false, pendingMargin)
		}
		pendingRoll = undefined
	}

	function handleCancelCritFail() {
		showCritFailModal = false
		pendingRoll = undefined
		// Allow re-rolling
		lastRoll = undefined
		lastSuccess = undefined
	}

	function handleMagickaBurst() {
		handleDigitalRoll(true)
	}

	function reset() {
		lastRoll = undefined
		lastSuccess = undefined
		pendingRoll = undefined
		showCritFailModal = false
		isMagickaBurstRoll = false
		previousRollWasCritFail = false
	}
</script>

<div class="dice-roller card p-4 variant-soft-surface">
	<!-- Mode Toggle -->
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

	<!-- Subskill Picker -->
	{#if subSkills.length > 0}
		<div class="mb-4">
			<SubskillPicker
				subSkills={subSkills}
				selectedSubskill={selectedSubskill}
				onSelect={(s) => selectedSubskill = s}
				{playerLevel}
			/>
		</div>
	{/if}

	<!-- Fortune Pre-Roll Option -->
	{#if showFortuneOption && fortunePoints > 0}
		<div class="mb-4 p-3 variant-soft-warning rounded">
			<p class="text-sm mb-2">Use Fortune Point for advantage?</p>
			<div class="flex gap-2">
				<button class="btn btn-sm variant-filled-warning" onclick={handleUseFortunePreRoll}>
					Use Fortune ({fortunePoints} remaining)
				</button>
				<button class="btn btn-sm variant-ghost" onclick={() => showFortunePreRoll = false}>
					No Thanks
				</button>
			</div>
		</div>
	{/if}

	<!-- Roll Controls -->
	<div class="flex flex-col gap-4">
		{#if mode === 'digital'}
			<button
				type="button"
				class="btn variant-filled-primary w-full"
				onclick={() => handleDigitalRoll(false)}
				disabled={disabled || isRolling}
			>
				{#if isRolling}
					Rolling...
				{:else}
					{label}
				{/if}
			</button>
		{:else}
			<ManualEntry onSubmit={handleManualRoll} />
		{/if}
	</div>

	<!-- Roll Result -->
	{#if lastRoll}
		<div class="mt-4">
			<RollResult
				roll={lastRoll}
				{targetDC}
				success={lastSuccess}
			/>
		</div>

		<!-- Magicka Burst Warning for downgraded crit -->
		{#if lastRoll.wasDowngradedFromCrit}
			<div class="text-center mt-2 text-warning-500 text-sm">
				Magicka Burst: Critical success downgraded to normal success
			</div>
		{/if}

		<div class="text-center mt-2 flex flex-col gap-2">
			<!-- Magicka Burst Reroll Option -->
			{#if showMagickaBurst && canBurst && burstCost && mode === 'digital'}
				<button
					type="button"
					class="btn btn-sm variant-filled-tertiary"
					onclick={handleMagickaBurst}
					disabled={disabled || isRolling}
				>
					{#if burstCost.isBurn}
						Magicka Burst (Burn: 1 HP)
					{:else}
						Magicka Burst (1 MP)
					{/if}
					{#if lastRoll.isCriticalFail}
						<span class="text-xs opacity-75 ml-1">(accepts misfortune)</span>
					{/if}
				</button>
				{#if burstCost.isBurn}
					<div class="text-xs text-error-500">
						Warning: No MP remaining - will take burn damage!
					</div>
				{/if}
			{/if}

			<button type="button" class="btn btn-sm variant-ghost" onclick={reset}>
				Roll Again
			</button>
		</div>
	{/if}

	<!-- Magicka Burst Info (when enabled but no roll yet) -->
	{#if showMagickaBurst && !lastRoll}
		<div class="text-xs text-center opacity-60 mt-2">
			Magicka Burst available after rolling
			{#if currentMP > 0}
				(1 MP)
			{:else if currentHP > 0}
				(Burn: 1 HP)
			{:else}
				(Burned out - unavailable)
			{/if}
		</div>
	{/if}

	<!-- Critical Fail Modal -->
	{#if showCritFailModal && pendingRoll}
		<CriticalFailModal
			roll={pendingRoll}
			{rollContext}
			{currentMisfortune}
			onAccept={handleAcceptCritFail}
			onStore={handleStoreMisfortune}
			onCancel={handleCancelCritFail}
		/>
	{/if}
</div>
