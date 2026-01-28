# Misfortune Points Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Misfortune Points system - a party-wide resource that accumulates when players roll critical failures and choose to store them, allowing the GM to use accumulated misfortune against the party.

**Game Rules Summary:**
- Misfortune Points are gained when a critical failure is rolled during any skill check or attack
- Player chooses: "Accept Crit Fail" (full crit fail effects) OR "Store Misfortune" (counts as normal failure, party gains 1 Misfortune)
- If player uses Fortune to replace a crit fail with crit success, they must also store a Misfortune point
- Misfortune is party-wide, tracked by GM
- GM can spend Misfortune against the party (specific mechanics TBD by GM)

**Architecture:**
- Add `misfortunePoints` to CombatSession (party-wide counter)
- Create CriticalFailModal for player choice when rolling crit fail
- Create MisfortuneTracker UI component for displaying/managing party Misfortune
- Integrate with DiceRoller callback to trigger modal on crit fails
- Provide GM controls to spend Misfortune

**Tech Stack:** Svelte 5 ($props, $state, $derived), Skeleton UI, combat.store.ts, vitest for tests

---

## Task 1: Add Misfortune Points to Combat Model and Store

**Files:**
- Modify: `src/lib/models/combat.ts`
- Modify: `src/lib/stores/combat.store.ts`
- Create: `src/lib/stores/combat.store.test.ts`

### Step 1.1: Write tests for misfortune store methods

Create file `src/lib/stores/combat.store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { combatStore } from './combat.store'

describe('Misfortune Points', () => {
	const testPlayerId = 'test-player-123'

	beforeEach(() => {
		// Clean up any existing session
		combatStore.endCombat(testPlayerId)
	})

	describe('addMisfortune', () => {
		it('should add misfortune points to the session', () => {
			combatStore.startCombat(testPlayerId, 5, 5, {
				health: 100,
				magicka: 50,
				maxActionPoints: 4,
			})

			combatStore.addMisfortune(testPlayerId, 1)
			const session = combatStore.getSession(testPlayerId)

			expect(session?.misfortunePoints).toBe(1)
		})

		it('should accumulate multiple misfortune points', () => {
			combatStore.startCombat(testPlayerId, 5, 5, {
				health: 100,
				magicka: 50,
				maxActionPoints: 4,
			})

			combatStore.addMisfortune(testPlayerId, 1)
			combatStore.addMisfortune(testPlayerId, 2)
			const session = combatStore.getSession(testPlayerId)

			expect(session?.misfortunePoints).toBe(3)
		})

		it('should log misfortune gain to combat log', () => {
			combatStore.startCombat(testPlayerId, 5, 5, {
				health: 100,
				magicka: 50,
				maxActionPoints: 4,
			})

			combatStore.addMisfortune(testPlayerId, 1)
			const session = combatStore.getSession(testPlayerId)
			const lastLog = session?.log[session.log.length - 1]

			expect(lastLog?.description).toContain('Misfortune')
		})
	})

	describe('spendMisfortune', () => {
		it('should spend misfortune points', () => {
			combatStore.startCombat(testPlayerId, 5, 5, {
				health: 100,
				magicka: 50,
				maxActionPoints: 4,
			})

			combatStore.addMisfortune(testPlayerId, 3)
			combatStore.spendMisfortune(testPlayerId, 2)
			const session = combatStore.getSession(testPlayerId)

			expect(session?.misfortunePoints).toBe(1)
		})

		it('should not reduce misfortune below zero', () => {
			combatStore.startCombat(testPlayerId, 5, 5, {
				health: 100,
				magicka: 50,
				maxActionPoints: 4,
			})

			combatStore.addMisfortune(testPlayerId, 1)
			combatStore.spendMisfortune(testPlayerId, 5)
			const session = combatStore.getSession(testPlayerId)

			expect(session?.misfortunePoints).toBe(0)
		})

		it('should log misfortune spend to combat log', () => {
			combatStore.startCombat(testPlayerId, 5, 5, {
				health: 100,
				magicka: 50,
				maxActionPoints: 4,
			})

			combatStore.addMisfortune(testPlayerId, 2)
			combatStore.spendMisfortune(testPlayerId, 1)
			const session = combatStore.getSession(testPlayerId)
			const lastLog = session?.log[session.log.length - 1]

			expect(lastLog?.description).toContain('Misfortune')
		})
	})

	describe('initial state', () => {
		it('should start combat with zero misfortune points', () => {
			combatStore.startCombat(testPlayerId, 5, 5, {
				health: 100,
				magicka: 50,
				maxActionPoints: 4,
			})

			const session = combatStore.getSession(testPlayerId)
			expect(session?.misfortunePoints).toBe(0)
		})
	})
})
```

### Step 1.2: Update CombatSession interface

Modify `src/lib/models/combat.ts`:

Add `misfortunePoints` to the CombatSession interface:

```typescript
export interface CombatSession {
  id: string
  playerId: string
  round: number
  isPlayerTurn: boolean
  partyInitiativePool: InitiativePool
  enemyInitiativePool: InitiativePool
  currentHP: number
  currentMP: number
  currentAP: number
  maxAP: number
  conditions: ActiveCondition[]
  log: CombatLogEntry[]
  distance: CombatDistance
  concentrationSpellId?: string
  isConcentrationBroken: boolean
  combatEquipment: Equipment
  misfortunePoints: number  // ADD THIS LINE
}
```

### Step 1.3: Update combat store with misfortune methods

Modify `src/lib/stores/combat.store.ts`:

In the `startCombat` function, add `misfortunePoints: 0` to the session initialization:

