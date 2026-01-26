# Combat Actions Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the tabbed combat action system with a unified 3-column tile grid showing all combat actions at once, with supporting inventory system for weapon swapping.

**Architecture:** New `ActionsPanel` component with color-coded columns (Movement/Utility, Offensive, Defensive). Each tile opens a modal for detailed options. New `ownedWeapons[]` field in player data enables equipment swapping across modes. All state persisted to localStorage for session recovery.

**Tech Stack:** SvelteKit, Svelte 5 stores, Vitest, Skeleton UI, localStorage persistence

---

## Task 1: Add `ownedWeapons` to Player Data Model

**Files:**
- Modify: `src/lib/models/player.ts`
- Modify: `src/lib/util/migration.util.ts`
- Create: `src/lib/models/player.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/models/player.test.ts
import { describe, it, expect } from 'vitest'
import { defaultPlayerData, type OwnedWeapon, type PlayerData } from './player'

describe('PlayerData model', () => {
	it('should have ownedWeapons array in default data', () => {
		expect(defaultPlayerData.ownedWeapons).toBeDefined()
		expect(Array.isArray(defaultPlayerData.ownedWeapons)).toBe(true)
		expect(defaultPlayerData.ownedWeapons).toHaveLength(0)
	})

	it('should define OwnedWeapon interface with weaponId and materialId', () => {
		const ownedWeapon: OwnedWeapon = {
			weaponId: 'iron-sword',
			materialId: 'steel'
		}
		expect(ownedWeapon.weaponId).toBe('iron-sword')
		expect(ownedWeapon.materialId).toBe('steel')
	})

	it('should allow null materialId for OwnedWeapon', () => {
		const ownedWeapon: OwnedWeapon = {
			weaponId: 'iron-sword',
			materialId: null
		}
		expect(ownedWeapon.materialId).toBeNull()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/models/player.test.ts`
Expected: FAIL with "ownedWeapons" not defined

**Step 3: Write minimal implementation**

```typescript
// src/lib/models/player.ts - Add after InventoryItem interface (around line 10)

export interface OwnedWeapon {
	weaponId: string
	materialId: string | null
}
```

```typescript
// src/lib/models/player.ts - Add to PlayerData type (around line 42)
// Add after: inventory: InventoryItem[]

	ownedWeapons: OwnedWeapon[]
```

```typescript
// src/lib/models/player.ts - Add to defaultPlayerData (around line 72)
// Add after: inventory: [],

	ownedWeapons: [],
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/models/player.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/models/player.ts src/lib/models/player.test.ts
git commit -m "feat: add ownedWeapons array to PlayerData model"
```

---

## Task 2: Add Migration for `ownedWeapons`

**Files:**
- Modify: `src/lib/util/migration.util.ts`
- Create: `src/lib/util/migration.util.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/util/migration.util.test.ts
import { describe, it, expect } from 'vitest'
import { migratePlayerData } from './migration.util'
import type { PlayerData } from '$lib/models/player'

describe('migratePlayerData', () => {
	it('should add empty ownedWeapons array if missing', () => {
		const legacyPlayer = {
			id: 'test-id',
			level: 1,
			playerName: 'Test',
			characterName: 'Hero',
			equipment: {
				weapon: { id: null, materialId: null },
				offhand: { id: null, materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			},
			inventory: []
			// Note: no ownedWeapons field
		} as unknown as PlayerData

		const migrated = migratePlayerData(legacyPlayer)

		expect(migrated.ownedWeapons).toBeDefined()
		expect(Array.isArray(migrated.ownedWeapons)).toBe(true)
		expect(migrated.ownedWeapons).toHaveLength(0)
	})

	it('should preserve existing ownedWeapons array', () => {
		const player = {
			id: 'test-id',
			level: 1,
			ownedWeapons: [
				{ weaponId: 'iron-sword', materialId: 'steel' }
			],
			equipment: {
				weapon: { id: null, materialId: null },
				offhand: { id: null, materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			},
			inventory: []
		} as unknown as PlayerData

		const migrated = migratePlayerData(player)

		expect(migrated.ownedWeapons).toHaveLength(1)
		expect(migrated.ownedWeapons[0].weaponId).toBe('iron-sword')
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/util/migration.util.test.ts`
Expected: FAIL - ownedWeapons not being added during migration

**Step 3: Write minimal implementation**

```typescript
// src/lib/util/migration.util.ts - Add to migratePlayerData function
// Add after the equipment migration block (around line 30)

	// Migrate ownedWeapons - add empty array if missing
	if (!player.ownedWeapons) {
		player.ownedWeapons = []
	}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/util/migration.util.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/util/migration.util.ts src/lib/util/migration.util.test.ts
git commit -m "feat: add migration for ownedWeapons field"
```

---

## Task 3: Create Action Tile Component

**Files:**
- Create: `src/lib/components/combat/ActionTile.svelte`
- Create: `src/lib/components/combat/ActionTile.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/components/combat/ActionTile.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import ActionTile from './ActionTile.svelte'

describe('ActionTile', () => {
	it('should render action name and cost', () => {
		render(ActionTile, {
			props: {
				name: 'Move',
				cost: '1-3 AP',
				icon: 'boot',
				color: 'primary',
				disabled: false,
				onclick: vi.fn()
			}
		})

		expect(screen.getByText('Move')).toBeTruthy()
		expect(screen.getByText('1-3 AP')).toBeTruthy()
	})

	it('should apply disabled styling when disabled', () => {
		render(ActionTile, {
			props: {
				name: 'Move',
				cost: '1-3 AP',
				icon: 'boot',
				color: 'primary',
				disabled: true,
				onclick: vi.fn()
			}
		})

		const button = screen.getByRole('button')
		expect(button.classList.contains('opacity-50')).toBe(true)
	})

	it('should call onclick when clicked', async () => {
		const handleClick = vi.fn()
		render(ActionTile, {
			props: {
				name: 'Move',
				cost: '1-3 AP',
				icon: 'boot',
				color: 'primary',
				disabled: false,
				onclick: handleClick
			}
		})

		await fireEvent.click(screen.getByRole('button'))
		expect(handleClick).toHaveBeenCalledOnce()
	})

	it('should still call onclick when disabled (for exploration)', async () => {
		const handleClick = vi.fn()
		render(ActionTile, {
			props: {
				name: 'Move',
				cost: '1-3 AP',
				icon: 'boot',
				color: 'primary',
				disabled: true,
				onclick: handleClick
			}
		})

		await fireEvent.click(screen.getByRole('button'))
		expect(handleClick).toHaveBeenCalledOnce()
	})

	it('should apply correct color variant class', () => {
		render(ActionTile, {
			props: {
				name: 'Attack',
				cost: '2 AP',
				icon: 'sword',
				color: 'error',
				disabled: false,
				onclick: vi.fn()
			}
		})

		const button = screen.getByRole('button')
		expect(button.classList.contains('variant-soft-error')).toBe(true)
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/components/combat/ActionTile.test.ts`
Expected: FAIL - component doesn't exist

**Step 3: Write minimal implementation**

```svelte
<!-- src/lib/components/combat/ActionTile.svelte -->
<script lang="ts">
	import classNames from 'classnames'

	interface Props {
		name: string
		cost: string
		icon: string
		color: 'primary' | 'error' | 'success'
		disabled: boolean
		onclick: () => void
	}

	let { name, cost, icon, color, disabled, onclick }: Props = $props()

	const iconMap: Record<string, string> = {
		boot: '🥾',
		sword: '⚔️',
		shield: '🛡️',
		pouch: '🎒',
		magic: '✨',
		crosshair: '🎯',
		running: '🏃',
		aura: '🔮'
	}
</script>

<button
	type="button"
	class={classNames(
		'card p-4 flex flex-col items-center gap-2 transition-all cursor-pointer min-w-[100px]',
		`variant-soft-${color}`,
		{
			'opacity-50': disabled,
			'hover:brightness-110': !disabled
		}
	)}
	onclick={onclick}
>
	<span class="text-2xl">{iconMap[icon] ?? '❓'}</span>
	<span class="font-semibold text-sm">{name}</span>
	<span class="badge variant-filled text-xs">{cost}</span>
</button>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/components/combat/ActionTile.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/components/combat/ActionTile.svelte src/lib/components/combat/ActionTile.test.ts
git commit -m "feat: add ActionTile component for combat actions"
```

---

## Task 4: Create Actions Panel Component Structure

