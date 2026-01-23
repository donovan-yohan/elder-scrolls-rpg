<script lang="ts">
	import type { CombatSession } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import { ActionType } from '$lib/models/combat'

	export let session: CombatSession
	export let availableActions: AvailableAction[]
	export let onSelectAction: (action: AvailableAction) => void

	$: moveActions = availableActions.filter(a => a.type === ActionType.Move)
</script>

<div class="movement-actions space-y-2">
	<div class="text-center mb-3">
		<span class="text-sm opacity-75">Current Distance:</span>
		<span class="badge variant-filled-secondary ml-2">{session.distance}</span>
	</div>

	{#each moveActions as action}
		<button
			type="button"
			class="btn w-full justify-between {action.isAvailable ? 'variant-soft-secondary' : 'variant-ghost-surface opacity-50'}"
			disabled={!action.isAvailable}
			on:click={() => onSelectAction(action)}
		>
			<span>{action.name}</span>
			<span class="badge variant-filled-warning">{action.apCost} AP</span>
		</button>
	{/each}
</div>
