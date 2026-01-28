# Spirit Points System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Spirit Points system that serves as a "second chance" mechanic when HP drops to zero. Players have spirit points derived from their level that allow them to reset all resources and continue fighting when they would otherwise fall unconscious.

**Game Rules (from docs/Game Flow Rules):**
- Spirit points = floor(level / 4), minimum 1
- When HP drops to 0 or below, immediately roll a complication
- If spirit points remain: spend one, reset HP/MP/AP to their maximums
- Spirit points restore: one per full night's rest (requires food and comfort)
- Out of spirit points at 0 HP = unconscious/dying (needs ally healing check)

**Architecture:**
- Add `maxSpiritPoints` (derived) and `currentSpiritPoints` to PlayerData
- Add `currentSpiritPoints` to CombatSession for combat tracking
- Modify `takeDamage` to detect HP <= 0 and trigger spirit point flow
- Create "Spirit Recovery" modal for the death/recovery UX
- Add spirit points display to ResourceBars component
- Create rest action to restore spirit points outside combat

**Tech Stack:** SvelteKit, Svelte 5 runes, Vitest, Skeleton UI, localStorage persistence

---

## Task 1: Add Spirit Point Utility Functions

**Files:**
- Create: `src/lib/util/spiritPoints.util.ts`
- Create: `src/lib/util/spiritPoints.util.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/util/spiritPoints.util.test.ts
import { describe, it, expect } from 'vitest'
import { calculateMaxSpiritPoints } from './spiritPoints.util'

describe('Spirit Points Utility', () => {
	describe('calculateMaxSpiritPoints', () => {
		it('should return 1 for level 1', () => {
			expect(calculateMaxSpiritPoints(1)).toBe(1)
		})

		it('should return 1 for levels 1-4 (minimum is 1)', () => {
			expect(calculateMaxSpiritPoints(1)).toBe(1)
			expect(calculateMaxSpiritPoints(2)).toBe(1)
			expect(calculateMaxSpiritPoints(3)).toBe(1)
			expect(calculateMaxSpiritPoints(4)).toBe(1)
		})

		it('should return 1 for levels 5-7 (floor of 5/4 = 1)', () => {
			expect(calculateMaxSpiritPoints(5)).toBe(1)
			expect(calculateMaxSpiritPoints(6)).toBe(1)
			expect(calculateMaxSpiritPoints(7)).toBe(1)
		})

		it('should return 2 for levels 8-11', () => {
			expect(calculateMaxSpiritPoints(8)).toBe(2)
			expect(calculateMaxSpiritPoints(9)).toBe(2)
			expect(calculateMaxSpiritPoints(10)).toBe(2)
			expect(calculateMaxSpiritPoints(11)).toBe(2)
		})

		it('should return 3 for levels 12-15', () => {
			expect(calculateMaxSpiritPoints(12)).toBe(3)
			expect(calculateMaxSpiritPoints(13)).toBe(3)
			expect(calculateMaxSpiritPoints(14)).toBe(3)
			expect(calculateMaxSpiritPoints(15)).toBe(3)
		})

		it('should return 4 for levels 16-19', () => {
			expect(calculateMaxSpiritPoints(16)).toBe(4)
			expect(calculateMaxSpiritPoints(17)).toBe(4)
			expect(calculateMaxSpiritPoints(18)).toBe(4)
			expect(calculateMaxSpiritPoints(19)).toBe(4)
		})

		it('should return 5 for level 20', () => {
			expect(calculateMaxSpiritPoints(20)).toBe(5)
		})

		it('should handle edge case of level 0 (return minimum 1)', () => {
			expect(calculateMaxSpiritPoints(0)).toBe(1)
		})
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/util/spiritPoints.util.test.ts`
Expected: FAIL with "calculateMaxSpiritPoints is not defined"

**Step 3: Write minimal implementation**

```typescript
// src/lib/util/spiritPoints.util.ts

/**
 * Calculate the maximum spirit points for a given level.
 * Formula: floor(level / 4), minimum 1
 *
 * Spirit points serve as "second chances" - when HP drops to 0,
 * a spirit point can be spent to reset HP/MP/AP to max.
 */
export function calculateMaxSpiritPoints(level: number): number {
	return Math.max(1, Math.floor(level / 4))
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/util/spiritPoints.util.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/util/spiritPoints.util.ts src/lib/util/spiritPoints.util.test.ts
git commit -m "feat: add spirit points calculation utility"
```

---

## Task 2: Add Spirit Points to PlayerData Model