**Files:**
- Create: `src/lib/components/combat/ActionsPanel.svelte`
- Create: `src/lib/components/combat/ActionsPanel.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/components/combat/ActionsPanel.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import ActionsPanel from './ActionsPanel.svelte'

describe('ActionsPanel', () => {
	const defaultProps = {
		currentAP: 5,
		currentMP: 10,
		currentInitiative: 3,
		hasHeftedShield: false,
		onActionSelect: vi.fn()
	}

	it('should render three column headers', () => {
		render(ActionsPanel, { props: defaultProps })

		expect(screen.getByText('Movement & Utility')).toBeTruthy()
		expect(screen.getByText('Offensive')).toBeTruthy()
		expect(screen.getByText('Defensive')).toBeTruthy()
	})

	it('should render all 10 action tiles', () => {
		render(ActionsPanel, { props: defaultProps })

		// Movement/Utility (4)
		expect(screen.getByText('Move')).toBeTruthy()
		expect(screen.getByText('Swap Weapon')).toBeTruthy()
		expect(screen.getByText('Heft Shield')).toBeTruthy()
		expect(screen.getByText('Use Item')).toBeTruthy()

		// Offensive (3)
		expect(screen.getByText('Attack')).toBeTruthy()
		expect(screen.getByText('Cast Spell')).toBeTruthy()
		expect(screen.getByText('Focus Attack')).toBeTruthy()

		// Defensive (3)
		expect(screen.getByText('Block')).toBeTruthy()
		expect(screen.getByText('Dodge')).toBeTruthy()
		expect(screen.getByText('Focus Spell')).toBeTruthy()
	})

	it('should disable tiles when insufficient resources', () => {
		render(ActionsPanel, {
			props: {
				...defaultProps,
				currentAP: 0,
				currentInitiative: 0
			}
		})

		// AP-based actions should be disabled
		const moveButton = screen.getByText('Move').closest('button')
		expect(moveButton?.classList.contains('opacity-50')).toBe(true)

		// Initiative-based actions should be disabled
		const blockButton = screen.getByText('Block').closest('button')
		expect(blockButton?.classList.contains('opacity-50')).toBe(true)
	})

	it('should hide Heft Shield when no shield equipped', () => {
		render(ActionsPanel, {
			props: {
				...defaultProps,
				hasHeftedShield: false
			}
		})

		// Heft Shield should still show but context-dependent
		expect(screen.getByText('Heft Shield')).toBeTruthy()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/components/combat/ActionsPanel.test.ts`
Expected: FAIL - component doesn't exist

**Step 3: Write minimal implementation**

```svelte
<!-- src/lib/components/combat/ActionsPanel.svelte -->
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

	// Resource checks
	let canAffordAP1 = $derived(currentAP >= 1)
	let canAffordAP2 = $derived(currentAP >= 2)
	let canAffordInit1 = $derived(currentInitiative >= 1)

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
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/components/combat/ActionsPanel.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/components/combat/ActionsPanel.svelte src/lib/components/combat/ActionsPanel.test.ts
git commit -m "feat: add ActionsPanel component with 3-column tile grid"
```

---

## Task 5: Create Move Modal Component

**Files:**
- Create: `src/lib/components/combat/modals/MoveModal.svelte`
- Create: `src/lib/components/combat/modals/MoveModal.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/components/combat/modals/MoveModal.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import MoveModal from './MoveModal.svelte'

describe('MoveModal', () => {
	const defaultProps = {
		isOpen: true,
		currentAP: 5,
		onMove: vi.fn(),
		onClose: vi.fn()
	}

	it('should display all movement options with AP costs', () => {
		render(MoveModal, { props: defaultProps })

		expect(screen.getByText('Immediate ↔ Adjacent')).toBeTruthy()
		expect(screen.getByText('Adjacent ↔ Close')).toBeTruthy()
		expect(screen.getByText('Close ↔ Short')).toBeTruthy()
		expect(screen.getByText('Short ↔ Medium')).toBeTruthy()
		expect(screen.getByText('Medium ↔ Long')).toBeTruthy()
		expect(screen.getByText('Long ↔ Extreme')).toBeTruthy()
	})

	it('should show correct AP costs for each movement', () => {
		render(MoveModal, { props: defaultProps })

		// 1 AP movements
		const oneApButtons = screen.getAllByText('1 AP')
		expect(oneApButtons.length).toBe(3)

		// 2 AP movements
		const twoApButtons = screen.getAllByText('2 AP')
		expect(twoApButtons.length).toBe(2)

		// 3 AP movements
		const threeApButtons = screen.getAllByText('3 AP')
		expect(threeApButtons.length).toBe(1)
	})

	it('should disable movements that cost more than current AP', () => {
		render(MoveModal, {
			props: {
				...defaultProps,
				currentAP: 1
			}
		})

		// 2 AP and 3 AP movements should be disabled
		const shortMediumRow = screen.getByText('Short ↔ Medium').closest('button')
		expect(shortMediumRow?.hasAttribute('disabled')).toBe(true)
	})

	it('should call onMove with AP cost when movement selected', async () => {
		const handleMove = vi.fn()
		render(MoveModal, {
			props: {
				...defaultProps,
				onMove: handleMove
			}
		})

		await fireEvent.click(screen.getByText('Immediate ↔ Adjacent').closest('button')!)
		expect(handleMove).toHaveBeenCalledWith(1)
	})

	it('should display weapon range reference table', () => {
		render(MoveModal, { props: defaultProps })

		expect(screen.getByText('Weapon Ranges')).toBeTruthy()
		expect(screen.getByText('Melee')).toBeTruthy()
		expect(screen.getByText('Ranged')).toBeTruthy()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/components/combat/modals/MoveModal.test.ts`
Expected: FAIL - component doesn't exist

**Step 3: Write minimal implementation**

```svelte
<!-- src/lib/components/combat/modals/MoveModal.svelte -->
<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton'

	interface Props {
		isOpen: boolean
		currentAP: number
		onMove: (apCost: number) => void
		onClose: () => void
	}

	let { isOpen, currentAP, onMove, onClose }: Props = $props()

	const movementOptions = [
		{ label: 'Immediate ↔ Adjacent', cost: 1 },
		{ label: 'Adjacent ↔ Close', cost: 1 },
		{ label: 'Close ↔ Short', cost: 1 },
		{ label: 'Short ↔ Medium', cost: 2 },
		{ label: 'Medium ↔ Long', cost: 2 },
		{ label: 'Long ↔ Extreme', cost: 3 }
	]

	const rangeReference = [
		{ range: 'Immediate', melee: 'Disadv', reach: 'No', ranged: 'No', penalty: '—' },
		{ range: 'Adjacent', melee: 'Normal', reach: 'Disadv', ranged: 'Disadv', penalty: '—' },
		{ range: 'Close', melee: 'No', reach: 'Normal', ranged: 'Normal', penalty: '—' },
		{ range: 'Short', melee: 'No', reach: 'No', ranged: 'Normal', penalty: '—' },
		{ range: 'Medium', melee: 'No', reach: 'No', ranged: 'Normal', penalty: '-5' },
		{ range: 'Long', melee: 'No', reach: 'No', ranged: 'Normal', penalty: '-10' },
		{ range: 'Extreme', melee: 'No', reach: 'No', ranged: 'Normal', penalty: '-15' }
	]

	let showRangeReference = $state(false)

	function handleSelect(cost: number) {
		if (currentAP >= cost) {
			onMove(cost)
			onClose()
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Movement</h2>
				<span class="badge variant-filled-primary">AP: {currentAP}</span>
			</header>

			<div class="flex flex-col gap-2 mb-4">
				{#each movementOptions as option}
					{@const canAfford = currentAP >= option.cost}
					<button
						type="button"
						class="btn flex justify-between items-center w-full"
						class:variant-soft-primary={canAfford}
						class:variant-soft-surface={!canAfford}
						class:opacity-50={!canAfford}
						disabled={!canAfford}
						onclick={() => handleSelect(option.cost)}
					>
						<span>{option.label}</span>
						<span class="badge variant-filled">{option.cost} AP</span>
					</button>
				{/each}
			</div>

			<button
				type="button"
				class="btn variant-soft w-full mb-4"
				onclick={() => showRangeReference = !showRangeReference}
			>
				{showRangeReference ? 'Hide' : 'Show'} Weapon Ranges
			</button>

			{#if showRangeReference}
				<div class="overflow-x-auto mb-4">
					<table class="table table-compact w-full">
						<thead>
							<tr>
								<th>Range</th>
								<th>Melee</th>
								<th>Reach</th>
								<th>Ranged</th>
								<th>Penalty</th>
							</tr>
						</thead>
						<tbody>
							{#each rangeReference as row}
								<tr>
									<td class="font-medium">{row.range}</td>
									<td>{row.melee}</td>
									<td>{row.reach}</td>
									<td>{row.ranged}</td>
									<td>{row.penalty}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<footer class="flex justify-end">
				<button type="button" class="btn variant-soft" onclick={onClose}>
					Cancel
				</button>
			</footer>
		</div>
	</div>
{/if}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/components/combat/modals/MoveModal.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/components/combat/modals/MoveModal.svelte src/lib/components/combat/modals/MoveModal.test.ts
git commit -m "feat: add MoveModal with movement costs and range reference"
```

