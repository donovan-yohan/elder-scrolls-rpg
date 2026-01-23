<script lang="ts">
	import { goto } from '$app/navigation'
	import { getModalStore, RadioGroup, RadioItem } from '@skeletonlabs/skeleton'
	import { Level } from '$lib/data/level'
	import { playersStore } from '$lib/stores/persisted.store'
	import { Skill, SkillLevel } from '$lib/data/skill'
	import type { PlayerData } from '$lib/models/player'
	import CharacterSheet from '$lib/components/CharacterSheet.svelte'
	import { CombatMode } from '$lib/components/combat'
	import { getIsInCombatStore } from '$lib/stores/combat.store'
	import classNames from 'classnames'

	export let data

	const modalStore = getModalStore()

	// View mode: 'playing' | 'editing' | 'combat'
	type ViewMode = 'playing' | 'editing' | 'combat'
	let viewMode: ViewMode = 'playing'

	// Legacy compatibility
	$: editMode = viewMode === 'editing'

	// Check if player is in combat
	$: isInCombatStore = getIsInCombatStore(data.id)
	$: isInCombat = $isInCombatStore
	let showDeleteConfirm = false

	// Helper function to update player safely
	function updatePlayer(updates: Partial<PlayerData>) {
		const currentPlayer = $playersStore[data.id]
		if (currentPlayer) {
			$playersStore[data.id] = {
				...currentPlayer,
				...updates,
				updatedAt: new Date().toISOString(),
			}
		}
	}

	// Handle player updates from CharacterSheet
	function handlePlayerUpdate(updatedPlayer: PlayerData) {
		updatePlayer(updatedPlayer)
	}

	// Delete character with confirmation
	function confirmDelete() {
		showDeleteConfirm = true
	}

	function cancelDelete() {
		showDeleteConfirm = false
	}

	function deleteCharacter() {
		const currentPlayer = $playersStore[data.id]
		if (currentPlayer) {
			const { [data.id]: _removed, ...rest } = $playersStore
			$playersStore = rest
			goto('/')
		}
	}

	// Helper function to determine skill level for a player
	function getSkillLevel(player: PlayerData | undefined, skill: Skill): SkillLevel {
		if (player?.majorSkills?.includes(skill)) return SkillLevel.Major
		if (player?.minorSkills?.includes(skill)) return SkillLevel.Minor
		return SkillLevel.Untrained
	}

	// Initialize skill groups from current player data
	function initializeSkillGroups(): Record<Skill, SkillLevel> {
		const currentPlayer = $playersStore[data.id]
		return Object.values(Skill).reduce(
			(acc, skill) => {
				acc[skill] = getSkillLevel(currentPlayer, skill)
				return acc
			},
			{} as Record<Skill, SkillLevel>,
		)
	}

	let skillGroups = initializeSkillGroups()

	// Update skills when skill groups change (only in edit mode)
	function handleSkillChange(skill: Skill, level: SkillLevel) {
		skillGroups[skill] = level
		skillGroups = skillGroups // Trigger reactivity

		const majorSkills = Object.entries(skillGroups)
			.filter(([_, lvl]) => lvl === SkillLevel.Major)
			.map(([s, _]) => Skill[s as keyof typeof Skill])

		const minorSkills = Object.entries(skillGroups)
			.filter(([_, lvl]) => lvl === SkillLevel.Minor)
			.map(([s, _]) => Skill[s as keyof typeof Skill])

		updatePlayer({ majorSkills, minorSkills })
	}

	// Reactive getters
	$: currentPlayer = $playersStore[data.id]
	$: totalMajorSkills = currentPlayer ? Level[currentPlayer.level]?.majorSkills ?? 0 : 0
	$: totalMinorSkills = currentPlayer ? Level[currentPlayer.level]?.minorSkills ?? 0 : 0
	$: selectedMajorSkills = currentPlayer?.majorSkills?.length ?? 0
	$: selectedMinorSkills = currentPlayer?.minorSkills?.length ?? 0
</script>

