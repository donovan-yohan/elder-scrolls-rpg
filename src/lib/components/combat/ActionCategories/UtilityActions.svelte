<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { CombatSession } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import { ActionType } from '$lib/models/combat'

	export let player: PlayerData
	export let session: CombatSession
	export let availableActions: AvailableAction[]
	export let onSelectAction: (action: AvailableAction) => void

	$: utilityActions = availableActions.filter(a =>
		a.type === ActionType.SwapWeapon ||
		a.type === ActionType.Heft ||
		a.type === ActionType.Limber ||
		a.type === ActionType.Resteady ||
		a.type === ActionType.UseItem
	)
</script>

<div class="utility-actions space-y-2">
	{#if utilityActions.length === 0}
		<p class="text-surface-500 text-sm italic">No utility actions available</p>
	{:else}
		{#each utilityActions as action}
			<button
				type="button"
				class="btn w-full justify-between {action.isAvailable ? 'variant-soft-surface' : 'variant-ghost-surface opacity-50'}"
				disabled={!action.isAvailable}
				on:click={() => onSelectAction(action)}
			>
				<span>{action.name}</span>
				<span class="badge variant-filled-warning">{action.apCost} AP</span>
			</button>
			{#if action.description}
				<p class="text-xs opacity-75 ml-2">{action.description}</p>
			{/if}
		{/each}
	{/if}
</div>
