<script lang="ts">
	import WizardStep from '../WizardStep.svelte'
	import { wizardStore } from '$lib/stores/wizard.store'
	import { Accordion, AccordionItem } from '@skeletonlabs/skeleton'
	import { onMount } from 'svelte'
	import type { SubSkill } from '$lib/models/subskill'
	import { Skill, SpellSkills } from '$lib/data/skill'
	import { Level } from '$lib/data/level'
	import { camelToTitleCase } from '$lib/util/string.util'
	import classNames from 'classnames'

	export let stepIndex: number = 2

	// Get all skills (major + minor) from the wizard store
	$: majorSkills = $wizardStore.formData.majorSkills || []
	$: minorSkills = $wizardStore.formData.minorSkills || []
	$: allSkills = [...majorSkills, ...minorSkills]

	// Get the player's current level (default to 1)
	$: playerLevel = $wizardStore.formData.level || 1
	$: levelData = Level[playerLevel] ?? Level[1]!

	// Maximum subskills per skill based on level (subSkills value from level data)
	$: maxSubskillsPerSkill = levelData.subSkills

	// Initialize subskills from store
	let subSkills: SubSkill[] = $wizardStore.formData.subSkills || []

	// Count subskills for a specific parent skill
	function getSubskillCount(parentSkill: Skill): number {
		return subSkills.filter((s) => s.parentSkill === parentSkill).length
	}

	// Check if we can add more subskills for a given skill
	function canAddSubskill(parentSkill: Skill): boolean {
		return getSubskillCount(parentSkill) < maxSubskillsPerSkill
	}

	// Get subskills for a specific parent skill
	function getSubskillsForSkill(parentSkill: Skill): SubSkill[] {
		return subSkills.filter((s) => s.parentSkill === parentSkill)
	}

	// Add a new subskill to a parent skill
	function addSubskill(parentSkill: Skill): void {
		if (!canAddSubskill(parentSkill)) return

		const newSubskill: SubSkill = {
			name: '',
			parentSkill,
			description: '',
		}

		subSkills = [...subSkills, newSubskill]
	}

	// Remove a subskill
	function removeSubskill(parentSkill: Skill, index: number): void {
		const skillSubskills = getSubskillsForSkill(parentSkill)
		const subskillToRemove = skillSubskills[index]
		if (subskillToRemove) {
			subSkills = subSkills.filter((s) => s !== subskillToRemove)
		}
	}

	// Update a subskill's name
	function updateSubskillName(parentSkill: Skill, index: number, name: string): void {
		const skillSubskills = getSubskillsForSkill(parentSkill)
		const subskillToUpdate = skillSubskills[index]
		if (subskillToUpdate) {
			subSkills = subSkills.map((s) =>
				s === subskillToUpdate ? { ...s, name } : s
			)
		}
	}

	// Update a subskill's description
	function updateSubskillDescription(parentSkill: Skill, index: number, description: string): void {
		const skillSubskills = getSubskillsForSkill(parentSkill)
		const subskillToUpdate = skillSubskills[index]
		if (subskillToUpdate) {
			subSkills = subSkills.map((s) =>
				s === subskillToUpdate ? { ...s, description } : s
			)
		}
	}

	// Check if a skill is a magic skill
	function isMagicSkill(skill: Skill): boolean {
		return SpellSkills.includes(skill)
	}

	// Check if a skill is major
	function isMajorSkill(skill: Skill): boolean {
		return majorSkills.includes(skill)
	}

	// Get total subskills used
	$: totalSubskillsUsed = subSkills.length

	// This step is always valid (subskills are optional)
	// But we validate that all subskills have names if they exist
	$: {
		wizardStore.updateFormData({ subSkills })
		wizardStore.setStepValid(stepIndex, true)
	}

	onMount(() => {
		wizardStore.setStepValid(stepIndex, true)
	})
</script>

<WizardStep
	title="Subskills"
	description="Create specializations for your chosen skills. Subskills provide additional bonuses in specific areas."
	{stepIndex}