---

## Task 6: Create Swap Weapon Modal Component

**Files:**
- Create: `src/lib/components/combat/modals/SwapWeaponModal.svelte`
- Create: `src/lib/components/combat/modals/SwapWeaponModal.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/components/combat/modals/SwapWeaponModal.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import SwapWeaponModal from './SwapWeaponModal.svelte'
import type { OwnedWeapon, Equipment } from '$lib/models/player'

describe('SwapWeaponModal', () => {
	const mockOwnedWeapons: OwnedWeapon[] = [
		{ weaponId: 'iron-sword', materialId: null },
		{ weaponId: 'steel-dagger', materialId: 'steel' },
		{ weaponId: 'iron-shield', materialId: null }
	]

	const mockEquipment: Equipment = {
		weapon: { id: 'iron-sword', materialId: null },
		offhand: { id: null, materialId: null },
		armor: { id: null, materialId: null },
		accessories: []
	}

	const defaultProps = {
		isOpen: true,
		ownedWeapons: mockOwnedWeapons,
		currentEquipment: mockEquipment,
		currentAP: 5,
		onSwap: vi.fn(),
		onClose: vi.fn()
	}

	it('should display owned weapons not currently equipped', () => {
		render(SwapWeaponModal, { props: defaultProps })

		// iron-sword is equipped, should not appear
		// steel-dagger and iron-shield should appear
		expect(screen.queryByText('Iron Sword')).toBeFalsy()
		expect(screen.getByText('Steel Dagger')).toBeTruthy()
		expect(screen.getByText('Iron Shield')).toBeTruthy()
	})

	it('should show weapon range for each option', () => {
		render(SwapWeaponModal, { props: defaultProps })

		// Should show range badges
		expect(screen.getByText('Adjacent')).toBeTruthy() // dagger range
	})

	it('should call onSwap with weapon data when selected', async () => {
		const handleSwap = vi.fn()
		render(SwapWeaponModal, {
			props: {
				...defaultProps,
				onSwap: handleSwap
			}
		})

		await fireEvent.click(screen.getByText('Steel Dagger').closest('button')!)
		expect(handleSwap).toHaveBeenCalledWith({
			weaponId: 'steel-dagger',
			materialId: 'steel',
			slot: 'weapon'
		})
	})

	it('should disable swap when insufficient AP', () => {
		render(SwapWeaponModal, {
			props: {
				...defaultProps,
				currentAP: 0
			}
		})

		const buttons = screen.getAllByRole('button')
		const weaponButton = buttons.find(b => b.textContent?.includes('Steel Dagger'))
		expect(weaponButton?.hasAttribute('disabled')).toBe(true)
	})

	it('should show slot selection for shields', async () => {
		render(SwapWeaponModal, { props: defaultProps })

		// Clicking shield should show slot options (main hand or offhand)
		await fireEvent.click(screen.getByText('Iron Shield').closest('button')!)

		expect(screen.getByText('Main Hand')).toBeTruthy()
		expect(screen.getByText('Off Hand')).toBeTruthy()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/components/combat/modals/SwapWeaponModal.test.ts`
Expected: FAIL - component doesn't exist

**Step 3: Write minimal implementation**

```svelte
<!-- src/lib/components/combat/modals/SwapWeaponModal.svelte -->
<script lang="ts">
	import type { OwnedWeapon, Equipment } from '$lib/models/player'
	import { getWeaponById, type Weapon, WeaponRange } from '$lib/data/weapons'
	import { getMaterialById } from '$lib/data/materials'

	interface Props {
		isOpen: boolean
		ownedWeapons: OwnedWeapon[]
		currentEquipment: Equipment
		currentAP: number
		onSwap: (data: { weaponId: string; materialId: string | null; slot: 'weapon' | 'offhand' }) => void
		onClose: () => void
	}

	let { isOpen, ownedWeapons, currentEquipment, currentAP, onSwap, onClose }: Props = $props()

	const SWAP_COST = 1

	let selectedWeapon = $state<OwnedWeapon | null>(null)
	let showSlotSelection = $state(false)

	// Filter out currently equipped weapons
	let availableWeapons = $derived(
		ownedWeapons.filter(ow => {
			const isMainHand = currentEquipment.weapon.id === ow.weaponId
			const isOffhand = currentEquipment.offhand.id === ow.weaponId
			return !isMainHand && !isOffhand
		})
	)

	function getWeaponDisplay(ow: OwnedWeapon): { weapon: Weapon; materialName: string | null } | null {
		const weapon = getWeaponById(ow.weaponId)
		if (!weapon) return null
		const material = ow.materialId ? getMaterialById(ow.materialId) : null
		return { weapon, materialName: material?.name ?? null }
	}

	function formatRange(range: WeaponRange): string {
		switch (range) {
			case WeaponRange.Immediate: return 'Immediate'
			case WeaponRange.Adjacent: return 'Adjacent'
			case WeaponRange.Large: return 'Large'
			case WeaponRange.Reach: return 'Reach'
			case WeaponRange.Short: return 'Short'
			case WeaponRange.Ranged: return 'Ranged'
			default: return range
		}
	}

	function handleWeaponClick(ow: OwnedWeapon) {
		if (currentAP < SWAP_COST) return

		const display = getWeaponDisplay(ow)
		if (!display) return

		if (display.weapon.isShield || !display.weapon.isTwoHanded) {
			// Can go in either slot
			selectedWeapon = ow
			showSlotSelection = true
		} else {
			// Two-handed goes to main hand only
			onSwap({ weaponId: ow.weaponId, materialId: ow.materialId, slot: 'weapon' })
			onClose()
		}
	}

	function handleSlotSelect(slot: 'weapon' | 'offhand') {
		if (selectedWeapon) {
			onSwap({ weaponId: selectedWeapon.weaponId, materialId: selectedWeapon.materialId, slot })
			selectedWeapon = null
			showSlotSelection = false
			onClose()
		}
	}

	function handleCancel() {
		selectedWeapon = null
		showSlotSelection = false
		onClose()
	}
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Swap Weapon</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-warning">{SWAP_COST} AP</span>
					<span class="badge variant-filled-primary">AP: {currentAP}</span>
				</div>
			</header>

			{#if showSlotSelection && selectedWeapon}
				{@const display = getWeaponDisplay(selectedWeapon)}
				<div class="mb-4">
					<p class="text-sm text-surface-400 mb-3">
						Equip {display?.weapon.name} to which slot?
					</p>
					<div class="flex gap-2">
						<button
							type="button"
							class="btn variant-soft-primary flex-1"
							onclick={() => handleSlotSelect('weapon')}
						>
							Main Hand
						</button>
						<button
							type="button"
							class="btn variant-soft-secondary flex-1"
							onclick={() => handleSlotSelect('offhand')}
						>
							Off Hand
						</button>
					</div>
				</div>
			{:else}
				<div class="flex flex-col gap-2 mb-4 max-h-80 overflow-y-auto">
					{#each availableWeapons as ow}
						{@const display = getWeaponDisplay(ow)}
						{#if display}
							{@const canAfford = currentAP >= SWAP_COST}
							<button
								type="button"
								class="btn flex justify-between items-center w-full"
								class:variant-soft-primary={canAfford}
								class:variant-soft-surface={!canAfford}
								class:opacity-50={!canAfford}
								disabled={!canAfford}
								onclick={() => handleWeaponClick(ow)}
							>
								<div class="flex flex-col items-start">
									<span class="font-medium">
										{display.materialName ? `${display.materialName} ` : ''}{display.weapon.name}
									</span>
									<span class="text-xs text-surface-400">
										{display.weapon.baseDamageLethal ?? display.weapon.baseDamageBlunted} Dmg
									</span>
								</div>
								<div class="flex gap-2">
									<span class="badge variant-soft-tertiary">{formatRange(display.weapon.range)}</span>
									<span class="badge variant-soft-warning">{display.weapon.apCost} AP</span>
								</div>
							</button>
						{/if}
					{/each}

					{#if availableWeapons.length === 0}
						<p class="text-center text-surface-400 py-4">No other weapons available</p>
					{/if}
				</div>
			{/if}

			<footer class="flex justify-end">
				<button type="button" class="btn variant-soft" onclick={handleCancel}>
					Cancel
				</button>
			</footer>
		</div>
	</div>
{/if}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/components/combat/modals/SwapWeaponModal.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/components/combat/modals/SwapWeaponModal.svelte src/lib/components/combat/modals/SwapWeaponModal.test.ts
git commit -m "feat: add SwapWeaponModal for combat weapon swapping"
```

