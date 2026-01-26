<script lang="ts">
	import WizardStep from '../WizardStep.svelte'
	import { wizardStore } from '$lib/stores/wizard.store'
	import { onMount } from 'svelte'
	import type { SubSkill } from '$lib/models/subskill'
	import { getSubskillBonus, getSubskillSlots } from '$lib/util/stats.util'
	import SubskillEditor from '$lib/components/subskills/SubskillEditor.svelte'

	let { stepIndex = 2 }: { stepIndex?: number } = $props()

	// Get the player's current level (default to 1)
	let playerLevel = $derived($wizardStore.formData.level || 1)
	let maxSlots = $derived(getSubskillSlots(playerLevel))
	let bonus = $derived(getSubskillBonus(playerLevel))

	// Initialize subskills from store
	let subSkills: SubSkill[] = $state($wizardStore.formData.subSkills || [])

	// This step is always valid (subskills are optional)
	$effect(() => {
		wizardStore.updateFormData({ subSkills })
		wizardStore.setStepValid(stepIndex, true)
	})

	onMount(() => {
		wizardStore.setStepValid(stepIndex, true)
	})
</script>

<WizardStep
	title="Subskills"
	description="Create unique subskills that represent your expertise, background, and specializations."
	{stepIndex}
>
	<div class="flex flex-col gap-6">
		<!-- Info Box explaining Lancer-style triggers -->
		<div class="card p-4 variant-soft-primary">
			<div class="flex items-start gap-3">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div>
					<p class="font-semibold">How Subskills Work</p>
					<p class="text-sm text-surface-400 mt-1">
						Subskills are custom specializations that can apply to <span class="text-primary-400 font-medium">any skill roll</span>.
						When making a roll, you can invoke a subskill if you can justify its relevance. If the GM agrees,
						you add <span class="font-bold text-success-400">+{bonus}</span> to your roll.
					</p>
					<p class="text-sm text-surface-400 mt-2">
						At level {playerLevel}, you have <span class="font-bold text-primary-400">{maxSlots}</span> subskill slot{maxSlots !== 1 ? 's' : ''}.
						You gain additional slots at levels 5, 10, and 15.
					</p>
				</div>
			</div>
		</div>

		<!-- Subskill Editor Component -->
		<SubskillEditor bind:subSkills {playerLevel} />

		<!-- Examples and Tips -->
		<div class="card p-4 variant-soft">
			<h4 class="font-semibold mb-2">Example Subskills</h4>
			<ul class="text-sm text-surface-400 space-y-2">
				<li>
					<span class="text-surface-200 font-medium">"Fastidious Farmer"</span>
					<span class="text-surface-500"> - </span>
					<span class="italic">Apply to animal handling, crop knowledge, weather prediction, or haggling at markets</span>
				</li>
				<li>
					<span class="text-surface-200 font-medium">"Former Legionnaire"</span>
					<span class="text-surface-500"> - </span>
					<span class="italic">Apply to military tactics, weapon maintenance, discipline checks, or recognizing Legion protocols</span>
				</li>
				<li>
					<span class="text-surface-200 font-medium">"Silver-Tongued Noble"</span>
					<span class="text-surface-500"> - </span>
					<span class="italic">Apply to etiquette, political intrigue, intimidation through status, or knowledge of noble houses</span>
				</li>
				<li>
					<span class="text-surface-200 font-medium">"Guild Alchemist"</span>
					<span class="text-surface-500"> - </span>
					<span class="italic">Apply to potion brewing, ingredient identification, chemical reactions, or guild politics</span>
				</li>
			</ul>
			<div class="mt-3 pt-3 border-t border-surface-600">
				<p class="text-xs text-surface-500">
					<span class="font-semibold">Tip:</span> Good subskills are specific enough to not apply to everything,
					but broad enough to be useful in multiple situations. They should tell a story about your character.
				</p>
			</div>
		</div>
	</div>
</WizardStep>
