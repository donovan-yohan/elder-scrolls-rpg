<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton'
	import type { PlayerData, Equipment } from '$lib/models/player'
	import type { AvailableAction } from '$lib/models/combatAction'
	import { combatStore, getCombatSessionStore } from '$lib/stores/combat.store'
	import { getAvailableActions } from '$lib/util/combat.util'
	import CombatHeader from './CombatHeader.svelte'
	import ResourceBars from './ResourceBars.svelte'
	import InitiativeTracker from './InitiativeTracker.svelte'
	import ConditionTracker from './ConditionTracker.svelte'
	import CombatLog from './CombatLog.svelte'
	import ActionsPanel, { type ActionType as ActionsPanelActionType } from './ActionsPanel.svelte'
	import DiceRoller from './DiceRoller/DiceRoller.svelte'
	import EnterCombatModal from './modals/EnterCombatModal.svelte'
	import EndCombatModal from './modals/EndCombatModal.svelte'
	import AttackResolverModal from './modals/AttackResolverModal.svelte'
	import SpellResolverModal from './modals/SpellResolverModal.svelte'
	import MoveModal from './modals/MoveModal.svelte'
	import SwapWeaponModal from './modals/SwapWeaponModal.svelte'
	import { ActionType } from '$lib/models/combat'

	interface Props {
		player: PlayerData
		onCombatEnded?: (data: { health: number; magicka: number; equipment: Equipment }) => void
	}

	let { player, onCombatEnded }: Props = $props()

	const modalStore = getModalStore()

	// Subscribe to combat session for this player
	let sessionStore = $derived(getCombatSessionStore(player.id))
	let session = $derived($sessionStore)

	// Compute available actions based on current state
	let availableActions = $derived(session ? getAvailableActions(player, session) : [])

	// Modal states
	let showEnterCombatModal = $state(false)
	let showEndCombatModal = $state(false)
	let showAttackResolver = $state(false)
	let showSpellResolver = $state(false)
	let selectedAction = $state<AvailableAction | null>(null)
	let activeModal = $state<ActionsPanelActionType | null>(null)

	// Handle ActionsPanel action selection
	function handleActionSelect(action: ActionsPanelActionType) {
		activeModal = action
	}

	function handleCloseModal() {
		activeModal = null
	}

	function handleMove(apCost: number) {
		combatStore.spendAP(player.id, apCost)
		activeModal = null
	}

	function handleSwapWeapon(data: { weaponId: string; materialId: string | null; slot: 'weapon' | 'offhand' }) {
		combatStore.swapWeapon(player.id, data)
		activeModal = null
	}

	// Handle entering combat
	function handleEnterCombat() {
		showEnterCombatModal = true
	}

	function handleCombatStarted(event: CustomEvent<{ partyInit: number; enemyInit: number }>) {
		const { partyInit, enemyInit } = event.detail
		combatStore.startCombat(
			player.id,
			partyInit,
			enemyInit,
			{
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: player.maxActionPoints,
			}
		)
		showEnterCombatModal = false
	}

	// Handle ending combat
	function handleEndCombat() {
		showEndCombatModal = true
	}

	function handleCombatEnded() {
		const finalState = combatStore.endCombat(player.id)
		showEndCombatModal = false

		if (finalState && onCombatEnded) {
			onCombatEnded(finalState)
		}
	}

	// Handle turn management
	function handleEndTurn() {
		combatStore.endPlayerTurn(player.id, player)
	}

	function handleStartTurn() {
		combatStore.startPlayerTurn(player.id, player)
	}

	// Handle action selection
	function handleSelectAction(action: AvailableAction) {
		selectedAction = action

		if (action.type === ActionType.Attack) {
			showAttackResolver = true
		} else if (action.type === ActionType.CastSpell) {
			showSpellResolver = true
		} else if (action.type === ActionType.Move) {
			// Handle movement directly
			combatStore.spendAP(player.id, action.apCost)
			// The distance change would need to be handled separately
			selectedAction = null
		} else if (action.type === ActionType.Dodge || action.type === ActionType.Block) {
			// Handle reactions
			combatStore.spendInitiative(player.id, action.initiativeCost ?? 1)
			selectedAction = null
		} else {
			// Handle utility actions
			combatStore.spendAP(player.id, action.apCost)
			selectedAction = null
		}
	}

	// Handle attack resolution
	function handleAttackComplete(event: CustomEvent<{ damage: number }>) {
		if (selectedAction) {
			combatStore.spendAP(player.id, selectedAction.apCost)
		}
		showAttackResolver = false
		selectedAction = null
	}

	// Handle spell resolution
	function handleSpellComplete(event: CustomEvent<{ mpSpent: number }>) {
		if (selectedAction) {
			combatStore.spendAP(player.id, selectedAction.apCost)
			combatStore.spendMP(player.id, event.detail.mpSpent)
		}
		showSpellResolver = false
		selectedAction = null
	}

	// Handle resource adjustments
	function handleAdjustHP(amount: number) {
		if (amount > 0) {
			combatStore.heal(player.id, amount, player.maxHealth)
		} else {
			combatStore.takeDamage(player.id, Math.abs(amount))
		}
	}

	function handleAdjustMP(amount: number) {
		if (session) {
			// Direct MP adjustment
			if (amount < 0) {
				combatStore.spendMP(player.id, Math.abs(amount))
			}
			// For positive adjustment, we'd need a separate method or direct store update
		}
	}

	function handleAdjustAP(amount: number) {
		if (session && amount < 0) {
			combatStore.spendAP(player.id, Math.abs(amount))
		}
	}

	// Handle condition removal
	function handleRemoveCondition(condition: { type: string }) {
		combatStore.removeCondition(player.id, condition.type)
	}

	// Handle quick roll (for generic d20 rolls)
	function handleQuickRoll(roll: import('$lib/models/combat').DiceRoll, success: boolean, margin: number) {
		// Could log the roll or display it
		console.log('Quick roll:', roll.total, success ? 'success' : 'fail')
	}
