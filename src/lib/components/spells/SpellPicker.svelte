<script lang="ts">
	import { getSpellsBySchool, SpellSchool, getSpellLevelColor } from '$lib/data/spells'

	interface Props {
		knownSpells: string[]
		onchange: (spells: string[]) => void
	}

	let { knownSpells, onchange }: Props = $props()

	const schools: SpellSchool[] = [
		SpellSchool.Alteration,
		SpellSchool.Conjuration,
		SpellSchool.Destruction,
		SpellSchool.Illusion,
		SpellSchool.Mysticism,
		SpellSchool.Restoration,
	]

	function toggleSpell(spellId: string) {
		if (knownSpells.includes(spellId)) {
			onchange(knownSpells.filter(id => id !== spellId))
		} else {
			onchange([...knownSpells, spellId])
		}
	}

</script>

<div class="spell-picker">
	<div class="flex items-center justify-between mb-4">
		<p class="text-sm text-surface-400">
			Select spells your character knows. Click on a spell to add or remove it.
		</p>
		<span class="badge variant-soft-tertiary">
			{knownSpells.length} spell{knownSpells.length !== 1 ? 's' : ''} selected
		</span>
	</div>

	<div class="space-y-2">
		{#each schools as school}
			{@const schoolSpells = getSpellsBySchool(school)}
			{#if schoolSpells.length > 0}
				{@const selectedInSchool = schoolSpells.filter(s => knownSpells.includes(s.id)).length}
				<details class="card variant-ghost-surface" open>
					<summary class="p-3 cursor-pointer hover:bg-surface-500/10 rounded-t flex items-center justify-between">
						<span class="font-semibold">{school}</span>
						{#if selectedInSchool > 0}
							<span class="badge variant-filled-tertiary text-xs">{selectedInSchool}</span>
						{/if}
					</summary>
					<div class="p-3 pt-0 space-y-2">
						{#each schoolSpells as spell}
							{@const isSelected = knownSpells.includes(spell.id)}
							<button
								type="button"
								class="w-full card p-3 text-left transition-all {isSelected ? 'ring-2 ring-tertiary-500 bg-tertiary-500/10' : 'hover:bg-surface-600/50'}"
								onclick={() => toggleSpell(spell.id)}
							>
								<div class="flex items-start justify-between gap-2">
									<div class="flex-1">
										<div class="flex items-center gap-2 flex-wrap">
											<span class="font-medium">{spell.name}</span>
											<span class="badge {getSpellLevelColor(spell.level)} text-xs">{spell.level}</span>
											{#if spell.isConcentration}
												<span class="badge variant-soft-warning text-xs">Concentration</span>
											{/if}
											{#if spell.isReaction}
												<span class="badge variant-soft-error text-xs">Reaction</span>
											{/if}
										</div>
										<div class="flex gap-2 mt-1 text-xs">
											<span class="badge variant-soft-success">{spell.apCost} AP</span>
											<span class="badge variant-soft-primary">{spell.mpCost} MP</span>
											<span class="badge variant-soft">{spell.range}</span>
										</div>
										<p class="text-xs text-surface-400 mt-2 line-clamp-2">{spell.description}</p>
									</div>
									<div
										class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 {isSelected ? 'border-tertiary-500 bg-tertiary-500' : 'border-surface-500'}"
									>
										{#if isSelected}
											<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</div>
								</div>
							</button>
						{/each}
					</div>
				</details>
			{/if}
		{/each}
	</div>
</div>
