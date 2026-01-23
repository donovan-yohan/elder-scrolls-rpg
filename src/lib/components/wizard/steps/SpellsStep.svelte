<script lang="ts">
	import WizardStep from '../WizardStep.svelte'
	import { wizardStore } from '$lib/stores/wizard.store'
	import { onMount } from 'svelte'
	import { getAvailableSpellSlots } from '$lib/util/stats.util'
	import { SpellSkills, type Skill } from '$lib/data/skill'
	import { Spells, getSpellsBySchool, SpellSchool, SpellLevel, type Spell } from '$lib/data/spells'
	import type { PlayerData } from '$lib/models/player'
	import { TabGroup, Tab } from '@skeletonlabs/skeleton'
	import { camelToTitleCase } from '$lib/util/string.util'
	import classNames from 'classnames'

	export let stepIndex: number = 3

	// Get spell slots based on current form data
	$: spellSlots = getAvailableSpellSlots($wizardStore.formData as PlayerData)

	// Calculate total available spell slots
	$: totalSlots = Object.values(spellSlots).reduce((sum, slots) => sum + slots, 0)

	// Get schools that have spell slots
	$: availableSchools = Object.keys(spellSlots) as Skill[]

	// Initialize known spells from store
	let knownSpells: string[] = $wizardStore.formData.knownSpells || []

	// Track selected tab
	let selectedTabIndex: number = 0

	// Get spells for a specific school
	function getSpellsForSchool(skill: Skill): Spell[] {
		// Map skill to SpellSchool enum
		const schoolMap: Record<string, SpellSchool> = {
			Alteration: SpellSchool.Alteration,
			Conjuration: SpellSchool.Conjuration,
			Destruction: SpellSchool.Destruction,
			Illusion: SpellSchool.Illusion,
			Mysticism: SpellSchool.Mysticism,
			Restoration: SpellSchool.Restoration,
		}
		const school = schoolMap[skill]
		return school ? getSpellsBySchool(school) : []
	}

	// Count selected spells for a school
	function getSelectedCountForSchool(skill: Skill): number {
		const schoolSpells = getSpellsForSchool(skill)
		return knownSpells.filter((id) => schoolSpells.some((s) => s.id === id)).length
	}

	// Get remaining slots for a school
	function getRemainingSlots(skill: Skill): number {
		const total = spellSlots[skill] || 0
		const used = getSelectedCountForSchool(skill)
		return total - used
	}

	// Check if a spell is selected
	function isSpellSelected(spellId: string): boolean {
		return knownSpells.includes(spellId)
	}

	// Toggle spell selection
	function toggleSpell(spell: Spell): void {
		const isSelected = isSpellSelected(spell.id)
		const skill = spell.skill as Skill

		if (isSelected) {
			// Deselect the spell
			knownSpells = knownSpells.filter((id) => id !== spell.id)
		} else {
			// Check if we have slots available
			if (getRemainingSlots(skill) > 0) {
				knownSpells = [...knownSpells, spell.id]
			}
		}
	}

	// Check if a skill is major
	function isMajorSkill(skill: Skill): boolean {
		const majorSkills = $wizardStore.formData.majorSkills || []
		return majorSkills.includes(skill)
	}

	// Get spell level color
	function getSpellLevelColor(level: SpellLevel): string {
		switch (level) {
			case SpellLevel.Novice:
				return 'variant-soft-success'
			case SpellLevel.Apprentice:
				return 'variant-soft-primary'
			case SpellLevel.Adept:
				return 'variant-soft-secondary'
			case SpellLevel.Expert:
				return 'variant-soft-warning'
			case SpellLevel.Master:
				return 'variant-soft-error'
			default:
				return 'variant-soft'
		}
	}

	// Get effect type icon
	function getEffectTypeIcon(type: string): string {
		switch (type) {
			case 'damage':
				return 'M13 10V3L4 14h7v7l9-11h-7z' // Lightning bolt
			case 'healing':
				return 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' // Heart
			case 'buff':
				return 'M5 10l7-7m0 0l7 7m-7-7v18' // Arrow up
			case 'debuff':
				return 'M19 14l-7 7m0 0l-7-7m7 7V3' // Arrow down
			case 'summon':
				return 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' // Flame/summon
			case 'utility':
				return 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' // Lightbulb
			case 'ward':
				return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' // Shield
			default:
				return 'M13 10V3L4 14h7v7l9-11h-7z'
		}
	}

	// Calculate total selected spells
	$: totalSelectedSpells = knownSpells.length

	// Validate step - valid when we haven't exceeded any school limits
	$: isValid = availableSchools.every((skill) => getSelectedCountForSchool(skill) <= (spellSlots[skill] || 0))

	// Update store and validation
	$: {
		wizardStore.updateFormData({ knownSpells })
		wizardStore.setStepValid(stepIndex, isValid)
	}

	onMount(() => {
		wizardStore.setStepValid(stepIndex, isValid)
	})
