<script lang="ts">
	import { TabGroup, Tab } from '@skeletonlabs/skeleton'
	import type { PlayerData } from '$lib/models/player'
	import type { CombatSession } from '$lib/models/combat'
	import { ActionType } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import AttackActions from './ActionCategories/AttackActions.svelte'
	import SpellActions from './ActionCategories/SpellActions.svelte'
	import MovementActions from './ActionCategories/MovementActions.svelte'
	import ReactionActions from './ActionCategories/ReactionActions.svelte'
	import UtilityActions from './ActionCategories/UtilityActions.svelte'

	export let player: PlayerData
	export let session: CombatSession
	export let availableActions: AvailableAction[]
	export let onSelectAction: (action: AvailableAction) => void

	let selectedTabIndex: number = 0

	// Count available actions per category
	$: attackCount = availableActions.filter(a => a.type === ActionType.Attack && a.isAvailable).length
	$: spellCount = availableActions.filter(a => a.type === ActionType.CastSpell && a.isAvailable).length
	$: movementCount = availableActions.filter(a => a.type === ActionType.Move && a.isAvailable).length
	$: reactionCount = availableActions.filter(a =>
		(a.type === ActionType.Dodge || a.type === ActionType.Block) && a.isAvailable
	).length
	$: utilityCount = availableActions.filter(a =>
		(a.type === ActionType.SwapWeapon || a.type === ActionType.Heft ||
		 a.type === ActionType.Limber || a.type === ActionType.Resteady ||
		 a.type === ActionType.UseItem) && a.isAvailable
	).length
</script>

<div class="action-panel card p-4">
	<h3 class="h4 mb-3">Actions</h3>

	<TabGroup>
		<Tab bind:group={selectedTabIndex} name="attacks" value={0}>
			<span class="flex items-center gap-2">
				<span>Attack</span>
				{#if attackCount > 0}
					<span class="badge variant-filled-primary text-xs">{attackCount}</span>
				{/if}
			</span>
		</Tab>
		<Tab bind:group={selectedTabIndex} name="spells" value={1}>
			<span class="flex items-center gap-2">
				<span>Spells</span>
				{#if spellCount > 0}
					<span class="badge variant-filled-tertiary text-xs">{spellCount}</span>
				{/if}
			</span>
		</Tab>
		<Tab bind:group={selectedTabIndex} name="movement" value={2}>
			<span class="flex items-center gap-2">
				<span>Move</span>
				{#if movementCount > 0}
					<span class="badge variant-filled-success text-xs">{movementCount}</span>
				{/if}
			</span>
		</Tab>
		<Tab bind:group={selectedTabIndex} name="reactions" value={3}>
			<span class="flex items-center gap-2">
				<span>React</span>
				{#if reactionCount > 0}
					<span class="badge variant-filled-warning text-xs">{reactionCount}</span>
				{/if}
			</span>
		</Tab>
		<Tab bind:group={selectedTabIndex} name="utility" value={4}>
			<span class="flex items-center gap-2">
				<span>Utility</span>
				{#if utilityCount > 0}
					<span class="badge variant-filled-surface text-xs">{utilityCount}</span>
				{/if}
			</span>
		</Tab>

		<svelte:fragment slot="panel">
			<div class="pt-4">
				{#if selectedTabIndex === 0}
					<AttackActions
						{player}
						{session}
						{availableActions}
						{onSelectAction}
					/>
				{/if}

				{#if selectedTabIndex === 1}
					<SpellActions
						{player}
						{session}
						{availableActions}
						{onSelectAction}
					/>
				{/if}

				{#if selectedTabIndex === 2}
					<MovementActions
						{session}
						{availableActions}
						{onSelectAction}
					/>
				{/if}

				{#if selectedTabIndex === 3}
					<ReactionActions
						{session}
						{availableActions}
						{onSelectAction}
					/>
				{/if}

				{#if selectedTabIndex === 4}
					<UtilityActions
						{player}
						{session}
						{availableActions}
						{onSelectAction}
					/>
				{/if}
			</div>
		</svelte:fragment>
	</TabGroup>
</div>