<svelte:head>
	<title>{currentPlayer?.characterName || 'Character'} - Skyrim RPG</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8 max-w-6xl">
	{#if currentPlayer !== undefined}
		<!-- Mode Toggle & Actions Bar -->
		<div class="flex flex-wrap justify-between items-center gap-4 mb-6 print:hidden">
			<RadioGroup background="bg-surface-700">
				<RadioItem name="playing" bind:group={viewMode} value="playing">
					<span class="flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
						</svg>
						Playing
					</span>
				</RadioItem>
				<RadioItem name="editing" bind:group={viewMode} value="editing">
					<span class="flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
						Editing
					</span>
				</RadioItem>
				<RadioItem name="combat" bind:group={viewMode} value="combat">
					<span class="flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						Combat
						{#if isInCombat}
							<span class="badge variant-filled-error text-xs ml-1">Active</span>
						{/if}
					</span>
				</RadioItem>
			</RadioGroup>

			<div class="flex gap-2">
				<a href="/" class="btn variant-ghost-surface">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Back to Characters
				</a>
				{#if editMode}
					<button class="btn variant-filled-error" on:click={confirmDelete}>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
						Delete Character
					</button>
				{/if}
			</div>
		</div>

		<!-- Delete Confirmation Modal -->
		{#if showDeleteConfirm}
			<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
				<div class="card p-6 variant-filled-surface max-w-md w-full shadow-xl">
					<h3 class="h3 font-bold mb-4">Delete Character?</h3>
					<p class="text-surface-600-300-token mb-6">
						Are you sure you want to delete <strong>{currentPlayer.characterName}</strong>? This action cannot be undone.
					</p>
					<div class="flex justify-end gap-3">
						<button class="btn variant-ghost-surface" on:click={cancelDelete}>
							Cancel
						</button>
						<button class="btn variant-filled-error" on:click={deleteCharacter}>
							Delete Forever
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Combat Mode or Character Sheet -->
		{#if viewMode === 'combat'}
			<CombatMode player={currentPlayer} />
		{:else}
			<CharacterSheet player={currentPlayer} {editMode} onUpdate={handlePlayerUpdate} />
		{/if}

		<!-- Advanced Edit Mode: Skills Selection -->
		{#if editMode}
			<section class="card p-6 mt-6 variant-soft-surface print:hidden">
				<h3 class="h3 font-bold mb-4">Edit Skills</h3>

				<div class="flex flex-wrap gap-4 mb-4">
					<div class="flex items-center gap-2">
						<span class="badge variant-filled-primary px-4 py-2">
							Major Skills: {selectedMajorSkills} / {totalMajorSkills}
						</span>
						{#if selectedMajorSkills < totalMajorSkills}
							<span class="text-warning-500 text-sm">
								Choose {totalMajorSkills - selectedMajorSkills} more
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<span class="badge variant-filled-secondary px-4 py-2">
							Minor Skills: {selectedMinorSkills} / {totalMinorSkills}
						</span>
						{#if selectedMinorSkills < totalMinorSkills}
							<span class="text-warning-500 text-sm">
								Choose {totalMinorSkills - selectedMinorSkills} more
							</span>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
					{#each Object.values(Skill) as skill}
						<div class="card p-3 variant-ghost-surface">
							<span
								class={classNames('block text-sm font-medium mb-2', {
									'text-primary-500': currentPlayer.majorSkills.includes(skill),
									'text-secondary-500': currentPlayer.minorSkills.includes(skill),
									'text-surface-500': !currentPlayer.majorSkills.includes(skill) && !currentPlayer.minorSkills.includes(skill),
								})}
							>
								{skill.replace(/([A-Z])/g, ' $1').trim()}
							</span>
							<div class="flex flex-col gap-1">
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										class="radio"
										type="radio"
										checked={skillGroups[skill] === SkillLevel.Major}
										disabled={skillGroups[skill] !== SkillLevel.Major && selectedMajorSkills >= totalMajorSkills}
										on:change={() => handleSkillChange(skill, SkillLevel.Major)}
									/>
									<span class="text-xs">Major</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										class="radio"
										type="radio"
										checked={skillGroups[skill] === SkillLevel.Minor}
										disabled={skillGroups[skill] !== SkillLevel.Minor && selectedMinorSkills >= totalMinorSkills}
										on:change={() => handleSkillChange(skill, SkillLevel.Minor)}
									/>
									<span class="text-xs">Minor</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										class="radio"
										type="radio"
										checked={skillGroups[skill] === SkillLevel.Untrained}
										on:change={() => handleSkillChange(skill, SkillLevel.Untrained)}
									/>
									<span class="text-xs">Untrained</span>
								</label>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- Edit Character Basics -->
			<section class="card p-6 mt-6 variant-soft-surface print:hidden">
				<h3 class="h3 font-bold mb-4">Edit Character Details</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<label class="label">
						<span>Character Name</span>
						<input
							class="input"
							type="text"
							value={currentPlayer.characterName}
							on:input={(e) => updatePlayer({ characterName: e.currentTarget.value })}
						/>
					</label>
					<label class="label">
						<span>Player Name</span>
						<input
							class="input"
							type="text"
							value={currentPlayer.playerName}
							on:input={(e) => updatePlayer({ playerName: e.currentTarget.value })}
						/>
					</label>
					<label class="label">
						<span>Archetype</span>
						<button
							class="btn variant-soft-surface w-full justify-between"
							on:click={() =>
								modalStore.trigger({
									type: 'component',
									component: 'archetypesModal',
									meta: { playerId: currentPlayer.id },
									response: (newArchetype) => {
										if (newArchetype) updatePlayer({ archetype: newArchetype })
									},
								})}
						>
							{currentPlayer.archetype}
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
					</label>
					<label class="label">
						<span>Race</span>
						<button
							class="btn variant-soft-surface w-full justify-between"
							on:click={() =>
								modalStore.trigger({
									type: 'component',
									component: 'raceModal',
									meta: { playerId: currentPlayer.id },
									response: (newRace) => {
										if (newRace) updatePlayer({ race: newRace })
									},
								})}
						>
							{currentPlayer.race}
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
					</label>
					<label class="label">
						<span>Birth Sign</span>
						<button
							class="btn variant-soft-surface w-full justify-between"
							on:click={() =>
								modalStore.trigger({
									type: 'component',
									component: 'birthSignModal',
									meta: { playerId: currentPlayer.id },
									response: (newBirthSign) => {
										if (newBirthSign) updatePlayer({ birthSign: newBirthSign })
									},
								})}
						>
							{currentPlayer.birthSign}
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
					</label>
				</div>
			</section>
		{/if}
	{:else}
		<!-- Player Not Found State -->
		<div class="card p-12 text-center variant-soft-error">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<h2 class="h2 mb-4">Character Not Found</h2>
			<p class="text-surface-600-300-token mb-6">
				The character you're looking for doesn't exist or may have been deleted.
			</p>
			<a href="/" class="btn variant-filled-primary">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Back to Characters
			</a>
		</div>
	{/if}
</div>

<style>
	@media print {
		/* Hide all edit controls when printing */
		:global(.print\:hidden) {
			display: none !important;
		}

		/* Remove container padding for print */
		.container {
			padding: 0 !important;
			max-width: none !important;
		}
	}
</style>
