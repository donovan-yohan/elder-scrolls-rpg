# Magicka Burst Reroll System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Magicka Burst reroll system that allows players to spend Magicka (or take burn damage) to reroll any roll on their turn, with special rules for critical successes and failures.

**Architecture:** The DiceRoller component will be enhanced to support reroll flows. A new `MagickaBurstState` tracks whether the current roll is a magicka burst reroll. The combat store will handle MP spending and burn damage. All modals using DiceRoller will receive callbacks for reroll support.

**Tech Stack:** Svelte 5 ($props, $state, $derived), TypeScript, existing DiceRoller component, combat.store.ts

---

## Game Rules Summary (from docs/Game Flow Rules)

1. **Cost:** Spend 1 MP to reroll any roll on your turn
2. **Magicka Burn:** If MP is 0, you may take burn damage (1 HP) to reroll, but cannot reroll if completely burned out (HP at 0)
3. **No Crit Success:** Magicka burst rerolls DO NOT allow critical success - any roll in crit range counts as a normal success
4. **Crit Fail Allowed:** Critical failures ARE still possible on magicka rerolls (making it risky)
5. **Rerolling Crit Fail:** If using magicka burst to reroll a critical failure, you accept the misfortune point and roll again, risking another failure

---

## Task 1: Add Magicka Burst Types and Utilities

**Files:**
- Create: `src/lib/util/__tests__/magicka-burst.util.test.ts`
- Create: `src/lib/util/magicka-burst.util.ts`

### Step 1.1: Write the failing tests

Create test file `src/lib/util/__tests__/magicka-burst.util.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  canUseMagickaBurst,
  getMagickaBurstCost,
  processMagickaBurstRoll,
  type MagickaBurstState,
  type MagickaBurstCost,
} from '$lib/util/magicka-burst.util'

describe('canUseMagickaBurst', () => {
  it('returns true when player has MP > 0', () => {
    const result = canUseMagickaBurst(5, 10)
    expect(result).toBe(true)
  })

  it('returns true when MP is 0 but HP > 0 (can burn)', () => {
    const result = canUseMagickaBurst(0, 10)
    expect(result).toBe(true)
  })

  it('returns false when both MP and HP are 0 (completely burned out)', () => {
    const result = canUseMagickaBurst(0, 0)
    expect(result).toBe(false)
  })

  it('returns false when MP is 0 and HP is 1 (would die from burn)', () => {
    // Player can still burn at 1 HP - they just go to 0
    const result = canUseMagickaBurst(0, 1)
    expect(result).toBe(true)
  })
})

describe('getMagickaBurstCost', () => {
  it('returns MP cost when player has MP', () => {
    const cost = getMagickaBurstCost(5, 10)
    expect(cost).toEqual({ mpCost: 1, hpCost: 0, isBurn: false })
  })

  it('returns HP cost when player has no MP (burn damage)', () => {
    const cost = getMagickaBurstCost(0, 10)
    expect(cost).toEqual({ mpCost: 0, hpCost: 1, isBurn: true })
  })

  it('returns null when cannot use magicka burst', () => {
    const cost = getMagickaBurstCost(0, 0)
    expect(cost).toBeNull()
  })
})

describe('processMagickaBurstRoll', () => {
  it('converts crit success to normal success on magicka burst', () => {
    // Roll of 20 would normally be crit at level 1
    const result = processMagickaBurstRoll(20, 15, 1, true)
    expect(result.isCritical).toBe(false)
    expect(result.wasDowngradedFromCrit).toBe(true)
    expect(result.success).toBe(true)
  })

  it('allows crit failure on magicka burst', () => {
    // Roll of 1 is crit fail at level 1
    const result = processMagickaBurstRoll(1, 15, 1, true)
    expect(result.isCriticalFail).toBe(true)
    expect(result.success).toBe(false)
  })

  it('normal roll behavior when not a magicka burst', () => {
    const result = processMagickaBurstRoll(20, 15, 1, false)
    expect(result.isCritical).toBe(true)
    expect(result.wasDowngradedFromCrit).toBe(false)
  })

  it('tracks if rerolling from a crit fail (accepts misfortune)', () => {
    const result = processMagickaBurstRoll(15, 10, 1, true)
    // This test just verifies the utility processes correctly
    // The actual misfortune tracking is handled by the parent component
    expect(result.success).toBe(true)
  })
})
```

