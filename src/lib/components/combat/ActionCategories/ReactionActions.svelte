<script lang="ts">
	import type { CombatSession } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import { ActionType } from '$lib/models/combat'

	export let session: CombatSession
	export let availableActions: AvailableAction[]
	export let onSelectAction: (action: AvailableAction) => void

	$: reactionActions = availableActions.filter(a =>
		a.type === ActionType.Dodge || a.type === ActionType.Block
	)
</script>

<div class="reaction-actions space-y-2">
	<p class="text-xs text-center opacity-75 mb-3">
		Reactions cost Initiative instead of AP
	</p>

	{#each reactionActions as action}
		<button
			type="button"
			class="btn w-full justify-between {action.isAvailable ? 'variant-soft-warning' : 'variant-ghost-surface opacity-50'}"
			disabled={!action.isAvailable}
			on:click={() => onSelectAction(action)}
		>
			<span>{action.name}</span>
			<span class="badge variant-filled-primary">{action.initiativeCost} Init</span>
		</button>
		{#if action.description}
			<p class="text-xs opacity-75 ml-2">{action.description}</p>
		{/if}
	{/each}
</div>