---

## Task 7: Add Combat Equipment State to Combat Store

**Files:**
- Modify: `src/lib/models/combat.ts`
- Modify: `src/lib/stores/combat.store.ts`
- Create: `src/lib/stores/combat.store.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/stores/combat.store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'

// Mock localStorage
const localStorageMock = {
	store: {} as Record<string, string>,
	getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
	setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value }),
	clear: vi.fn(() => { localStorageMock.store = {} })
}

vi.stubGlobal('localStorage', localStorageMock)

// Must import after mocking
import { combatStore } from './combat.store'
import type { Equipment } from '$lib/models/player'

describe('Combat Store - Equipment State', () => {
	const mockEquipment: Equipment = {
		weapon: { id: 'iron-sword', materialId: null },
		offhand: { id: 'iron-shield', materialId: null },
		armor: { id: 'leather', materialId: null },
		accessories: []
	}

	const mockPlayerData = {
		id: 'player-1',
		health: 100,
		maxHealth: 100,
		magicka: 50,
		maxMagicka: 50,
		actionPoints: 5,
		maxActionPoints: 5,
		equipment: mockEquipment
	}

	beforeEach(() => {
		localStorageMock.clear()
		combatStore.endCombat('player-1') // Clean up any existing session
	})

	it('should store equipment snapshot when combat starts', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.combatEquipment).toBeDefined()
		expect(session.combatEquipment.weapon.id).toBe('iron-sword')
		expect(session.combatEquipment.offhand.id).toBe('iron-shield')
	})

	it('should update combat equipment when swapping weapon', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-sword',
			materialId: 'steel',
			slot: 'weapon'
		})

		const state = get(combatStore)
		const session = state['player-1']

		expect(session.combatEquipment.weapon.id).toBe('steel-sword')
		expect(session.combatEquipment.weapon.materialId).toBe('steel')
	})

	it('should spend AP when swapping weapon', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)

		const initialAP = get(combatStore)['player-1'].currentAP

		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-sword',
			materialId: null,
			slot: 'weapon'
		})

		const finalAP = get(combatStore)['player-1'].currentAP
		expect(finalAP).toBe(initialAP - 1)
	})

	it('should persist equipment changes to localStorage', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-sword',
			materialId: null,
			slot: 'weapon'
		})

		expect(localStorageMock.setItem).toHaveBeenCalled()

		const savedData = JSON.parse(localStorageMock.store['combat-sessions'])
		expect(savedData['player-1'].combatEquipment.weapon.id).toBe('steel-sword')
	})

	it('should return final equipment state when combat ends', () => {
		combatStore.startCombat('player-1', 3, 2, mockPlayerData as any)
		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-sword',
			materialId: 'steel',
			slot: 'weapon'
		})

		const result = combatStore.endCombat('player-1')

		expect(result).toBeDefined()
		expect(result!.equipment.weapon.id).toBe('steel-sword')
		expect(result!.equipment.weapon.materialId).toBe('steel')
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/stores/combat.store.test.ts`
Expected: FAIL - combatEquipment and swapWeapon don't exist

**Step 3: Write minimal implementation**

```typescript
// src/lib/models/combat.ts - Add to CombatSession interface (around line 45)
// Add after: distance: CombatDistance

	combatEquipment: Equipment
```

```typescript
// src/lib/models/combat.ts - Add import at top
import type { Equipment } from './player'
```

```typescript
// src/lib/stores/combat.store.ts - Update startCombat function
// Modify the session creation (around line 50) to include combatEquipment

startCombat(
	playerId: string,
	partyInitiative: number,
	enemyInitiative: number,
	playerData: PlayerData
) {
	update((state) => {
		const session: CombatSession = {
			id: crypto.randomUUID(),
			playerId,
			round: 1,
			isPlayerTurn: true,
			partyInitiativePool: { current: partyInitiative, max: partyInitiative },
			enemyInitiativePool: { current: enemyInitiative, max: enemyInitiative },
			currentHP: playerData.health,
			currentMP: playerData.magicka,
			currentAP: playerData.actionPoints,
			conditions: [],
			log: [],
			distance: CombatDistance.Medium,
			combatEquipment: { ...playerData.equipment } // NEW: snapshot equipment
		}
		return { ...state, [playerId]: session }
	})
},
```

```typescript
// src/lib/stores/combat.store.ts - Add swapWeapon method (after other methods)

swapWeapon(
	playerId: string,
	data: { weaponId: string; materialId: string | null; slot: 'weapon' | 'offhand' }
) {
	update((state) => {
		const session = state[playerId]
		if (!session) return state

		const SWAP_COST = 1
		if (session.currentAP < SWAP_COST) return state

		const newEquipment = { ...session.combatEquipment }
		newEquipment[data.slot] = {
			id: data.weaponId,
			materialId: data.materialId
		}

		return {
			...state,
			[playerId]: {
				...session,
				currentAP: session.currentAP - SWAP_COST,
				combatEquipment: newEquipment,
				log: [
					...session.log,
					{
						id: crypto.randomUUID(),
						timestamp: Date.now(),
						type: 'action' as const,
						message: `Swapped ${data.slot === 'weapon' ? 'main hand' : 'off-hand'} weapon`
					}
				]
			}
		}
	})
},
```

```typescript
// src/lib/stores/combat.store.ts - Update endCombat to return equipment
// Modify the return type and value (around line 80)

endCombat(playerId: string): { health: number; magicka: number; equipment: Equipment } | null {
	let result: { health: number; magicka: number; equipment: Equipment } | null = null

	update((state) => {
		const session = state[playerId]
		if (session) {
			result = {
				health: session.currentHP,
				magicka: session.currentMP,
				equipment: session.combatEquipment
			}
		}
		const { [playerId]: _, ...rest } = state
		return rest
	})

	return result
},
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/stores/combat.store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/models/combat.ts src/lib/stores/combat.store.ts src/lib/stores/combat.store.test.ts
git commit -m "feat: add combat equipment state with swap and persistence"
```

---

## Task 8: Update Owned Weapons Editor in Equipment Editor

**Files:**
- Modify: `src/lib/components/equipment/EquipmentEditor.svelte`
- Create: `src/lib/components/equipment/OwnedWeaponsEditor.svelte`
- Create: `src/lib/components/equipment/OwnedWeaponsEditor.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/components/equipment/OwnedWeaponsEditor.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import OwnedWeaponsEditor from './OwnedWeaponsEditor.svelte'
import type { OwnedWeapon } from '$lib/models/player'

describe('OwnedWeaponsEditor', () => {
	const mockOwnedWeapons: OwnedWeapon[] = [
		{ weaponId: 'iron-sword', materialId: null }
	]

	const defaultProps = {
		ownedWeapons: mockOwnedWeapons,
		onOwnedWeaponsChange: vi.fn()
	}

	it('should display currently owned weapons', () => {
		render(OwnedWeaponsEditor, { props: defaultProps })

		expect(screen.getByText('Iron Sword')).toBeTruthy()
	})

	it('should allow adding a new weapon to owned list', async () => {
		const handleChange = vi.fn()
		render(OwnedWeaponsEditor, {
			props: {
				...defaultProps,
				onOwnedWeaponsChange: handleChange
			}
		})

		// Find and click "Add Weapon" button
		await fireEvent.click(screen.getByText('Add Weapon'))

		// Select a weapon from the list
		await fireEvent.click(screen.getByText('Steel Sword'))

		expect(handleChange).toHaveBeenCalled()
		const newList = handleChange.mock.calls[0][0]
		expect(newList.some((w: OwnedWeapon) => w.weaponId === 'steel-sword')).toBe(true)
	})

	it('should allow removing a weapon from owned list', async () => {
		const handleChange = vi.fn()
		render(OwnedWeaponsEditor, {
			props: {
				...defaultProps,
				onOwnedWeaponsChange: handleChange
			}
		})

		// Find and click remove button for iron-sword
		const removeButton = screen.getByLabelText('Remove Iron Sword')
		await fireEvent.click(removeButton)

		expect(handleChange).toHaveBeenCalledWith([])
	})

	it('should allow setting material for owned weapon', async () => {
		const handleChange = vi.fn()
		render(OwnedWeaponsEditor, {
			props: {
				...defaultProps,
				onOwnedWeaponsChange: handleChange
			}
		})

		// Find material selector for iron-sword
		const materialSelect = screen.getByLabelText('Material for Iron Sword')
		await fireEvent.change(materialSelect, { target: { value: 'steel' } })

		expect(handleChange).toHaveBeenCalled()
		const newList = handleChange.mock.calls[0][0]
		expect(newList[0].materialId).toBe('steel')
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/components/equipment/OwnedWeaponsEditor.test.ts`
Expected: FAIL - component doesn't exist

