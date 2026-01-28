# Fortune Points Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Fortune Points system that allows players to store critical successes for later use, and optionally convert critical failures using stored Fortune at the cost of Misfortune.

**Architecture:** Fortune and Misfortune points are stored both on the player (persistent across sessions) and in the combat session (for combat-specific tracking). When a critical success is rolled, a modal prompts the player to keep it or store Fortune. Fortune can be spent before or after any roll to convert it to a critical success. Using Fortune on a critical failure also stores Misfortune.

**Tech Stack:** Svelte 5 ($props, $state, $derived, $effect), Skeleton UI (cards, badges, buttons, modals), existing DiceRoller component, combat.store.ts, persisted.store.ts

---

## Task 1: Add Fortune/Misfortune to PlayerData Model

**Files:**
- Modify: `src/lib/models/player.ts`
- Modify: `src/lib/version.ts`

### Step 1.1: Update PlayerData type

Modify `src/lib/models/player.ts` to add fortune and misfortune fields after `notes`:

```typescript
export type PlayerData = {
	id: string
	schemaVersion: string
	level: number
	playerName: string
	characterName: string
	maxHealth: number
	health: number
	maxActionPoints: number
	actionPoints: number
	maxMagicka: number
	magicka: number
	birthSign: BirthSignName
	archetype: ArchetypeName
	majorSkills: Skill[]
	minorSkills: Skill[]
	subSkills: SubSkill[]
	race: RaceName
	knownSpells: string[]
	equipment: Equipment
	inventory: InventoryItem[]
	ownedWeapons: OwnedWeapon[]
	notes: string
	fortunePoints: number
	misfortunePoints: number
	createdAt: string
	updatedAt: string
}
```

### Step 1.2: Update defaultPlayerData

Add defaults for the new fields:

```typescript
export const defaultPlayerData: Omit<PlayerData, 'id'> = {
	schemaVersion: CHARACTER_SCHEMA_VERSION,
	level: 1,
	playerName: '',
	characterName: '',
	maxHealth: 0,
	health: 0,
	maxActionPoints: 0,
	actionPoints: 0,
	maxMagicka: 0,
	magicka: 0,
	birthSign: BirthSignName.Apprentice,
	archetype: ArchetypeName.Warrior,
	race: RaceName.Nord,
	majorSkills: [],
	minorSkills: [],
	subSkills: [],
	knownSpells: [],
	equipment: {
		weapon: { id: null, materialId: null },
		offhand: { id: null, materialId: null },
		armor: { id: null, materialId: null },
		accessories: [],
	},
	inventory: [],
	ownedWeapons: [],
	notes: '',
	fortunePoints: 0,
	misfortunePoints: 0,
	createdAt: '',
	updatedAt: '',
}
```

### Step 1.3: Bump schema version

Modify `src/lib/version.ts`:

```typescript
export const CHARACTER_SCHEMA_VERSION = '0.2.0'
```

### Step 1.4: Run type check

Run: `npm run check 2>&1 | head -30`
Expected: Type errors in files that don't provide fortunePoints/misfortunePoints (expected, will fix)

---

## Task 2: Add Fortune/Misfortune to CombatSession Model

**Files:**
- Modify: `src/lib/models/combat.ts`

### Step 2.1: Update CombatSession interface

Add fortune tracking fields to `CombatSession` in `src/lib/models/combat.ts`:

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
  // Fortune tracking (synced from player at combat start, updated during combat)
  fortunePoints: number
  misfortunePoints: number
}
```

### Step 2.2: Verify combat model compiles

Run: `npm run check 2>&1 | grep -i "combat.ts" | head -10`
Expected: Errors about missing fortunePoints in combat store (will fix next)

---

## Task 3: Update Combat Store with Fortune Methods

**Files:**
- Modify: `src/lib/stores/combat.store.ts`

### Step 3.1: Update startCombat to include fortune

In `src/lib/stores/combat.store.ts`, update the `startCombat` function signature and session creation:

```typescript
/**
 * Start a new combat session for a player
 */