**Files:**
- Modify: `src/lib/models/player.ts`
- Modify: `src/lib/util/migration.util.ts`
- Modify: `src/lib/util/migration.util.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/util/migration.util.test.ts - Add new test cases

describe('Spirit Points Migration', () => {
	it('should add currentSpiritPoints based on level if missing', () => {
		const legacyPlayer = {
			id: 'test-id',
			level: 8, // Should have max 2 spirit points
			playerName: 'Test',
			characterName: 'Hero',
			equipment: {
				weapon: { id: null, materialId: null },
				offhand: { id: null, materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			},
			inventory: [],
			ownedWeapons: []
			// Note: no currentSpiritPoints field
		} as unknown as PlayerData

		const migrated = migratePlayerData(legacyPlayer)

		expect(migrated.currentSpiritPoints).toBeDefined()
		expect(migrated.currentSpiritPoints).toBe(2) // max for level 8
	})

	it('should preserve existing currentSpiritPoints', () => {
		const player = {
			id: 'test-id',
			level: 12, // Max 3 spirit points
			currentSpiritPoints: 1, // Player has only 1 remaining
			equipment: {
				weapon: { id: null, materialId: null },
				offhand: { id: null, materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			},
			inventory: [],
			ownedWeapons: []
		} as unknown as PlayerData

		const migrated = migratePlayerData(player)

		expect(migrated.currentSpiritPoints).toBe(1)
	})

	it('should cap currentSpiritPoints to max if over limit', () => {
		const player = {
			id: 'test-id',
			level: 4, // Max 1 spirit point
			currentSpiritPoints: 5, // Invalid - over max
			equipment: {
				weapon: { id: null, materialId: null },
				offhand: { id: null, materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			},
			inventory: [],
			ownedWeapons: []
		} as unknown as PlayerData

		const migrated = migratePlayerData(player)

		expect(migrated.currentSpiritPoints).toBe(1) // Capped to max
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/util/migration.util.test.ts`
Expected: FAIL - currentSpiritPoints not defined on PlayerData

**Step 3: Write minimal implementation**

```typescript
// src/lib/models/player.ts - Add to PlayerData type (after magicka: number)

	currentSpiritPoints: number
```

```typescript
// src/lib/models/player.ts - Add to defaultPlayerData (after magicka: 0)

	currentSpiritPoints: 1,
```

```typescript
// src/lib/util/migration.util.ts - Add import at top
import { calculateMaxSpiritPoints } from './spiritPoints.util'
```

```typescript
// src/lib/util/migration.util.ts - Add to migratePlayerData function (before return)

	// Migrate spirit points - add max if missing, cap if over max
	const maxSpiritPoints = calculateMaxSpiritPoints(player.level)
	let currentSpiritPoints = playerAny.currentSpiritPoints
	if (currentSpiritPoints === undefined) {
		currentSpiritPoints = maxSpiritPoints
	} else {
		currentSpiritPoints = Math.min(currentSpiritPoints, maxSpiritPoints)
	}
```

```typescript
// src/lib/util/migration.util.ts - Update return statement to include currentSpiritPoints

	return {
		...player,
		equipment: migratePlayerEquipment(player.equipment as Equipment | LegacyEquipment),
		ownedWeapons,
		currentSpiritPoints,
	}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/util/migration.util.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/models/player.ts src/lib/util/migration.util.ts src/lib/util/migration.util.test.ts
git commit -m "feat: add currentSpiritPoints to PlayerData with migration"
```

---

## Task 3: Add Spirit Points to CombatSession

**Files:**
- Modify: `src/lib/models/combat.ts`
- Modify: `src/lib/stores/combat.store.ts`
- Modify: `src/lib/stores/combat.store.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/stores/combat.store.test.ts - Add new describe block

describe('Combat Store - Spirit Points', () => {
	const mockPlayerData = {
		id: 'player-1',
		level: 8, // Max 2 spirit points
		health: 100,
		maxHealth: 100,
		magicka: 50,
		maxMagicka: 50,
		actionPoints: 5,
		maxActionPoints: 5,
		currentSpiritPoints: 2,
		equipment: {
			weapon: { id: null, materialId: null },
			offhand: { id: null, materialId: null },
			armor: { id: null, materialId: null },
			accessories: []
		}
	}

	beforeEach(() => {
		localStorageMock.clear()
		combatStore.endCombat('player-1')
	})

	it('should store current spirit points when combat starts', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.currentSpiritPoints).toBe(2)
	})

	it('should store max spirit points based on level when combat starts', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.maxSpiritPoints).toBe(2) // Level 8 = floor(8/4) = 2
	})

	it('should return spirit points state when combat ends', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const result = combatStore.endCombat('player-1')

		expect(result).toBeDefined()
		expect(result!.currentSpiritPoints).toBe(2)
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/stores/combat.store.test.ts`
Expected: FAIL - currentSpiritPoints not on CombatSession

**Step 3: Write minimal implementation**

```typescript
// src/lib/models/combat.ts - Add to CombatSession interface (after maxAP: number)

  currentSpiritPoints: number
  maxSpiritPoints: number
```

```typescript
// src/lib/stores/combat.store.ts - Add import
import { calculateMaxSpiritPoints } from '$lib/util/spiritPoints.util'
```

```typescript
// src/lib/stores/combat.store.ts - Modify startCombat signature
// Change from:
startCombat: (
	playerId: string,
	partyInitiative: number,
	enemyInitiative: number,
	playerData: { health: number; magicka: number; maxActionPoints: number; equipment?: Equipment }
): void => {

// To:
startCombat: (
	playerId: string,
	partyInitiative: number,
	enemyInitiative: number,
	playerData: {
		health: number
		magicka: number
		maxActionPoints: number
		equipment?: Equipment
		level: number
		currentSpiritPoints: number
	}
): void => {
```

