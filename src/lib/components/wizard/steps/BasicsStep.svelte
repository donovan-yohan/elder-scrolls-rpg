<script lang="ts">
	import WizardStep from '../WizardStep.svelte'
	import { wizardStore } from '$lib/stores/wizard.store'
	import { Accordion, AccordionItem, RadioGroup, RadioItem } from '@skeletonlabs/skeleton'
	import { ArchetypeName, Archetypes } from '$lib/data/archetype'
	import { BirthSignName, BirthSigns } from '$lib/data/birthSign'
	import { Race, RaceName } from '$lib/data/race'
	import { camelToTitleCase } from '$lib/util/string.util'
	import { onMount } from 'svelte'

	interface Props {
		stepIndex?: number
	}

	let { stepIndex = 0 }: Props = $props()

	// Local form state
	let characterName = $wizardStore.formData.characterName || ''
	let race = $wizardStore.formData.race || RaceName.Nord
	let archetype = $wizardStore.formData.archetype || ArchetypeName.Warrior
	let birthSign = $wizardStore.formData.birthSign || BirthSignName.Warrior

	// Validate and update store when form changes
	$: {
		const isValid = characterName.trim().length > 0

		wizardStore.updateFormData({
			characterName,
			race,
			archetype,
			birthSign,
		})

		wizardStore.setStepValid(stepIndex, isValid)
	}

	// Initialize validation on mount
	onMount(() => {
		const isValid = characterName.trim().length > 0
		wizardStore.setStepValid(stepIndex, isValid)
	})
</script>

<WizardStep
	title="Character Basics"
	description="Choose your character's name, race, archetype, and birth sign."
	{stepIndex}
>
	<div class="flex flex-col gap-8">
		<!-- Character Name -->
		<label class="label">
			<span class="text-lg font-semibold">Character Name</span>
			<input
				class="input mt-2"
				type="text"
				placeholder="Enter your character's name"
				bind:value={characterName}
			/>
			{#if characterName.trim().length === 0}
				<span class="text-error-400 text-sm mt-1">Character name is required</span>
			{/if}
		</label>

		<!-- Race Selection -->
		<div class="label flex flex-col">
			<span class="text-lg font-semibold mb-2">Race</span>
			<Accordion>
				{#each Object.values(RaceName) as raceName}
					<AccordionItem>
						<svelte:fragment slot="summary">
							<span class="text-lg flex items-center space-x-2">
								<input
									class="radio"
									type="radio"
									bind:group={race}
									name="race"
									value={RaceName[raceName]}
									on:click|stopPropagation
								/>
								<span class={race === raceName ? 'text-primary-400 font-semibold' : ''}>{raceName}</span>
							</span>
						</svelte:fragment>
						<svelte:fragment slot="content">
							<div class="bg-surface-700 p-4 rounded">
								{#each Race[raceName].description.split('\n') as line}
									<p class="mb-2">{line}</p>
								{/each}
							</div>
						</svelte:fragment>
					</AccordionItem>
				{/each}
			</Accordion>
		</div>

		<!-- Archetype Selection -->
		<div class="label flex flex-col">
			<span class="text-lg font-semibold mb-2">Archetype</span>
			<RadioGroup>
				{#each Object.values(ArchetypeName) as archetypeName}
					<RadioItem bind:group={archetype} name="archetype" value={ArchetypeName[archetypeName]}>
						{archetypeName}
					</RadioItem>
				{/each}
			</RadioGroup>

			<!-- Archetype Stats Preview -->
			{#if archetype}
				{@const arch = Archetypes[archetype]}
				{@const highStat = Object.entries(arch).find(([_, v]) => v === 'highStat')?.[0] ?? ''}
				{@const mediumStat = Object.entries(arch).find(([_, v]) => v === 'mediumStat')?.[0] ?? ''}
				{@const lowStat = Object.entries(arch).find(([_, v]) => v === 'lowStat')?.[0] ?? ''}
				<div class="flex mt-4 p-4 bg-surface-700 rounded-lg">
					<div class="min-w-[33%] flex flex-col">
						<span class="text-sm text-surface-400">High Stat</span>
						<span class="font-semibold text-success-400">{camelToTitleCase(highStat.replace('max', ''))}</span>
					</div>
					<div class="min-w-[33%] flex flex-col">
						<span class="text-sm text-surface-400">Medium Stat</span>
						<span class="font-semibold text-warning-400">{camelToTitleCase(mediumStat.replace('max', ''))}</span>
					</div>
					<div class="min-w-[33%] flex flex-col">
						<span class="text-sm text-surface-400">Low Stat</span>
						<span class="font-semibold text-error-400">{camelToTitleCase(lowStat.replace('max', ''))}</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Birth Sign Selection -->
		<div class="label flex flex-col">
			<span class="text-lg font-semibold mb-2">Birth Sign</span>
			<Accordion>
				{#each Object.values(BirthSignName) as signName}
					<AccordionItem>
						<svelte:fragment slot="summary">
							<span class="text-lg flex items-center space-x-2">
								<input
									class="radio"
									type="radio"
									bind:group={birthSign}
									name="birthSign"
									value={BirthSignName[signName]}
									on:click|stopPropagation
								/>
								<span class={birthSign === signName ? 'text-primary-400 font-semibold' : ''}>{signName}</span>
							</span>
						</svelte:fragment>
						<svelte:fragment slot="content">
							<div class="bg-surface-700 p-4 rounded flex flex-col gap-2">
								{#each Object.entries(BirthSigns[signName]) as [key, value]}
									<div class="flex">
										<span class="font-bold min-w-[25%] text-surface-400">{camelToTitleCase(key)}</span>
										<span class="shrink">{value}</span>
									</div>
								{/each}
							</div>
						</svelte:fragment>
					</AccordionItem>
				{/each}
			</Accordion>
		</div>
	</div>
</WizardStep>