```typescript
const session: CombatSession = {
	id: crypto.randomUUID(),
	playerId,
	round: 0,
	isPlayerTurn: false,
	partyInitiativePool: { current: partyInitiative, max: partyInitiative },
	enemyInitiativePool: { current: enemyInitiative, max: enemyInitiative },
	currentHP: playerData.health,
	currentMP: playerData.magicka,
	currentAP: playerData.maxActionPoints,
	maxAP: playerData.maxActionPoints,
	conditions: [],
	log: [createCombatLogEntry('system', 'Combat started!')],
	distance: CombatDistance.Medium,
	concentrationSpellId: undefined,
	isConcentrationBroken: false,
	combatEquipment: equipmentSnapshot,
	misfortunePoints: 0,  // ADD THIS LINE
}
```

Add these methods to the store's return object (after `setConcentration`):

```typescript
/**
 * Add misfortune points (when player stores a critical failure)
 */
addMisfortune: (playerId: string, amount: number = 1): void => {
	update((state) => {
		const session = state[playerId]
		if (!session) return state
		return {
			...state,
			[playerId]: {
				...session,
				misfortunePoints: session.misfortunePoints + amount,
				log: [...session.log, createCombatLogEntry('system', `Party gained ${amount} Misfortune point${amount > 1 ? 's' : ''}`)]
			}
		}
	})
},

/**
 * Spend misfortune points (when GM uses them against party)
 */
spendMisfortune: (playerId: string, amount: number = 1): void => {
	update((state) => {
		const session = state[playerId]
		if (!session) return state
		const newAmount = Math.max(0, session.misfortunePoints - amount)
		const actualSpent = session.misfortunePoints - newAmount
		return {
			...state,
			[playerId]: {
				...session,
				misfortunePoints: newAmount,
				log: [...session.log, createCombatLogEntry('system', `GM spent ${actualSpent} Misfortune point${actualSpent > 1 ? 's' : ''}`)]
			}
		}
	})
},
```

### Step 1.4: Run tests to verify

```bash
npm run test -- --run src/lib/stores/combat.store.test.ts
```

Expected: All tests pass

### Step 1.5: Run build to verify

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no errors

---

## Task 2: Create CriticalFailModal Component

**Files:**
- Create: `src/lib/components/combat/modals/CriticalFailModal.svelte`

### Step 2.1: Create the CriticalFailModal component

Create file `src/lib/components/combat/modals/CriticalFailModal.svelte`:

```svelte
<script lang="ts">
	import type { DiceRoll } from '$lib/models/combat'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		roll: DiceRoll
		rollContext: string // e.g., "Attack Roll", "Dodge Check", "Spell Cast"
		currentMisfortune: number
		onAcceptCritFail: () => void
		onStoreMisfortune: () => void
		onCancel: () => void
	}

	let { isOpen, roll, rollContext, currentMisfortune, onAcceptCritFail, onStoreMisfortune, onCancel }: Props = $props()
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="mb-4">
				<h2 class="h3 text-error-500 font-bold">Critical Failure!</h2>
				<p class="text-sm opacity-75">{rollContext}</p>
			</header>

			<!-- Show the roll result -->
			<div class="mb-6">
				<RollResult {roll} />
			</div>

			<!-- Explanation -->
			<div class="card variant-soft-error p-4 mb-6">
				<p class="text-sm mb-2">
					You rolled a <strong class="text-error-500">critical failure</strong>. You have a choice:
				</p>
				<ul class="text-sm list-disc list-inside space-y-1 opacity-90">
					<li><strong>Accept:</strong> The action fails with critical failure effects</li>
					<li><strong>Store Misfortune:</strong> The action counts as a normal failure, but the party gains 1 Misfortune point</li>
				</ul>
			</div>

			<!-- Current Misfortune Display -->
			<div class="flex justify-center mb-6">
				<div class="badge variant-filled-error px-4 py-2 text-lg">
					Party Misfortune: {currentMisfortune}
				</div>
			</div>

			<!-- Choice Buttons -->
			<div class="grid grid-cols-2 gap-4">
				<button
					type="button"
					class="btn variant-filled-error h-auto py-4 flex-col"
					onclick={onAcceptCritFail}
				>
					<span class="font-bold">Accept Critical Fail</span>
					<span class="text-xs opacity-75">Full crit fail effects</span>
				</button>

				<button
					type="button"
					class="btn variant-filled-warning h-auto py-4 flex-col"
					onclick={onStoreMisfortune}
				>
					<span class="font-bold">Store Misfortune</span>
					<span class="text-xs opacity-75">Normal failure + 1 Misfortune</span>
				</button>
			</div>

			<footer class="flex justify-end mt-6">
				<button type="button" class="btn variant-ghost" onclick={onCancel}>
					Cancel (Re-roll or Reconsider)
				</button>
			</footer>
		</div>
	</div>
{/if}
```

### Step 2.2: Export from combat components index

Modify `src/lib/components/combat/index.ts`:

Add to the modals exports section:

```typescript
export { default as CriticalFailModal } from './modals/CriticalFailModal.svelte'
```

### Step 2.3: Run build to verify

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds

---

## Task 3: Create MisfortuneTracker UI Component

**Files:**
- Create: `src/lib/components/combat/MisfortuneTracker.svelte`

### Step 3.1: Create the MisfortuneTracker component

Create file `src/lib/components/combat/MisfortuneTracker.svelte`:

```svelte
<script lang="ts">
	interface Props {
		misfortunePoints: number
		isGMMode?: boolean
		onSpendMisfortune?: (amount: number) => void
		onAddMisfortune?: (amount: number) => void
	}

	let { misfortunePoints, isGMMode = false, onSpendMisfortune, onAddMisfortune }: Props = $props()

	let spendAmount = $state(1)

	function handleSpend() {
		if (onSpendMisfortune && spendAmount > 0 && spendAmount <= misfortunePoints) {
			onSpendMisfortune(spendAmount)
			spendAmount = 1
		}
	}

	function handleAdd() {
		if (onAddMisfortune && spendAmount > 0) {
			onAddMisfortune(spendAmount)
			spendAmount = 1
		}
	}
</script>

<div class="card p-4 variant-soft-error">
	<header class="flex justify-between items-center mb-3">
		<h3 class="h4 font-bold text-error-500">Misfortune</h3>
		<span class="badge variant-filled-error text-lg px-4 py-1">
			{misfortunePoints}
		</span>
	</header>

	<!-- Visual representation -->
	<div class="flex flex-wrap gap-1 mb-3 min-h-[24px]">
		{#each Array(Math.min(misfortunePoints, 10)) as _, i}
			<div
				class="w-5 h-5 rounded-full bg-error-500 shadow-md"
				title="Misfortune Point"
			></div>
		{/each}
		{#if misfortunePoints > 10}
			<span class="text-sm text-error-500 self-center ml-1">+{misfortunePoints - 10} more</span>
		{/if}
		{#if misfortunePoints === 0}
			<span class="text-sm opacity-50 italic">No misfortune accumulated</span>
		{/if}
	</div>

	<!-- GM Controls -->
	{#if isGMMode && (onSpendMisfortune || onAddMisfortune)}
		<div class="border-t border-surface-500 pt-3 mt-3">
			<p class="text-xs opacity-75 mb-2">GM Controls</p>
			<div class="flex items-center gap-2">
				<label class="label flex-1">
					<span class="sr-only">Amount</span>
					<input
						type="number"
						class="input input-sm"
						min="1"
						max={Math.max(misfortunePoints, 10)}
						bind:value={spendAmount}
					/>
				</label>
				{#if onSpendMisfortune}
					<button
						type="button"
						class="btn btn-sm variant-filled-error"
						disabled={misfortunePoints < spendAmount || spendAmount < 1}
						onclick={handleSpend}
					>
						Spend
					</button>
				{/if}
				{#if onAddMisfortune}
					<button
						type="button"
						class="btn btn-sm variant-ghost-error"
						disabled={spendAmount < 1}
						onclick={handleAdd}
					>
						Add
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
```

### Step 3.2: Export from combat components index

Modify `src/lib/components/combat/index.ts`:

Add to the exports:

```typescript
export { default as MisfortuneTracker } from './MisfortuneTracker.svelte'
```

### Step 3.3: Run build to verify

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds

---

## Task 4: Create Critical Fail Handler Utility

**Files:**
- Create: `src/lib/util/criticalFail.util.ts`
- Create: `src/lib/util/criticalFail.util.test.ts`

### Step 4.1: Write tests for critical fail utility

Create file `src/lib/util/criticalFail.util.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { DiceRoll } from '$lib/models/combat'
import { shouldShowCritFailModal, getCritFailConsequences } from './criticalFail.util'

describe('criticalFail.util', () => {
	describe('shouldShowCritFailModal', () => {
		it('should return true for critical failure roll', () => {
			const roll: DiceRoll = {
				baseRoll: 1,
				bonuses: [],
				advantageCount: 0,
				total: 5,
				isCritical: false,
				isCriticalFail: true,
			}
			expect(shouldShowCritFailModal(roll)).toBe(true)
		})

		it('should return false for normal roll', () => {
			const roll: DiceRoll = {
				baseRoll: 10,
				bonuses: [],
				advantageCount: 0,
				total: 14,
				isCritical: false,
				isCriticalFail: false,
			}
			expect(shouldShowCritFailModal(roll)).toBe(false)
		})

		it('should return false for critical success', () => {
			const roll: DiceRoll = {
				baseRoll: 20,
				bonuses: [],
				advantageCount: 0,
				total: 24,
				isCritical: true,
				isCriticalFail: false,
			}
			expect(shouldShowCritFailModal(roll)).toBe(false)
		})
	})

	describe('getCritFailConsequences', () => {
		it('should return attack consequences for attack context', () => {
			const result = getCritFailConsequences('attack')
			expect(result.acceptConsequences).toContain('damage')
			expect(result.storedConsequences).toContain('miss')
		})

		it('should return spell consequences for spell context', () => {
			const result = getCritFailConsequences('spell')
			expect(result.acceptConsequences).toContain('fizzle')
		})

		it('should return dodge consequences for dodge context', () => {
			const result = getCritFailConsequences('dodge')
			expect(result.acceptConsequences).toContain('disoriented')
		})

		it('should return generic consequences for unknown context', () => {
			const result = getCritFailConsequences('unknown')
			expect(result.acceptConsequences).toBeDefined()
			expect(result.storedConsequences).toBeDefined()
		})
	})
})
```

### Step 4.2: Create critical fail utility

Create file `src/lib/util/criticalFail.util.ts`:

```typescript
import type { DiceRoll } from '$lib/models/combat'

export type CritFailContext =
	| 'attack'
	| 'spell'
	| 'dodge'
	| 'block'
	| 'focus-attack'
	| 'focus-spell'
	| 'skill-check'
	| string

export interface CritFailConsequences {
	acceptConsequences: string
	storedConsequences: string
}

/**
 * Determines if the critical failure modal should be shown for a given roll
 */
export function shouldShowCritFailModal(roll: DiceRoll): boolean {
	return roll.isCriticalFail
}

/**
 * Gets the consequences description for accepting vs storing a critical failure
 * based on the context of the roll
 */
export function getCritFailConsequences(context: CritFailContext): CritFailConsequences {
	switch (context) {
		case 'attack':
			return {
				acceptConsequences: 'Attack misses and you may take self-damage or drop weapon',
				storedConsequences: 'Attack counts as a normal miss',
			}
		case 'spell':
			return {
				acceptConsequences: 'Spell fizzles, MP is lost, and you may suffer magical backlash',
				storedConsequences: 'Spell fails but only costs half MP',
			}
		case 'dodge':
			return {
				acceptConsequences: 'Full damage taken and you become disoriented',
				storedConsequences: 'Full damage taken (no disorientation)',
			}
		case 'block':
			return {
				acceptConsequences: 'Full damage taken and shield may be damaged',
				storedConsequences: 'Full damage taken (shield intact)',
			}
		case 'focus-attack':
			return {
				acceptConsequences: 'Become disoriented, party loses 1 initiative, enemy gains 1',
				storedConsequences: 'Become disoriented only (no initiative change)',
			}
		case 'focus-spell':
			return {
				acceptConsequences: 'Unfocused with disadvantage and lose extra MP',
				storedConsequences: 'Unfocused with disadvantage only',
			}
		case 'skill-check':
		default:
			return {
				acceptConsequences: 'Check fails critically with severe consequences',
				storedConsequences: 'Check counts as a normal failure',
			}
	}
}

/**
 * Formats the roll context for display in the modal
 */
export function formatRollContext(context: CritFailContext): string {
	switch (context) {
		case 'attack':
			return 'Attack Roll'
		case 'spell':
			return 'Spell Cast'
		case 'dodge':
			return 'Dodge Check'
		case 'block':
			return 'Block Check'
		case 'focus-attack':
			return 'Focus Attack Check'
		case 'focus-spell':
			return 'Focus Spell Check'
		case 'skill-check':
			return 'Skill Check'
		default:
			return context.charAt(0).toUpperCase() + context.slice(1)
	}
}
```

### Step 4.3: Run tests

```bash
npm run test -- --run src/lib/util/criticalFail.util.test.ts
```

Expected: All tests pass

---

## Task 5: Integrate CriticalFailModal into DiceRoller

**Files:**
- Modify: `src/lib/components/combat/DiceRoller/DiceRoller.svelte`

### Step 5.1: Update DiceRoller props and add modal integration

Modify `src/lib/components/combat/DiceRoller/DiceRoller.svelte`:

Update the Props interface to include critical fail handling:

```svelte
<script lang="ts">
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton'
	import type { DiceRoll, DiceRollBonus } from '$lib/models/combat'
	import type { SubSkill } from '$lib/models/subskill'
	import { rollD20, isCriticalSuccess, isCriticalFailure, performSkillCheck } from '$lib/util/dice.util'
	import { getSubskillBonus } from '$lib/util/stats.util'
	import { shouldShowCritFailModal } from '$lib/util/criticalFail.util'
	import RollResult from './RollResult.svelte'
	import ManualEntry from './ManualEntry.svelte'
	import SubskillPicker from '$lib/components/subskills/SubskillPicker.svelte'
	import CriticalFailModal from '../modals/CriticalFailModal.svelte'

	interface Props {
		onRoll: (roll: DiceRoll, success: boolean, margin: number) => void
		skillBonus?: number
		bonuses?: DiceRollBonus[]
		targetDC?: number
		advantageCount?: number
		playerLevel?: number
		disabled?: boolean
		label?: string
		subSkills?: SubSkill[]
		// Critical fail handling
		rollContext?: string  // e.g., 'attack', 'spell', 'dodge'
		currentMisfortune?: number
		onCritFailChoice?: (choice: 'accept' | 'store', roll: DiceRoll) => void
		enableCritFailModal?: boolean
	}

	let {
		onRoll,
		skillBonus = 0,
		bonuses = [],
		targetDC,
		advantageCount = 0,
		playerLevel = 1,
		disabled = false,
		label = 'Roll',
		subSkills = [],
		rollContext = 'skill-check',
		currentMisfortune = 0,
		onCritFailChoice,
		enableCritFailModal = false,
	}: Props = $props()

	let mode: 'digital' | 'manual' = $state('digital')
	let lastRoll: DiceRoll | undefined = $state(undefined)
	let lastSuccess: boolean | undefined = $state(undefined)
	let isRolling: boolean = $state(false)
	let selectedSubskill: SubSkill | null = $state(null)

	// Critical fail modal state
	let showCritFailModal = $state(false)
	let pendingRoll: DiceRoll | undefined = $state(undefined)
	let pendingSuccess = $state(false)
	let pendingMargin = $state(0)

	let subskillBonus = $derived(selectedSubskill ? getSubskillBonus(playerLevel) : 0)

	function handleRollResult(roll: DiceRoll, success: boolean, margin: number) {
		// Check if we should show crit fail modal
		if (enableCritFailModal && onCritFailChoice && shouldShowCritFailModal(roll)) {
			pendingRoll = roll
			pendingSuccess = success
			pendingMargin = margin
			showCritFailModal = true
			lastRoll = roll
			lastSuccess = success
		} else {
			// Normal flow - call onRoll immediately
			lastRoll = roll
			lastSuccess = targetDC !== undefined ? success : undefined
			onRoll(roll, success, margin)
		}
	}

	async function handleDigitalRoll() {
		if (disabled || isRolling) return

		isRolling = true
		lastRoll = undefined

		// Brief animation delay
		await new Promise(r => setTimeout(r, 500))

		// Combine bonuses with subskill bonus if selected
		const allBonuses: DiceRollBonus[] = [
			...bonuses,
			...(selectedSubskill ? [{ source: selectedSubskill.name, value: subskillBonus }] : []),
		]

		const baseRoll = rollD20(advantageCount)
		const result = performSkillCheck(baseRoll, skillBonus, allBonuses, targetDC ?? 0, playerLevel, advantageCount)

		isRolling = false
		handleRollResult(result.roll, result.success, result.margin)
	}

	function handleManualRoll(value: number) {
		const allBonuses: DiceRollBonus[] = [
			{ source: 'Skill', value: skillBonus },
			...bonuses,
			...(selectedSubskill ? [{ source: selectedSubskill.name, value: subskillBonus }] : []),
		]
		const total = value + allBonuses.reduce((sum, b) => sum + b.value, 0)

		const roll: DiceRoll = {
			baseRoll: value,
			bonuses: allBonuses,
			advantageCount: 0,
			total,
			isCritical: isCriticalSuccess(value, playerLevel),
			isCriticalFail: isCriticalFailure(value, playerLevel)
		}

		const success = targetDC !== undefined ? (total >= targetDC || roll.isCritical) : true
		const margin = targetDC !== undefined ? total - targetDC : 0

		handleRollResult(roll, success, margin)
	}

	function handleAcceptCritFail() {
		showCritFailModal = false
		if (pendingRoll && onCritFailChoice) {
			onCritFailChoice('accept', pendingRoll)
		}
		if (pendingRoll) {
			onRoll(pendingRoll, pendingSuccess, pendingMargin)
		}
		pendingRoll = undefined
	}

	function handleStoreMisfortune() {
		showCritFailModal = false
		if (pendingRoll && onCritFailChoice) {
			onCritFailChoice('store', pendingRoll)
		}
		if (pendingRoll) {
			// When storing misfortune, the roll is treated as a normal failure
			// Create a modified roll that's not a critical fail for downstream handling
			const modifiedRoll: DiceRoll = {
				...pendingRoll,
				isCriticalFail: false, // Downgrade to normal failure
			}
			onRoll(modifiedRoll, false, pendingMargin)
		}
		pendingRoll = undefined
	}

	function handleCancelCritFail() {
		showCritFailModal = false
		pendingRoll = undefined
		// Allow re-rolling
		lastRoll = undefined
		lastSuccess = undefined
	}

	function reset() {
		lastRoll = undefined
		lastSuccess = undefined
		pendingRoll = undefined
		showCritFailModal = false
	}
</script>

<div class="dice-roller card p-4 variant-soft-surface">
	<!-- Mode Toggle -->
	<div class="mb-4">
		<RadioGroup>
			<RadioItem bind:group={mode} name="roll-mode" value="digital">
				Roll In-App
			</RadioItem>
			<RadioItem bind:group={mode} name="roll-mode" value="manual">
				Enter Roll
			</RadioItem>
		</RadioGroup>
	</div>

	<!-- Roll Info -->
	{#if targetDC !== undefined}
		<div class="text-sm text-center mb-2">
			Target DC: <span class="font-bold">{targetDC}</span>
		</div>
	{/if}

	{#if skillBonus !== 0 || bonuses.length > 0}
		<div class="text-xs text-center mb-2 opacity-75">
			Modifiers: +{skillBonus} skill
			{#each bonuses as bonus}
				{bonus.value >= 0 ? '+' : ''}{bonus.value} ({bonus.source})
			{/each}
		</div>
	{/if}

	<!-- Subskill Picker -->
	{#if subSkills.length > 0}
		<div class="mb-4">
			<SubskillPicker {subSkills} {playerLevel} bind:selectedSubskill />
		</div>
	{/if}

	<!-- Roll Controls -->
	<div class="flex justify-center mb-4">
		{#if mode === 'digital'}
			<button
				type="button"
				class="btn variant-filled-primary"
				onclick={handleDigitalRoll}
				disabled={disabled || isRolling}
			>
				{#if isRolling}
					<span class="animate-spin mr-2">🎲</span> Rolling...
				{:else}
					🎲 {label}
				{/if}
			</button>
		{:else}
			<ManualEntry onSubmit={handleManualRoll} {disabled} />
		{/if}
	</div>

	<!-- Result Display -->
	{#if lastRoll && !showCritFailModal}
		<RollResult roll={lastRoll} {targetDC} />
		<div class="text-center mt-2">
			<button type="button" class="btn btn-sm variant-ghost" onclick={reset}>
				Roll Again
			</button>
		</div>
	{/if}
</div>

<!-- Critical Fail Modal -->
<CriticalFailModal
	isOpen={showCritFailModal}
	roll={pendingRoll ?? { baseRoll: 1, bonuses: [], advantageCount: 0, total: 1, isCritical: false, isCriticalFail: true }}
	{rollContext}
	currentMisfortune={currentMisfortune}
	onAcceptCritFail={handleAcceptCritFail}
	onStoreMisfortune={handleStoreMisfortune}
	onCancel={handleCancelCritFail}
/>
```

### Step 5.2: Run build to verify

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds

---

## Task 6: Integrate Misfortune System into CombatMode

**Files:**
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 6.1: Add MisfortuneTracker to CombatMode layout

Modify `src/lib/components/combat/CombatMode.svelte`:

Add import at top:

```typescript
import MisfortuneTracker from './MisfortuneTracker.svelte'
```

Add misfortune handlers after the existing handlers (around line 290):

```typescript
// Handle misfortune adjustments
function handleSpendMisfortune(amount: number) {
	combatStore.spendMisfortune(player.id, amount)
}

function handleAddMisfortune(amount: number) {
	combatStore.addMisfortune(player.id, amount)
}
```

Add MisfortuneTracker to the layout. Find the section with Initiative & Conditions (around line 356-378) and add MisfortuneTracker below the conditions:

```svelte
<!-- Left Column: Initiative, Conditions & Misfortune -->
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

	<!-- ADD MISFORTUNE TRACKER HERE -->
	<MisfortuneTracker
		misfortunePoints={session.misfortunePoints}
		isGMMode={true}
		onSpendMisfortune={handleSpendMisfortune}
		onAddMisfortune={handleAddMisfortune}
	/>
</div>
```

### Step 6.2: Run build to verify

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds

---

## Task 7: Integrate CriticalFailModal into Action Modals

**Files:**
- Modify: `src/lib/components/combat/modals/AttackResolverModal.svelte`
- Modify: `src/lib/components/combat/modals/DodgeModal.svelte`

### Step 7.1: Update AttackResolverModal

Modify `src/lib/components/combat/modals/AttackResolverModal.svelte`:

Update the Props interface and add misfortune handling:

```svelte
<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import { getWeaponById } from '$lib/data/weapons'
	import type { DiceRoll } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'
	import { calculateWeaponDamage, getSkillBonus } from '$lib/util/combat.util'

	interface Props {
		player: PlayerData
		action: AvailableAction
		currentMisfortune?: number
		onComplete: (result: { damage: number; isCritical: boolean; isCriticalFail: boolean; apCost: number; storedMisfortune: boolean }) => void
		onCancel: () => void
	}

	let { player, action, currentMisfortune = 0, onComplete, onCancel }: Props = $props()

	// Get weapon from action
	let weapon = $derived(action.weaponId ? getWeaponById(action.weaponId) : null)

	let step = $state<'attack' | 'damage' | 'complete'>('attack')
	let targetAC = $state(10)
	let attackRoll = $state<DiceRoll | undefined>(undefined)
	let attackSuccess = $state(false)
	let damageResult = $state<{ baseDamage: number; bonusDamage: number; total: number } | undefined>(undefined)
	let storedMisfortune = $state(false)
	let wasCritFail = $state(false)

	let skillBonus = $derived(weapon ? getSkillBonus(player, weapon.relatedSkill) : 0)

	function handleAttackRoll(roll: DiceRoll, success: boolean) {
		attackRoll = roll
		attackSuccess = success
		wasCritFail = roll.isCriticalFail
		if (success && weapon) {
			damageResult = calculateWeaponDamage(weapon, roll.total, targetAC, roll.isCritical)
		}
		step = 'damage'
	}

	function handleCritFailChoice(choice: 'accept' | 'store', roll: DiceRoll) {
		if (choice === 'store') {
			storedMisfortune = true
		}
	}

	function handleConfirm() {
		onComplete({
			damage: attackSuccess ? damageResult?.total ?? 0 : 0,
			isCritical: attackRoll?.isCritical ?? false,
			isCriticalFail: wasCritFail && !storedMisfortune,
			apCost: action.apCost,
			storedMisfortune,
		})
	}
</script>

<div class="card p-6 w-full max-w-lg">
	<header class="mb-4">
		<h3 class="h3 font-bold">Attack with {weapon?.name ?? 'Unknown Weapon'}</h3>
	</header>

	{#if step === 'attack'}
		<div class="space-y-4">
			<label class="label">
				<span>Target AC</span>
				<input type="number" class="input" bind:value={targetAC} min="1" />
			</label>

			<DiceRoller
				onRoll={handleAttackRoll}
				{skillBonus}
				targetDC={targetAC}
				playerLevel={player.level}
				label="Roll Attack"
				rollContext="attack"
				{currentMisfortune}
				onCritFailChoice={handleCritFailChoice}
				enableCritFailModal={true}
			/>
		</div>
	{:else}
		<div class="space-y-4">
			{#if attackRoll}
				<RollResult roll={attackRoll} targetDC={targetAC} />
			{/if}

			{#if storedMisfortune}
				<div class="card variant-soft-warning p-3 text-center">
					<span class="text-warning-500 font-semibold">+1 Misfortune stored</span>
				</div>
			{/if}

			{#if attackSuccess && damageResult}
				<div class="card variant-soft-success p-4 text-center">
					<div class="text-sm opacity-75">Damage</div>
					<div class="text-3xl font-bold text-success-500">{damageResult.total}</div>
					<div class="text-xs opacity-75">
						{damageResult.baseDamage} base + {damageResult.bonusDamage} bonus
					</div>
					{#if attackRoll?.isCritical}
						<div class="text-sm text-warning-500 font-semibold mt-2">
							Critical! Refund {Math.floor(action.apCost / 2)} AP + 1 Party Initiative
						</div>
					{/if}
				</div>
			{:else}
				<div class="card variant-soft-error p-4 text-center">
					<div class="text-xl font-bold text-error-500">
						{#if wasCritFail && !storedMisfortune}
							Critical Miss!
						{:else}
							Miss!
						{/if}
					</div>
					{#if wasCritFail && !storedMisfortune}
						<div class="text-sm opacity-75 mt-2">
							Critical failure effects apply
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<footer class="flex justify-end gap-2 mt-6">
		<button type="button" class="btn variant-ghost" onclick={onCancel}>Cancel</button>
		{#if step === 'damage'}
			<button type="button" class="btn variant-filled-primary" onclick={handleConfirm}
				>Apply Result</button
			>
		{/if}
	</footer>
</div>
```

### Step 7.2: Update CombatMode to handle storedMisfortune from attack

Modify `src/lib/components/combat/CombatMode.svelte`:

Update the `handleAttackComplete` function:

```typescript
// Handle attack resolution
function handleAttackComplete(result: { damage: number; isCritical: boolean; isCriticalFail?: boolean; apCost: number; storedMisfortune?: boolean }) {
	// Spend AP (full cost first)
	combatStore.spendAP(player.id, result.apCost)

	// Handle stored misfortune
	if (result.storedMisfortune) {
		combatStore.addMisfortune(player.id, 1)
	}

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
```