startCombat: (
	playerId: string,
	partyInitiative: number,
	enemyInitiative: number,
	playerData: {
		health: number
		magicka: number
		maxActionPoints: number
		equipment?: Equipment
		fortunePoints?: number
		misfortunePoints?: number
	}
): void => {
	update((state) => {
		// ... existing equipment snapshot code ...

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
			fortunePoints: playerData.fortunePoints ?? 0,
			misfortunePoints: playerData.misfortunePoints ?? 0,
		}
		return { ...state, [playerId]: session }
	})
},
```

### Step 3.2: Update endCombat to return fortune

Update `endCombat` return type and implementation:

```typescript
/**
 * End combat session for a player
 */
endCombat: (playerId: string): {
	health: number
	magicka: number
	equipment: Equipment
	fortunePoints: number
	misfortunePoints: number
} | null => {
	let finalState: {
		health: number
		magicka: number
		equipment: Equipment
		fortunePoints: number
		misfortunePoints: number
	} | null = null

	update((state) => {
		const session = state[playerId]
		if (session) {
			finalState = {
				health: session.currentHP,
				magicka: session.currentMP,
				equipment: session.combatEquipment,
				fortunePoints: session.fortunePoints,
				misfortunePoints: session.misfortunePoints,
			}
		}
		const newState = { ...state }
		delete newState[playerId]
		return newState
	})

	return finalState
},
```

### Step 3.3: Add Fortune store methods

Add these new methods after `adjustEnemyInitiative`:

```typescript
/**
 * Gain a Fortune point (when storing a critical success)
 */
gainFortune: (playerId: string): void => {
	update((state) => {
		const session = state[playerId]
		if (!session) return state
		return {
			...state,
			[playerId]: {
				...session,
				fortunePoints: session.fortunePoints + 1,
				log: [...session.log, createCombatLogEntry('system', 'Stored 1 Fortune point')]
			}
		}
	})
},

/**
 * Spend a Fortune point (when using it on a roll)
 */
spendFortune: (playerId: string): boolean => {
	let spent = false
	update((state) => {
		const session = state[playerId]
		if (!session || session.fortunePoints <= 0) return state
		spent = true
		return {
			...state,
			[playerId]: {
				...session,
				fortunePoints: session.fortunePoints - 1,
				log: [...session.log, createCombatLogEntry('system', 'Spent 1 Fortune point')]
			}
		}
	})
	return spent
},

/**
 * Gain a Misfortune point (when a critical failure is stored or Fortune used on crit fail)
 */
gainMisfortune: (playerId: string): void => {
	update((state) => {
		const session = state[playerId]
		if (!session) return state
		return {
			...state,
			[playerId]: {
				...session,
				misfortunePoints: session.misfortunePoints + 1,
				log: [...session.log, createCombatLogEntry('system', 'Gained 1 Misfortune point (stored for GM)')]
			}
		}
	})
},

/**
 * Spend a Misfortune point (GM invokes it)
 */