```typescript
// src/lib/stores/combat.store.ts - Add to session creation in startCombat (after maxAP)

				const maxSpiritPoints = calculateMaxSpiritPoints(playerData.level)
				const session: CombatSession = {
					// ... existing fields ...
					maxAP: playerData.maxActionPoints,
					currentSpiritPoints: playerData.currentSpiritPoints,
					maxSpiritPoints,
					// ... rest of fields ...
				}
```

```typescript
// src/lib/stores/combat.store.ts - Update endCombat return type and value
// Change from:
endCombat: (playerId: string): { health: number; magicka: number; equipment: Equipment } | null => {
	let finalState: { health: number; magicka: number; equipment: Equipment } | null = null

// To:
endCombat: (playerId: string): { health: number; magicka: number; equipment: Equipment; currentSpiritPoints: number } | null => {
	let finalState: { health: number; magicka: number; equipment: Equipment; currentSpiritPoints: number } | null = null

// And update the if block:
if (session) {
	finalState = {
		health: session.currentHP,
		magicka: session.currentMP,
		equipment: session.combatEquipment,
		currentSpiritPoints: session.currentSpiritPoints,
	}
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/stores/combat.store.test.ts`
Expected: PASS

**Step 5: Update combat start calls across codebase**

Search for all usages of `combatStore.startCombat` and update them to include `level` and `currentSpiritPoints`:

```typescript
// src/routes/[id]/+page.svelte - Update handleEnterCombatFromPage
combatStore.startCombat(
	currentPlayer.id,
	partyInit,
	enemyInit,
	{
		health: currentPlayer.health,
		magicka: currentPlayer.magicka,
		maxActionPoints: currentPlayer.maxActionPoints,
		equipment: currentPlayer.equipment,
		level: currentPlayer.level,
		currentSpiritPoints: currentPlayer.currentSpiritPoints,
	}
)
```

**Step 6: Commit**

```bash
git add src/lib/models/combat.ts src/lib/stores/combat.store.ts src/lib/stores/combat.store.test.ts src/routes/[id]/+page.svelte
git commit -m "feat: add spirit points tracking to combat session"
```

---

## Task 4: Create Spirit Recovery Modal Component

**Files:**
- Create: `src/lib/components/combat/modals/SpiritRecoveryModal.svelte`
- Create: `src/lib/components/combat/modals/SpiritRecoveryModal.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/components/combat/modals/SpiritRecoveryModal.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import SpiritRecoveryModal from './SpiritRecoveryModal.svelte'

describe('SpiritRecoveryModal', () => {
	it('should render with spirit points remaining message', () => {
		const { getByText } = render(SpiritRecoveryModal, {
			props: {
				currentSpiritPoints: 2,
				maxSpiritPoints: 3,
				characterName: 'Dovahkiin',
				onspend: vi.fn(),
				onfall: vi.fn()
			}
		})

		expect(getByText(/Dovahkiin has fallen!/i)).toBeTruthy()
		expect(getByText(/2 spirit points remaining/i)).toBeTruthy()
	})

	it('should show dying message when no spirit points', () => {
		const { getByText } = render(SpiritRecoveryModal, {
			props: {
				currentSpiritPoints: 0,
				maxSpiritPoints: 2,
				characterName: 'Dovahkiin',
				onspend: vi.fn(),
				onfall: vi.fn()
			}
		})

		expect(getByText(/unconscious and dying/i)).toBeTruthy()
	})

	it('should call onspend when Rise Again clicked', async () => {
		const onspend = vi.fn()
		const { getByText } = render(SpiritRecoveryModal, {
			props: {
				currentSpiritPoints: 1,
				maxSpiritPoints: 2,
				characterName: 'Dovahkiin',
				onspend,
				onfall: vi.fn()
			}
		})

		await fireEvent.click(getByText('Rise Again'))
		expect(onspend).toHaveBeenCalled()
	})

	it('should disable Rise Again button when no spirit points', () => {
		const { getByText } = render(SpiritRecoveryModal, {
			props: {
				currentSpiritPoints: 0,
				maxSpiritPoints: 2,
				characterName: 'Dovahkiin',
				onspend: vi.fn(),
				onfall: vi.fn()
			}
		})

		const button = getByText('Rise Again')
		expect(button.hasAttribute('disabled')).toBe(true)
	})

	it('should call onfall when Fall Unconscious clicked', async () => {
		const onfall = vi.fn()
		const { getByText } = render(SpiritRecoveryModal, {
			props: {
				currentSpiritPoints: 0,
				maxSpiritPoints: 2,
				characterName: 'Dovahkiin',
				onspend: vi.fn(),
				onfall
			}
		})

		await fireEvent.click(getByText('Fall Unconscious'))
		expect(onfall).toHaveBeenCalled()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/components/combat/modals/SpiritRecoveryModal.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```svelte