**Step 3: Write minimal implementation**

```svelte
<!-- src/lib/components/equipment/OwnedWeaponsEditor.svelte -->
<script lang="ts">
	import classNames from 'classnames'
	import type { OwnedWeapon } from '$lib/models/player'
	import { Weapons, getWeaponById, WeaponRange, type Weapon } from '$lib/data/weapons'
	import { Materials, getMaterialById } from '$lib/data/materials'

	interface Props {
		ownedWeapons: OwnedWeapon[]
		onOwnedWeaponsChange: (weapons: OwnedWeapon[]) => void
	}

	let { ownedWeapons, onOwnedWeaponsChange }: Props = $props()

	let showAddPanel = $state(false)

	// Get weapons not already owned
	let availableWeapons = $derived(
		Weapons.filter(w =>
			!w.isAmmunition &&
			!ownedWeapons.some(ow => ow.weaponId === w.id)
		)
	)

	// Get weapon materials (excludes armor-only)
	const weaponMaterials = Materials.filter(m => !m.isArmorOnly)

	function formatRange(range: WeaponRange): string {
		switch (range) {
			case WeaponRange.Immediate: return 'Immediate'
			case WeaponRange.Adjacent: return 'Adjacent'
			case WeaponRange.Large: return 'Large'
			case WeaponRange.Reach: return 'Reach'
			case WeaponRange.Short: return 'Short'
			case WeaponRange.Ranged: return 'Ranged'
			default: return range
		}
	}

	function addWeapon(weaponId: string) {
		onOwnedWeaponsChange([...ownedWeapons, { weaponId, materialId: null }])
		showAddPanel = false
	}

	function removeWeapon(weaponId: string) {
		onOwnedWeaponsChange(ownedWeapons.filter(ow => ow.weaponId !== weaponId))
	}

	function updateMaterial(weaponId: string, materialId: string | null) {
		onOwnedWeaponsChange(
			ownedWeapons.map(ow =>
				ow.weaponId === weaponId ? { ...ow, materialId } : ow
			)
		)
	}
</script>

<div class="owned-weapons-editor">
	<div class="flex justify-between items-center mb-4">
		<h4 class="font-bold">Owned Weapons & Shields</h4>
		<button
			type="button"
			class="btn btn-sm variant-soft-primary"
			onclick={() => showAddPanel = !showAddPanel}
		>
			{showAddPanel ? 'Cancel' : 'Add Weapon'}
		</button>
	</div>

	{#if showAddPanel}
		<div class="card p-4 variant-soft mb-4 max-h-60 overflow-y-auto">
			<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
				{#each availableWeapons as weapon}
					<button
						type="button"
						class="card p-3 text-left hover:bg-surface-600/50 transition-all"
						onclick={() => addWeapon(weapon.id)}
					>
						<span class="font-medium block text-sm">{weapon.name}</span>
						<div class="flex gap-1 mt-1">
							<span class="badge variant-soft text-xs">
								{weapon.baseDamageLethal ?? weapon.baseDamageBlunted} Dmg
							</span>
							<span class="badge variant-soft-tertiary text-xs">
								{formatRange(weapon.range)}
							</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if ownedWeapons.length === 0}
		<p class="text-surface-400 text-sm text-center py-4">
			No weapons owned. Add weapons to your inventory.
		</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each ownedWeapons as ow}
				{@const weapon = getWeaponById(ow.weaponId)}
				{#if weapon}
					<div class="card p-4 variant-soft flex flex-col gap-3">
						<div class="flex justify-between items-start">
							<div>
								<span class="font-medium">{weapon.name}</span>
								<div class="flex gap-2 mt-1">
									<span class="badge variant-soft text-xs">
										{weapon.baseDamageLethal ?? weapon.baseDamageBlunted} Dmg
									</span>
									<span class="badge variant-soft-warning text-xs">
										{weapon.apCost} AP
									</span>
									<span class="badge variant-soft-tertiary text-xs">
										{formatRange(weapon.range)}
									</span>
								</div>
							</div>
							<button
								type="button"
								class="btn-icon btn-icon-sm variant-soft-error"
								aria-label="Remove {weapon.name}"
								onclick={() => removeWeapon(ow.weaponId)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<div class="flex items-center gap-2">
							<label class="text-sm text-surface-400" for="material-{ow.weaponId}">
								Material:
							</label>
							<select
								id="material-{ow.weaponId}"
								aria-label="Material for {weapon.name}"
								class="select select-sm flex-1"
								value={ow.materialId ?? ''}
								onchange={(e) => updateMaterial(ow.weaponId, e.currentTarget.value || null)}
							>
								<option value="">None</option>
								{#each weaponMaterials as material}
									<option value={material.id}>{material.name}</option>
								{/each}
							</select>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/components/equipment/OwnedWeaponsEditor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/components/equipment/OwnedWeaponsEditor.svelte src/lib/components/equipment/OwnedWeaponsEditor.test.ts
git commit -m "feat: add OwnedWeaponsEditor for managing weapon inventory"
```

---

## Task 9: Integrate OwnedWeaponsEditor into EquipmentEditor

**Files:**
- Modify: `src/lib/components/equipment/EquipmentEditor.svelte`

**Step 1: Write the failing test**

```typescript
// Add to existing test file or create new
// src/lib/components/equipment/EquipmentEditor.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import EquipmentEditor from './EquipmentEditor.svelte'

describe('EquipmentEditor - Owned Weapons Tab', () => {
	const defaultProps = {
		equipment: {
			weapon: { id: null, materialId: null },
			offhand: { id: null, materialId: null },
			armor: { id: null, materialId: null },
			accessories: []
		},
		inventory: [],
		ownedWeapons: [],
		onEquipmentChange: vi.fn(),
		onInventoryChange: vi.fn(),
		onOwnedWeaponsChange: vi.fn()
	}

	it('should have an Owned tab for managing weapon inventory', () => {
		render(EquipmentEditor, { props: defaultProps })

		expect(screen.getByText('Owned')).toBeTruthy()
	})

	it('should render OwnedWeaponsEditor in Owned tab', async () => {
		render(EquipmentEditor, { props: defaultProps })

		// Click Owned tab
		const ownedTab = screen.getByText('Owned')
		await ownedTab.click()

		expect(screen.getByText('Owned Weapons & Shields')).toBeTruthy()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/components/equipment/EquipmentEditor.test.ts`
Expected: FAIL - Owned tab doesn't exist

**Step 3: Write minimal implementation**

```svelte
<!-- src/lib/components/equipment/EquipmentEditor.svelte -->
<!-- Add to script section, around line 27 -->
import OwnedWeaponsEditor from './OwnedWeaponsEditor.svelte'

<!-- Add to Props interface -->
ownedWeapons: OwnedWeapon[]
onOwnedWeaponsChange: (weapons: OwnedWeapon[]) => void

<!-- Add to destructured props -->
let { equipment, inventory, ownedWeapons, onEquipmentChange, onInventoryChange, onOwnedWeaponsChange }: Props = $props()

<!-- Add new Tab after Items tab (around line 254) -->
<Tab bind:group={selectedTabIndex} name="owned" value={3}>
	<span class="flex items-center gap-2">
		<span>Owned</span>
		{#if ownedWeapons.length > 0}
			<span class="badge variant-filled-warning text-xs">{ownedWeapons.length}</span>
		{/if}
	</span>
</Tab>

<!-- Add new panel after Items panel (around line 830) -->
{#if selectedTabIndex === 3}
	<div class="mt-4">
		<OwnedWeaponsEditor
			{ownedWeapons}
			{onOwnedWeaponsChange}
		/>
	</div>
{/if}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/components/equipment/EquipmentEditor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/components/equipment/EquipmentEditor.svelte src/lib/components/equipment/EquipmentEditor.test.ts
git commit -m "feat: integrate OwnedWeaponsEditor into EquipmentEditor"
```

---

## Task 10: Update Player Schema for ownedWeapons Validation

