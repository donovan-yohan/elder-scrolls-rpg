<script lang="ts">
	import type { SubSkill } from '$lib/models/subskill'
	import { getSubskillBonus } from '$lib/util/stats.util'

	let {
		subSkills,
		playerLevel,
		selectedSubskill = $bindable(null),
	}: {
		subSkills: SubSkill[]
		playerLevel: number
		selectedSubskill: SubSkill | null
	} = $props()

	let bonus = $derived(getSubskillBonus(playerLevel))

	function toggleSubskill(subskill: SubSkill) {
		selectedSubskill = selectedSubskill === subskill ? null : subskill
	}

	function clearSelection() {
		selectedSubskill = null
	}
</script>

{#if subSkills.length > 0}
	<div class="subskill-picker">
		<div class="text-xs text-surface-400 mb-2 text-center">
			Invoke a trait for +{bonus} bonus (if GM agrees it applies)
		</div>
		<div class="flex flex-wrap gap-2 justify-center">
			<!-- None option -->
			<button
				type="button"
				class="chip {selectedSubskill === null ? 'variant-filled-surface' : 'variant-soft-surface'}"
				onclick={clearSelection}
			>
				None
			</button>

			<!-- Subskill options -->
			{#each subSkills as subskill (subskill.name)}
				<button
					type="button"
					class="chip {selectedSubskill === subskill ? 'variant-filled-primary' : 'variant-soft-primary'}"
					onclick={() => toggleSubskill(subskill)}
					title={subskill.description || subskill.name}
				>
					{subskill.name}
					{#if selectedSubskill === subskill}
						<span class="ml-1 text-xs font-bold">+{bonus}</span>
					{/if}
				</button>
			{/each}
		</div>

		{#if selectedSubskill}
			<div class="mt-2 text-center text-sm text-primary-400">
				Using "{selectedSubskill.name}" (+{bonus})
			</div>
			{#if selectedSubskill.description}
				<div class="mt-1 text-center text-xs text-surface-400 italic">
					{selectedSubskill.description}
				</div>
			{/if}
		{/if}
	</div>
{/if}