>
	<div class="flex flex-col gap-6">
		<!-- Info Box -->
		<div class="card p-4 variant-soft-primary">
			<div class="flex items-start gap-3">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div>
					<p class="font-semibold">Subskill Specializations</p>
					<p class="text-sm text-surface-400 mt-1">
						Subskills represent specialized knowledge within a skill. Each subskill provides a +1 bonus when the specific specialization applies.
						At level {playerLevel}, you can create up to <span class="font-bold text-primary-400">{maxSubskillsPerSkill}</span> subskill{maxSubskillsPerSkill !== 1 ? 's' : ''} per skill.
					</p>
				</div>
			</div>
		</div>

		<!-- Subskill Summary -->
		<div class="flex gap-4 p-4 bg-surface-700 rounded-lg">
			<div class="flex-1 text-center">
				<span class="block text-2xl font-bold text-primary-400">{totalSubskillsUsed}</span>
				<span class="text-sm text-surface-400">Subskills Created</span>
			</div>
			<div class="flex-1 text-center">
				<span class="block text-2xl font-bold text-surface-400">{maxSubskillsPerSkill}</span>
				<span class="text-sm text-surface-400">Max Per Skill</span>
			</div>
		</div>

		<!-- Skills Accordion -->
		{#if allSkills.length > 0}
			<Accordion>
				{#each allSkills as skill}
					{@const isMajor = isMajorSkill(skill)}
					{@const isMagic = isMagicSkill(skill)}
					{@const skillSubskills = getSubskillsForSkill(skill)}
					{@const count = skillSubskills.length}
					{@const canAdd = canAddSubskill(skill)}

					<AccordionItem>
						<svelte:fragment slot="summary">
							<div class="flex items-center justify-between w-full pr-4">
								<div class="flex items-center gap-2">
									<span class={classNames('font-semibold', {
										'text-primary-400': isMajor,
										'text-secondary-400': !isMajor,
									})}>
										{camelToTitleCase(skill)}
									</span>
									{#if isMagic}
										<span class="badge variant-soft-tertiary text-xs" title="Magic Skill">M</span>
									{/if}
									<span class={classNames('badge text-xs', {
										'variant-soft-primary': isMajor,
										'variant-soft-secondary': !isMajor,
									})}>
										{isMajor ? 'Major' : 'Minor'}
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span class={classNames('text-sm font-medium', {
										'text-success-400': count > 0,
										'text-surface-500': count === 0,
									})}>
										{count}/{maxSubskillsPerSkill}
									</span>
								</div>
							</div>
						</svelte:fragment>
						<svelte:fragment slot="content">
							<div class="flex flex-col gap-4 p-4 bg-surface-700/50 rounded">
								<!-- Existing Subskills -->
								{#each skillSubskills as subskill, index}
									<div class="flex flex-col gap-2 p-3 bg-surface-800 rounded-lg border border-surface-600">
										<div class="flex items-start gap-3">
											<div class="flex-1 flex flex-col gap-2">
												<input
													class="input"
													type="text"
													placeholder="Subskill name (e.g., 'Swordsmanship' for One-Handed)"
													value={subskill.name}
													on:input={(e) => updateSubskillName(skill, index, e.currentTarget.value)}
												/>
												<textarea
													class="textarea"
													rows="2"
													placeholder="Description (optional) - When does this specialization apply?"
													value={subskill.description}
													on:input={(e) => updateSubskillDescription(skill, index, e.currentTarget.value)}
												></textarea>
											</div>
											<button
												type="button"
												class="btn-icon btn-icon-sm variant-soft-error"
												title="Remove subskill"
												on:click={() => removeSubskill(skill, index)}
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</div>
										{#if subskill.name.trim() === ''}
											<span class="text-warning-400 text-xs">Subskill name is required</span>
										{/if}
									</div>
								{/each}

								<!-- Add Subskill Button -->
								{#if canAdd}
									<button
										type="button"
										class="btn variant-soft-primary w-full"
										on:click={() => addSubskill(skill)}
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
										</svg>
										<span>Add Subskill</span>
									</button>
								{:else}
									<p class="text-center text-surface-500 text-sm py-2">
										Maximum subskills reached for this skill
									</p>
								{/if}

								<!-- Empty State -->
								{#if skillSubskills.length === 0}
									<p class="text-center text-surface-400 text-sm italic">
										No subskills created yet. Click "Add Subskill" to create a specialization.
									</p>
								{/if}
							</div>
						</svelte:fragment>
					</AccordionItem>
				{/each}
			</Accordion>
		{:else}
			<div class="card p-6 variant-soft-warning text-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-warning-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				<p class="font-semibold">No Skills Selected</p>
				<p class="text-sm text-surface-400 mt-2">
					Go back to the Skills step to select major and minor skills before creating subskills.
				</p>
			</div>
		{/if}

		<!-- Optional: Subskills Tips -->
		<div class="card p-4 variant-soft">
			<h4 class="font-semibold mb-2">Subskill Examples</h4>
			<ul class="text-sm text-surface-400 list-disc list-inside space-y-1">
				<li><span class="text-surface-300">One-Handed:</span> Swordsmanship, Axe Fighting, Mace Combat</li>
				<li><span class="text-surface-300">Destruction:</span> Fire Magic, Frost Magic, Lightning Magic</li>
				<li><span class="text-surface-300">Sneak:</span> Urban Stealth, Wilderness Concealment, Pickpocketing</li>
				<li><span class="text-surface-300">Speechcraft:</span> Persuasion, Intimidation, Haggling</li>
			</ul>
		</div>
	</div>
</WizardStep>