</script>

<WizardStep
	title="Spells"
	description="Choose your starting spells based on your magic skills."
	{stepIndex}
>
	<div class="flex flex-col gap-6">
		<!-- Info Box -->
		<div class="card p-4 variant-soft-tertiary">
			<div class="flex items-start gap-3">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-tertiary-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
				<div>
					<p class="font-semibold">Starting Spells</p>
					<p class="text-sm text-surface-400 mt-1">
						Major magic skills grant <span class="font-bold text-primary-400">3 spells</span>,
						minor magic skills grant <span class="font-bold text-secondary-400">1 spell</span>.
						Select spells from each of your magic schools.
					</p>
				</div>
			</div>
		</div>

		{#if availableSchools.length > 0}
			<!-- Spell Slots Summary -->
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
				{#each availableSchools as skill}
					{@const total = spellSlots[skill] || 0}
					{@const selected = getSelectedCountForSchool(skill)}
					{@const isMajor = isMajorSkill(skill)}

					<div
						class={classNames('p-3 rounded-lg border-2 text-center', {
							'border-primary-500 bg-primary-500/10': isMajor,
							'border-secondary-500 bg-secondary-500/10': !isMajor,
						})}
					>
						<span class="block text-sm font-medium">{camelToTitleCase(skill)}</span>
						<span
							class={classNames('block text-xl font-bold', {
								'text-success-400': selected === total,
								'text-warning-400': selected > 0 && selected < total,
								'text-surface-400': selected === 0,
							})}
						>
							{selected}/{total}
						</span>
					</div>
				{/each}
			</div>

			<!-- Total Summary -->
			<div class="flex gap-4 p-4 bg-surface-700 rounded-lg">
				<div class="flex-1 text-center">
					<span class="block text-2xl font-bold text-tertiary-400">{totalSelectedSpells}</span>
					<span class="text-sm text-surface-400">Spells Selected</span>
				</div>
				<div class="flex-1 text-center">
					<span class="block text-2xl font-bold text-surface-400">{totalSlots}</span>
					<span class="text-sm text-surface-400">Total Available</span>
				</div>
			</div>

			<!-- School Tabs -->
			<TabGroup>
				{#each availableSchools as skill, index}
					{@const selected = getSelectedCountForSchool(skill)}
					{@const total = spellSlots[skill] || 0}
					{@const isMajor = isMajorSkill(skill)}

					<Tab bind:group={selectedTabIndex} name={skill} value={index}>
						<span class="flex items-center gap-2">
							<span>{camelToTitleCase(skill)}</span>
							<span
								class={classNames('badge text-xs', {
									'variant-filled-success': selected === total,
									'variant-filled-warning': selected > 0 && selected < total,
									'variant-soft': selected === 0,
								})}
							>
								{selected}/{total}
							</span>
						</span>
					</Tab>
				{/each}

				<svelte:fragment slot="panel">
					{#each availableSchools as skill, index}
						{#if selectedTabIndex === index}
							{@const schoolSpells = getSpellsForSchool(skill)}
							{@const remaining = getRemainingSlots(skill)}
							{@const isMajor = isMajorSkill(skill)}

							<div class="flex flex-col gap-4 mt-4">
								<!-- School Header -->
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<h3 class="h4 font-semibold">{camelToTitleCase(skill)} Spells</h3>
										<span
											class={classNames('badge', {
												'variant-filled-primary': isMajor,
												'variant-filled-secondary': !isMajor,
											})}
										>
											{isMajor ? 'Major' : 'Minor'}
										</span>
									</div>
									<span class="text-sm text-surface-400">
										{remaining} slot{remaining !== 1 ? 's' : ''} remaining
									</span>
								</div>

								<!-- Spells Grid -->
								<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
									{#each schoolSpells as spell}
										{@const isSelected = isSpellSelected(spell.id)}
										{@const canSelect = remaining > 0 || isSelected}

										<button
											type="button"
											class={classNames(
												'card p-4 text-left transition-all',
												{
													'ring-2 ring-tertiary-500 bg-tertiary-500/10': isSelected,
													'hover:bg-surface-600/50': canSelect && !isSelected,
													'opacity-50 cursor-not-allowed': !canSelect,
												}
											)}
											disabled={!canSelect}
											on:click={() => toggleSpell(spell)}
										>
											<!-- Spell Header -->
											<div class="flex items-start justify-between gap-2 mb-2">
												<div class="flex-1">
													<h4 class="font-semibold text-lg">{spell.name}</h4>
													<div class="flex items-center gap-2 mt-1">
														<span class={classNames('badge text-xs', getSpellLevelColor(spell.level))}>
															{spell.level}
														</span>
														{#if spell.isConcentration}
															<span class="badge variant-soft-warning text-xs" title="Concentration">C</span>
														{/if}
														{#if spell.isReaction}
															<span class="badge variant-soft-tertiary text-xs" title="Reaction">R</span>
														{/if}
													</div>
												</div>
												<div
													class={classNames(
														'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
														{
															'border-tertiary-500 bg-tertiary-500': isSelected,
															'border-surface-500': !isSelected,
														}
													)}
												>
													{#if isSelected}
														<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
														</svg>
													{/if}
												</div>
											</div>

											<!-- Spell Costs -->
											<div class="flex gap-4 mb-3 text-sm">
												<div class="flex items-center gap-1">
													<span class="text-warning-400 font-medium">{spell.apCost}</span>
													<span class="text-surface-400">AP</span>
												</div>
												<div class="flex items-center gap-1">
													<span class="text-primary-400 font-medium">{spell.mpCost}</span>
													<span class="text-surface-400">MP</span>
												</div>
												<div class="flex items-center gap-1">
													<span class="text-surface-300">{spell.range}</span>
												</div>
												{#if spell.duration > 0}
													<div class="flex items-center gap-1">
														<span class="text-surface-400">{spell.duration} rnd</span>
													</div>
												{/if}
											</div>

											<!-- Description -->
											<p class="text-sm text-surface-400 mb-3">{spell.description}</p>

											<!-- Effects -->
											<div class="flex flex-wrap gap-2">
												{#each spell.effects as effect}
													<div class="flex items-center gap-1 text-xs bg-surface-700 rounded px-2 py-1">
														<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getEffectTypeIcon(effect.type)} />
														</svg>
														<span class="text-surface-300">{effect.description}</span>
													</div>
												{/each}
											</div>
										</button>
									{/each}
								</div>

								{#if schoolSpells.length === 0}
									<p class="text-center text-surface-500 py-8">No spells available for this school.</p>
								{/if}
							</div>
						{/if}
					{/each}
				</svelte:fragment>
			</TabGroup>

			<!-- Selected Spells Summary -->
			{#if knownSpells.length > 0}
				<div class="card p-4 variant-soft">
					<h4 class="font-semibold mb-3">Selected Spells ({knownSpells.length})</h4>
					<div class="flex flex-wrap gap-2">
						{#each knownSpells as spellId}
							{@const spell = Spells.find((s) => s.id === spellId)}
							{#if spell}
								<button
									type="button"
									class="badge variant-filled-tertiary cursor-pointer hover:variant-filled-error transition-colors"
									title="Click to remove"
									on:click={() => toggleSpell(spell)}
								>
									{spell.name}
									<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<!-- No Magic Skills -->
			<div class="card p-6 variant-soft-warning text-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-warning-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				<p class="font-semibold">No Magic Skills Selected</p>
				<p class="text-sm text-surface-400 mt-2">
					You haven't selected any magic skills. Go back to the Skills step to select magic skills if you want to use spells.
				</p>
				<p class="text-sm text-surface-500 mt-4">
					Magic skills include: Alteration, Conjuration, Destruction, Illusion, Mysticism, and Restoration.
				</p>
			</div>
		{/if}
	</div>
</WizardStep>
