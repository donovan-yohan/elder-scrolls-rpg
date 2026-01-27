<script lang="ts">
	import { goto } from '$app/navigation'
	import { playersStore } from '$lib/stores/persisted.store'
	import { wizardStore } from '$lib/stores/wizard.store'
	import { hasMagicSkills, calculateMaxHealth, calculateMaxMagicka, calculateMaxAP } from '$lib/util/stats.util'
	import { createEmptySlot } from '$lib/util/equipment.util'
	import type { PlayerData } from '$lib/models/player'
	import { CHARACTER_SCHEMA_VERSION } from '$lib/version'
	import type { WizardStepConfig } from '$lib/components/wizard/types'

	import {
		Wizard,
		BasicsStep,
		SkillsStep,
		SubskillsStep,
		SpellsStep,
		EquipmentStep,
		ReviewStep,
	} from '$lib/components/wizard'
	import { onMount } from 'svelte'

	// Define wizard steps configuration
	const steps: WizardStepConfig[] = [
		{
			id: 0,
			name: 'Basics',
			component: BasicsStep,
		},
		{
			id: 1,
			name: 'Skills',
			component: SkillsStep,
		},
		{
			id: 2,
			name: 'Subskills',
			component: SubskillsStep,
		},
		{
			id: 3,
			name: 'Spells',
			component: SpellsStep,
			isConditional: true,
			showIf: (formData: Partial<PlayerData>) => {
				// Only show spells step if player has magic skills
				if (!formData.majorSkills || !formData.minorSkills) return false
				return hasMagicSkills(formData as PlayerData)
			},
		},
		{
			id: 4,
			name: 'Equipment',
			component: EquipmentStep,
		},
		{
			id: 5,
			name: 'Review',
			component: ReviewStep,
		},
	]

	// Handle wizard completion
	function handleComplete(event: CustomEvent<{ formData: Partial<PlayerData> }>) {
		const formData = event.detail.formData

		// Calculate derived stats
		const now = new Date().toISOString()
		const maxHealth = calculateMaxHealth(formData as PlayerData)
		const maxMagicka = calculateMaxMagicka(formData as PlayerData)
		const maxAP = calculateMaxAP(formData as PlayerData)

		// Create the complete player data
		const newPlayer: PlayerData = {
			// Spread form data
			id: formData.characterName || 'unnamed',
			schemaVersion: CHARACTER_SCHEMA_VERSION,
			level: 1,
			playerName: '',
			characterName: formData.characterName || 'Unnamed Hero',
			race: formData.race!,
			archetype: formData.archetype!,
			birthSign: formData.birthSign!,
			majorSkills: formData.majorSkills || [],
			minorSkills: formData.minorSkills || [],
			subSkills: formData.subSkills || [],
			knownSpells: formData.knownSpells || [],
			equipment: formData.equipment || {
				weapon: createEmptySlot(),
				offhand: createEmptySlot(),
				armor: createEmptySlot(),
				accessories: [],
			},
			inventory: formData.inventory || [],
			ownedWeapons: formData.ownedWeapons || [],
			notes: formData.notes || '',
			// Calculated stats
			maxHealth,
			health: maxHealth,
			maxMagicka,
			magicka: maxMagicka,
			maxActionPoints: maxAP,
			actionPoints: maxAP,
			// Timestamps
			createdAt: now,
			updatedAt: now,
		}

		// Save to store
		playersStore.update((players) => {
			players[newPlayer.id] = newPlayer
			return players
		})

		// Clear wizard state
		wizardStore.initializeWizard()

		// Navigate to home or character page
		goto(`/${newPlayer.id}`)
	}

	// Handle wizard cancellation
	function handleCancel() {
		// Confirm before canceling
		if (confirm('Are you sure you want to cancel? All progress will be lost.')) {
			wizardStore.initializeWizard()
			goto('/')
		}
	}

	// Initialize wizard on mount - start fresh each time
	onMount(() => {
		wizardStore.initializeWizard()
	})
</script>

<svelte:head>
	<title>Create Character | Elder Scrolls RPG</title>
</svelte:head>

<div class="container mx-auto p-4 h-full">
	<Wizard
		{steps}
		on:complete={handleComplete}
		on:cancel={handleCancel}
	/>
</div>