**Files:**
- Modify: `src/lib/schema/player.schema.ts`
- Create: `src/lib/schema/player.schema.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/schema/player.schema.test.ts
import { describe, it, expect } from 'vitest'
import { playerSchema } from './player.schema'

describe('playerSchema - ownedWeapons validation', () => {
	it('should accept valid ownedWeapons array', () => {
		const data = {
			// ... minimal required fields
			ownedWeapons: [
				{ weaponId: 'iron-sword', materialId: null },
				{ weaponId: 'steel-dagger', materialId: 'steel' }
			]
		}

		const result = playerSchema.safeParse(data)
		// Will fail on other required fields, but ownedWeapons should parse
		if (!result.success) {
			const ownedWeaponsError = result.error.issues.find(
				i => i.path.includes('ownedWeapons')
			)
			expect(ownedWeaponsError).toBeUndefined()
		}
	})

	it('should reject invalid ownedWeapons structure', () => {
		const data = {
			ownedWeapons: [
				{ weaponId: 123 } // invalid: weaponId should be string
			]
		}

		const result = playerSchema.safeParse(data)
		expect(result.success).toBe(false)
	})

	it('should default ownedWeapons to empty array', () => {
		const result = playerSchema.safeParse({})
		// Check that default is applied
		if (!result.success) {
			const issues = result.error.issues
			const ownedWeaponsRequired = issues.find(
				i => i.path[0] === 'ownedWeapons' && i.code === 'invalid_type'
			)
			expect(ownedWeaponsRequired).toBeUndefined()
		}
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/schema/player.schema.test.ts`
Expected: FAIL - ownedWeapons not in schema

**Step 3: Write minimal implementation**

```typescript
// src/lib/schema/player.schema.ts - Add ownedWeapon schema (near top)

const ownedWeaponSchema = z.object({
	weaponId: z.string(),
	materialId: z.string().nullable()
})

// Add to playerSchema object (after inventory)
ownedWeapons: z.array(ownedWeaponSchema).default([]),
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/schema/player.schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/schema/player.schema.ts src/lib/schema/player.schema.test.ts
git commit -m "feat: add ownedWeapons validation to player schema"
```

---

## Task 11: Update Export/Import to Include ownedWeapons

**Files:**
- Modify: `src/lib/util/import.util.ts`
- Create: `src/lib/util/import.util.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/util/import.util.test.ts
import { describe, it, expect } from 'vitest'
import { validateImport } from './import.util'

describe('Import validation - ownedWeapons', () => {
	it('should accept import with ownedWeapons field', async () => {
		const importData = {
			version: '1.0.0',
			exportedAt: new Date().toISOString(),
			player: {
				id: 'test-id',
				characterName: 'Test Hero',
				playerName: 'Player',
				level: 5,
				race: 'Nord',
				archetype: 'Warrior',
				birthSign: 'Warrior',
				ownedWeapons: [
					{ weaponId: 'iron-sword', materialId: null }
				],
				equipment: {
					weapon: { id: null, materialId: null },
					offhand: { id: null, materialId: null },
					armor: { id: null, materialId: null },
					accessories: []
				},
				inventory: []
			}
		}

		const result = validateImport(importData)

		expect(result.valid).toBe(true)
		expect(result.players[0].ownedWeapons).toHaveLength(1)
	})

	it('should default ownedWeapons to empty array for legacy imports', async () => {
		const legacyImportData = {
			version: '1.0.0',
			exportedAt: new Date().toISOString(),
			player: {
				id: 'test-id',
				characterName: 'Test Hero',
				playerName: 'Player',
				level: 5,
				race: 'Nord',
				archetype: 'Warrior',
				birthSign: 'Warrior',
				// No ownedWeapons field (legacy)
				equipment: {
					weapon: { id: null, materialId: null },
					offhand: { id: null, materialId: null },
					armor: { id: null, materialId: null },
					accessories: []
				},
				inventory: []
			}
		}

		const result = validateImport(legacyImportData)

		expect(result.valid).toBe(true)
		expect(result.players[0].ownedWeapons).toBeDefined()
		expect(result.players[0].ownedWeapons).toHaveLength(0)
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/util/import.util.test.ts`
Expected: FAIL - ownedWeapons not handled in import

**Step 3: Write minimal implementation**

```typescript
// src/lib/util/import.util.ts - Add to validatePlayerData function
// Add after inventory validation (around line 80)

// Ensure ownedWeapons exists (for legacy imports)
if (!player.ownedWeapons) {
	player.ownedWeapons = []
}

// Validate ownedWeapons structure
if (!Array.isArray(player.ownedWeapons)) {
	errors.push('ownedWeapons must be an array')
} else {
	player.ownedWeapons.forEach((ow, index) => {
		if (typeof ow.weaponId !== 'string') {
			errors.push(`ownedWeapons[${index}].weaponId must be a string`)
		}
		if (ow.materialId !== null && typeof ow.materialId !== 'string') {
			errors.push(`ownedWeapons[${index}].materialId must be a string or null`)
		}
	})
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/util/import.util.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/util/import.util.ts src/lib/util/import.util.test.ts
git commit -m "feat: add ownedWeapons support to import/export flow"
```

---

## Task 12: Integrate ActionsPanel into CombatMode

**Files:**
- Modify: `src/lib/components/combat/CombatMode.svelte`
- Modify: `src/lib/components/combat/index.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/components/combat/CombatMode.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import CombatMode from './CombatMode.svelte'

// Mock stores
vi.mock('$lib/stores/combat.store', () => ({
	combatStore: {
		subscribe: vi.fn((cb) => {
			cb({
				'player-1': {
					currentAP: 5,
					currentMP: 10,
					currentHP: 100,
					partyInitiativePool: { current: 3, max: 5 },
					combatEquipment: {
						weapon: { id: 'iron-sword', materialId: null },
						offhand: { id: null, materialId: null },
						armor: { id: null, materialId: null },
						accessories: []
					}
				}
			})
			return () => {}
		})
	},
	getCombatSessionStore: vi.fn()
}))

describe('CombatMode - ActionsPanel Integration', () => {
	it('should render ActionsPanel with column headers', () => {
		render(CombatMode, {
			props: {
				playerId: 'player-1',
				playerData: {
					id: 'player-1',
					ownedWeapons: []
				} as any
			}
		})

		expect(screen.getByText('Movement & Utility')).toBeTruthy()
		expect(screen.getByText('Offensive')).toBeTruthy()
		expect(screen.getByText('Defensive')).toBeTruthy()
	})

	it('should render action tiles instead of tabs', () => {
		render(CombatMode, {
			props: {
				playerId: 'player-1',
				playerData: {
					id: 'player-1',
					ownedWeapons: []
				} as any
			}
		})

		// Should have tiles, not tabs
		expect(screen.getByText('Move')).toBeTruthy()
		expect(screen.getByText('Attack')).toBeTruthy()
		expect(screen.getByText('Block')).toBeTruthy()

		// Old tabs should not exist
		expect(screen.queryByRole('tab', { name: 'Attack' })).toBeFalsy()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/components/combat/CombatMode.test.ts`
Expected: FAIL - ActionsPanel not integrated

**Step 3: Write minimal implementation**

```svelte
<!-- src/lib/components/combat/CombatMode.svelte -->
<!-- Replace ActionPanel import and usage with ActionsPanel -->

<!-- In script section, add imports -->
import ActionsPanel, { type ActionType } from './ActionsPanel.svelte'
import MoveModal from './modals/MoveModal.svelte'
import SwapWeaponModal from './modals/SwapWeaponModal.svelte'

<!-- Add modal state -->
let activeModal = $state<ActionType | null>(null)

<!-- Add action handler -->
function handleActionSelect(action: ActionType) {
	activeModal = action
}

function handleCloseModal() {
	activeModal = null
}

function handleMove(apCost: number) {
	combatStore.spendAP(playerId, apCost)
	activeModal = null
}

function handleSwapWeapon(data: { weaponId: string; materialId: string | null; slot: 'weapon' | 'offhand' }) {
	combatStore.swapWeapon(playerId, data)
	activeModal = null
}

<!-- Replace the ActionPanel component with ActionsPanel -->
<ActionsPanel
	currentAP={session.currentAP}
	currentMP={session.currentMP}
	currentInitiative={session.partyInitiativePool.current}
	hasHeftedShield={false}
	onActionSelect={handleActionSelect}
/>

<!-- Add modals at bottom of component -->
<MoveModal
	isOpen={activeModal === 'move'}
	currentAP={session.currentAP}
	onMove={handleMove}
	onClose={handleCloseModal}
/>

<SwapWeaponModal
	isOpen={activeModal === 'swapWeapon'}
	ownedWeapons={playerData.ownedWeapons}
	currentEquipment={session.combatEquipment}
	currentAP={session.currentAP}
	onSwap={handleSwapWeapon}
	onClose={handleCloseModal}
/>
```

```typescript
// src/lib/components/combat/index.ts - Add exports
export { default as ActionsPanel } from './ActionsPanel.svelte'
export { default as ActionTile } from './ActionTile.svelte'
export { default as MoveModal } from './modals/MoveModal.svelte'
export { default as SwapWeaponModal } from './modals/SwapWeaponModal.svelte'
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/components/combat/CombatMode.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/components/combat/CombatMode.svelte src/lib/components/combat/index.ts
git commit -m "feat: integrate ActionsPanel into CombatMode, replacing tabs"
```

