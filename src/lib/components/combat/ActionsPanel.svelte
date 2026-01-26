<script lang="ts">
	import ActionTile from './ActionTile.svelte'

	export type ActionType =
		| 'move' | 'swapWeapon' | 'heftShield' | 'useItem'
		| 'attack' | 'castSpell' | 'focusAttack'
		| 'block' | 'dodge' | 'focusSpell'

	interface Props {
		currentAP: number
		currentMP: number
		currentInitiative: number
		hasHeftedShield: boolean
		onActionSelect: (action: ActionType) => void
	}

	let { currentAP, currentMP, currentInitiative, hasHeftedShield, onActionSelect }: Props = $props()

	// Action definitions
	const movementActions = [
		{ id: 'move' as const, name: 'Move', cost: '1-3 AP', icon: 'boot', minAP: 1 },
		{ id: 'swapWeapon' as const, name: 'Swap Weapon', cost: '1 AP', icon: 'sword', minAP: 1 },
		{ id: 'heftShield' as const, name: 'Heft Shield', cost: '0-3 AP', icon: 'shield', minAP: 0 },
		{ id: 'useItem' as const, name: 'Use Item', cost: '1 AP', icon: 'pouch', minAP: 1 }
	]

	const offensiveActions = [
		{ id: 'attack' as const, name: 'Attack', cost: 'Varies', icon: 'sword', minAP: 1 },
		{ id: 'castSpell' as const, name: 'Cast Spell', cost: 'Varies', icon: 'magic', minAP: 1 },
		{ id: 'focusAttack' as const, name: 'Focus Attack', cost: '1 AP', icon: 'crosshair', minAP: 1 }
	]

	const defensiveActions = [
		{ id: 'block' as const, name: 'Block', cost: '1 Init', icon: 'shield', minInit: 1 },
		{ id: 'dodge' as const, name: 'Dodge', cost: '1 Init', icon: 'running', minInit: 1 },
		{ id: 'focusSpell' as const, name: 'Focus Spell', cost: '1 AP', icon: 'aura', minAP: 1 }
	]

	function isDisabled(action: { minAP?: number; minInit?: number }): boolean {
		if (action.minAP !== undefined && currentAP < action.minAP) return true
		if (action.minInit !== undefined && currentInitiative < action.minInit) return true
		return false
	}
</script>

<div class="actions-panel grid grid-cols-3 gap-4 p-4">
	<!-- Movement & Utility Column -->
	<div class="flex flex-col gap-3">
		<h3 class="font-bold text-primary-500 text-center border-b border-primary-500/30 pb-2">
			Movement & Utility
		</h3>
		<div class="flex flex-col gap-2">
			{#each movementActions as action}
				<ActionTile
					name={action.name}
					cost={action.cost}
					icon={action.icon}
					color="primary"
					disabled={isDisabled(action)}
					onclick={() => onActionSelect(action.id)}
				/>
			{/each}
		</div>
	</div>

	<!-- Offensive Column -->
	<div class="flex flex-col gap-3">
		<h3 class="font-bold text-error-500 text-center border-b border-error-500/30 pb-2">
			Offensive
		</h3>
		<div class="flex flex-col gap-2">
			{#each offensiveActions as action}
				<ActionTile
					name={action.name}
					cost={action.cost}
					icon={action.icon}
					color="error"
					disabled={isDisabled(action)}
					onclick={() => onActionSelect(action.id)}
				/>
			{/each}
		</div>
	</div>

	<!-- Defensive Column -->
	<div class="flex flex-col gap-3">
		<h3 class="font-bold text-success-500 text-center border-b border-success-500/30 pb-2">
			Defensive
		</h3>
		<div class="flex flex-col gap-2">
			{#each defensiveActions as action}
				<ActionTile
					name={action.name}
					cost={action.cost}
					icon={action.icon}
					color="success"
					disabled={isDisabled(action)}
					onclick={() => onActionSelect(action.id)}
				/>
			{/each}
		</div>
	</div>
</div>
