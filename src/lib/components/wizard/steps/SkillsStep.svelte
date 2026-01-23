<script lang="ts">
	import WizardStep from '../WizardStep.svelte'
	import { wizardStore } from '$lib/stores/wizard.store'
	import { Skill, SkillLevel, SpellSkills } from '$lib/data/skill'
	import { camelToTitleCase } from '$lib/util/string.util'
	import classNames from 'classnames'
	import { onMount } from 'svelte'

	export let stepIndex: number = 1

	// Initialize skill groups from store or default to untrained
	let skillGroups: Record<Skill, SkillLevel> = Object.values(Skill).reduce(
		(acc, skill) => {
			// Check if skill is already selected as major or minor
			if ($wizardStore.formData.majorSkills?.includes(skill)) {
				acc[skill] = SkillLevel.Major
			} else if ($wizardStore.formData.minorSkills?.includes(skill)) {
				acc[skill] = SkillLevel.Minor
			} else {
				acc[skill] = SkillLevel.Untrained
			}
			return acc
		},
		{} as Record<Skill, SkillLevel>
	)

	// Derived arrays from skill groups
	$: majorSkills = Object.entries(skillGroups)
		.filter(([_, level]) => level === SkillLevel.Major)
		.map(([skill]) => skill as Skill)

	$: minorSkills = Object.entries(skillGroups)
		.filter(([_, level]) => level === SkillLevel.Minor)
		.map(([skill]) => skill as Skill)

	// Validate and update store when skills change
	$: {
		const isValid = majorSkills.length === 6 && minorSkills.length === 6

		wizardStore.updateFormData({
			majorSkills,
			minorSkills,
		})

		wizardStore.setStepValid(stepIndex, isValid)
	}

	// Check if a skill is a magic skill
	function isMagicSkill(skill: Skill): boolean {
		return SpellSkills.includes(skill)
	}

	onMount(() => {
		const isValid = majorSkills.length === 6 && minorSkills.length === 6
		wizardStore.setStepValid(stepIndex, isValid)
	})
</script>

<WizardStep
	title="Skills"
	description="Choose 6 Major Skills and 6 Minor Skills. Major skills provide higher bonuses."
	{stepIndex}
>
	<div class="flex flex-col gap-6">
		<!-- Skill Counter -->
		<div class="flex gap-4 p-4 bg-surface-700 rounded-lg">
			<div class="flex-1 text-center">
				<span class="block text-2xl font-bold text-primary-400">{majorSkills.length}/6</span>
				<span class="text-sm text-surface-400">Major Skills</span>
			</div>
			<div class="flex-1 text-center">
				<span class="block text-2xl font-bold text-secondary-400">{minorSkills.length}/6</span>
				<span class="text-sm text-surface-400">Minor Skills</span>
			</div>
		</div>

		<!-- Skills Grid -->
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
			{#each Object.values(Skill) as skill}
				{@const isMajor = skillGroups[skill] === SkillLevel.Major}
				{@const isMinor = skillGroups[skill] === SkillLevel.Minor}
				{@const isMagic = isMagicSkill(skill)}

				<div
					class={classNames(
						'flex flex-col gap-2 p-4 rounded-lg border-2 transition-colors',
						{
							'border-primary-500 bg-primary-500/10': isMajor,
							'border-secondary-500 bg-secondary-500/10': isMinor,
							'border-surface-600 bg-surface-800': !isMajor && !isMinor,
						}
					)}
				>
					<!-- Skill Name -->
					<div class="flex items-center gap-2">
						<span
							class={classNames('font-semibold', {
								'text-primary-400': isMajor,
								'text-secondary-400': isMinor,
							})}
						>
							{camelToTitleCase(skill)}
						</span>
						{#if isMagic}
							<span class="badge variant-soft-tertiary text-xs" title="Magic Skill">M</span>
						{/if}
					</div>

					<!-- Skill Level Radio Buttons -->
					<div class="flex flex-col gap-1 text-sm">
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								class="radio"
								type="radio"
								bind:group={skillGroups[skill]}
								value={SkillLevel.Major}
								disabled={majorSkills.length >= 6 && !isMajor}
							/>
							<span
								class={classNames({
									'text-surface-500': majorSkills.length >= 6 && !isMajor,
									'text-primary-400': isMajor,
								})}
							>
								Major
							</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								class="radio"
								type="radio"
								bind:group={skillGroups[skill]}
								value={SkillLevel.Minor}
								disabled={minorSkills.length >= 6 && !isMinor}
							/>
							<span
								class={classNames({
									'text-surface-500': minorSkills.length >= 6 && !isMinor,
									'text-secondary-400': isMinor,
								})}
							>
								Minor
							</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								class="radio"
								type="radio"
								bind:group={skillGroups[skill]}
								value={SkillLevel.Untrained}
							/>
							<span class="text-surface-400">Untrained</span>
						</label>
					</div>
				</div>
			{/each}
		</div>

		<!-- Validation Message -->
		{#if majorSkills.length !== 6 || minorSkills.length !== 6}
			<div class="text-warning-400 text-center">
				{#if majorSkills.length < 6}
					Select {6 - majorSkills.length} more Major skill{majorSkills.length !== 5 ? 's' : ''}.
				{/if}
				{#if minorSkills.length < 6}
					Select {6 - minorSkills.length} more Minor skill{minorSkills.length !== 5 ? 's' : ''}.
				{/if}
			</div>
		{/if}
	</div>
</WizardStep>