</script>

<div class="combat-mode">
	{#if !session}
		<!-- Not in combat - show enter combat button -->
		<div class="card p-8 text-center">
			<h2 class="h2 mb-4">Enter Combat</h2>
			<p class="text-surface-600-300-token mb-6">
				Ready to begin combat? You'll roll for initiative and start tracking actions.
			</p>
			<button
				type="button"
				class="btn variant-filled-primary btn-lg"
				on:click={handleEnterCombat}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Enter Combat
			</button>
		</div>
	{:else}
		<!-- In combat - show full combat interface -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- Left Column: Resources & Status -->
			<div class="space-y-4">
				<CombatHeader
					{session}
					onEndTurn={handleEndTurn}
					onStartTurn={handleStartTurn}
					onEndCombat={handleEndCombat}
				/>

				<ResourceBars
					{session}
					maxHP={player.maxHealth}
					maxMP={player.maxMagicka}
					onAdjustHP={handleAdjustHP}
					onAdjustMP={handleAdjustMP}
					onAdjustAP={handleAdjustAP}
				/>

				<InitiativeTracker
					partyPool={session.partyInitiativePool}
					enemyPool={session.enemyInitiativePool}
					onAdjustParty={(delta) => {
						if (delta > 0) {
							combatStore.gainInitiative(player.id, delta)
						} else {
							combatStore.spendInitiative(player.id, Math.abs(delta))
						}
					}}
					onAdjustEnemy={(delta) => combatStore.adjustEnemyInitiative(player.id, delta)}
				/>

				<div class="card p-4">
					<h3 class="h4 mb-3">Conditions</h3>
					<ConditionTracker
						conditions={session.conditions}
						onRemove={handleRemoveCondition}
					/>
				</div>
			</div>

			<!-- Center Column: Actions -->
			<div class="space-y-4">
				<ActionsPanel
					currentAP={session.currentAP}
					currentMP={session.currentMP}
					currentInitiative={session.partyInitiativePool.current}
					hasHeftedShield={false}
					onActionSelect={handleActionSelect}
				/>

				<div class="card p-4">
					<h3 class="h4 mb-3">Quick Roll</h3>
					<DiceRoller
						onRoll={handleQuickRoll}
						playerLevel={player.level}
						label="Roll d20"
					/>
				</div>
			</div>

			<!-- Right Column: Combat Log -->
			<div class="space-y-4">
				<CombatLog log={session.log} />
			</div>
		</div>
	{/if}

	<!-- Modals -->
	{#if showEnterCombatModal}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<EnterCombatModal
				{player}
				on:start={handleCombatStarted}
				on:cancel={() => showEnterCombatModal = false}
			/>
		</div>
	{/if}

	{#if showEndCombatModal}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<EndCombatModal
				on:confirm={handleCombatEnded}
				on:cancel={() => showEndCombatModal = false}
			/>
		</div>
	{/if}

	{#if showAttackResolver && selectedAction}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<AttackResolverModal
				{player}
				action={selectedAction}
				on:complete={handleAttackComplete}
				on:cancel={() => { showAttackResolver = false; selectedAction = null; }}
			/>
		</div>
	{/if}

	{#if showSpellResolver && selectedAction}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<SpellResolverModal
				{player}
				action={selectedAction}
				on:complete={handleSpellComplete}
				on:cancel={() => { showSpellResolver = false; selectedAction = null; }}
			/>
		</div>
	{/if}

	<!-- ActionsPanel modals -->
	{#if session}
		<MoveModal
			isOpen={activeModal === 'move'}
			currentAP={session.currentAP}
			onMove={handleMove}
			onClose={handleCloseModal}
		/>

		<SwapWeaponModal
			isOpen={activeModal === 'swapWeapon'}
			ownedWeapons={player.ownedWeapons}
			currentEquipment={session.combatEquipment}
			currentAP={session.currentAP}
			onSwap={handleSwapWeapon}
			onClose={handleCloseModal}
		/>
	{/if}
</div>
