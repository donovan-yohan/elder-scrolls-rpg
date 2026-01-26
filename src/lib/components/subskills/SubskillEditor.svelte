<script lang="ts">
	import type { SubSkill } from '$lib/models/subskill'
	import { getSubskillBonus, getSubskillSlots } from '$lib/util/stats.util'

	let {
		subSkills = $bindable([]),
		playerLevel,
		readonly = false,
	}: {
		subSkills: SubSkill[]
		playerLevel: number
		readonly?: boolean
	} = $props()

	let maxSlots = $derived(getSubskillSlots(playerLevel))
	let bonus = $derived(getSubskillBonus(playerLevel))
	let canAdd = $derived(subSkills.length < maxSlots)

	function addSubskill() {
		if (!canAdd || readonly) return
		subSkills = [...subSkills, { name: '', description: '' }]
	}

	function removeSubskill(index: number) {
		if (readonly) return
		subSkills = subSkills.filter((_, i) => i !== index)
	}

	function updateSubskill(index: number, field: keyof SubSkill, value: string) {
		if (readonly) return
		subSkills = subSkills.map((s, i) => (i === index ? { ...s, [field]: value } : s))
	}
</script>

<div class="flex flex-col gap-4">
	<!-- Slot and Bonus Summary -->
	<div class="flex gap-4 p-4 bg-surface-700 rounded-lg">
		<div class="flex-1 text-center">
			<span class="block text-2xl font-bold text-primary-400">{subSkills.length}/{maxSlots}</span>
			<span class="text-sm text-surface-400">Subskill Slots</span>
		</div>
		<div class="flex-1 text-center">
			<span class="block text-2xl font-bold text-success-400">+{bonus}</span>
			<span class="text-sm text-surface-400">Bonus When Invoked</span>
		</div>
	</div>

	<!-- Existing Subskills -->
	{#each subSkills as subskill, index (index)}
		<div class="flex flex-col gap-2 p-4 bg-surface-800 rounded-lg border border-surface-600">
			<div class="flex items-start gap-3">
				<div class="flex-1 flex flex-col gap-2">
					<input
						class="input"
						type="text"
						placeholder="Subskill name (e.g., 'Fastidious Farmer')"
						value={subskill.name}
						oninput={(e) => updateSubskill(index, 'name', e.currentTarget.value)}
						disabled={readonly}
					/>
					<textarea
						class="textarea"
						rows="2"
						placeholder="When does this subskill apply? (e.g., 'When working with crops, farm animals, or agricultural tools')"
						value={subskill.description}
						oninput={(e) => updateSubskill(index, 'description', e.currentTarget.value)}
						disabled={readonly}
					></textarea>
				</div>
				{#if !readonly}
					<button
						type="button"
						class="btn-icon btn-icon-sm variant-soft-error"
						title="Remove subskill"
						onclick={() => removeSubskill(index)}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				{/if}
			</div>
			{#if subskill.name.trim() === ''}
				<span class="text-warning-400 text-xs">Subskill name is required</span>
			{/if}
		</div>
	{/each}

	<!-- Add Subskill Button -->
	{#if !readonly}
		{#if canAdd}
			<button
				type="button"
				class="btn variant-soft-primary w-full"
				onclick={addSubskill}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
				<span>Add Subskill</span>
			</button>
		{:else}
			<p class="text-center text-surface-500 text-sm py-2">
				Maximum subskill slots reached ({maxSlots} at level {playerLevel})
			</p>
		{/if}
	{/if}

	<!-- Empty State -->
	{#if subSkills.length === 0 && !readonly}
		<p class="text-center text-surface-400 text-sm italic py-2">
			No subskills created yet. Click "Add Subskill" to create one.
		</p>
	{/if}
</div>