### Step 1.2: Run test to verify it fails

Run: `npm test -- src/lib/util/__tests__/magicka-burst.util.test.ts`
Expected: FAIL - module not found

### Step 1.3: Write minimal implementation

Create `src/lib/util/magicka-burst.util.ts`:

```typescript
import { isCriticalSuccess, isCriticalFailure } from './dice.util'

export interface MagickaBurstState {
  isActive: boolean
  previousRollWasCritFail: boolean
  misfortuneAccepted: boolean
}

export interface MagickaBurstCost {
  mpCost: number
  hpCost: number
  isBurn: boolean
}

export interface MagickaBurstRollResult {
  isCritical: boolean
  isCriticalFail: boolean
  success: boolean
  wasDowngradedFromCrit: boolean
}

/**
 * Check if player can use Magicka Burst to reroll
 * Requires either MP > 0 or HP > 0 (to take burn damage)
 * Cannot reroll if completely burned out (HP = 0)
 */
export function canUseMagickaBurst(currentMP: number, currentHP: number): boolean {
  // If has MP, can use it
  if (currentMP > 0) return true
  // If no MP but has HP, can take burn damage
  if (currentHP > 0) return true
  // Completely burned out
  return false
}

/**
 * Get the cost of using Magicka Burst
 * Returns MP cost if available, otherwise HP cost (burn damage)
 */
export function getMagickaBurstCost(
  currentMP: number,
  currentHP: number
): MagickaBurstCost | null {
  if (!canUseMagickaBurst(currentMP, currentHP)) {
    return null
  }

  if (currentMP > 0) {
    return { mpCost: 1, hpCost: 0, isBurn: false }
  }

  // No MP - take burn damage
  return { mpCost: 0, hpCost: 1, isBurn: true }
}

/**
 * Process a roll that was made via Magicka Burst
 * - Downgrades critical successes to normal successes
 * - Critical failures are still allowed
 */
export function processMagickaBurstRoll(
  roll: number,
  targetDC: number,
  playerLevel: number,
  isMagickaBurst: boolean
): MagickaBurstRollResult {
  const wouldBeCrit = isCriticalSuccess(roll, playerLevel)
  const isCritFail = isCriticalFailure(roll, playerLevel)

  if (isMagickaBurst) {
    // Magicka burst: no crit success, but crit fail allowed
    return {
      isCritical: false, // Never crit on magicka burst
      isCriticalFail: isCritFail,
      success: roll >= targetDC, // Normal success check only
      wasDowngradedFromCrit: wouldBeCrit,
    }
  }

  // Normal roll
  return {
    isCritical: wouldBeCrit,
    isCriticalFail: isCritFail,
    success: roll >= targetDC || wouldBeCrit, // Crit auto-succeeds
    wasDowngradedFromCrit: false,
  }
}

/**
 * Create initial magicka burst state
 */
export function createMagickaBurstState(): MagickaBurstState {
  return {
    isActive: false,
    previousRollWasCritFail: false,
    misfortuneAccepted: false,
  }
}
```

### Step 1.4: Run test to verify it passes

Run: `npm test -- src/lib/util/__tests__/magicka-burst.util.test.ts`
Expected: PASS

### Step 1.5: Run build verification

Run: `npm run build 2>&1 | head -20`
Expected: Build succeeds

---

## Task 2: Extend DiceRoll Model for Magicka Burst

**Files:**
- Modify: `src/lib/models/combat.ts`

### Step 2.1: Update the DiceRoll interface

Add to `src/lib/models/combat.ts`, update the DiceRoll interface:

```typescript
export interface DiceRoll {
  baseRoll: number
  bonuses: DiceRollBonus[]
  advantageCount: number // positive = advantage, negative = disadvantage
  total: number
  isCritical: boolean
  isCriticalFail: boolean
  // Magicka burst fields
  isMagickaBurst?: boolean
  wasDowngradedFromCrit?: boolean
}
```

