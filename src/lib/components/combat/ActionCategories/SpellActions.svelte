<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { CombatSession } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import { ActionType } from '$lib/models/combat'

	export let player: PlayerData
	export let session: CombatSession
	export let availableActions: AvailableAction[]
	export let onSelectAction: (action: AvailableAction) => void

	$: spellActions = availableActions.filter(a => a.type === ActionType.CastSpell)
</script>

<div class="spell-actions space-y-2 max-h-64 overflow-y-auto">
	{#if spellActions.length === 0}
		<p class="text-surface-500 text-sm italic">No spells known</p>
	{:else}
		{#each spellActions as action}
			<button
				type="button"
				class="btn w-full justify-between text-left {action.isAvailable ? 'variant-soft-tertiary' : 'variant-ghost-surface opacity-50'}"
				disabled={!action.isAvailable}
				on:click={() => onSelectAction(action)}
			>
				<span class="truncate">{action.name}</span>
				<span class="flex gap-1 shrink-0">
					<span class="badge variant-filled-warning">{action.apCost} AP</span>
					{#if action.mpCost}
						<span class="badge variant-filled-tertiary">{action.mpCost} MP</span>
					{/if}
				</span>
			</button>
			{#if !action.isAvailable && action.unavailableReason}
				<p class="text-xs text-error-500 ml-2">{action.unavailableReason}</p>
			{/if}
		{/each}
	{/if}
</div>
