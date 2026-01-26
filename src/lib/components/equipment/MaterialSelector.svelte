<script lang="ts">
	import { Materials, type Material } from '$lib/data/materials'

	interface Props {
		selectedMaterialId: string | null
		onSelect: (materialId: string | null) => void
		excludeArmorOnly?: boolean
		disabled?: boolean
	}

	let { selectedMaterialId, onSelect, excludeArmorOnly = false, disabled = false }: Props = $props()

	// Filter materials based on excludeArmorOnly
	let availableMaterials = $derived(
		excludeArmorOnly ? Materials.filter((m) => !m.isArmorOnly) : Materials
	)

	// Get selected material
	let selectedMaterial = $derived(
		selectedMaterialId ? Materials.find((m) => m.id === selectedMaterialId) : null
	)

	// Group materials by tier
	let materialsByTier = $derived.by(() => {
		const grouped: Record<number, Material[]> = {}
		for (const material of availableMaterials) {
			if (!grouped[material.tier]) {
				grouped[material.tier] = []
			}
			grouped[material.tier]!.push(material)
		}
		return grouped
	})

	function getTierLabel(tier: number): string {
		switch (tier) {
			case 1:
				return 'Novice'
			case 2:
				return 'Apprentice'
			case 3:
				return 'Adept'
			case 4:
				return 'Expert'
			case 5:
				return 'Master'
			default:
				return `Tier ${tier}`
		}
	}

	function handleSelect(materialId: string | null) {
		if (!disabled) {
			onSelect(materialId)
		}
	}

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement
		const value = target.value === '' ? null : target.value
		handleSelect(value)
	}
</script>

<div class="material-selector">
	<label class="label">
		<span class="label-text">Material</span>
		<select
			class="select"
			value={selectedMaterialId ?? ''}
			onchange={handleChange}
			{disabled}
		>
			<option value="">No Material (Base)</option>
			{#each Object.entries(materialsByTier).sort(([a], [b]) => Number(a) - Number(b)) as [tier, materials]}
				<optgroup label={getTierLabel(Number(tier))}>
					{#each materials as material (material.id)}
						<option value={material.id}>
							{material.name} ({material.valueMultiplier}x value, {material.weightMultiplier}x weight)
						</option>
					{/each}
				</optgroup>
			{/each}
		</select>
	</label>

	{#if selectedMaterial && selectedMaterial.specialProperties.length > 0}
		<div class="card p-2 variant-soft-warning text-sm mt-2">
			<p class="font-semibold mb-1">Special Properties:</p>
			<ul class="list-disc list-inside space-y-1">
				{#each selectedMaterial.specialProperties as property (property.name)}
					<li>
						<span class="font-bold">{property.name}</span>: {property.description}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
