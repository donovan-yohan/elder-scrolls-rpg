<!-- src/lib/components/levelup/LevelUpWizard.svelte -->
<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { Skill } from '$lib/data/skill'
	import type { SubSkill } from '$lib/models/subskill'
	import { Level } from '$lib/data/level'
	import { getLevelUpChanges, getPromotableSkills, getSubskillSlots, getSubskillBonus } from '$lib/util/stats.util'
	import { camelToTitleCase } from '$lib/util/string.util'

	interface Props {
		player: PlayerData
		onComplete?: (data: {
			newLevel: number
			promotedToMajor: Skill[]
			promotedToMinor: Skill[]
			newSubskills: SubSkill[]
		}) => void
		onCancel?: () => void
	}

	let { player, onComplete, onCancel }: Props = $props()

	// Target level (next level up)
	let targetLevel = player.level + 1

	// Get changes needed
	let changes = $derived(getLevelUpChanges(player.level, targetLevel))
	let promotable = $derived(getPromotableSkills(player))
	let targetLevelData = $derived(Level[targetLevel] ?? Level[20]!)

	// Selection state
	let selectedMajorPromotions: Skill[] = $state([])
	let selectedMinorPromotions: Skill[] = $state([])
	let newSubskills: SubSkill[] = $state([])

	// Validation
	let majorPromotionsNeeded = $derived(changes?.majorSlotsGained ?? 0)
	let minorPromotionsNeeded = $derived(changes?.minorSlotsGained ?? 0)
	let subskillSlotsGained = $derived(changes?.subskillSlotsGained ?? 0)

	let majorPromotionsValid = $derived(selectedMajorPromotions.length === majorPromotionsNeeded)
	let minorPromotionsValid = $derived(selectedMinorPromotions.length === minorPromotionsNeeded)
	let isValid = $derived(majorPromotionsValid && minorPromotionsValid)

	// Current step for multi-step wizard
	type WizardStep = 'overview' | 'major' | 'minor' | 'subskills' | 'confirm'
	let currentStep: WizardStep = $state('overview')

	let steps = $derived.by(() => {
		const s: WizardStep[] = ['overview']
		if (majorPromotionsNeeded > 0) s.push('major')
		if (minorPromotionsNeeded > 0) s.push('minor')
		if (subskillSlotsGained > 0) s.push('subskills')
		s.push('confirm')
		return s
	})

	let currentStepIndex = $derived(steps.indexOf(currentStep))
	let isFirstStep = $derived(currentStepIndex === 0)
	let isLastStep = $derived(currentStepIndex === steps.length - 1)

	function nextStep() {
		const nextStepValue = steps[currentStepIndex + 1]
		if (!isLastStep && nextStepValue) {
			currentStep = nextStepValue
		}
	}

	function prevStep() {
		const prevStepValue = steps[currentStepIndex - 1]
		if (!isFirstStep && prevStepValue) {
			currentStep = prevStepValue
		}
	}

	function toggleMajorPromotion(skill: Skill) {
		if (selectedMajorPromotions.includes(skill)) {
			selectedMajorPromotions = selectedMajorPromotions.filter(s => s !== skill)
		} else if (selectedMajorPromotions.length < majorPromotionsNeeded) {
			selectedMajorPromotions = [...selectedMajorPromotions, skill]
		}
	}

	function toggleMinorPromotion(skill: Skill) {
		if (selectedMinorPromotions.includes(skill)) {
			selectedMinorPromotions = selectedMinorPromotions.filter(s => s !== skill)
		} else if (selectedMinorPromotions.length < minorPromotionsNeeded) {
			selectedMinorPromotions = [...selectedMinorPromotions, skill]
		}
	}

	function addSubskill() {
		const maxSlots = getSubskillSlots(targetLevel)
		const currentCount = (player.subSkills?.length ?? 0) + newSubskills.length
		if (currentCount < maxSlots) {
			newSubskills = [...newSubskills, { name: '', description: '' }]
		}
	}

	function removeSubskill(index: number) {
		newSubskills = newSubskills.filter((_, i) => i !== index)
	}

	function updateSubskill(index: number, field: keyof SubSkill, value: string) {
		newSubskills = newSubskills.map((s, i) => (i === index ? { ...s, [field]: value } : s))
	}

	function handleComplete() {
		onComplete?.({
			newLevel: targetLevel,
			promotedToMajor: selectedMajorPromotions,
			promotedToMinor: selectedMinorPromotions,
			newSubskills: newSubskills.filter(s => s.name.trim() !== ''),
		})
	}

	function handleCancel() {
		onCancel?.()
	}

	// Check if can proceed from current step
	let canProceedFromStep = $derived.by(() => {
		switch (currentStep) {
			case 'overview': return true
			case 'major': return majorPromotionsValid
			case 'minor': return minorPromotionsValid
			case 'subskills': return true // Subskills are optional
			case 'confirm': return isValid
			default: return false
		}
	})