---

## Task 13: Sync Combat Equipment Back to Player on Combat End

**Files:**
- Modify: `src/routes/[id]/+page.svelte` (or wherever combat end is handled)
- Create: `src/lib/util/combatSync.util.ts`
- Create: `src/lib/util/combatSync.util.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/util/combatSync.util.test.ts
import { describe, it, expect } from 'vitest'
import { syncCombatResultToPlayer } from './combatSync.util'
import type { PlayerData, Equipment } from '$lib/models/player'

describe('syncCombatResultToPlayer', () => {
	const basePlayer: PlayerData = {
		id: 'player-1',
		health: 100,
		maxHealth: 100,
		magicka: 50,
		maxMagicka: 50,
		equipment: {
			weapon: { id: 'iron-sword', materialId: null },
			offhand: { id: null, materialId: null },
			armor: { id: null, materialId: null },
			accessories: []
		}
	} as PlayerData

	it('should update player health from combat result', () => {
		const combatResult = {
			health: 75,
			magicka: 30,
			equipment: basePlayer.equipment
		}

		const updated = syncCombatResultToPlayer(basePlayer, combatResult)

		expect(updated.health).toBe(75)
		expect(updated.magicka).toBe(30)
	})

	it('should update player equipment from combat result', () => {
		const newEquipment: Equipment = {
			weapon: { id: 'steel-sword', materialId: 'steel' },
			offhand: { id: 'iron-shield', materialId: null },
			armor: { id: null, materialId: null },
			accessories: []
		}

		const combatResult = {
			health: 100,
			magicka: 50,
			equipment: newEquipment
		}

		const updated = syncCombatResultToPlayer(basePlayer, combatResult)

		expect(updated.equipment.weapon.id).toBe('steel-sword')
		expect(updated.equipment.weapon.materialId).toBe('steel')
		expect(updated.equipment.offhand.id).toBe('iron-shield')
	})

	it('should update the updatedAt timestamp', () => {
		const combatResult = {
			health: 100,
			magicka: 50,
			equipment: basePlayer.equipment
		}

		const before = new Date().toISOString()
		const updated = syncCombatResultToPlayer(basePlayer, combatResult)
		const after = new Date().toISOString()

		expect(updated.updatedAt >= before).toBe(true)
		expect(updated.updatedAt <= after).toBe(true)
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/util/combatSync.util.test.ts`
Expected: FAIL - function doesn't exist

**Step 3: Write minimal implementation**

```typescript
// src/lib/util/combatSync.util.ts
import type { PlayerData, Equipment } from '$lib/models/player'

export interface CombatResult {
	health: number
	magicka: number
	equipment: Equipment
}

export function syncCombatResultToPlayer(
	player: PlayerData,
	combatResult: CombatResult
): PlayerData {
	return {
		...player,
		health: combatResult.health,
		magicka: combatResult.magicka,
		equipment: combatResult.equipment,
		updatedAt: new Date().toISOString()
	}
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/util/combatSync.util.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/util/combatSync.util.ts src/lib/util/combatSync.util.test.ts
git commit -m "feat: add combatSync utility for syncing combat results to player"
```

---

## Task 14: Wire Up Combat End to Sync Equipment

**Files:**
- Modify: Component that handles combat end (likely `src/routes/[id]/+page.svelte` or `EndCombatModal.svelte`)

**Step 1: Identify the combat end handler**

Look for where `combatStore.endCombat()` is called and update it to use the sync utility.

**Step 2: Write the integration**

```typescript
// In the component handling combat end
import { syncCombatResultToPlayer } from '$lib/util/combatSync.util'
import { playersStore } from '$lib/stores/persisted.store'

function handleEndCombat() {
	const result = combatStore.endCombat(playerId)

	if (result) {
		playersStore.update(players => {
			const player = players[playerId]
			if (player) {
				return {
					...players,
					[playerId]: syncCombatResultToPlayer(player, result)
				}
			}
			return players
		})
	}
}
```

**Step 3: Run full test suite**

Run: `npm run test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/routes/[id]/+page.svelte  # or relevant file
git commit -m "feat: sync combat equipment changes back to player on combat end"
```

---

## Task 15: Add Playing Mode Equipment Quick-Swap UI

**Files:**
- Create: `src/lib/components/equipment/QuickEquipPanel.svelte`
- Create: `src/lib/components/equipment/QuickEquipPanel.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/components/equipment/QuickEquipPanel.test.ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import QuickEquipPanel from './QuickEquipPanel.svelte'
import type { Equipment, OwnedWeapon } from '$lib/models/player'

describe('QuickEquipPanel', () => {
	const mockEquipment: Equipment = {
		weapon: { id: 'iron-sword', materialId: null },
		offhand: { id: null, materialId: null },
		armor: { id: null, materialId: null },
		accessories: []
	}

	const mockOwnedWeapons: OwnedWeapon[] = [
		{ weaponId: 'iron-sword', materialId: null },
		{ weaponId: 'steel-dagger', materialId: 'steel' }
	]

	const defaultProps = {
		equipment: mockEquipment,
		ownedWeapons: mockOwnedWeapons,
		onEquipmentChange: vi.fn()
	}

	it('should display currently equipped weapon', () => {
		render(QuickEquipPanel, { props: defaultProps })

		expect(screen.getByText('Iron Sword')).toBeTruthy()
		expect(screen.getByText('Equipped')).toBeTruthy()
	})

	it('should show unequipped owned weapons', () => {
		render(QuickEquipPanel, { props: defaultProps })

		expect(screen.getByText('Steel Dagger')).toBeTruthy()
	})

	it('should allow equipping a different weapon', async () => {
		const handleChange = vi.fn()
		render(QuickEquipPanel, {
			props: {
				...defaultProps,
				onEquipmentChange: handleChange
			}
		})

		await fireEvent.click(screen.getByText('Steel Dagger').closest('button')!)

		expect(handleChange).toHaveBeenCalled()
		const newEquipment = handleChange.mock.calls[0][0]
		expect(newEquipment.weapon.id).toBe('steel-dagger')
	})

	it('should allow unequipping current weapon', async () => {
		const handleChange = vi.fn()
		render(QuickEquipPanel, {
			props: {
				...defaultProps,
				onEquipmentChange: handleChange
			}
		})

		await fireEvent.click(screen.getByText('Unequip'))

		expect(handleChange).toHaveBeenCalled()
		const newEquipment = handleChange.mock.calls[0][0]
		expect(newEquipment.weapon.id).toBeNull()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/components/equipment/QuickEquipPanel.test.ts`
Expected: FAIL - component doesn't exist

**Step 3: Write minimal implementation**