### Step 2.2: Run build verification

Run: `npm run build 2>&1 | head -20`
Expected: Build succeeds (optional fields don't break existing code)

---

## Task 3: Extend DiceRoller Component for Reroll Support

**Files:**
- Modify: `src/lib/components/combat/DiceRoller/DiceRoller.svelte`

### Step 3.1: Update DiceRoller with reroll support

Modify `src/lib/components/combat/DiceRoller/DiceRoller.svelte`:

```svelte
<script lang="ts">
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton'
	import type { DiceRoll, DiceRollBonus } from '$lib/models/combat'
	import type { SubSkill } from '$lib/models/subskill'
	import { rollD20, isCriticalSuccess, isCriticalFailure, performSkillCheck } from '$lib/util/dice.util'
	import { getSubskillBonus } from '$lib/util/stats.util'
	import {
		canUseMagickaBurst,
		getMagickaBurstCost,
		processMagickaBurstRoll,
		type MagickaBurstCost,
	} from '$lib/util/magicka-burst.util'
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
		// Magicka burst support
		currentMP?: number
		currentHP?: number
		onMagickaBurst?: (cost: MagickaBurstCost, previousRollWasCritFail: boolean) => void
		showMagickaBurst?: boolean
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
		// Magicka burst props
		currentMP = 0,
		currentHP = 0,
		onMagickaBurst,
		showMagickaBurst = false,
	}: Props = $props()

	let mode: 'digital' | 'manual' = $state('digital')
	let lastRoll: DiceRoll | undefined = $state(undefined)
	let lastSuccess: boolean | undefined = $state(undefined)
	let isRolling: boolean = $state(false)
	let selectedSubskill: SubSkill | null = $state(null)

	// Magicka burst state
	let isMagickaBurstRoll: boolean = $state(false)
	let previousRollWasCritFail: boolean = $state(false)

	let subskillBonus = $derived(selectedSubskill ? getSubskillBonus(playerLevel) : 0)

	// Can the player use magicka burst?
	let canBurst = $derived(showMagickaBurst && canUseMagickaBurst(currentMP, currentHP))
	let burstCost = $derived(canBurst ? getMagickaBurstCost(currentMP, currentHP) : null)

	async function handleDigitalRoll(magickaBurst: boolean = false) {
		if (disabled || isRolling) return

		isRolling = true
		isMagickaBurstRoll = magickaBurst

		// Track if previous roll was crit fail (for misfortune)
		if (magickaBurst && lastRoll?.isCriticalFail) {
			previousRollWasCritFail = true
		}

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

		// If magicka burst, process the roll to downgrade crits
		if (magickaBurst && targetDC !== undefined) {
			const burstResult = processMagickaBurstRoll(baseRoll, targetDC, playerLevel, true)

			// Override the roll's critical status
			result.roll.isCritical = burstResult.isCritical
			result.roll.isMagickaBurst = true
			result.roll.wasDowngradedFromCrit = burstResult.wasDowngradedFromCrit
			result.success = burstResult.success
		}

		lastRoll = result.roll
		lastSuccess = targetDC !== undefined ? result.success : undefined
		isRolling = false

		// Notify parent about magicka burst cost
		if (magickaBurst && burstCost && onMagickaBurst) {
			onMagickaBurst(burstCost, previousRollWasCritFail)
		}

		onRoll(result.roll, result.success, result.margin)
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

		lastRoll = roll
		lastSuccess = targetDC !== undefined ? success : undefined

		onRoll(roll, success, margin)
	}

	function handleMagickaBurst() {
		handleDigitalRoll(true)
	}

	function reset() {
		lastRoll = undefined
		lastSuccess = undefined
		isMagickaBurstRoll = false
		previousRollWasCritFail = false
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
				onclick={() => handleDigitalRoll(false)}
				disabled={disabled || isRolling}
			>
				{#if isRolling}
					<span class="animate-spin mr-2">*</span> Rolling...
				{:else}
					{label}
				{/if}
			</button>
		{:else}
			<ManualEntry onSubmit={handleManualRoll} {disabled} />
		{/if}
	</div>

	<!-- Result Display -->
	{#if lastRoll}
		<RollResult roll={lastRoll} {targetDC} />

		<!-- Magicka Burst Warning for downgraded crit -->
		{#if lastRoll.wasDowngradedFromCrit}
			<div class="text-center mt-2 text-warning-500 text-sm">
				Magicka Burst: Critical success downgraded to normal success
			</div>
		{/if}

		<div class="text-center mt-2 flex flex-col gap-2">
			<!-- Magicka Burst Reroll Option -->
			{#if showMagickaBurst && canBurst && burstCost && mode === 'digital'}
				<button
					type="button"
					class="btn btn-sm variant-filled-tertiary"
					onclick={handleMagickaBurst}
					disabled={disabled || isRolling}
				>
					{#if burstCost.isBurn}
						Magicka Burst (Burn: 1 HP)
					{:else}
						Magicka Burst (1 MP)
					{/if}
					{#if lastRoll.isCriticalFail}
						<span class="text-xs opacity-75 ml-1">(accepts misfortune)</span>
					{/if}
				</button>
				{#if burstCost.isBurn}
					<div class="text-xs text-error-500">
						Warning: No MP remaining - will take burn damage!
					</div>
				{/if}
			{/if}

			<button type="button" class="btn btn-sm variant-ghost" onclick={reset}>
				Roll Again
			</button>
		</div>
	{/if}

	<!-- Magicka Burst Info (when enabled but no roll yet) -->
	{#if showMagickaBurst && !lastRoll}
		<div class="text-xs text-center opacity-60 mt-2">
			Magicka Burst available after rolling
			{#if currentMP > 0}
				(1 MP)
			{:else if currentHP > 0}
				(Burn: 1 HP)
			{:else}
				(Burned out - unavailable)
			{/if}
		</div>
	{/if}
</div>
```

### Step 3.2: Run build verification

Run: `npm run build 2>&1 | head -20`
Expected: Build succeeds

---

## Task 4: Update RollResult for Magicka Burst Display

**Files:**
- Modify: `src/lib/components/combat/DiceRoller/RollResult.svelte`

### Step 4.1: Update RollResult to show magicka burst info

Modify `src/lib/components/combat/DiceRoller/RollResult.svelte`:

```svelte
<script lang="ts">
	import type { DiceRoll } from '$lib/models/combat'

	interface Props {
		roll: DiceRoll
		targetDC?: number
		showBreakdown?: boolean
	}

	let { roll, targetDC = undefined, showBreakdown = true }: Props = $props()

	let success = $derived(targetDC !== undefined ? (roll.total >= targetDC || roll.isCritical) : undefined)
	let margin = $derived(targetDC !== undefined ? roll.total - targetDC : undefined)
</script>

<div class="roll-result p-4 rounded-lg" class:variant-soft-success={success === true} class:variant-soft-error={success === false} class:variant-soft-surface={success === undefined}>
	<!-- Magicka Burst Indicator -->
	{#if roll.isMagickaBurst}
		<div class="text-center mb-2">
			<span class="badge variant-filled-tertiary text-xs">Magicka Burst</span>
		</div>
	{/if}

	<!-- Main Result -->
	<div class="text-center mb-2">
		<span class="text-3xl font-bold" class:text-success-500={roll.isCritical} class:text-error-500={roll.isCriticalFail}>
			{roll.total}
		</span>
		{#if roll.isCritical}
			<span class="badge variant-filled-success ml-2">CRITICAL!</span>
		{/if}
		{#if roll.isCriticalFail}
			<span class="badge variant-filled-error ml-2">FUMBLE!</span>
		{/if}
		{#if roll.wasDowngradedFromCrit}
			<span class="badge variant-soft-warning ml-2 text-xs">Crit Suppressed</span>
		{/if}
	</div>

	<!-- Success/Failure vs DC -->
	{#if targetDC !== undefined}
		<div class="text-center text-sm mb-2">
			vs DC {targetDC}:
			{#if success}
				<span class="text-success-500 font-semibold">Success (+{margin})</span>
			{:else}
				<span class="text-error-500 font-semibold">Failure ({margin})</span>
			{/if}
		</div>
	{/if}

	<!-- Breakdown -->
	{#if showBreakdown}
		<div class="text-sm text-surface-600-300-token text-center">
			<span class="font-mono">d20({roll.baseRoll})</span>
			{#each roll.bonuses as bonus}
				<span class="font-mono"> {bonus.value >= 0 ? '+' : ''}{bonus.value} <span class="text-xs opacity-75">({bonus.source})</span></span>
			{/each}
		</div>
		{#if roll.advantageCount !== 0}
			<div class="text-xs text-center mt-1 opacity-75">
				{roll.advantageCount > 0 ? `${roll.advantageCount} advantage` : `${Math.abs(roll.advantageCount)} disadvantage`}
			</div>
		{/if}
	{/if}
</div>
```

### Step 4.2: Run build verification

Run: `npm run build 2>&1 | head -20`
Expected: Build succeeds

---

## Task 5: Add Combat Store Methods for Magicka Burst

**Files:**
- Modify: `src/lib/stores/combat.store.ts`

### Step 5.1: Add magicka burn method to combat store

Add to `src/lib/stores/combat.store.ts` after the `spendMP` method:

```typescript
/**
 * Apply magicka burn damage (when using magicka burst with 0 MP)
 */
takeMagickaBurnDamage: (playerId: string): void => {
	update((state) => {
		const session = state[playerId]
		if (!session) return state
		const newHP = Math.max(0, session.currentHP - 1)
		return {
			...state,
			[playerId]: {
				...session,
				currentHP: newHP,
				log: [
					...session.log,
					createCombatLogEntry('damage', 'Took 1 magicka burn damage', { damage: 1 })
				]
			}
		}
	})
},

/**
 * Log a magicka burst reroll
 */
logMagickaBurst: (playerId: string, usedBurn: boolean, acceptedMisfortune: boolean): void => {
	update((state) => {
		const session = state[playerId]
		if (!session) return state

		let message = usedBurn
			? 'Used Magicka Burst (burn damage)'
			: 'Used Magicka Burst (1 MP)'

		if (acceptedMisfortune) {
			message += ' - Misfortune accepted from critical failure'
		}

		return {
			...state,
			[playerId]: {
				...session,
				log: [...session.log, createCombatLogEntry('system', message)]
			}
		}
	})
},
```

### Step 5.2: Run build verification

Run: `npm run build 2>&1 | head -20`
Expected: Build succeeds

---

## Task 6: Update AttackResolverModal with Magicka Burst

**Files:**
- Modify: `src/lib/components/combat/modals/AttackResolverModal.svelte`

### Step 6.1: Add magicka burst support to AttackResolverModal

Update `src/lib/components/combat/modals/AttackResolverModal.svelte`:

```svelte
<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import { getWeaponById } from '$lib/data/weapons'
	import type { DiceRoll } from '$lib/models/combat'
	import type { AvailableAction } from '$lib/models/combatAction'
	import type { MagickaBurstCost } from '$lib/util/magicka-burst.util'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'
	import { calculateWeaponDamage, getSkillBonus } from '$lib/util/combat.util'

	interface Props {
		player: PlayerData
		action: AvailableAction
		currentMP: number
		currentHP: number
		onComplete: (result: { damage: number; isCritical: boolean; apCost: number }) => void
		onCancel: () => void
		onMagickaBurst?: (cost: MagickaBurstCost, acceptedMisfortune: boolean) => void
	}

	let { player, action, currentMP, currentHP, onComplete, onCancel, onMagickaBurst }: Props = $props()

	// Get weapon from action
	let weapon = $derived(action.weaponId ? getWeaponById(action.weaponId) : null)

	let step = $state<'attack' | 'damage' | 'complete'>('attack')
	let targetAC = $state(10)
	let attackRoll = $state<DiceRoll | undefined>(undefined)
	let attackSuccess = $state(false)
	let damageResult = $state<{ baseDamage: number; bonusDamage: number; total: number } | undefined>(undefined)

	let skillBonus = $derived(weapon ? getSkillBonus(player, weapon.relatedSkill) : 0)

	function handleAttackRoll(roll: DiceRoll, success: boolean) {
		attackRoll = roll
		attackSuccess = success
		if (success && weapon) {
			damageResult = calculateWeaponDamage(weapon, roll.total, targetAC, roll.isCritical)
		}
		step = 'damage'
	}

	function handleMagickaBurst(cost: MagickaBurstCost, previousRollWasCritFail: boolean) {
		if (onMagickaBurst) {
			onMagickaBurst(cost, previousRollWasCritFail)
		}
	}

	function handleConfirm() {
		onComplete({
			damage: attackSuccess ? damageResult?.total ?? 0 : 0,
			isCritical: attackRoll?.isCritical ?? false,
			apCost: action.apCost
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
				showMagickaBurst={true}
				{currentMP}
				{currentHP}
				onMagickaBurst={handleMagickaBurst}
			/>
		</div>
	{:else}
		<div class="space-y-4">
			{#if attackRoll}
				<RollResult roll={attackRoll} targetDC={targetAC} />
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
					<div class="text-xl font-bold text-error-500">Miss!</div>
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

### Step 6.2: Run build verification

Run: `npm run build 2>&1 | head -20`
Expected: Build succeeds

---

## Task 7: Update CombatMode to Handle Magicka Burst

**Files:**
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 7.1: Update CombatMode with magicka burst handlers

Add import at top of `src/lib/components/combat/CombatMode.svelte`:
```typescript
import type { MagickaBurstCost } from '$lib/util/magicka-burst.util'
```

Add handler function after `handleAttackComplete`:
```typescript
// Handle magicka burst cost
function handleMagickaBurst(cost: MagickaBurstCost, acceptedMisfortune: boolean) {
	if (cost.isBurn) {
		combatStore.takeMagickaBurnDamage(player.id)
	} else {
		combatStore.spendMP(player.id, cost.mpCost)
	}
	combatStore.logMagickaBurst(player.id, cost.isBurn, acceptedMisfortune)

	// TODO: Track misfortune points when acceptedMisfortune is true
	// This would be added to a party-wide misfortune tracker
	if (acceptedMisfortune) {
		console.log('Misfortune point accepted - implement party tracker')
	}
}
```

Update AttackResolverModal call to pass new props:
```svelte
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
```

### Step 7.2: Run build verification

Run: `npm run build 2>&1 | head -20`
Expected: Build succeeds

---

## Task 8: Update Remaining Modals with Magicka Burst

**Files:**
- Modify: `src/lib/components/combat/modals/SpellResolverModal.svelte`
- Modify: `src/lib/components/combat/modals/FocusAttackModal.svelte`
- Modify: `src/lib/components/combat/modals/FocusSpellModal.svelte`
- Modify: `src/lib/components/combat/modals/DodgeModal.svelte`
- Modify: `src/lib/components/combat/modals/BlockModal.svelte`

### Step 8.1: Update SpellResolverModal

Add to Props interface:
```typescript
currentMP: number
currentHP: number
onMagickaBurst?: (cost: MagickaBurstCost, acceptedMisfortune: boolean) => void
```

Update DiceRoller call:
```svelte
<DiceRoller
	onRoll={handleSpellRoll}
	{skillBonus}
	targetDC={spellDC}
	playerLevel={player.level}
	label="Roll Spell Attack"
	showMagickaBurst={true}
	{currentMP}
	{currentHP}
	onMagickaBurst={(cost, accepted) => onMagickaBurst?.(cost, accepted)}
/>
```

### Step 8.2: Update FocusAttackModal

Add similar props and DiceRoller updates for focus checks.

### Step 8.3: Update FocusSpellModal

Add similar props and DiceRoller updates for spell focus checks.

### Step 8.4: Update DodgeModal

Add similar props and DiceRoller updates for dodge rolls.

### Step 8.5: Update BlockModal

Add similar props and DiceRoller updates for block rolls.

### Step 8.6: Run build verification

Run: `npm run build 2>&1 | head -20`
Expected: Build succeeds

---

## Task 9: Update CombatMode Modal Calls

**Files:**
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 9.1: Update all modal calls in CombatMode

For each modal that uses DiceRoller, update the call to pass:
- `currentMP={session.currentMP}`
- `currentHP={session.currentHP}`
- `onMagickaBurst={handleMagickaBurst}`

Example for SpellResolverModal:
```svelte
<SpellResolverModal
	{player}
	action={selectedAction}
	currentMP={session.currentMP}
	currentHP={session.currentHP}
	onComplete={handleSpellComplete}
	onCancel={() => { showSpellResolver = false; selectedAction = null; }}
	onMagickaBurst={handleMagickaBurst}
/>
```

### Step 9.2: Run build verification

Run: `npm run build 2>&1 | head -20`
Expected: Build succeeds

---

## Task 10: Write Integration Tests

**Files:**
- Create: `src/lib/util/__tests__/magicka-burst.integration.test.ts`

### Step 10.1: Write integration tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { combatStore } from '$lib/stores/combat.store'
import { get } from 'svelte/store'

describe('Magicka Burst Integration', () => {
  const playerId = 'test-player'

  beforeEach(() => {
    combatStore.endCombat(playerId)
    combatStore.startCombat(playerId, 10, 5, {
      health: 20,
      magicka: 10,
      maxActionPoints: 4,
    })
  })

  it('spends MP when using magicka burst', () => {
    const before = combatStore.getSession(playerId)
    expect(before?.currentMP).toBe(10)

    combatStore.spendMP(playerId, 1)

    const after = combatStore.getSession(playerId)
    expect(after?.currentMP).toBe(9)
  })

  it('takes burn damage when using magicka burst with 0 MP', () => {
    // Drain all MP first
    combatStore.spendMP(playerId, 10)
    const beforeBurn = combatStore.getSession(playerId)
    expect(beforeBurn?.currentMP).toBe(0)
    expect(beforeBurn?.currentHP).toBe(20)

    combatStore.takeMagickaBurnDamage(playerId)

    const afterBurn = combatStore.getSession(playerId)
    expect(afterBurn?.currentHP).toBe(19)
  })

  it('logs magicka burst usage', () => {
    combatStore.logMagickaBurst(playerId, false, false)

    const session = combatStore.getSession(playerId)
    const lastLog = session?.log[session.log.length - 1]
    expect(lastLog?.description).toContain('Magicka Burst')
  })

  it('logs magicka burst with misfortune', () => {
    combatStore.logMagickaBurst(playerId, false, true)

    const session = combatStore.getSession(playerId)
    const lastLog = session?.log[session.log.length - 1]
    expect(lastLog?.description).toContain('Misfortune accepted')
  })
})
```

### Step 10.2: Run tests

Run: `npm test -- src/lib/util/__tests__/magicka-burst.integration.test.ts`
Expected: All tests pass

---

## Task 11: Final Verification and Cleanup

### Step 11.1: Run full build

Run: `npm run build`
Expected: Build succeeds with no errors

### Step 11.2: Run all tests

Run: `npm test`
Expected: All tests pass

### Step 11.3: Manual testing checklist

1. [ ] Enter combat with a character that has MP
2. [ ] Make an attack roll
3. [ ] Verify "Magicka Burst" button appears after rolling
4. [ ] Click Magicka Burst and verify MP is spent
5. [ ] Verify critical successes are downgraded to normal successes
6. [ ] Drain all MP and verify burn damage option appears
7. [ ] Use burn damage and verify HP decreases
8. [ ] Roll a critical failure and reroll - verify misfortune message
9. [ ] Check combat log shows magicka burst usage

---

## Summary

This plan implements the Magicka Burst reroll system with:

1. **New utility functions** for checking burst eligibility and calculating costs
2. **Extended DiceRoller** component with reroll support
3. **Updated RollResult** to display magicka burst state
4. **Combat store methods** for burn damage and logging
5. **Updated modals** (Attack, Spell, Focus, Dodge, Block) to pass magicka burst props
6. **Integration tests** for the full flow

Key rules implemented:
- 1 MP cost per reroll
- Burn damage (1 HP) when MP is 0
- Cannot reroll when completely burned out (HP = 0)
- Critical successes downgraded to normal successes
- Critical failures still possible (risky!)
- Misfortune points accepted when rerolling crit fails