</script>

<div class="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
	<header class="mb-6">
		<h2 class="h2 font-bold">Level Up!</h2>
		<p class="text-surface-500">
			Level {player.level} → Level {targetLevel}
		</p>
	</header>

	{#if currentStep === 'overview'}
		<!-- Overview Step -->
		<div class="space-y-4">
			<h3 class="h4 font-semibold">What's Changing</h3>

			<div class="grid grid-cols-2 gap-4">
				<div class="card p-4 variant-soft-surface">
					<div class="text-sm text-surface-500">Major Skill Bonus</div>
					<div class="text-xl font-bold">
						+{Level[player.level]?.majorSkillBonus} → +{targetLevelData.majorSkillBonus}
					</div>
				</div>
				<div class="card p-4 variant-soft-surface">
					<div class="text-sm text-surface-500">Minor Skill Bonus</div>
					<div class="text-xl font-bold">
						+{Level[player.level]?.minorSkillBonus} → +{targetLevelData.minorSkillBonus}
					</div>
				</div>
				<div class="card p-4 variant-soft-surface">
					<div class="text-sm text-surface-500">Critical Success Range</div>
					<div class="text-xl font-bold">
						{Level[player.level]?.critical}-20 → {targetLevelData.critical}-20
					</div>
				</div>
				<div class="card p-4 variant-soft-surface">
					<div class="text-sm text-surface-500">Critical Fail Range</div>
					<div class="text-xl font-bold">
						1-{Level[player.level]?.criticalFail} → 1-{targetLevelData.criticalFail}
					</div>
				</div>
			</div>

			{#if changes}
				<div class="card p-4 variant-soft-primary mt-4">
					<h4 class="font-semibold mb-2">Choices to Make</h4>
					<ul class="space-y-1 text-sm">
						{#if majorPromotionsNeeded > 0}
							<li class="flex items-center gap-2">
								<span class="badge variant-filled-primary">{majorPromotionsNeeded}</span>
								Promote {majorPromotionsNeeded} minor skill{majorPromotionsNeeded > 1 ? 's' : ''} to major
							</li>
						{/if}
						{#if minorPromotionsNeeded > 0}
							<li class="flex items-center gap-2">
								<span class="badge variant-filled-secondary">{minorPromotionsNeeded}</span>
								Promote {minorPromotionsNeeded} untrained skill{minorPromotionsNeeded > 1 ? 's' : ''} to minor
							</li>
						{/if}
						{#if subskillSlotsGained > 0}
							<li class="flex items-center gap-2">
								<span class="badge variant-filled-success">{subskillSlotsGained}</span>
								{subskillSlotsGained} new subskill slot{subskillSlotsGained > 1 ? 's' : ''} available (optional)
							</li>
						{/if}
					</ul>
				</div>
			{:else}
				<p class="text-surface-500 italic">No skill choices needed for this level.</p>
			{/if}
		</div>

	{:else if currentStep === 'major'}
		<!-- Major Skill Promotion Step -->
		<div class="space-y-4">
			<h3 class="h4 font-semibold">Promote to Major Skills</h3>
			<p class="text-sm text-surface-500">
				Select {majorPromotionsNeeded} minor skill{majorPromotionsNeeded > 1 ? 's' : ''} to promote to major.
				Selected: {selectedMajorPromotions.length}/{majorPromotionsNeeded}
			</p>

			<div class="grid grid-cols-2 gap-2">
				{#each promotable.minorToMajor as skill}
					{@const isSelected = selectedMajorPromotions.includes(skill)}
					<button
						type="button"
						class="p-3 rounded-lg text-left transition-colors {isSelected ? 'bg-primary-500 text-white' : 'bg-surface-700 hover:bg-surface-600'}"
						onclick={() => toggleMajorPromotion(skill)}
						disabled={!isSelected && selectedMajorPromotions.length >= majorPromotionsNeeded}
					>
						<span class="font-medium">{camelToTitleCase(skill)}</span>
						{#if isSelected}
							<span class="float-right">✓</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

	{:else if currentStep === 'minor'}
		<!-- Minor Skill Promotion Step -->
		<div class="space-y-4">
			<h3 class="h4 font-semibold">Promote to Minor Skills</h3>
			<p class="text-sm text-surface-500">
				Select {minorPromotionsNeeded} untrained skill{minorPromotionsNeeded > 1 ? 's' : ''} to promote to minor.
				Selected: {selectedMinorPromotions.length}/{minorPromotionsNeeded}
			</p>

			<div class="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
				{#each promotable.untrainedToMinor as skill}
					{@const isSelected = selectedMinorPromotions.includes(skill)}
					<button
						type="button"
						class="p-3 rounded-lg text-left transition-colors {isSelected ? 'bg-secondary-500 text-white' : 'bg-surface-700 hover:bg-surface-600'}"
						onclick={() => toggleMinorPromotion(skill)}
						disabled={!isSelected && selectedMinorPromotions.length >= minorPromotionsNeeded}
					>
						<span class="font-medium">{camelToTitleCase(skill)}</span>
						{#if isSelected}
							<span class="float-right">✓</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

	{:else if currentStep === 'subskills'}
		<!-- Subskills Step -->
		<div class="space-y-4">
			<h3 class="h4 font-semibold">Add Subskills (Optional)</h3>
			<p class="text-sm text-surface-500">
				You gained {subskillSlotsGained} new subskill slot{subskillSlotsGained > 1 ? 's' : ''}.
				Subskills give +{getSubskillBonus(targetLevel)} when invoked.
			</p>

			{#each newSubskills as subskill, index}
				<div class="card p-4 variant-soft-surface">
					<div class="flex gap-2 mb-2">
						<input
							type="text"
							class="input flex-1"
							placeholder="Subskill name"
							value={subskill.name}
							oninput={(e) => updateSubskill(index, 'name', e.currentTarget.value)}
						/>
						<button
							type="button"
							class="btn-icon variant-soft-error"
							onclick={() => removeSubskill(index)}
						>×</button>
					</div>
					<textarea
						class="textarea w-full"
						rows="2"
						placeholder="When does this subskill apply?"
						value={subskill.description}
						oninput={(e) => updateSubskill(index, 'description', e.currentTarget.value)}
					></textarea>
				</div>
			{/each}

			{#if newSubskills.length < subskillSlotsGained}
				<button
					type="button"
					class="btn variant-soft-success w-full"
					onclick={addSubskill}
				>
					+ Add Subskill ({newSubskills.length}/{subskillSlotsGained})
				</button>
			{/if}
		</div>

	{:else if currentStep === 'confirm'}
		<!-- Confirmation Step -->
		<div class="space-y-4">
			<h3 class="h4 font-semibold">Confirm Level Up</h3>

			<div class="card p-4 variant-soft-surface space-y-3">
				<div class="flex justify-between">
					<span>New Level:</span>
					<span class="font-bold">{targetLevel}</span>
				</div>

				{#if selectedMajorPromotions.length > 0}
					<div>
						<span class="text-sm text-surface-500">Promoted to Major:</span>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each selectedMajorPromotions as skill}
								<span class="badge variant-filled-primary">{camelToTitleCase(skill)}</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if selectedMinorPromotions.length > 0}
					<div>
						<span class="text-sm text-surface-500">Promoted to Minor:</span>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each selectedMinorPromotions as skill}
								<span class="badge variant-filled-secondary">{camelToTitleCase(skill)}</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if newSubskills.filter(s => s.name.trim()).length > 0}
					<div>
						<span class="text-sm text-surface-500">New Subskills:</span>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each newSubskills.filter(s => s.name.trim()) as subskill}
								<span class="badge variant-filled-success">{subskill.name}</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Footer Navigation -->
	<footer class="flex justify-between mt-6 pt-4 border-t border-surface-500/20">
		<button type="button" class="btn variant-ghost" onclick={handleCancel}>
			Cancel
		</button>

		<div class="flex gap-2">
			{#if !isFirstStep}
				<button type="button" class="btn variant-ghost" onclick={prevStep}>
					Back
				</button>
			{/if}

			{#if isLastStep}
				<button
					type="button"
					class="btn variant-filled-primary"
					disabled={!isValid}
					onclick={handleComplete}
				>
					Confirm Level Up
				</button>
			{:else}
				<button
					type="button"
					class="btn variant-filled-primary"
					disabled={!canProceedFromStep}
					onclick={nextStep}
				>
					Next
				</button>
			{/if}
		</div>
	</footer>
</div>