```svelte
<!-- src/lib/components/equipment/QuickEquipPanel.svelte -->
<script lang="ts">
	import classNames from 'classnames'
	import type { Equipment, OwnedWeapon, EquipmentSlot } from '$lib/models/player'
	import { getWeaponById, WeaponRange } from '$lib/data/weapons'
	import { getMaterialById } from '$lib/data/materials'

	interface Props {
		equipment: Equipment
		ownedWeapons: OwnedWeapon[]
		onEquipmentChange: (equipment: Equipment) => void
	}

	let { equipment, ownedWeapons, onEquipmentChange }: Props = $props()

	function formatRange(range: WeaponRange): string {
		switch (range) {
			case WeaponRange.Immediate: return 'Immediate'
			case WeaponRange.Adjacent: return 'Adjacent'
			case WeaponRange.Large: return 'Large'
			case WeaponRange.Reach: return 'Reach'
			case WeaponRange.Short: return 'Short'
			case WeaponRange.Ranged: return 'Ranged'
			default: return range
		}
	}

	function getWeaponDisplay(ow: OwnedWeapon) {
		const weapon = getWeaponById(ow.weaponId)
		if (!weapon) return null
		const material = ow.materialId ? getMaterialById(ow.materialId) : null
		return { weapon, materialName: material?.name ?? null }
	}

	function isEquipped(weaponId: string): boolean {
		return equipment.weapon.id === weaponId || equipment.offhand.id === weaponId
	}

	function equipWeapon(ow: OwnedWeapon) {
		const display = getWeaponDisplay(ow)
		if (!display) return

		const newEquipment = { ...equipment }

		if (display.weapon.isTwoHanded) {
			// Two-handed: main hand, clear offhand
			newEquipment.weapon = { id: ow.weaponId, materialId: ow.materialId }
			newEquipment.offhand = { id: null, materialId: null }
		} else if (display.weapon.isShield) {
			// Shield: offhand
			newEquipment.offhand = { id: ow.weaponId, materialId: ow.materialId }
		} else {
			// One-handed: main hand
			newEquipment.weapon = { id: ow.weaponId, materialId: ow.materialId }
		}

		onEquipmentChange(newEquipment)
	}

	function unequipWeapon(slot: 'weapon' | 'offhand') {
		const newEquipment = { ...equipment }
		newEquipment[slot] = { id: null, materialId: null }
		onEquipmentChange(newEquipment)
	}

	let equippedWeapon = $derived(
		equipment.weapon.id
			? getWeaponDisplay({ weaponId: equipment.weapon.id, materialId: equipment.weapon.materialId })
			: null
	)

	let equippedOffhand = $derived(
		equipment.offhand.id
			? getWeaponDisplay({ weaponId: equipment.offhand.id, materialId: equipment.offhand.materialId })
			: null
	)

	let unequippedWeapons = $derived(
		ownedWeapons.filter(ow => !isEquipped(ow.weaponId))
	)
</script>

<div class="quick-equip-panel card p-4">
	<h4 class="font-bold mb-3">Equipment</h4>

	<!-- Currently Equipped -->
	<div class="flex flex-col gap-2 mb-4">
		<div class="text-sm text-surface-400">Currently Equipped:</div>

		{#if equippedWeapon}
			<div class="flex justify-between items-center p-2 rounded variant-soft-primary">
				<div>
					<span class="font-medium">
						{equippedWeapon.materialName ? `${equippedWeapon.materialName} ` : ''}{equippedWeapon.weapon.name}
					</span>
					<span class="badge variant-soft text-xs ml-2">Main Hand</span>
					<span class="badge variant-filled-success text-xs ml-1">Equipped</span>
				</div>
				<button
					type="button"
					class="btn btn-sm variant-soft-error"
					onclick={() => unequipWeapon('weapon')}
				>
					Unequip
				</button>
			</div>
		{:else}
			<div class="text-surface-500 text-sm p-2">No main hand weapon</div>
		{/if}

		{#if equippedOffhand}
			<div class="flex justify-between items-center p-2 rounded variant-soft-secondary">
				<div>
					<span class="font-medium">
						{equippedOffhand.materialName ? `${equippedOffhand.materialName} ` : ''}{equippedOffhand.weapon.name}
					</span>
					<span class="badge variant-soft text-xs ml-2">Off Hand</span>
					<span class="badge variant-filled-success text-xs ml-1">Equipped</span>
				</div>
				<button
					type="button"
					class="btn btn-sm variant-soft-error"
					onclick={() => unequipWeapon('offhand')}
				>
					Unequip
				</button>
			</div>
		{/if}
	</div>

	<!-- Available Weapons -->
	{#if unequippedWeapons.length > 0}
		<div class="text-sm text-surface-400 mb-2">Available:</div>
		<div class="flex flex-col gap-2">
			{#each unequippedWeapons as ow}
				{@const display = getWeaponDisplay(ow)}
				{#if display}
					<button
						type="button"
						class="flex justify-between items-center p-2 rounded variant-soft hover:variant-soft-primary transition-all text-left w-full"
						onclick={() => equipWeapon(ow)}
					>
						<div>
							<span class="font-medium">
								{display.materialName ? `${display.materialName} ` : ''}{display.weapon.name}
							</span>
							<div class="flex gap-1 mt-1">
								<span class="badge variant-soft text-xs">
									{display.weapon.baseDamageLethal ?? display.weapon.baseDamageBlunted} Dmg
								</span>
								<span class="badge variant-soft-tertiary text-xs">
									{formatRange(display.weapon.range)}
								</span>
							</div>
						</div>
						<span class="btn btn-sm variant-soft-success">Equip</span>
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/components/equipment/QuickEquipPanel.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/components/equipment/QuickEquipPanel.svelte src/lib/components/equipment/QuickEquipPanel.test.ts
git commit -m "feat: add QuickEquipPanel for Playing mode equipment management"
```

---

## Task 16: Final Integration Test

**Files:**
- Create: `src/lib/integration/combatActions.integration.test.ts`

**Step 1: Write integration test**

```typescript
// src/lib/integration/combatActions.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'

// Mock localStorage
const localStorageMock = {
	store: {} as Record<string, string>,
	getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
	setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value }),
	clear: vi.fn(() => { localStorageMock.store = {} })
}
vi.stubGlobal('localStorage', localStorageMock)

import { combatStore } from '$lib/stores/combat.store'
import { syncCombatResultToPlayer } from '$lib/util/combatSync.util'
import type { PlayerData } from '$lib/models/player'

describe('Combat Actions Integration', () => {
	const mockPlayer: PlayerData = {
		id: 'player-1',
		level: 5,
		playerName: 'Test',
		characterName: 'Hero',
		health: 100,
		maxHealth: 100,
		magicka: 50,
		maxMagicka: 50,
		actionPoints: 5,
		maxActionPoints: 5,
		ownedWeapons: [
			{ weaponId: 'iron-sword', materialId: null },
			{ weaponId: 'steel-dagger', materialId: 'steel' },
			{ weaponId: 'iron-shield', materialId: null }
		],
		equipment: {
			weapon: { id: 'iron-sword', materialId: null },
			offhand: { id: null, materialId: null },
			armor: { id: null, materialId: null },
			accessories: []
		},
		inventory: [],
		knownSpells: []
	} as PlayerData

	beforeEach(() => {
		localStorageMock.clear()
	})

	it('should complete full combat flow with equipment changes', () => {
		// 1. Start combat
		combatStore.startCombat('player-1', 3, 2, mockPlayer)

		let state = get(combatStore)
		expect(state['player-1']).toBeDefined()
		expect(state['player-1'].combatEquipment.weapon.id).toBe('iron-sword')

		// 2. Swap weapon during combat
		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-dagger',
			materialId: 'steel',
			slot: 'weapon'
		})

		state = get(combatStore)
		expect(state['player-1'].combatEquipment.weapon.id).toBe('steel-dagger')
		expect(state['player-1'].currentAP).toBe(4) // 5 - 1 for swap

		// 3. Equip shield to offhand
		combatStore.swapWeapon('player-1', {
			weaponId: 'iron-shield',
			materialId: null,
			slot: 'offhand'
		})

		state = get(combatStore)
		expect(state['player-1'].combatEquipment.offhand.id).toBe('iron-shield')
		expect(state['player-1'].currentAP).toBe(3) // 4 - 1 for swap

		// 4. Take some damage
		combatStore.takeDamage('player-1', 25)

		state = get(combatStore)
		expect(state['player-1'].currentHP).toBe(75)

		// 5. End combat
		const result = combatStore.endCombat('player-1')

		expect(result).toBeDefined()
		expect(result!.health).toBe(75)
		expect(result!.equipment.weapon.id).toBe('steel-dagger')
		expect(result!.equipment.offhand.id).toBe('iron-shield')

		// 6. Sync back to player
		const updatedPlayer = syncCombatResultToPlayer(mockPlayer, result!)

		expect(updatedPlayer.health).toBe(75)
		expect(updatedPlayer.equipment.weapon.id).toBe('steel-dagger')
		expect(updatedPlayer.equipment.weapon.materialId).toBe('steel')
		expect(updatedPlayer.equipment.offhand.id).toBe('iron-shield')

		// 7. Verify persistence
		expect(localStorageMock.setItem).toHaveBeenCalled()
	})

	it('should persist combat state across page reloads', () => {
		// Start combat and make changes
		combatStore.startCombat('player-1', 3, 2, mockPlayer)
		combatStore.swapWeapon('player-1', {
			weaponId: 'steel-dagger',
			materialId: 'steel',
			slot: 'weapon'
		})

		// Verify it was saved
		const savedData = JSON.parse(localStorageMock.store['combat-sessions'])
		expect(savedData['player-1'].combatEquipment.weapon.id).toBe('steel-dagger')
	})
})
```

**Step 2: Run full test suite**

Run: `npm run test`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/lib/integration/combatActions.integration.test.ts
git commit -m "test: add integration tests for combat actions flow"
```

---

## Summary

This plan implements:

1. **Data Model**: `ownedWeapons[]` array on PlayerData with migration support
2. **UI Components**:
   - `ActionTile` - Individual action button
   - `ActionsPanel` - 3-column grid replacing tabs
   - `MoveModal` - Movement selection with range reference
   - `SwapWeaponModal` - Weapon selection from inventory
   - `OwnedWeaponsEditor` - Inventory management in Editing mode
   - `QuickEquipPanel` - Free equipment swap in Playing mode
3. **State Management**: Combat equipment tracking with persistence
4. **Sync Flow**: Equipment changes persist when combat ends
5. **Validation**: Schema and import/export support for new fields
6. **Testing**: TDD throughout with integration tests

All state is persisted to localStorage ensuring no data loss between sessions.
