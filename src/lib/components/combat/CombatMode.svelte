<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton'
	import type { PlayerData, Equipment, Complication } from '$lib/models/player'
	import type { AvailableAction } from '$lib/models/combatAction'
	import { combatStore, getCombatSessionStore } from '$lib/stores/combat.store'
	import { getAvailableActions } from '$lib/util/combat.util'
	import { Weapons } from '$lib/data/weapons'
	import { calculateEffectiveMaxHealth, calculateEffectiveMaxMagicka, calculateEffectiveMaxAP } from '$lib/util/stats.util'
	import CombatHeader from './CombatHeader.svelte'
	import ResourceBars from './ResourceBars.svelte'
	import InitiativeTracker from './InitiativeTracker.svelte'
	import ConditionTracker from './ConditionTracker.svelte'
	import CombatLog from './CombatLog.svelte'
	import MisfortuneTracker from './MisfortuneTracker.svelte'
	import ActionsPanel, { type ActionType as ActionsPanelActionType } from './ActionsPanel.svelte'
	import DiceRoller from './DiceRoller/DiceRoller.svelte'
	import EnterCombatModal from './modals/EnterCombatModal.svelte'
	import EndCombatModal from './modals/EndCombatModal.svelte'
	import AttackResolverModal from './modals/AttackResolverModal.svelte'
	import SpellResolverModal from './modals/SpellResolverModal.svelte'
	import MoveModal from './modals/MoveModal.svelte'
	import SwapWeaponModal from './modals/SwapWeaponModal.svelte'
	import HeftShieldModal from './modals/HeftShieldModal.svelte'
	import FocusAttackModal from './modals/FocusAttackModal.svelte'
	import FocusSpellModal from './modals/FocusSpellModal.svelte'
	import DodgeModal from './modals/DodgeModal.svelte'
	import BlockModal from './modals/BlockModal.svelte'
	import UseItemModal from './modals/UseItemModal.svelte'
	import TakeDamageModal from './modals/TakeDamageModal.svelte'
	import SpiritRecoveryModal from './modals/SpiritRecoveryModal.svelte'
	import ComplicationRollModal from './modals/ComplicationRollModal.svelte'
	import SpiritPointsTracker from './SpiritPointsTracker.svelte'
	import ComplicationsDisplay from './ComplicationsDisplay.svelte'
	import FortuneDisplay from './FortuneDisplay.svelte'
	import FortuneChoiceModal from './modals/FortuneChoiceModal.svelte'
	import MisfortuneChoiceModal from './modals/MisfortuneChoiceModal.svelte'
	import UseFortuneModal from './modals/UseFortuneModal.svelte'
	import { ActionType, ConditionType } from '$lib/models/combat'
	import type { DiceRoll } from '$lib/models/combat'
	import { DamageType } from '$lib/data/element'
	import type { MagickaBurstCost } from '$lib/util/magicka-burst.util'

	interface Props {
		player: PlayerData
		onCombatEnded?: (data: {
			health: number
			magicka: number
			equipment: Equipment
			fortunePoints: number
			misfortunePoints: number
		}) => void
		onPlayerUpdate?: (player: PlayerData) => void
	}

	let { player, onCombatEnded, onPlayerUpdate }: Props = $props()

	const modalStore = getModalStore()

	// Subscribe to combat session for this player
	let sessionStore = $derived(getCombatSessionStore(player.id))
	let session = $derived($sessionStore)

	// Compute available actions based on current state
	let availableActions = $derived(session ? getAvailableActions(player, session) : [])

	// Check if player has a shield equipped in offhand
	let hasShieldEquipped = $derived(() => {
		const offhandId = session?.combatEquipment?.offhand?.id ?? player.equipment?.offhand?.id
		if (!offhandId) return false
		const weapon = Weapons[offhandId]
		return weapon?.isShield ?? false
	})

	// Effective max stats after complications
	let effectiveMaxHP = $derived(calculateEffectiveMaxHealth(player))
	let effectiveMaxMP = $derived(calculateEffectiveMaxMagicka(player))
	let effectiveMaxAP = $derived(calculateEffectiveMaxAP(player))

	// Modal states
	let showEnterCombatModal = $state(false)
	let showEndCombatModal = $state(false)
	let showAttackResolver = $state(false)
	let showSpellResolver = $state(false)
	let showSpiritRecoveryModal = $state(false)
	let selectedAction = $state<AvailableAction | null>(null)
	let activeModal = $state<ActionsPanelActionType | null>(null)

	// Complication modal state
	let showComplicationModal = $state(false)
	let pendingDamageAmount = $state(0)

	// Turn-based state (reset at turn end)
	let hasHeftedShield = $state(false)
	let hasFocusedAttack = $state(false)
	let hasFocusedSpell = $state(false)

	// Take damage modal state
	let showTakeDamageModal = $state(false)

	// Fortune/Misfortune modal state
	let showFortuneChoice = $state(false)
	let showMisfortuneChoice = $state(false)
	let showUseFortuneModal = $state(false)
	let pendingRoll = $state<{
		roll: DiceRoll
		targetDC?: number
		rollType: string
		onComplete: (roll: DiceRoll, success: boolean, usedFortune: boolean) => void
	} | null>(null)

	// Handle ActionsPanel action selection
	function handleActionSelect(action: ActionsPanelActionType) {
		if (action === 'attack') {
			// Create a default attack action with equipped weapon
			const weaponId = session?.combatEquipment?.weapon?.id ?? player.equipment?.weapon?.id
			if (weaponId) {
				selectedAction = {
					type: ActionType.Attack,
					name: 'Attack',
					apCost: 2, // Default AP cost
					isAvailable: true,
					weaponId
				}
				showAttackResolver = true
			}
		} else if (action === 'castSpell') {
			// For now, open the spell resolver without a pre-selected spell
			// The modal could be updated to allow spell selection
			selectedAction = {
				type: ActionType.CastSpell,
				name: 'Cast Spell',
				apCost: 1,
				mpCost: 1,
				isAvailable: true
			}
			showSpellResolver = true
		} else {
			activeModal = action
		}
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

	function handleHeftShield(apCost: number) {
		combatStore.spendAP(player.id, apCost)
		hasHeftedShield = true
		activeModal = null
	}

	function handleFocusAttack(result: { success: boolean; isCritical: boolean }) {
		combatStore.spendAP(player.id, 1)
		if (result.success) {
			hasFocusedAttack = true
		}
		activeModal = null
	}

	function handleFocusSpell(result: { success: boolean; extraMPCost: number }) {
		combatStore.spendAP(player.id, 1)
		if (result.success) {
			hasFocusedSpell = true
			combatStore.spendMP(player.id, result.extraMPCost)
		}
		activeModal = null
	}

	function handleDodge(result: { success: boolean; damageReduction: 'full' | 'half' | 'none'; disoriented: boolean; storedMisfortune?: boolean }) {
		combatStore.spendInitiative(player.id, 1)

		// Handle stored misfortune
		if (result.storedMisfortune) {
			combatStore.addMisfortune(player.id, 1)
		}

		activeModal = null
	}

	function handleBlock(result: { success: boolean; damageReduction: 'full' | 'half' | 'minimal' | 'none' }) {
		combatStore.spendInitiative(player.id, 1)
		activeModal = null
	}

	function handleUseItem(itemId: string) {
		combatStore.spendAP(player.id, 1)
		// TODO: Apply item effects and remove from inventory
		activeModal = null
	}

	// Handle damage that might trigger spirit point usage
	function handlePotentialLethalDamage(damage: number) {
		if (!session) return

		if (combatStore.checkLethalDamage(player.id, damage)) {
			// Check if player has spirit points
			if (player.spiritPoints > 0) {
				pendingDamageAmount = damage
				showComplicationModal = true
			} else {
				// No spirit points - player is dying/unconscious
				combatStore.takeDamage(player.id, damage)
				// Could trigger unconscious state here
			}
		} else {
			combatStore.takeDamage(player.id, damage)
		}
	}

	// Handle complication roll completion
	function handleComplicationComplete(complication: Complication) {
		// Add complication to player
		if (onPlayerUpdate) {
			const newComplications = [...player.complications, complication]
			const newSpiritPoints = Math.max(0, player.spiritPoints - 1)

			onPlayerUpdate({
				...player,
				complications: newComplications,
				spiritPoints: newSpiritPoints,
				// Reset HP/MP/AP to new effective maximums
				health: calculateEffectiveMaxHealth({ ...player, complications: newComplications }),
				magicka: calculateEffectiveMaxMagicka({ ...player, complications: newComplications }),
				actionPoints: calculateEffectiveMaxAP({ ...player, complications: newComplications }),
			})
		}

		// Update combat session HP to new max
		if (session) {
			const newEffectiveMaxHP = calculateEffectiveMaxHealth({ ...player, complications: [...player.complications, complication] })
			// Reset combat HP to new max
			combatStore.heal(player.id, newEffectiveMaxHP, newEffectiveMaxHP)
		}

		showComplicationModal = false
		pendingDamageAmount = 0
	}

	function handleComplicationCancel() {
		// Player chose not to spend spirit point - apply the damage normally
		combatStore.takeDamage(player.id, pendingDamageAmount)
		showComplicationModal = false
		pendingDamageAmount = 0
	}

	// Handle healing a complication (outside combat, typically)
	function handleHealComplication(complicationId: string) {
		if (onPlayerUpdate) {
			onPlayerUpdate({
				...player,
				complications: player.complications.filter(c => c.id !== complicationId),
			})
		}
	}

	// Handle entering combat
	function handleEnterCombat() {
		showEnterCombatModal = true
	}

	function handleCombatStarted(detail: { partyInit: number; enemyInit: number }) {
		const { partyInit, enemyInit } = detail
		combatStore.startCombat(
			player.id,
			partyInit,
			enemyInit,
			{
				health: player.health,
				magicka: player.magicka,
				maxActionPoints: player.maxActionPoints,
				equipment: player.equipment,
				level: player.level,
				currentSpiritPoints: player.currentSpiritPoints,
				fortunePoints: player.fortunePoints,
				misfortunePoints: player.misfortunePoints,
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
		// Reset turn-based states
		hasHeftedShield = false
		hasFocusedAttack = false
		hasFocusedSpell = false
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
	function handleAttackComplete(result: { damage: number; isCritical: boolean; apCost: number }) {
		// Spend AP (full cost first)
		combatStore.spendAP(player.id, result.apCost)

		// On critical: refund half AP (rounded down) + add 1 party initiative
		if (result.isCritical) {
			const apRefund = Math.floor(result.apCost / 2)
			if (apRefund > 0) {
				// Refund AP by gaining it back
				combatStore.gainAP(player.id, apRefund)
			}
			combatStore.gainInitiative(player.id, 1)
		}

		showAttackResolver = false
		selectedAction = null
	}

	// Handle magicka burst cost
	function handleMagickaBurst(cost: MagickaBurstCost, acceptedMisfortune: boolean) {
		if (cost.isBurn) {
			combatStore.takeMagickaBurnDamage(player.id)
		} else {
			combatStore.spendMP(player.id, cost.mpCost)
		}
		combatStore.logMagickaBurst(player.id, cost.isBurn, acceptedMisfortune)

		// Track misfortune points when accepting critical failure via magicka burst
		if (acceptedMisfortune) {
			combatStore.gainMisfortune(player.id)
		}
	}

	// Handle spell resolution
	function handleSpellComplete(result: { mpSpent: number; isCritical: boolean; apCost: number; success: boolean }) {
		// Spend AP and MP (full cost first)
		combatStore.spendAP(player.id, result.apCost)
		combatStore.spendMP(player.id, result.mpSpent)

		// On critical success: refund half AP (rounded down) + full MP + 1 party initiative
		if (result.isCritical && result.success) {
			const apRefund = Math.floor(result.apCost / 2)
			if (apRefund > 0) {
				combatStore.gainAP(player.id, apRefund)
			}
			// Refund full MP
			combatStore.gainMP(player.id, result.mpSpent)
			combatStore.gainInitiative(player.id, 1)
		}

		showSpellResolver = false
		selectedAction = null
	}

	// Handle resource adjustments
	function handleAdjustHP(amount: number) {
		if (amount > 0) {
			combatStore.heal(player.id, amount, effectiveMaxHP)
		} else {
			// Open the take damage modal for damage input with type selection
			showTakeDamageModal = true
		}
	}

	// Handle damage with resistance calculation
	function handleTakeDamage(amount: number, damageType: DamageType, isMagicSource: boolean) {
		combatStore.takeDamageWithEffects(player.id, player, amount, damageType, isMagicSource)
		showTakeDamageModal = false
		// Check if HP dropped to 0 or below after taking damage
		const currentSession = combatStore.getSession(player.id)
		if (currentSession && currentSession.currentHP <= 0) {
			showSpiritRecoveryModal = true
		}
	}

	// Handle spirit point spending
	function handleSpendSpiritPoint() {
		combatStore.spendSpiritPoint(player.id, {
			maxHealth: player.maxHealth,
			maxMagicka: player.maxMagicka,
			maxActionPoints: player.maxActionPoints
		})
		showSpiritRecoveryModal = false
	}

	// Handle falling unconscious
	function handleFallUnconscious() {
		combatStore.addCondition(player.id, {
			type: ConditionType.Stunned, // Using Stunned as substitute for Unconscious
			source: 'Spirit Point Exhaustion'
		})
		showSpiritRecoveryModal = false
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

	// Fortune/Misfortune handlers
	function handleFortuneChoice(choice: 'keep' | 'store') {
		if (!pendingRoll) return

		if (choice === 'store') {
			combatStore.gainFortune(player.id)
			// Treat as non-crit roll
			const nonCritRoll = { ...pendingRoll.roll, isCritical: false }
			const success = pendingRoll.targetDC !== undefined
				? nonCritRoll.total >= pendingRoll.targetDC
				: true
			pendingRoll.onComplete(nonCritRoll, success, false)
		} else {
			// Keep crit - pass through as-is
			pendingRoll.onComplete(pendingRoll.roll, true, false)
		}

		showFortuneChoice = false
		pendingRoll = null
	}

	function handleMisfortuneChoice(choice: 'accept' | 'store') {
		if (!pendingRoll) return

		if (choice === 'store') {
			combatStore.gainMisfortune(player.id)
			// Treat as normal failure (not crit fail)
			const nonCritFailRoll = { ...pendingRoll.roll, isCriticalFail: false }
			pendingRoll.onComplete(nonCritFailRoll, false, false)
		} else {
			// Accept crit fail
			pendingRoll.onComplete(pendingRoll.roll, false, false)
		}

		showMisfortuneChoice = false
		pendingRoll = null
	}

	function handleUseFortuneChoice(useFortune: boolean) {
		if (!pendingRoll) return

		if (useFortune && session && session.fortunePoints > 0) {
			// Spend fortune and convert to crit success
			combatStore.spendFortune(player.id)

			// If original was crit fail, also gain misfortune
			if (pendingRoll.roll.isCriticalFail) {
				combatStore.gainMisfortune(player.id)
			}

			// Create crit success roll
			const critRoll: DiceRoll = {
				...pendingRoll.roll,
				isCritical: true,
				isCriticalFail: false,
			}
			pendingRoll.onComplete(critRoll, true, true)
		} else {
			// Keep original roll
			const success = pendingRoll.targetDC !== undefined
				? (pendingRoll.roll.total >= pendingRoll.targetDC || pendingRoll.roll.isCritical)
				: !pendingRoll.roll.isCriticalFail
			pendingRoll.onComplete(pendingRoll.roll, success, false)
		}

		showUseFortuneModal = false
		pendingRoll = null
	}

	// Wrapper for rolls that should trigger fortune system
	function handleRollWithFortune(
		roll: DiceRoll,
		targetDC: number | undefined,
		rollType: string,
		onComplete: (roll: DiceRoll, success: boolean, usedFortune: boolean) => void
	) {
		// Check for critical success - offer choice
		if (roll.isCritical) {
			pendingRoll = { roll, targetDC, rollType, onComplete }
			showFortuneChoice = true
			return
		}

		// Check for critical failure - offer choice
		if (roll.isCriticalFail) {
			pendingRoll = { roll, targetDC, rollType, onComplete }
			showMisfortuneChoice = true
			return
		}

		// Normal roll - check if player wants to use fortune
		const success = targetDC !== undefined ? roll.total >= targetDC : true
		if (!success && session && session.fortunePoints > 0) {
			pendingRoll = { roll, targetDC, rollType, onComplete }
			showUseFortuneModal = true
			return
		}

		// No fortune interaction needed
		onComplete(roll, success, false)
	}

	// Handle quick roll (for generic d20 rolls)
	function handleQuickRoll(roll: DiceRoll, success: boolean, margin: number) {
		// Could log the roll or display it
		console.log('Quick roll:', roll.total, success ? 'success' : 'fail')
	}
</script>

<div class="combat-mode">
	{#if !session}
		<!-- Not in combat - show enter combat button -->
		<button
			type="button"
			class="btn variant-filled-warning btn-lg w-full"
			onclick={handleEnterCombat}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
			</svg>
			Enter Combat
		</button>
	{:else}
		<!-- In combat - show full combat interface -->
		<div class="space-y-4">
			<!-- Top: End Combat button -->
			<button
				type="button"
				class="btn variant-ringed-error btn-lg w-full"
				onclick={handleEndCombat}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
				Exit Combat
			</button>

			<!-- Round/Turn info with buttons -->
			<CombatHeader
				{session}
				onEndTurn={handleEndTurn}
				onStartTurn={handleStartTurn}
			/>

			<!-- Resource Bars in 3 columns -->
			<div class="card p-4">
				<ResourceBars
					{session}
					maxHP={effectiveMaxHP}
					maxMP={effectiveMaxMP}
					onAdjustHP={handleAdjustHP}
					onAdjustMP={handleAdjustMP}
					onAdjustAP={handleAdjustAP}
				/>
			</div>

			<!-- Full-width Actions Panel -->
			<ActionsPanel
				currentAP={session.currentAP}
				currentMP={session.currentMP}
				currentInitiative={session.partyInitiativePool.current}
				{hasHeftedShield}
				hasShieldEquipped={hasShieldEquipped()}
				onActionSelect={handleActionSelect}
			/>

			<!-- Three column layout for initiative, quick roll, and log -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<!-- Left Column: Initiative, Conditions & Fortune -->
				<div class="space-y-4">
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

					<div class="card p-4">
						<h3 class="h4 mb-3">Spirit & Wounds</h3>
						<SpiritPointsTracker
							current={player.spiritPoints}
							max={player.maxSpiritPoints}
						/>
						<div class="mt-4">
							<h4 class="font-semibold text-sm mb-2">Active Complications</h4>
							<ComplicationsDisplay
								complications={player.complications}
								equipment={player.equipment}
							/>
						</div>
					</div>

					<FortuneDisplay
						fortunePoints={session.fortunePoints}
						misfortunePoints={session.misfortunePoints}
						onSpendMisfortune={() => combatStore.spendMisfortune(player.id)}
					/>
				</div>

				<!-- Center Column: Quick Roll -->
				<div class="space-y-4">
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
		</div>
	{/if}

	<!-- Modals -->
	{#if showEnterCombatModal}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<EnterCombatModal
				{player}
				onstart={handleCombatStarted}
				oncancel={() => showEnterCombatModal = false}
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

	{#if showSpiritRecoveryModal && session}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<SpiritRecoveryModal
				currentSpiritPoints={session.currentSpiritPoints}
				maxSpiritPoints={session.maxSpiritPoints}
				characterName={player.characterName}
				onspend={handleSpendSpiritPoint}
				onfall={handleFallUnconscious}
			/>
		</div>
	{/if}

	{#if showAttackResolver && selectedAction && session}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<AttackResolverModal
				{player}
				action={selectedAction}
				currentMP={session.currentMP}
				currentHP={session.currentHP}
				onComplete={handleAttackComplete}
				onCancel={() => { showAttackResolver = false; selectedAction = null; }}
				onMagickaBurst={handleMagickaBurst}
			/>
		</div>
	{/if}

	{#if showSpellResolver && selectedAction}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<SpellResolverModal
				{player}
				action={selectedAction}
				onComplete={handleSpellComplete}
				onCancel={() => { showSpellResolver = false; selectedAction = null; }}
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

		<HeftShieldModal
			isOpen={activeModal === 'heftShield'}
			currentAP={session.currentAP}
			shieldId={session.combatEquipment?.offhand?.id ?? player.equipment?.offhand?.id ?? null}
			{hasHeftedShield}
			onHeft={handleHeftShield}
			onClose={handleCloseModal}
		/>

		<FocusAttackModal
			isOpen={activeModal === 'focusAttack'}
			{player}
			weaponId={session.combatEquipment?.weapon?.id ?? player.equipment?.weapon?.id ?? null}
			currentAP={session.currentAP}
			onFocus={handleFocusAttack}
			onClose={handleCloseModal}
		/>

		<FocusSpellModal
			isOpen={activeModal === 'focusSpell'}
			{player}
			currentAP={session.currentAP}
			currentMP={session.currentMP}
			onFocus={handleFocusSpell}
			onClose={handleCloseModal}
		/>

		<DodgeModal
			isOpen={activeModal === 'dodge'}
			{player}
			currentInitiative={session.partyInitiativePool.current}
			currentMisfortune={session.misfortunePoints}
			onDodge={handleDodge}
			onClose={handleCloseModal}
		/>

		<BlockModal
			isOpen={activeModal === 'block'}
			{player}
			shieldId={session.combatEquipment?.offhand?.id ?? player.equipment?.offhand?.id ?? null}
			currentInitiative={session.partyInitiativePool.current}
			{hasHeftedShield}
			onBlock={handleBlock}
			onClose={handleCloseModal}
		/>

		<UseItemModal
			isOpen={activeModal === 'useItem'}
			{player}
			currentAP={session.currentAP}
			onUseItem={handleUseItem}
			onClose={handleCloseModal}
		/>

		<TakeDamageModal
			isOpen={showTakeDamageModal}
			onTakeDamage={handleTakeDamage}
			onClose={() => showTakeDamageModal = false}
		/>
	{/if}

	{#if showComplicationModal}
		<ComplicationRollModal
			isOpen={showComplicationModal}
			{player}
			equipment={session?.combatEquipment ?? player.equipment}
			onComplete={handleComplicationComplete}
			onCancel={handleComplicationCancel}
		/>
	{/if}

	<!-- Fortune System Modals -->
	{#if showFortuneChoice && pendingRoll}
		<FortuneChoiceModal
			isOpen={true}
			roll={pendingRoll.roll}
			targetDC={pendingRoll.targetDC}
			rollType={pendingRoll.rollType}
			onKeepCrit={() => handleFortuneChoice('keep')}
			onStoreFortune={() => handleFortuneChoice('store')}
		/>
	{/if}

	{#if showMisfortuneChoice && pendingRoll}
		<MisfortuneChoiceModal
			isOpen={true}
			roll={pendingRoll.roll}
			targetDC={pendingRoll.targetDC}
			rollType={pendingRoll.rollType}
			onAcceptCritFail={() => handleMisfortuneChoice('accept')}
			onStoreMisfortune={() => handleMisfortuneChoice('store')}
		/>
	{/if}

	{#if showUseFortuneModal && pendingRoll && session}
		<UseFortuneModal
			isOpen={true}
			fortunePoints={session.fortunePoints}
			roll={pendingRoll.roll}
			targetDC={pendingRoll.targetDC}
			rollType={pendingRoll.rollType}
			isCriticalFail={pendingRoll.roll.isCriticalFail}
			onUseFortune={() => handleUseFortuneChoice(true)}
			onDecline={() => handleUseFortuneChoice(false)}
		/>
	{/if}
</div>
