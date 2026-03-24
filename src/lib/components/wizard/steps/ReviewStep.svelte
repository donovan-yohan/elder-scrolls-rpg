<script lang="ts">
	import WizardStep from '../WizardStep.svelte'
	import { wizardStore } from '$lib/stores/wizard.store'
	import { onMount } from 'svelte'
	import { calculateMaxHealth, calculateMaxMagicka, calculateMaxAP, hasMagicSkills, getAvailableSpellSlots } from '$lib/util/stats.util'
	import type { PlayerData } from '$lib/models/player'
	import { Archetypes } from '$lib/data/archetype'
	import { BirthSigns } from '$lib/data/birthSign'
	import { Race } from '$lib/data/race'
	import { camelToTitleCase } from '$lib/util/string.util'
	import { getEquippedWeapon, getEquippedArmor, type EquippedWeapon, type EquippedArmor } from '$lib/util/equipment.util'

	export let stepIndex: number = 5

	$: formData = $wizardStore.formData as Partial<PlayerData>

	// Calculate derived stats
	$: maxHealth = formData.race && formData.archetype && formData.birthSign
		? calculateMaxHealth(formData as PlayerData)
		: 0
	$: maxMagicka = formData.race && formData.archetype && formData.birthSign
		? calculateMaxMagicka(formData as PlayerData)
		: 0
	$: maxAP = formData.race && formData.archetype && formData.birthSign
		? calculateMaxAP(formData as PlayerData)
		: 0

	$: hasMagic = formData.majorSkills && formData.minorSkills
		? hasMagicSkills(formData as PlayerData)
		: false

	$: spellSlots = formData.majorSkills && formData.minorSkills
		? getAvailableSpellSlots(formData as PlayerData)
		: {}

	// Equipment display helpers
	$: equippedWeapon = formData.equipment?.weapon
		? getEquippedWeapon(formData.equipment.weapon)
		: null
	$: equippedOffhand = formData.equipment?.offhand
		? getEquippedWeapon(formData.equipment.offhand)
		: null
	$: equippedArmor = formData.equipment?.armor
		? getEquippedArmor(formData.equipment.armor)
		: null

	function formatWeaponName(equipped: EquippedWeapon | null): string {
		if (!equipped) return 'None'
		return equipped.material ? `${equipped.material.name} ${equipped.weapon.name}` : equipped.weapon.name
	}

	function formatArmorName(equipped: EquippedArmor | null): string {
		if (!equipped) return 'None'
		return equipped.material ? `${equipped.material.name} ${equipped.armor.name}` : equipped.armor.name
	}

	// Validate the review step (always valid if we got here)
	$: {
		wizardStore.setStepValid(stepIndex, true)
	}

	onMount(() => {
		wizardStore.setStepValid(stepIndex, true)
	})
</script>

<WizardStep
	title="Review Character"
	description="Review your character before finalizing. You can go back to any step to make changes."
	{stepIndex}