<!-- src/lib/components/combat/modals/SpiritRecoveryModal.svelte -->
<script lang="ts">
	interface Props {
		currentSpiritPoints: number
		maxSpiritPoints: number
		characterName: string
		onspend: () => void
		onfall: () => void
	}

	let { currentSpiritPoints, maxSpiritPoints, characterName, onspend, onfall }: Props = $props()

	let hasSpiritPoints = $derived(currentSpiritPoints > 0)
</script>

<div class="card p-6 w-full max-w-md">
	<header class="mb-4 text-center">
		<div class="text-6xl mb-2">💀</div>
		<h3 class="h3 font-bold text-error-500">{characterName} has fallen!</h3>
	</header>

	<div class="space-y-4 mb-6">
		{#if hasSpiritPoints}
			<p class="text-center">
				Your HP has dropped to zero, but your spirit endures.
			</p>
			<div class="bg-surface-700 rounded-lg p-4 text-center">
				<div class="text-sm text-surface-400">Spirit Points</div>
				<div class="text-2xl font-bold text-primary-400">
					{currentSpiritPoints} / {maxSpiritPoints}
				</div>
				<div class="text-sm text-surface-400 mt-1">
					{currentSpiritPoints} spirit point{currentSpiritPoints !== 1 ? 's' : ''} remaining
				</div>
			</div>
			<p class="text-sm text-surface-400 text-center">
				Spend a spirit point to reset HP, MP, and AP to maximum and continue fighting!
			</p>
		{:else}
			<p class="text-center text-error-400">
				You are <strong>unconscious and dying</strong>.
			</p>
			<div class="bg-surface-700 rounded-lg p-4 text-center">
				<div class="text-sm text-surface-400">Spirit Points</div>
				<div class="text-2xl font-bold text-error-400">
					0 / {maxSpiritPoints}
				</div>
				<div class="text-sm text-surface-400 mt-1">
					No spirit points remaining
				</div>
			</div>
			<p class="text-sm text-surface-400 text-center">
				An ally must succeed a healing check to stabilize you.
			</p>
		{/if}
	</div>

	<div class="bg-warning-900/30 border border-warning-500/50 rounded-lg p-3 mb-6">
		<p class="text-sm text-warning-300 text-center">
			<strong>Complication Roll Required!</strong><br/>
			Roll 1d10 to determine what stat is reduced.
		</p>
	</div>

	<footer class="flex justify-center gap-3">
		<button
			type="button"
			class="btn variant-filled-primary"
			disabled={!hasSpiritPoints}
			onclick={onspend}
		>
			Rise Again
		</button>
		<button
			type="button"
			class="btn variant-ghost-error"
			onclick={onfall}
		>
			Fall Unconscious
		</button>
	</footer>
</div>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/components/combat/modals/SpiritRecoveryModal.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/components/combat/modals/SpiritRecoveryModal.svelte src/lib/components/combat/modals/SpiritRecoveryModal.test.ts
git commit -m "feat: add SpiritRecoveryModal component for death/recovery flow"
```

---

## Task 5: Add Spirit Point Spend Method to Combat Store

**Files:**
- Modify: `src/lib/stores/combat.store.ts`
- Modify: `src/lib/stores/combat.store.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/stores/combat.store.test.ts - Add to Spirit Points describe block

it('should spend spirit point and reset resources via spendSpiritPoint', () => {
	const mockPlayer = {
		...mockPlayerData,
		currentSpiritPoints: 2,
		maxHealth: 100,
		maxMagicka: 50,
		maxActionPoints: 5
	}
	combatStore.startCombat('player-1', 3, 2, mockPlayer as any)

	// Simulate damage to 0 HP
	combatStore.takeDamage('player-1', 100)

	// Verify HP is 0
	expect(get(combatStore)['player-1'].currentHP).toBe(0)

	// Spend spirit point to recover
	combatStore.spendSpiritPoint('player-1', mockPlayer as any)

	const state = get(combatStore)
	const session = state['player-1']

	expect(session.currentSpiritPoints).toBe(1) // 2 - 1 = 1
	expect(session.currentHP).toBe(100) // Reset to max
	expect(session.currentMP).toBe(50) // Reset to max
	expect(session.currentAP).toBe(5) // Reset to max
})

it('should add log entry when spirit point spent', () => {
	const mockPlayer = {
		...mockPlayerData,
		currentSpiritPoints: 1
	}
	combatStore.startCombat('player-1', 3, 2, mockPlayer as any)

	const initialLogLength = get(combatStore)['player-1'].log.length

	combatStore.spendSpiritPoint('player-1', mockPlayer as any)

	const state = get(combatStore)
	const logEntry = state['player-1'].log[state['player-1'].log.length - 1]

	expect(state['player-1'].log.length).toBeGreaterThan(initialLogLength)
	expect(logEntry.description).toContain('spirit point')
})

it('should not spend spirit point when none available', () => {
	const mockPlayer = {
		...mockPlayerData,
		currentSpiritPoints: 0
	}
	combatStore.startCombat('player-1', 3, 2, mockPlayer as any)

	// Force 0 spirit points
	// First we need to spend all spirit points somehow
	const stateBefore = get(combatStore)['player-1']

	combatStore.spendSpiritPoint('player-1', mockPlayer as any)

	const stateAfter = get(combatStore)['player-1']
	expect(stateAfter.currentSpiritPoints).toBe(0)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/stores/combat.store.test.ts`
Expected: FAIL - spendSpiritPoint is not a function

**Step 3: Write minimal implementation**

```typescript
// src/lib/stores/combat.store.ts - Add new method after heal method

/**
 * Spend a spirit point to reset HP, MP, and AP to maximum
 */
spendSpiritPoint: (
	playerId: string,
	playerData: { maxHealth: number; maxMagicka: number; maxActionPoints: number }
): boolean => {
	let success = false

	update((state) => {
		const session = state[playerId]
		if (!session) return state
		if (session.currentSpiritPoints <= 0) return state

		success = true

		return {
			...state,
			[playerId]: {
				...session,
				currentSpiritPoints: session.currentSpiritPoints - 1,
				currentHP: playerData.maxHealth,
				currentMP: playerData.maxMagicka,
				currentAP: playerData.maxActionPoints,
				log: [
					...session.log,
					createCombatLogEntry(
						'system',
						`Spent a spirit point! HP, MP, and AP reset to maximum. (${session.currentSpiritPoints - 1} spirit points remaining)`
					),
				],
			},
		}
	})

	return success
},
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/stores/combat.store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/stores/combat.store.ts src/lib/stores/combat.store.test.ts
git commit -m "feat: add spendSpiritPoint method to combat store"
```

---

## Task 6: Add Spirit Points Display to ResourceBars Component

**Files:**
- Modify: `src/lib/components/combat/ResourceBars.svelte`

**Step 1: Update the component to display spirit points**

Note: This component uses Svelte 4 syntax (export let). Consider migrating to Svelte 5 if time permits, but maintain compatibility for now.

```svelte
<!-- src/lib/components/combat/ResourceBars.svelte - Add new props -->
<script lang="ts">
	import { ProgressBar } from '@skeletonlabs/skeleton'
	import type { CombatSession } from '$lib/models/combat'

	export let session: CombatSession
	export let maxHP: number
	export let maxMP: number
	export let onAdjustHP: (delta: number) => void
	export let onAdjustMP: (delta: number) => void
	export let onAdjustAP: (delta: number) => void
	export let onAdjustSP: ((delta: number) => void) | undefined = undefined

	$: hpPercent = maxHP > 0 ? (session.currentHP / maxHP) * 100 : 0
	$: mpPercent = maxMP > 0 ? (session.currentMP / maxMP) * 100 : 0
	$: apPercent = session.maxAP > 0 ? (session.currentAP / session.maxAP) * 100 : 0
	$: spPercent = session.maxSpiritPoints > 0 ? (session.currentSpiritPoints / session.maxSpiritPoints) * 100 : 0

	function getHPColor(percent: number): string {
		if (percent > 50) return 'bg-success-500'
		if (percent > 25) return 'bg-warning-500'
		return 'bg-error-500'
	}
</script>

<!-- Update grid to 4 columns -->
<div class="resource-bars grid grid-cols-4 gap-4">
	<!-- HP Bar - unchanged -->
	<div class="resource-row">
		<div class="flex items-center justify-between mb-1">
			<span class="font-semibold text-error-500">HP</span>
			<span class="text-sm font-mono">{session.currentHP} / {maxHP}</span>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="btn btn-sm variant-ghost-error"
				on:click={() => onAdjustHP(-1)}
				disabled={session.currentHP <= 0}
			>
				-
			</button>
			<div class="flex-1">
				<ProgressBar value={hpPercent} max={100} meter={getHPColor(hpPercent)} track="bg-surface-300 dark:bg-surface-600" />
			</div>
			<button
				type="button"
				class="btn btn-sm variant-ghost-success"
				on:click={() => onAdjustHP(1)}
				disabled={session.currentHP >= maxHP}
			>
				+
			</button>
		</div>
	</div>

	<!-- MP Bar - unchanged -->
	<div class="resource-row">
		<div class="flex items-center justify-between mb-1">
			<span class="font-semibold text-tertiary-500">MP</span>
			<span class="text-sm font-mono">{session.currentMP} / {maxMP}</span>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="btn btn-sm variant-ghost-error"
				on:click={() => onAdjustMP(-1)}
				disabled={session.currentMP <= 0}
			>
				-
			</button>
			<div class="flex-1">
				<ProgressBar value={mpPercent} max={100} meter="bg-tertiary-500" track="bg-surface-300 dark:bg-surface-600" />
			</div>
			<button
				type="button"
				class="btn btn-sm variant-ghost-success"
				on:click={() => onAdjustMP(1)}
				disabled={session.currentMP >= maxMP}
			>
				+
			</button>
		</div>
	</div>

	<!-- AP Bar - unchanged -->
	<div class="resource-row">
		<div class="flex items-center justify-between mb-1">
			<span class="font-semibold text-warning-500">AP</span>
			<span class="text-sm font-mono">{session.currentAP} / {session.maxAP}</span>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="btn btn-sm variant-ghost-error"
				on:click={() => onAdjustAP(-1)}
				disabled={session.currentAP <= 0}
			>
				-
			</button>
			<div class="flex-1">
				<ProgressBar value={apPercent} max={100} meter="bg-warning-500" track="bg-surface-300 dark:bg-surface-600" />
			</div>
			<button
				type="button"
				class="btn btn-sm variant-ghost-success"
				on:click={() => onAdjustAP(1)}
				disabled={session.currentAP >= session.maxAP}
			>
				+
			</button>
		</div>
	</div>

	<!-- Spirit Points Bar - new -->
	<div class="resource-row">
		<div class="flex items-center justify-between mb-1">
			<span class="font-semibold text-primary-500">SP</span>
			<span class="text-sm font-mono">{session.currentSpiritPoints} / {session.maxSpiritPoints}</span>
		</div>
		<div class="flex items-center gap-2">
			{#if onAdjustSP}
				<button
					type="button"
					class="btn btn-sm variant-ghost-error"
					on:click={() => onAdjustSP?.(-1)}
					disabled={session.currentSpiritPoints <= 0}
				>
					-
				</button>
			{/if}
			<div class="flex-1">
				<ProgressBar
					value={spPercent}
					max={100}
					meter="bg-primary-500"
					track="bg-surface-300 dark:bg-surface-600"
				/>
			</div>
			{#if onAdjustSP}
				<button
					type="button"
					class="btn btn-sm variant-ghost-success"
					on:click={() => onAdjustSP?.(1)}
					disabled={session.currentSpiritPoints >= session.maxSpiritPoints}
				>
					+
				</button>
			{/if}
		</div>
	</div>
</div>
```

**Step 2: Verify manually**

Run: `npm run dev`
Navigate to a character and enter combat. Spirit Points should display as the 4th column.

**Step 3: Commit**

```bash
git add src/lib/components/combat/ResourceBars.svelte
git commit -m "feat: add spirit points display to ResourceBars component"
```

---

## Task 7: Integrate Spirit Recovery Modal into Combat Flow

**Files:**
- Modify: `src/lib/components/combat/CombatMode.svelte` (or wherever damage is handled)
- Update: Export from `src/lib/components/combat/index.ts`

**Step 1: Add modal export**

```typescript
// src/lib/components/combat/index.ts - Add export
export { default as SpiritRecoveryModal } from './modals/SpiritRecoveryModal.svelte'
```

**Step 2: Integrate into CombatMode**

Find the component that handles the HP adjustment (likely CombatMode.svelte) and add state tracking for when to show the Spirit Recovery modal.

```svelte
<!-- In the combat component that handles HP changes -->
<script lang="ts">
	import { SpiritRecoveryModal } from '$lib/components/combat'
	import { getModalStore } from '@skeletonlabs/skeleton'

	// ... existing code ...

	let showSpiritRecoveryModal = $state(false)

	// When HP hits 0, show the modal
	function handleHPChange(newHP: number) {
		if (newHP <= 0 && session.currentSpiritPoints > 0) {
			showSpiritRecoveryModal = true
		}
	}

	function handleSpendSpiritPoint() {
		combatStore.spendSpiritPoint(playerId, {
			maxHealth: player.maxHealth,
			maxMagicka: player.maxMagicka,
			maxActionPoints: player.maxActionPoints
		})
		showSpiritRecoveryModal = false
	}

	function handleFallUnconscious() {
		// Add unconscious condition or handle game state
		combatStore.addCondition(playerId, {
			type: ConditionType.Unconscious, // Note: May need to add this condition type
			source: 'Spirit Point Exhaustion'
		})
		showSpiritRecoveryModal = false
	}
</script>

<!-- Add modal display -->
{#if showSpiritRecoveryModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<SpiritRecoveryModal
			currentSpiritPoints={session.currentSpiritPoints}
			maxSpiritPoints={session.maxSpiritPoints}
			characterName={player.characterName}
			onspend={handleSpendSpiritPoint}
			onfall={handleFallUnconscious}
		/>
	</div>
{/if}
```

**Step 3: Test manually**

1. Enter combat
2. Take damage until HP = 0
3. Spirit Recovery modal should appear
4. Click "Rise Again" - resources should reset
5. Verify spirit points decreased by 1

**Step 4: Commit**

```bash
git add src/lib/components/combat/
git commit -m "feat: integrate spirit recovery modal into combat flow"
```

---

## Task 8: Sync Spirit Points Back to Player on Combat End

**Files:**
- Modify: `src/lib/util/combatSync.util.ts`
- Modify: `src/lib/util/combatSync.util.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/util/combatSync.util.test.ts - Add test case

describe('syncCombatResultToPlayer - Spirit Points', () => {
	it('should sync spirit points from combat result to player', () => {
		const player = {
			id: 'test-id',
			level: 8,
			health: 100,
			maxHealth: 100,
			magicka: 50,
			maxMagicka: 50,
			currentSpiritPoints: 2, // Started with 2
			equipment: {
				weapon: { id: null, materialId: null },
				offhand: { id: null, materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			}
		} as PlayerData

		const combatResult = {
			health: 75,
			magicka: 30,
			equipment: player.equipment,
			currentSpiritPoints: 1 // Spent 1 during combat
		}

		const synced = syncCombatResultToPlayer(player, combatResult)

		expect(synced.currentSpiritPoints).toBe(1)
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/util/combatSync.util.test.ts`
Expected: FAIL - currentSpiritPoints not synced

**Step 3: Write minimal implementation**

```typescript
// src/lib/util/combatSync.util.ts - Update syncCombatResultToPlayer

export function syncCombatResultToPlayer(
	player: PlayerData,
	combatResult: {
		health: number
		magicka: number
		equipment: Equipment
		currentSpiritPoints: number
	}
): PlayerData {
	return {
		...player,
		health: combatResult.health,
		magicka: combatResult.magicka,
		equipment: combatResult.equipment,
		currentSpiritPoints: combatResult.currentSpiritPoints,
		updatedAt: new Date().toISOString(),
	}
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/util/combatSync.util.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/util/combatSync.util.ts src/lib/util/combatSync.util.test.ts
git commit -m "feat: sync spirit points from combat result to player"
```

---

## Task 9: Create Rest Action for Spirit Point Recovery

**Files:**
- Create: `src/lib/components/player/RestModal.svelte`
- Modify: `src/routes/[id]/+page.svelte` to add rest button

**Step 1: Create the RestModal component**

```svelte
<!-- src/lib/components/player/RestModal.svelte -->
<script lang="ts">
	import { calculateMaxSpiritPoints } from '$lib/util/spiritPoints.util'

	interface Props {
		level: number
		currentSpiritPoints: number
		currentHealth: number
		maxHealth: number
		currentMagicka: number
		maxMagicka: number
		onrest: (restResult: {
			spiritPoints: number
			health: number
			magicka: number
		}) => void
		oncancel: () => void
	}

	let {
		level,
		currentSpiritPoints,
		currentHealth,
		maxHealth,
		currentMagicka,
		maxMagicka,
		onrest,
		oncancel
	}: Props = $props()

	let maxSpiritPoints = $derived(calculateMaxSpiritPoints(level))
	let canRestoreSpiritPoint = $derived(currentSpiritPoints < maxSpiritPoints)
	let needsHealing = $derived(currentHealth < maxHealth)
	let needsMagicka = $derived(currentMagicka < maxMagicka)

	function handleRest() {
		const newSpiritPoints = Math.min(currentSpiritPoints + 1, maxSpiritPoints)
		onrest({
			spiritPoints: newSpiritPoints,
			health: maxHealth,
			magicka: maxMagicka
		})
	}
</script>

<div class="card p-6 w-full max-w-md">
	<header class="mb-4 text-center">
		<h3 class="h3 font-bold">Rest for the Night</h3>
	</header>

	<div class="space-y-4 mb-6">
		<p class="text-center text-surface-400">
			A full night's rest with food and comfort will restore your body and spirit.
		</p>

		<div class="bg-surface-700 rounded-lg p-4 space-y-3">
			<h4 class="font-semibold text-center">Rest Effects</h4>

			{#if canRestoreSpiritPoint}
				<div class="flex justify-between items-center">
					<span class="text-primary-400">Spirit Points</span>
					<span>
						{currentSpiritPoints} <span class="text-success-400">+1</span>
						<span class="text-surface-500">/ {maxSpiritPoints}</span>
					</span>
				</div>
			{:else}
				<div class="flex justify-between items-center text-surface-500">
					<span>Spirit Points</span>
					<span>{currentSpiritPoints} / {maxSpiritPoints} (Full)</span>
				</div>
			{/if}

			{#if needsHealing}
				<div class="flex justify-between items-center">
					<span class="text-error-400">Health</span>
					<span>
						{currentHealth} <span class="text-success-400">-> {maxHealth}</span>
					</span>
				</div>
			{:else}
				<div class="flex justify-between items-center text-surface-500">
					<span>Health</span>
					<span>{currentHealth} / {maxHealth} (Full)</span>
				</div>
			{/if}

			{#if needsMagicka}
				<div class="flex justify-between items-center">
					<span class="text-tertiary-400">Magicka</span>
					<span>
						{currentMagicka} <span class="text-success-400">-> {maxMagicka}</span>
					</span>
				</div>
			{:else}
				<div class="flex justify-between items-center text-surface-500">
					<span>Magicka</span>
					<span>{currentMagicka} / {maxMagicka} (Full)</span>
				</div>
			{/if}
		</div>

		<p class="text-xs text-surface-500 text-center italic">
			Note: Resting requires food and comfortable shelter. Roughing it in a bad tent with thin stew won't count!
		</p>
	</div>

	<footer class="flex justify-center gap-3">
		<button type="button" class="btn variant-ghost" onclick={oncancel}>
			Cancel
		</button>
		<button type="button" class="btn variant-filled-primary" onclick={handleRest}>
			Rest
		</button>
	</footer>
</div>
```

**Step 2: Add rest button to player page**

```svelte
<!-- src/routes/[id]/+page.svelte - Add rest functionality -->
<script lang="ts">
	// ... existing imports ...
	import RestModal from '$lib/components/player/RestModal.svelte'

	// ... existing code ...

	let showRestModal = $state(false)

	function handleRest(restResult: { spiritPoints: number; health: number; magicka: number }) {
		updatePlayer({
			currentSpiritPoints: restResult.spiritPoints,
			health: restResult.health,
			magicka: restResult.magicka
		})
		showRestModal = false
	}
</script>

<!-- Add rest button somewhere in the UI when not in combat -->
{#if !isInCombat}
	<button
		type="button"
		class="btn variant-soft-primary"
		onclick={() => showRestModal = true}
	>
		Rest
	</button>
{/if}

<!-- Add rest modal -->
{#if showRestModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<RestModal
			level={currentPlayer.level}
			currentSpiritPoints={currentPlayer.currentSpiritPoints}
			currentHealth={currentPlayer.health}
			maxHealth={currentPlayer.maxHealth}
			currentMagicka={currentPlayer.magicka}
			maxMagicka={currentPlayer.maxMagicka}
			onrest={handleRest}
			oncancel={() => showRestModal = false}
		/>
	</div>
{/if}
```

**Step 3: Test manually**

1. View a character outside of combat
2. Click "Rest" button
3. Verify spirit point would increase by 1
4. Confirm and verify changes persisted

**Step 4: Commit**

```bash
git add src/lib/components/player/RestModal.svelte src/routes/[id]/+page.svelte
git commit -m "feat: add rest action for spirit point recovery"
```

---

## Task 10: Update Stats Utility with Spirit Point Calculation

**Files:**
- Modify: `src/lib/util/stats.util.ts`

**Step 1: Add spirit points to calculateAllStats**

```typescript
// src/lib/util/stats.util.ts - Add import
import { calculateMaxSpiritPoints } from './spiritPoints.util'

// Update calculateAllStats function
export function calculateAllStats(player: PlayerData): {
	maxHealth: number
	maxMagicka: number
	maxAP: number
	maxSpiritPoints: number
} {
	return {
		maxHealth: calculateMaxHealth(player),
		maxMagicka: calculateMaxMagicka(player),
		maxAP: calculateMaxAP(player),
		maxSpiritPoints: calculateMaxSpiritPoints(player.level),
	}
}
```

**Step 2: Commit**

```bash
git add src/lib/util/stats.util.ts
git commit -m "feat: add maxSpiritPoints to calculateAllStats utility"
```

---

## Task 11: Bump Schema Version

**Files:**
- Modify: `src/lib/version.ts`

**Step 1: Update version**

```typescript
// src/lib/version.ts
export const CHARACTER_SCHEMA_VERSION = '0.2.0'
```

**Step 2: Commit**

```bash
git add src/lib/version.ts
git commit -m "chore: bump character schema version for spirit points"
```

---

## Task 12: Final Integration Testing

**Manual Test Checklist:**

1. **Character Creation Flow**
   - [ ] New characters start with max spirit points (1 for level 1)
   - [ ] Spirit points display correctly on character sheet

2. **Combat Flow**
   - [ ] Spirit points visible in combat resource bars
   - [ ] Taking damage to 0 HP triggers Spirit Recovery modal
   - [ ] Clicking "Rise Again" spends spirit point and resets resources
   - [ ] Clicking "Fall Unconscious" adds unconscious state
   - [ ] Combat log shows spirit point spent message
   - [ ] Ending combat syncs spirit points back to player

3. **Rest Flow**
   - [ ] Rest button appears outside combat
   - [ ] Rest modal shows correct spirit point recovery preview
   - [ ] Rest restores 1 spirit point (up to max)
   - [ ] Rest also restores HP and MP to max

4. **Level Up Flow**
   - [ ] Max spirit points increase at levels 8, 12, 16, 20
   - [ ] Current spirit points capped at new max after level down (if applicable)

5. **Persistence**
   - [ ] Spirit points persist after page refresh
   - [ ] Combat session spirit points persist after page refresh
   - [ ] Migration adds spirit points to old characters

**Run all tests:**

```bash
npm run test
```

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "test: fix integration issues with spirit points system"
```

---

## Summary

This implementation plan adds the complete Spirit Points system with:

1. **Utility functions** for calculating max spirit points from level
2. **PlayerData model update** with currentSpiritPoints field
3. **CombatSession tracking** for spirit points during combat
4. **Spirit Recovery Modal** for death/recovery UX with complication reminder
5. **Combat store methods** for spending spirit points and resetting resources
6. **UI updates** to display spirit points in resource bars
7. **Rest action** for recovering spirit points outside combat
8. **Data sync** between combat and persistent player storage
9. **Schema migration** for existing characters

The system follows the game rules exactly:
- 1/4 level (rounded down, min 1) spirit points
- Spending resets HP, MP, AP to max
- Recovery requires full rest with food and comfort
- Out of spirit points = unconscious/dying