spendMisfortune: (playerId: string): boolean => {
	let spent = false
	update((state) => {
		const session = state[playerId]
		if (!session || session.misfortunePoints <= 0) return state
		spent = true
		return {
			...state,
			[playerId]: {
				...session,
				misfortunePoints: session.misfortunePoints - 1,
				log: [...session.log, createCombatLogEntry('system', 'GM spent 1 Misfortune point')]
			}
		}
	})
	return spent
},
```

### Step 3.4: Run type check

Run: `npm run check 2>&1 | head -20`
Expected: Fewer errors now, remaining in CombatMode.svelte

---

## Task 4: Create FortuneChoiceModal Component

**Files:**
- Create: `src/lib/components/combat/modals/FortuneChoiceModal.svelte`

### Step 4.1: Create the FortuneChoiceModal

Create file `src/lib/components/combat/modals/FortuneChoiceModal.svelte`:

```svelte
<script lang="ts">
	import type { DiceRoll } from '$lib/models/combat'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		roll: DiceRoll
		targetDC?: number
		rollType: string // e.g., "Attack", "Spell", "Dodge"
		onKeepCrit: () => void
		onStoreFortune: () => void
	}

	let { isOpen, roll, targetDC, rollType, onKeepCrit, onStoreFortune }: Props = $props()

	// Calculate if the roll would still succeed without the crit bonus
	let wouldSucceedNormally = $derived.by(() => {
		if (targetDC === undefined) return true
		return roll.total >= targetDC
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="mb-4">
				<h2 class="h3 text-warning-500">Critical Success!</h2>
				<p class="text-sm opacity-75">{rollType} Roll</p>
			</header>

			<div class="space-y-4">
				<!-- Show the roll result -->
				<RollResult {roll} {targetDC} />

				<div class="card variant-soft-warning p-4">
					<p class="text-sm mb-2">You rolled a critical success! Choose one:</p>
				</div>

				<div class="grid grid-cols-1 gap-3">
					<!-- Keep Critical Option -->
					<button
						type="button"
						class="btn variant-filled-success w-full text-left p-4 h-auto"
						onclick={onKeepCrit}
					>
						<div class="flex flex-col items-start">
							<span class="font-bold text-lg">Keep Critical Success</span>
							<span class="text-sm opacity-90">
								Gain the full critical benefits for this {rollType.toLowerCase()}
							</span>
						</div>
					</button>

					<!-- Store Fortune Option -->
					<button
						type="button"
						class="btn variant-filled-tertiary w-full text-left p-4 h-auto"
						onclick={onStoreFortune}
					>
						<div class="flex flex-col items-start">
							<span class="font-bold text-lg">Store Fortune Point</span>
							<span class="text-sm opacity-90">
								{#if wouldSucceedNormally}
									Roll succeeds normally (no crit bonus). Gain 1 Fortune point.
								{:else}
									Roll fails normally. Gain 1 Fortune point for later.
								{/if}
							</span>
						</div>
					</button>
				</div>

				<div class="card variant-soft-surface p-3 text-xs">
					<p class="font-semibold mb-1">Fortune Points:</p>
					<p>Can be spent before or after any roll to convert it into a critical success.</p>
				</div>
			</div>
		</div>
	</div>
{/if}
```

---

## Task 5: Create MisfortuneChoiceModal Component

**Files:**
- Create: `src/lib/components/combat/modals/MisfortuneChoiceModal.svelte`

### Step 5.1: Create the MisfortuneChoiceModal

Create file `src/lib/components/combat/modals/MisfortuneChoiceModal.svelte`:

```svelte
<script lang="ts">
	import type { DiceRoll } from '$lib/models/combat'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		roll: DiceRoll
		targetDC?: number
		rollType: string
		onAcceptCritFail: () => void
		onStoreMisfortune: () => void
	}

	let { isOpen, roll, targetDC, rollType, onAcceptCritFail, onStoreMisfortune }: Props = $props()
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="mb-4">
				<h2 class="h3 text-error-500">Critical Failure!</h2>
				<p class="text-sm opacity-75">{rollType} Roll</p>
			</header>

			<div class="space-y-4">
				<!-- Show the roll result -->
				<RollResult {roll} {targetDC} />

				<div class="card variant-soft-error p-4">
					<p class="text-sm mb-2">You rolled a critical failure! Choose one:</p>
				</div>

				<div class="grid grid-cols-1 gap-3">
					<!-- Accept Critical Failure Option -->
					<button
						type="button"
						class="btn variant-filled-error w-full text-left p-4 h-auto"
						onclick={onAcceptCritFail}
					>
						<div class="flex flex-col items-start">
							<span class="font-bold text-lg">Accept Critical Failure</span>
							<span class="text-sm opacity-90">
								Suffer the full critical failure consequences
							</span>
						</div>
					</button>

					<!-- Store Misfortune Option -->
					<button
						type="button"
						class="btn variant-filled-warning w-full text-left p-4 h-auto"
						onclick={onStoreMisfortune}
					>
						<div class="flex flex-col items-start">
							<span class="font-bold text-lg">Store Misfortune Point</span>
							<span class="text-sm opacity-90">
								Roll counts as normal failure. GM gains 1 Misfortune point to use later.
							</span>
						</div>
					</button>
				</div>

				<div class="card variant-soft-surface p-3 text-xs">
					<p class="font-semibold mb-1">Misfortune Points:</p>
					<p>The GM tracks these and can invoke them at dramatically appropriate moments.</p>
				</div>
			</div>
		</div>
	</div>
{/if}
```

---

## Task 6: Create UseFortuneModal Component

**Files:**
- Create: `src/lib/components/combat/modals/UseFortuneModal.svelte`

### Step 6.1: Create the UseFortuneModal

Create file `src/lib/components/combat/modals/UseFortuneModal.svelte`:

```svelte
<script lang="ts">
	import type { DiceRoll } from '$lib/models/combat'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		fortunePoints: number
		roll?: DiceRoll
		targetDC?: number
		rollType: string
		isCriticalFail: boolean
		onUseFortune: () => void
		onDecline: () => void
	}

	let { isOpen, fortunePoints, roll, targetDC, rollType, isCriticalFail, onUseFortune, onDecline }: Props = $props()
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="mb-4">
				<h2 class="h3">Use Fortune Point?</h2>
				<div class="flex gap-2 mt-2">
					<span class="badge variant-filled-tertiary">Fortune: {fortunePoints}</span>
				</div>
			</header>

			<div class="space-y-4">
				{#if roll}
					<RollResult {roll} {targetDC} />
				{/if}

				<div class="card variant-soft-tertiary p-4">
					<p class="text-sm">
						{#if isCriticalFail}
							Replace this critical failure with a critical success?
							<span class="text-warning-500 font-semibold">
								Warning: This will also store 1 Misfortune point.
							</span>
						{:else}
							Replace this roll with a critical success?
						{/if}
					</p>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<button
						type="button"
						class="btn variant-filled-tertiary"
						onclick={onUseFortune}
					>
						{#if isCriticalFail}
							Use Fortune (+Misfortune)
						{:else}
							Use Fortune
						{/if}
					</button>

					<button
						type="button"
						class="btn variant-ghost"
						onclick={onDecline}
					>
						Keep Roll
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
```

---

## Task 7: Create FortuneDisplay Component

**Files:**
- Create: `src/lib/components/combat/FortuneDisplay.svelte`

### Step 7.1: Create the FortuneDisplay component

Create file `src/lib/components/combat/FortuneDisplay.svelte`:

```svelte
<script lang="ts">
	interface Props {
		fortunePoints: number
		misfortunePoints: number
		onSpendMisfortune?: () => void
	}

	let { fortunePoints, misfortunePoints, onSpendMisfortune }: Props = $props()
</script>

<div class="fortune-display card p-4 variant-soft-surface">
	<h3 class="h4 mb-3">Fortune & Misfortune</h3>

	<div class="grid grid-cols-2 gap-4">
		<!-- Fortune Points -->
		<div class="text-center">
			<div class="text-3xl font-bold text-tertiary-500">{fortunePoints}</div>
			<div class="text-sm opacity-75">Fortune</div>
			<div class="text-xs mt-1 opacity-50">Use on any roll</div>
		</div>

		<!-- Misfortune Points -->
		<div class="text-center">
			<div class="text-3xl font-bold text-warning-500">{misfortunePoints}</div>
			<div class="text-sm opacity-75">Misfortune</div>
			{#if misfortunePoints > 0 && onSpendMisfortune}
				<button
					type="button"
					class="btn btn-sm variant-ghost-warning mt-1"
					onclick={onSpendMisfortune}
				>
					GM Spend
				</button>
			{:else}
				<div class="text-xs mt-1 opacity-50">GM controlled</div>
			{/if}
		</div>
	</div>
</div>
```

---

## Task 8: Update DiceRoller with Fortune Integration

**Files:**
- Modify: `src/lib/components/combat/DiceRoller/DiceRoller.svelte`

### Step 8.1: Add fortune props to DiceRoller

Update the Props interface and add new state in `src/lib/components/combat/DiceRoller/DiceRoller.svelte`:

```svelte
<script lang="ts">
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton'
	import type { DiceRoll, DiceRollBonus } from '$lib/models/combat'
	import type { SubSkill } from '$lib/models/subskill'
	import { rollD20, isCriticalSuccess, isCriticalFailure, performSkillCheck } from '$lib/util/dice.util'
	import { getSubskillBonus } from '$lib/util/stats.util'
	import RollResult from './RollResult.svelte'
	import ManualEntry from './ManualEntry.svelte'
	import SubskillPicker from '$lib/components/subskills/SubskillPicker.svelte'

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
		// Fortune integration
		fortunePoints?: number
		onUseFortune?: () => void
		showFortuneOption?: boolean
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
		fortunePoints = 0,
		onUseFortune,
		showFortuneOption = false,
	}: Props = $props()

	// ... existing state ...
	let mode: 'digital' | 'manual' = $state('digital')
	let lastRoll: DiceRoll | undefined = $state(undefined)
	let lastSuccess: boolean | undefined = $state(undefined)
	let isRolling: boolean = $state(false)
	let selectedSubskill: SubSkill | null = $state(null)

	let subskillBonus = $derived(selectedSubskill ? getSubskillBonus(playerLevel) : 0)

	// Fortune pre-roll option
	let showFortunePreRoll = $state(false)

	function handleUseFortunePreRoll() {
		if (onUseFortune && fortunePoints > 0) {
			onUseFortune()
			showFortunePreRoll = false
		}
	}

	// ... rest of existing functions ...
```

### Step 8.2: Add fortune button to template

Add before the Roll Controls section:

```svelte
<!-- Fortune Pre-Roll Option -->
{#if showFortuneOption && fortunePoints > 0 && !lastRoll}
	<div class="mb-4">
		{#if showFortunePreRoll}
			<div class="card variant-soft-tertiary p-3 space-y-2">
				<p class="text-sm">Use Fortune before rolling for automatic critical success?</p>
				<div class="flex gap-2">
					<button
						type="button"
						class="btn btn-sm variant-filled-tertiary"
						onclick={handleUseFortunePreRoll}
					>
						Use Fortune ({fortunePoints})
					</button>
					<button
						type="button"
						class="btn btn-sm variant-ghost"
						onclick={() => showFortunePreRoll = false}
					>
						Roll Normally
					</button>
				</div>
			</div>
		{:else}
			<button
				type="button"
				class="btn btn-sm variant-ghost-tertiary w-full"
				onclick={() => showFortunePreRoll = true}
			>
				Use Fortune Point? ({fortunePoints} available)
			</button>
		{/if}
	</div>
{/if}
```

---

## Task 9: Update CombatMode with Fortune Integration

**Files:**
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 9.1: Import new components

Add imports at the top of `src/lib/components/combat/CombatMode.svelte`:

```typescript
import FortuneDisplay from './FortuneDisplay.svelte'
import FortuneChoiceModal from './modals/FortuneChoiceModal.svelte'
import MisfortuneChoiceModal from './modals/MisfortuneChoiceModal.svelte'
import UseFortuneModal from './modals/UseFortuneModal.svelte'
```

### Step 9.2: Add fortune-related state

Add after the existing turn-based state:

```typescript
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
```

### Step 9.3: Add fortune handlers

Add after existing handlers:

```typescript
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
```

### Step 9.4: Update handleCombatStarted

Update to pass fortune data:

```typescript
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
			fortunePoints: player.fortunePoints,
			misfortunePoints: player.misfortunePoints,
		}
	)
	showEnterCombatModal = false
}
```

### Step 9.5: Update onCombatEnded type

Update the Props interface:

```typescript
interface Props {
	player: PlayerData
	onCombatEnded?: (data: {
		health: number
		magicka: number
		equipment: Equipment
		fortunePoints: number
		misfortunePoints: number
	}) => void
}
```

### Step 9.6: Add FortuneDisplay to template

Add in the left column after ConditionTracker:

```svelte
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

	<FortuneDisplay
		fortunePoints={session.fortunePoints}
		misfortunePoints={session.misfortunePoints}
		onSpendMisfortune={() => combatStore.spendMisfortune(player.id)}
	/>
</div>
```

### Step 9.7: Add fortune modals to template

Add at the bottom with other modals:

```svelte
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
```

---

## Task 10: Update Player Schema and Character Creation

**Files:**
- Modify: `src/lib/schema/player.schema.ts`
- Modify: `src/routes/create/+page.server.ts`

### Step 10.1: Update player schema

Add to `src/lib/schema/player.schema.ts`:

```typescript
// Add after notes field
fortunePoints: z.number().int().min(0).default(0),
misfortunePoints: z.number().int().min(0).default(0),
```

### Step 10.2: Update character creation

In `src/routes/create/+page.server.ts`, ensure new characters get fortune fields:

```typescript
const newPlayer: PlayerData = {
	...form.data,
	id: crypto.randomUUID(),
	schemaVersion: CHARACTER_SCHEMA_VERSION,
	level: 1,
	// ... existing fields ...
	fortunePoints: 0,
	misfortunePoints: 0,
	createdAt: now,
	updatedAt: now,
}
```

---

## Task 11: Update Player Page to Persist Fortune Changes

**Files:**
- Modify: `src/routes/player/[id]/+page.svelte`

### Step 11.1: Update onCombatEnded handler

Find the `handleCombatEnded` function and update it:

```typescript
function handleCombatEnded(data: {
	health: number
	magicka: number
	equipment: Equipment
	fortunePoints: number
	misfortunePoints: number
}) {
	playersStore.update((players) => {
		if (!players[id]) return players
		return {
			...players,
			[id]: {
				...players[id],
				health: data.health,
				magicka: data.magicka,
				equipment: data.equipment,
				fortunePoints: data.fortunePoints,
				misfortunePoints: data.misfortunePoints,
				updatedAt: new Date().toISOString(),
			},
		}
	})
}
```

---

## Task 12: Add Fortune Display to Player View (Non-Combat)

**Files:**
- Modify: `src/routes/player/[id]/+page.svelte`

### Step 12.1: Add fortune display outside combat

In the player view template, add a fortune display section (perhaps near the character stats):

```svelte
<!-- Fortune Points (visible outside combat) -->
{#if player}
	<div class="card p-4 variant-soft-surface">
		<div class="flex justify-between items-center">
			<div>
				<span class="font-semibold">Fortune:</span>
				<span class="text-tertiary-500 font-bold">{player.fortunePoints}</span>
			</div>
			<div>
				<span class="font-semibold">Misfortune:</span>
				<span class="text-warning-500 font-bold">{player.misfortunePoints}</span>
			</div>
		</div>
	</div>
{/if}
```

---

## Task 13: Write Tests for Fortune Store Methods

**Files:**
- Modify: `src/lib/stores/combat.store.test.ts`

### Step 13.1: Add fortune tests

Add a new describe block to `src/lib/stores/combat.store.test.ts`:

```typescript
describe('Combat Store - Fortune System', () => {
	const mockPlayerData = {
		id: 'player-1',
		health: 100,
		magicka: 50,
		maxActionPoints: 5,
		fortunePoints: 2,
		misfortunePoints: 1,
	}

	beforeEach(() => {
		localStorageMock.clear()
		combatStore.endCombat('player-1')
	})

	it('should initialize fortune points from player data', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData)

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.fortunePoints).toBe(2)
		expect(session.misfortunePoints).toBe(1)
	})

	it('should gain fortune points', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData)
		combatStore.gainFortune('player-1')

		const state = get(combatStore)
		expect(state['player-1'].fortunePoints).toBe(3)
	})

	it('should spend fortune points', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData)
		const spent = combatStore.spendFortune('player-1')

		const state = get(combatStore)
		expect(spent).toBe(true)
		expect(state['player-1'].fortunePoints).toBe(1)
	})

	it('should not spend fortune when none available', () => {
		combatStore.startCombat('player-1', 3, 2, { ...mockPlayerData, fortunePoints: 0 })
		const spent = combatStore.spendFortune('player-1')

		expect(spent).toBe(false)
	})

	it('should gain misfortune points', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData)
		combatStore.gainMisfortune('player-1')

		const state = get(combatStore)
		expect(state['player-1'].misfortunePoints).toBe(2)
	})

	it('should spend misfortune points', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData)
		const spent = combatStore.spendMisfortune('player-1')

		const state = get(combatStore)
		expect(spent).toBe(true)
		expect(state['player-1'].misfortunePoints).toBe(0)
	})

	it('should return fortune in endCombat result', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData)
		combatStore.gainFortune('player-1')
		combatStore.gainMisfortune('player-1')

		const result = combatStore.endCombat('player-1')

		expect(result).toBeDefined()
		expect(result!.fortunePoints).toBe(3)
		expect(result!.misfortunePoints).toBe(2)
	})

	it('should log fortune transactions', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData)
		const initialLogLength = get(combatStore)['player-1'].log.length

		combatStore.gainFortune('player-1')

		const state = get(combatStore)
		expect(state['player-1'].log.length).toBe(initialLogLength + 1)
		expect(state['player-1'].log[state['player-1'].log.length - 1].description).toContain('Fortune')
	})
})
```

---

## Task 14: Run Build and Fix Any Remaining Issues

### Step 14.1: Run type check

Run: `npm run check`
Expected: No TypeScript errors

### Step 14.2: Run tests

Run: `npm test`
Expected: All tests pass

### Step 14.3: Run build

Run: `npm run build`
Expected: Build succeeds

---

## Task 15: Final Cleanup and Documentation

### Step 15.1: Update migration utility if needed

If `src/lib/util/migration.util.ts` exists, add migration for fortune fields:

```typescript
// Add default fortune fields if missing
if (player.fortunePoints === undefined) {
	player.fortunePoints = 0
}
if (player.misfortunePoints === undefined) {
	player.misfortunePoints = 0
}
```

### Step 15.2: Manual testing checklist

1. Create new character - verify fortunePoints: 0, misfortunePoints: 0
2. Enter combat - verify fortune display shows
3. Roll a critical success - verify FortuneChoiceModal appears
4. Store fortune - verify fortune count increases
5. Roll a critical failure - verify MisfortuneChoiceModal appears
6. Store misfortune - verify misfortune count increases
7. Roll and fail - verify UseFortuneModal appears when fortune > 0
8. Use fortune on failure - verify converts to crit success
9. Use fortune on crit fail - verify both fortune spent and misfortune gained
10. End combat - verify fortune/misfortune persists to player data

---

## Summary

This plan implements the complete Fortune Points system:

1. **Data Model Updates** - Fortune and Misfortune fields added to PlayerData and CombatSession
2. **Combat Store Methods** - gainFortune, spendFortune, gainMisfortune, spendMisfortune
3. **UI Components**:
   - FortuneChoiceModal - Choose to keep crit or store Fortune
   - MisfortuneChoiceModal - Choose to accept crit fail or store Misfortune
   - UseFortuneModal - Offer to spend Fortune on failed/crit-failed rolls
   - FortuneDisplay - Show current Fortune/Misfortune counts
4. **Integration** - DiceRoller and CombatMode updated to trigger fortune system
5. **Persistence** - Fortune values sync between combat and player data
6. **Tests** - Comprehensive test coverage for store methods

The system follows the game rules:
- Critical successes offer choice: keep benefits or store Fortune
- Critical failures offer choice: accept consequences or store Misfortune (for GM)
- Fortune can be used before or after any roll for automatic crit success
- Using Fortune on a critical failure also stores Misfortune