>
	<div class="flex flex-col gap-6">
		<!-- Character Identity -->
		<section class="card p-6 variant-ghost">
			<h3 class="h3 font-bold mb-4 text-primary-400">Character Identity</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<span class="text-surface-400 text-sm">Character Name</span>
					<p class="font-semibold text-lg">{formData.characterName || 'Not set'}</p>
				</div>
				<div>
					<span class="text-surface-400 text-sm">Race</span>
					<p class="font-semibold text-lg">{formData.race || 'Not set'}</p>
				</div>
				<div>
					<span class="text-surface-400 text-sm">Archetype</span>
					<p class="font-semibold text-lg">{formData.archetype || 'Not set'}</p>
				</div>
				<div>
					<span class="text-surface-400 text-sm">Birth Sign</span>
					<p class="font-semibold text-lg">{formData.birthSign || 'Not set'}</p>
				</div>
			</div>
		</section>

		<!-- Derived Stats -->
		<section class="card p-6 variant-ghost">
			<h3 class="h3 font-bold mb-4 text-success-400">Derived Stats</h3>
			<div class="grid grid-cols-3 gap-4 text-center">
				<div class="card p-4 variant-soft-error">
					<span class="text-3xl font-bold text-error-400">{maxHealth}</span>
					<p class="text-sm text-surface-400 mt-1">Max Health</p>
				</div>
				<div class="card p-4 variant-soft-tertiary">
					<span class="text-3xl font-bold text-tertiary-400">{maxMagicka}</span>
					<p class="text-sm text-surface-400 mt-1">Max Magicka</p>
				</div>
				<div class="card p-4 variant-soft-warning">
					<span class="text-3xl font-bold text-warning-400">{maxAP}</span>
					<p class="text-sm text-surface-400 mt-1">Max AP</p>
				</div>
			</div>
		</section>

		<!-- Skills -->
		<section class="card p-6 variant-ghost">
			<h3 class="h3 font-bold mb-4 text-secondary-400">Skills</h3>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Major Skills -->
				<div>
					<h4 class="font-semibold text-primary-400 mb-2">Major Skills</h4>
					{#if formData.majorSkills && formData.majorSkills.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each formData.majorSkills as skill}
								<span class="badge variant-filled-primary">{camelToTitleCase(skill)}</span>
							{/each}
						</div>
					{:else}
						<p class="text-surface-500 italic">None selected</p>
					{/if}
				</div>

				<!-- Minor Skills -->
				<div>
					<h4 class="font-semibold text-secondary-400 mb-2">Minor Skills</h4>
					{#if formData.minorSkills && formData.minorSkills.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each formData.minorSkills as skill}
								<span class="badge variant-filled-secondary">{camelToTitleCase(skill)}</span>
							{/each}
						</div>
					{:else}
						<p class="text-surface-500 italic">None selected</p>
					{/if}
				</div>
			</div>
		</section>

		<!-- Character Traits (Subskills) -->
		{#if formData.subSkills && formData.subSkills.length > 0}
			<section class="card p-6 variant-ghost">
				<h3 class="h3 font-bold mb-4">Character Traits</h3>
				<div class="flex flex-wrap gap-2">
					{#each formData.subSkills as subskill}
						<span class="badge variant-soft" title={subskill.description}>{subskill.name}</span>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Magic (Conditional) -->
		{#if hasMagic}
			<section class="card p-6 variant-ghost">
				<h3 class="h3 font-bold mb-4 text-tertiary-400">Magic</h3>

				<!-- Spell Slots -->
				<div class="mb-4">
					<h4 class="font-semibold mb-2">Available Spell Slots</h4>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(spellSlots) as [school, slots]}
							<span class="badge variant-soft-tertiary">{camelToTitleCase(school)}: {slots}</span>
						{/each}
					</div>
				</div>

				<!-- Known Spells -->
				{#if formData.knownSpells && formData.knownSpells.length > 0}
					<div>
						<h4 class="font-semibold mb-2">Known Spells</h4>
						<div class="flex flex-wrap gap-2">
							{#each formData.knownSpells as spell}
								<span class="badge variant-filled-tertiary">{spell}</span>
							{/each}
						</div>
					</div>
				{:else}
					<p class="text-surface-500 italic">No spells selected</p>
				{/if}
			</section>
		{/if}

		<!-- Equipment -->
		<section class="card p-6 variant-ghost">
			<h3 class="h3 font-bold mb-4">Equipment</h3>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div>
					<span class="text-surface-400 text-sm">Weapon</span>
					<p class="font-semibold">{formatWeaponName(equippedWeapon)}</p>
				</div>
				<div>
					<span class="text-surface-400 text-sm">Offhand</span>
					<p class="font-semibold">{formatWeaponName(equippedOffhand)}</p>
				</div>
				<div>
					<span class="text-surface-400 text-sm">Armor</span>
					<p class="font-semibold">{formatArmorName(equippedArmor)}</p>
				</div>
				<div>
					<span class="text-surface-400 text-sm">Accessories</span>
					<p class="font-semibold">{formData.equipment?.accessories?.length || 0} items</p>
				</div>
			</div>
		</section>

		<!-- Ready to Create -->
		<div class="card p-6 variant-soft-success text-center">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-success-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<p class="font-semibold text-lg">Ready to Create Character</p>
			<p class="text-sm text-surface-400 mt-2">
				Click "Complete" below to finalize and create your character.
			</p>
		</div>
	</div>
</WizardStep>
