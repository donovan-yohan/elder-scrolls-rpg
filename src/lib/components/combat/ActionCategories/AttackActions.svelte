<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { CombatSession } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import { ActionType } from '$lib/models/combat'
	import { getWeaponById } from '$lib/data/weapons'

	export let player: PlayerData
	export let session: CombatSession
	export let availableActions: AvailableAction[]
	export let onSelectAction: (action: AvailableAction) => void

	$: attackActions = availableActions.filter(a => a.type === ActionType.Attack)
</script>

<div class="attack-actions space-y-2">
	{#if attackActions.length === 0}
		<p class="text-surface-500 text-sm italic">No weapons equipped</p>
	{:else}
		{#each attackActions as action}
			<button
				type="button"
				class="btn w-full justify-between {action.isAvailable ? 'variant-soft-primary' : 'variant-ghost-surface opacity-50'}"
				disabled={!action.isAvailable}
				on:click={() => onSelectAction(action)}
			>
				<span>{action.name}</span>
				<span class="badge variant-filled-warning">{action.apCost} AP</span>
			</button>
			{#if !action.isAvailable && action.unavailableReason}
				<p class="text-xs text-error-500 ml-2">{action.unavailableReason}</p>
			{/if}
		{/each}
	{/if}
</div>