Update the AttackResolverModal usage to pass currentMisfortune:

```svelte
{#if showAttackResolver && selectedAction}
	<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
		<AttackResolverModal
			{player}
			action={selectedAction}
			currentMisfortune={session?.misfortunePoints ?? 0}
			onComplete={handleAttackComplete}
			onCancel={() => { showAttackResolver = false; selectedAction = null; }}
		/>
	</div>
{/if}
```

### Step 7.3: Run build to verify

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds

---

## Task 8: Add Misfortune to DodgeModal

**Files:**
- Modify: `src/lib/components/combat/modals/DodgeModal.svelte`

### Step 8.1: Update DodgeModal with misfortune handling

Modify `src/lib/components/combat/modals/DodgeModal.svelte`:

Update the Props interface and component:

```svelte
<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { DiceRoll } from '$lib/models/combat'
	import { getSkillBonus } from '$lib/util/combat.util'
	import { Skill } from '$lib/data/skill'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		player: PlayerData
		currentInitiative: number
		currentMisfortune?: number
		onDodge: (result: { success: boolean; damageReduction: 'full' | 'half' | 'none'; disoriented: boolean; storedMisfortune: boolean }) => void
		onClose: () => void
	}

	let { isOpen, player, currentInitiative, currentMisfortune = 0, onDodge, onClose }: Props = $props()

	let step = $state<'setup' | 'roll' | 'result'>('setup')
	let attackRoll = $state(15) // Enemy attack roll to dodge against
	let dodgeRoll = $state<DiceRoll | undefined>(undefined)
	let useAcrobatics = $state(true) // Acrobatics (normal) vs Athletics (disadvantage)
	let partialChoice = $state<'half' | 'disoriented' | null>(null)
	let storedMisfortune = $state(false)
	let wasCritFail = $state(false)

	let skillBonus = $derived(
		useAcrobatics
			? getSkillBonus(player, Skill.Acrobatics)
			: getSkillBonus(player, Skill.Athletics)
	)

	let dodgeSuccess = $derived.by(() => {
		if (!dodgeRoll) return false
		return dodgeRoll.total >= attackRoll
	})

	let dodgeResult = $derived.by(() => {
		if (!dodgeRoll) return { damageReduction: 'none' as const, disoriented: false, isPartial: false }
		const margin = dodgeRoll.total - attackRoll

		// If crit fail was stored, treat as normal failure
		if (wasCritFail && storedMisfortune) {
			if (margin >= -10) {
				return { damageReduction: 'half' as const, disoriented: false, isPartial: true }
			}
			return { damageReduction: 'none' as const, disoriented: false, isPartial: false }
		}

		// Normal crit fail - full damage + disoriented
		if (dodgeRoll.isCriticalFail) {
			return { damageReduction: 'none' as const, disoriented: true, isPartial: false }
		}
		if (margin >= 0) {
			return { damageReduction: 'full' as const, disoriented: false, isPartial: false }
		}
		if (margin >= -10) {
			// Failed by less than 10 - player chooses half damage or disoriented
			return { damageReduction: 'half' as const, disoriented: false, isPartial: true }
		}
		return { damageReduction: 'none' as const, disoriented: false, isPartial: false }
	})

	const INIT_COST = 1

	function handleProceedToRoll() {
		step = 'roll'
	}

	function handleDodgeRoll(roll: DiceRoll) {
		dodgeRoll = roll
		wasCritFail = roll.isCriticalFail
		step = 'result'
	}

	function handleCritFailChoice(choice: 'accept' | 'store', roll: DiceRoll) {
		if (choice === 'store') {
			storedMisfortune = true
		}
	}

	function handleConfirm() {
		// If partial dodge, apply the player's choice
		if (dodgeResult.isPartial && partialChoice) {
			onDodge({
				success: false,
				damageReduction: partialChoice === 'half' ? 'half' : 'none',
				disoriented: partialChoice === 'disoriented',
				storedMisfortune,
			})
		} else {
			onDodge({
				success: dodgeSuccess,
				damageReduction: dodgeResult.damageReduction,
				disoriented: dodgeResult.disoriented,
				storedMisfortune,
			})
		}
	}

	function resetState() {
		step = 'setup'
		attackRoll = 15
		dodgeRoll = undefined
		useAcrobatics = true
		partialChoice = null
		storedMisfortune = false
		wasCritFail = false
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Dodge</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-success">Initiative: {currentInitiative}</span>
					<span class="badge variant-filled">Cost: {INIT_COST} Init</span>
				</div>
			</header>

			{#if currentInitiative < INIT_COST}
				<p class="text-error-500 mb-4">Not enough initiative to dodge.</p>
			{:else if step === 'setup'}
				<div class="space-y-4">
					<label class="label">
						<span>Enemy Attack Roll</span>
						<input type="number" class="input" bind:value={attackRoll} min="1" />
					</label>

					<div class="space-y-2">
						<span class="text-sm font-semibold">Dodge Skill</span>
						<div class="flex gap-2">
							<button
								type="button"
								class="btn flex-1"
								class:variant-filled-primary={useAcrobatics}
								class:variant-soft-surface={!useAcrobatics}
								onclick={() => useAcrobatics = true}
							>
								Acrobatics (Normal)
							</button>
							<button
								type="button"
								class="btn flex-1"
								class:variant-filled-primary={!useAcrobatics}
								class:variant-soft-surface={useAcrobatics}
								onclick={() => useAcrobatics = false}
							>
								Athletics (Disadvantage)
							</button>
						</div>
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						onclick={handleProceedToRoll}
					>
						Roll Dodge
					</button>
				</div>
			{:else if step === 'roll'}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<p class="text-sm">Dodging attack roll of <strong>{attackRoll}</strong></p>
						<p class="text-sm opacity-75">Using {useAcrobatics ? 'Acrobatics' : 'Athletics (Disadvantage)'}</p>
					</div>

					<DiceRoller
						onRoll={handleDodgeRoll}
						skillBonus={skillBonus}
						targetDC={attackRoll}
						playerLevel={player.level}
						label="Roll Dodge"
						advantageCount={useAcrobatics ? 0 : -1}
						rollContext="dodge"
						{currentMisfortune}
						onCritFailChoice={handleCritFailChoice}
						enableCritFailModal={true}
					/>
				</div>
			{:else}
				<div class="space-y-4">
					{#if dodgeRoll}
						<RollResult roll={dodgeRoll} targetDC={attackRoll} />
					{/if}

					{#if storedMisfortune}
						<div class="card variant-soft-warning p-3 text-center">
							<span class="text-warning-500 font-semibold">+1 Misfortune stored</span>
						</div>
					{/if}

					{#if dodgeSuccess}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Dodge Successful!</p>
							<p class="text-sm opacity-75">No damage taken. You may move up to 10 feet.</p>
						</div>
					{:else if dodgeResult.isPartial}
						<div class="card variant-soft-warning p-4 text-center">
							<p class="font-bold text-warning-500">Partial Dodge</p>
							<p class="text-sm opacity-75 mb-3">Choose one:</p>
							<div class="flex gap-2 justify-center">
								<button
									type="button"
									class="btn"
									class:variant-filled-warning={partialChoice === 'half'}
									class:variant-soft-surface={partialChoice !== 'half'}
									onclick={() => partialChoice = 'half'}
								>
									Take Half Damage
								</button>
								<button
									type="button"
									class="btn"
									class:variant-filled-warning={partialChoice === 'disoriented'}
									class:variant-soft-surface={partialChoice !== 'disoriented'}
									onclick={() => partialChoice = 'disoriented'}
								>
									Become Disoriented
								</button>
							</div>
						</div>
					{:else}
						<div class="card variant-soft-error p-4 text-center">
							<p class="font-bold text-error-500">Dodge Failed</p>
							<p class="text-sm opacity-75">
								{#if dodgeResult.disoriented}
									Full damage taken and you are disoriented.
								{:else}
									Full damage taken.
								{/if}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<footer class="flex justify-end gap-2 mt-6">
				<button type="button" class="btn variant-ghost" onclick={onClose}>Cancel</button>
				{#if step === 'result'}
					<button
						type="button"
						class="btn variant-filled-primary"
						onclick={handleConfirm}
						disabled={dodgeResult.isPartial && !partialChoice}
					>
						Apply Result
					</button>
				{/if}
			</footer>
		</div>
	</div>
{/if}
```

