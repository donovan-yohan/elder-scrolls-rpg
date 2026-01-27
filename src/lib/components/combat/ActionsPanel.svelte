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
		hasShieldEquipped: boolean
		onActionSelect: (action: ActionType) => void
	}

	let { currentAP, currentMP, currentInitiative, hasHeftedShield, hasShieldEquipped, onActionSelect }: Props = $props()

	// Action definitions
	const movementActions = [
		{ id: 'move' as const, name: 'Move', cost: '1-3 AP', icon: 'boot', minAP: 1 },
		{ id: 'swapWeapon' as const, name: 'Swap Weapon', cost: '1 AP', icon: 'sword', minAP: 1 },
		{ id: 'heftShield' as const, name: 'Heft Shield', cost: '0-3 AP', icon: 'shield', minAP: 0, requiresShield: true },
		{ id: 'useItem' as const, name: 'Use Item', cost: '1 AP', icon: 'pouch', minAP: 1 }
	]

	const offensiveActions = [
		{ id: 'attack' as const, name: 'Attack', cost: 'Varies', icon: 'sword', minAP: 1 },
		{ id: 'castSpell' as const, name: 'Cast Spell', cost: 'Varies', icon: 'magic', minAP: 1 },
		{ id: 'focusAttack' as const, name: 'Focus Attack', cost: '1 AP', icon: 'crosshair', minAP: 1 }
	]

	const defensiveActions = [
		{ id: 'block' as const, name: 'Block', cost: '1 Init', icon: 'shield', minInit: 1, requiresShield: true },
		{ id: 'dodge' as const, name: 'Dodge', cost: '1 Init', icon: 'running', minInit: 1 },
		{ id: 'focusSpell' as const, name: 'Focus Spell', cost: '1 AP', icon: 'aura', minAP: 1 }
	]

	function isDisabled(action: { minAP?: number; minInit?: number; requiresShield?: boolean }): boolean {
		if (action.minAP !== undefined && currentAP < action.minAP) return true
		if (action.minInit !== undefined && currentInitiative < action.minInit) return true
		if (action.requiresShield && !hasShieldEquipped) return true
		return false
	}
</script>

<div class="card p-4">
	<div class="grid grid-cols-3 gap-6">
		<!-- Movement & Utility Column -->
		<div class="flex flex-col gap-3">
			<h3 class="font-bold text-primary-500 text-center border-b border-primary-500/30 pb-2 h-12 flex items-center justify-center">
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
			<h3 class="font-bold text-error-500 text-center border-b border-error-500/30 pb-2 h-12 flex items-center justify-center">
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
			<h3 class="font-bold text-success-500 text-center border-b border-success-500/30 pb-2 h-12 flex items-center justify-center">
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
</div>