### Step 8.2: Update CombatMode to handle storedMisfortune from dodge

Modify `src/lib/components/combat/CombatMode.svelte`:

Update the `handleDodge` function:

```typescript
function handleDodge(result: { success: boolean; damageReduction: 'full' | 'half' | 'none'; disoriented: boolean; storedMisfortune?: boolean }) {
	combatStore.spendInitiative(player.id, 1)

	// Handle stored misfortune
	if (result.storedMisfortune) {
		combatStore.addMisfortune(player.id, 1)
	}

	activeModal = null
}
```

Update the DodgeModal usage to pass currentMisfortune:

```svelte
<DodgeModal
	isOpen={activeModal === 'dodge'}
	{player}
	currentInitiative={session.partyInitiativePool.current}
	currentMisfortune={session.misfortunePoints}
	onDodge={handleDodge}
	onClose={handleCloseModal}
/>
```

### Step 8.3: Run build to verify

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds

---

## Task 9: Run All Tests and Final Verification

**Files:** None (testing only)

### Step 9.1: Run all tests

```bash
npm run test -- --run
```

Expected: All tests pass

### Step 9.2: Run full build

```bash
npm run build
```

Expected: Build succeeds with no errors

### Step 9.3: Manual testing checklist

Test the following scenarios manually:

1. **Start combat** - Verify misfortune starts at 0
2. **Roll a critical failure on attack** - Verify CriticalFailModal appears with correct options
3. **Accept critical failure** - Verify normal crit fail effects, misfortune unchanged
4. **Store misfortune** - Verify roll is treated as normal failure, misfortune increases by 1
5. **GM spend misfortune** - Verify misfortune decreases and log entry added
6. **GM add misfortune manually** - Verify misfortune increases
7. **Dodge critical failure** - Verify same modal/options work for dodge

---

## Summary

This plan implements the complete Misfortune Points system:

1. **Model & Store Updates** - Added `misfortunePoints` to CombatSession with `addMisfortune` and `spendMisfortune` store methods
2. **CriticalFailModal** - Player choice modal when rolling crit fails (Accept vs Store)
3. **MisfortuneTracker** - Visual display of party misfortune with GM controls
4. **Critical Fail Utility** - Helper functions for determining consequences
5. **DiceRoller Integration** - Optional crit fail modal trigger on rolls
6. **Action Modal Integration** - AttackResolverModal and DodgeModal now support misfortune storage
7. **CombatMode Integration** - MisfortuneTracker displayed in combat UI with GM controls

The system follows game rules:
- Crit fails trigger player choice
- Accepting = full crit fail effects
- Storing = normal failure + 1 Misfortune
- Misfortune is party-wide and persists through combat
- GM can spend Misfortune (specific effects TBD by GM)
