# Initiative UI Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the Enter Combat modal to show skill tag chips for initiative bonuses, support manual/digital dice rolling for player initiative, show individual d6 rolls in the breakdown, and require manual entry for enemy initiative.

**Architecture:** Extend the existing EnterCombatModal to track which skills contribute to d6 advantage dice vs flat bonuses. Add a mode toggle (similar to DiceRoller) for digital vs manual rolling. Show individual d6 rolls in the breakdown. Enemy initiative starts blank and must be entered by player (GM rolls externally).

**Tech Stack:** TypeScript, Svelte 5, Skeleton UI (badges, RadioGroup), existing initiative utilities

---

## Requirements Summary

1. **Skill tag chips** - Show which skills contribute to advantage dice (major) and flat bonus (minor)
2. **Roll Initiative button** - Player clicks to roll, then sees breakdown
3. **Manual/Digital toggle** - Allow players to roll in-app OR enter their own d20 and d6 values
4. **Individual d6 display** - Show each d6 roll value in the breakdown, not just the max
5. **Enemy initiative blank by default** - GM rolls externally, player enters the result

---

## Task 1: Extend Initiative Utility to Return Contributing Skills

**Files:**
- Modify: `src/lib/util/initiative.util.ts`

**Step 1: Update InitiativeModifiers interface**

Add skill tracking to the interface:
```typescript
export interface InitiativeModifiers {
  d6Count: number
  flatBonus: number
  d6Skills: Skill[]      // Skills contributing d6 advantage dice
  flatBonusSkills: Skill[] // Skills contributing flat bonus
}
```

**Step 2: Update getPlayerInitiativeModifiers function**

```typescript
export function getPlayerInitiativeModifiers(player: PlayerData): InitiativeModifiers {
  const d6Skills: Skill[] = []
  const flatBonusSkills: Skill[] = []

  for (const skill of player.majorSkills) {
    if (InitiativeSkills.includes(skill)) {
      d6Skills.push(skill)
    }
  }

  for (const skill of player.minorSkills) {
    if (InitiativeSkills.includes(skill)) {
      flatBonusSkills.push(skill)
    }
  }

  return {
    d6Count: d6Skills.length,
    flatBonus: flatBonusSkills.length,
    d6Skills,
    flatBonusSkills,
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/util/initiative.util.ts
git commit -m "feat: track contributing skills in initiative modifiers"
```

---

## Task 2: Add Function to Return All Individual D6 Rolls

**Files:**
- Modify: `src/lib/util/dice.util.ts`
- Modify: `src/lib/util/initiative.util.ts`

**Step 1: Add rollD6AdvantageWithDetails function to dice.util.ts**

```typescript
export interface D6RollDetails {
  rolls: number[]  // Each individual d6 result (with explosions applied)
  highest: number  // The highest roll (used as the advantage value)
}

/**
 * Roll multiple d6s with advantage and return all results
 * Uses exploding dice rules for each individual die
 */
export function rollD6AdvantageWithDetails(count: number): D6RollDetails {
  if (count <= 0) return { rolls: [], highest: 0 }

  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    rolls.push(rollD6Exploding())
  }

  return {
    rolls,
    highest: Math.max(...rolls),
  }
}
```

**Step 2: Update InitiativeRollResult interface in initiative.util.ts**

```typescript
export interface InitiativeRollResult {
  d20Roll: number
  d6Rolls: number[]        // Individual d6 results
  d6AdvantageRoll: number  // Highest of d6Rolls (or 0 if none)
  flatBonus: number
  total: number
}
```

**Step 3: Update calculatePlayerInitiativeContribution**

```typescript
import { rollD20, rollD6AdvantageWithDetails } from '$lib/util/dice.util'

export function calculatePlayerInitiativeContribution(
  modifiers: InitiativeModifiers
): InitiativeRollResult {
  const d20Roll = rollD20()
  const d6Details = rollD6AdvantageWithDetails(modifiers.d6Count)
  const { flatBonus } = modifiers
  const total = d20Roll + d6Details.highest + flatBonus

  return {
    d20Roll,
    d6Rolls: d6Details.rolls,
    d6AdvantageRoll: d6Details.highest,
    flatBonus,
    total,
  }
}
```

**Step 4: Add function for manual initiative calculation**

```typescript
/**
 * Calculate initiative from manually entered dice values
 */
export function calculateManualInitiative(
  d20Value: number,
  d6Values: number[],
  flatBonus: number
): InitiativeRollResult {
  const d6AdvantageRoll = d6Values.length > 0 ? Math.max(...d6Values) : 0
  const total = d20Value + d6AdvantageRoll + flatBonus

  return {
    d20Roll: d20Value,
    d6Rolls: d6Values,
    d6AdvantageRoll,
    flatBonus,
    total,
  }
}
```

**Step 5: Commit**

```bash
git add src/lib/util/dice.util.ts src/lib/util/initiative.util.ts
git commit -m "feat: add detailed d6 roll tracking for initiative"
```

---

## Task 3: Redesign EnterCombatModal with Skill Chips and Roll Modes

**Files:**
- Modify: `src/lib/components/combat/modals/EnterCombatModal.svelte`

**Step 1: Read existing component structure**

The modal currently:
- Gets initiative modifiers
- Has a "Roll All Initiative" button
- Shows breakdown after rolling
- Allows editing party/enemy totals
- Has Cancel/Start Combat buttons

**Step 2: Write the new implementation**

Replace the entire file with:

```svelte
<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton'
	import type { PlayerData } from '$lib/models/player'
	import {
		getPlayerInitiativeModifiers,
		calculatePlayerInitiativeContribution,
		calculateManualInitiative,
		type InitiativeModifiers,
		type InitiativeRollResult
	} from '$lib/util/initiative.util'
	import { camelToTitleCase } from '$lib/util/string.util'

	export let player: PlayerData

	const dispatch = createEventDispatcher<{
		start: { partyInit: number; enemyInit: number }
		cancel: void
	}>()

	// State
	let rollMode: 'digital' | 'manual' = 'digital'
	let playerRollResult: InitiativeRollResult | null = null
	let isRolling = false

	// Manual entry state
	let manualD20: number = 10
	let manualD6Values: number[] = []

	// Enemy initiative (always manual entry)
	let enemyInitiative: number | null = null

	// Get modifiers with skill tracking
	const initiativeModifiers: InitiativeModifiers = getPlayerInitiativeModifiers(player)

	// Initialize manual d6 array based on d6Count
	$: {
		if (manualD6Values.length !== initiativeModifiers.d6Count) {
			manualD6Values = Array(initiativeModifiers.d6Count).fill(1)
		}
	}

	// Derived: can start combat
	$: canStartCombat = playerRollResult !== null && enemyInitiative !== null

	async function handleDigitalRoll() {
		if (isRolling) return
		isRolling = true

		// Brief animation delay
		await new Promise((r) => setTimeout(r, 500))

		playerRollResult = calculatePlayerInitiativeContribution(initiativeModifiers)
		isRolling = false
	}

	function handleManualSubmit() {
		playerRollResult = calculateManualInitiative(
			manualD20,
			manualD6Values,
			initiativeModifiers.flatBonus
		)
	}

	function resetRoll() {
		playerRollResult = null
	}

	function handleConfirm() {
		if (!playerRollResult || enemyInitiative === null) return
		dispatch('start', {
			partyInit: playerRollResult.total,
			enemyInit: enemyInitiative
		})
	}

	function handleCancel() {
		dispatch('cancel')
	}
</script>

<div class="card p-6 w-full max-w-lg">
	<header class="mb-4">
		<h3 class="h3 font-bold">Enter Combat</h3>
		<p class="text-surface-600-300-token">Roll initiative to begin combat</p>
	</header>

	<div class="space-y-4">
		<!-- Initiative Modifiers with Skill Chips -->
		<div class="card variant-soft p-3">
			<h4 class="font-semibold text-sm mb-3">Your Initiative Modifiers</h4>

			<!-- Advantage Dice (d6) from Major Skills -->
			<div class="mb-3">
				<div class="flex items-center gap-2 mb-1">
					<span class="text-sm">Advantage Dice (d6):</span>
					<span class="font-bold">{initiativeModifiers.d6Count}</span>
				</div>
				{#if initiativeModifiers.d6Skills.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each initiativeModifiers.d6Skills as skill}
							<span class="badge variant-filled-primary text-xs">
								{camelToTitleCase(skill)}
							</span>
						{/each}
					</div>
				{:else}
					<span class="text-xs text-surface-500">No major initiative skills</span>
				{/if}
			</div>

			<!-- Flat Bonus from Minor Skills -->
			<div>
				<div class="flex items-center gap-2 mb-1">
					<span class="text-sm">Flat Bonus:</span>
					<span class="font-bold">+{initiativeModifiers.flatBonus}</span>
				</div>
				{#if initiativeModifiers.flatBonusSkills.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each initiativeModifiers.flatBonusSkills as skill}
							<span class="badge variant-filled-secondary text-xs">
								{camelToTitleCase(skill)}
							</span>
						{/each}
					</div>
				{:else}
					<span class="text-xs text-surface-500">No minor initiative skills</span>
				{/if}
			</div>
		</div>

		<!-- Player Initiative Rolling Section -->
		<div class="card variant-soft p-3">
			<h4 class="font-semibold text-sm mb-3">Player Initiative</h4>

			<!-- Mode Toggle -->
			<div class="mb-4">
				<RadioGroup>
					<RadioItem bind:group={rollMode} name="roll-mode" value="digital">
						Roll In-App
					</RadioItem>
					<RadioItem bind:group={rollMode} name="roll-mode" value="manual">
						Enter Roll
					</RadioItem>
				</RadioGroup>
			</div>

			{#if !playerRollResult}
				<!-- Roll Controls -->
				{#if rollMode === 'digital'}
					<div class="text-center">
						<button
							type="button"
							class="btn variant-filled-primary"
							on:click={handleDigitalRoll}
							disabled={isRolling}
						>
							{#if isRolling}
								<span class="animate-spin mr-2">🎲</span> Rolling...
							{:else}
								🎲 Roll Initiative
							{/if}
						</button>
						<div class="text-xs text-surface-500 mt-1">
							1d20 + {initiativeModifiers.d6Count}d6 (highest) + {initiativeModifiers.flatBonus}
						</div>
					</div>
				{:else}
					<!-- Manual Entry -->
					<div class="space-y-3">
						<div class="flex items-center gap-2">
							<label class="flex-1">
								<span class="text-xs">d20 Roll</span>
								<input
									type="number"
									class="input"
									bind:value={manualD20}
									min="1"
									max="20"
								/>
							</label>
						</div>

						{#if initiativeModifiers.d6Count > 0}
							<div>
								<span class="text-xs">d6 Rolls (enter each die)</span>
								<div class="flex gap-2 mt-1">
									{#each manualD6Values as _, i}
										<input
											type="number"
											class="input w-16 text-center"
											bind:value={manualD6Values[i]}
											min="1"
											placeholder="d6"
										/>
									{/each}
								</div>
								<div class="text-xs text-surface-500 mt-1">
									Tip: Enter 6+ if the die exploded (e.g., rolled 6 then 4 = enter 10)
								</div>
							</div>
						{/if}

						<div class="text-center">
							<button
								type="button"
								class="btn variant-filled-primary"
								on:click={handleManualSubmit}
							>
								Use These Values
							</button>
						</div>
					</div>
				{/if}
			{:else}
				<!-- Roll Result Breakdown -->
				<div class="card variant-soft-primary p-3 mb-3">
					<h5 class="text-xs uppercase tracking-wide opacity-75 mb-2">Roll Breakdown</h5>

					<div class="space-y-2 text-sm">
						<!-- d20 Roll -->
						<div class="flex justify-between">
							<span>d20 Roll:</span>
							<span class="font-bold">{playerRollResult.d20Roll}</span>
						</div>

						<!-- d6 Rolls (show each die) -->
						{#if playerRollResult.d6Rolls.length > 0}
							<div class="flex justify-between items-start">
								<span>d6 Rolls:</span>
								<div class="text-right">
									<div class="flex gap-1 justify-end mb-1">
										{#each playerRollResult.d6Rolls as roll, i}
											<span
												class="badge text-xs"
												class:variant-filled-primary={roll === playerRollResult.d6AdvantageRoll}
												class:variant-soft={roll !== playerRollResult.d6AdvantageRoll}
											>
												{roll}
											</span>
										{/each}
									</div>
									<span class="text-xs opacity-75">
										Best: +{playerRollResult.d6AdvantageRoll}
									</span>
								</div>
							</div>
						{/if}

						<!-- Flat Bonus -->
						<div class="flex justify-between">
							<span>Flat Bonus:</span>
							<span class="font-bold">+{playerRollResult.flatBonus}</span>
						</div>

						<!-- Total -->
						<div class="border-t border-surface-400-500-token pt-2 mt-2">
							<div class="flex justify-between font-bold">
								<span>Total:</span>
								<span class="text-primary-500 text-xl">{playerRollResult.total}</span>
							</div>
						</div>
					</div>
				</div>

				<div class="text-center">
					<button type="button" class="btn btn-sm variant-ghost" on:click={resetRoll}>
						Roll Again
					</button>
				</div>
			{/if}
		</div>

		<!-- Enemy Initiative (always manual entry) -->
		<div class="card variant-soft p-3">
			<h4 class="font-semibold text-sm mb-2">Enemy Initiative</h4>
			<p class="text-xs text-surface-500 mb-2">
				Enter the enemy's initiative as rolled by the GM
			</p>
			<input
				type="number"
				class="input"
				bind:value={enemyInitiative}
				min="0"
				placeholder="Enter enemy initiative..."
			/>
		</div>
	</div>

	<footer class="flex justify-end gap-2 mt-6">
		<button type="button" class="btn variant-ghost" on:click={handleCancel}>Cancel</button>
		<button
			type="button"
			class="btn variant-filled-primary"
			on:click={handleConfirm}
			disabled={!canStartCombat}
		>
			Start Combat
		</button>
	</footer>
</div>
```

**Step 3: Manual test**

1. Open the app and navigate to a character
2. Click "Enter Combat"
3. Verify skill chips appear showing which skills contribute to d6 vs flat bonus
4. Test digital roll mode - click "Roll Initiative" and verify breakdown shows each d6
5. Test manual mode - switch to "Enter Roll", enter values, verify calculation
6. Verify enemy initiative is blank by default
7. Verify "Start Combat" is disabled until both player rolled and enemy entered

**Step 4: Commit**

```bash
git add src/lib/components/combat/modals/EnterCombatModal.svelte
git commit -m "feat: add skill chips, roll modes, and detailed breakdown to initiative modal"
```

---

## Task 4: Verify camelToTitleCase Utility Exists

**Files:**
- Check: `src/lib/util/string.util.ts`

**Step 1: Verify the function exists**

The `camelToTitleCase` function should already exist in the codebase. If not, add:

```typescript
/**
 * Convert camelCase to Title Case
 * e.g., "oneHanded" -> "One Handed"
 */
export function camelToTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim()
}
```

**Step 2: Commit if changes needed**

```bash
git add src/lib/util/string.util.ts
git commit -m "feat: add camelToTitleCase utility function"
```

---

## Task 5: Final Integration Test

**Files:**
- None (manual testing)

**Step 1: Test full flow**

1. Create or load a character with various initiative skills:
   - Some as Major (should show as d6 advantage chips)
   - Some as Minor (should show as flat bonus chips)
   - Some non-initiative skills (should not appear)

2. Test digital rolling:
   - Click "Roll Initiative"
   - Verify each d6 is shown individually
   - Verify the highest d6 is highlighted
   - Verify total calculation is correct

3. Test manual entry:
   - Switch to "Enter Roll" mode
   - Enter d20 value
   - Enter each d6 value (test exploding dice by entering values > 6)
   - Verify "Use These Values" calculates correctly

4. Test enemy initiative:
   - Verify field starts blank
   - Verify "Start Combat" is disabled until enemy value entered
   - Enter enemy value and verify button enables

5. Start combat and verify values are correct in InitiativeTracker

**Step 2: Commit final changes if any**

```bash
git add -A
git commit -m "test: verify initiative UI improvements work end-to-end"
```

---

## Summary

This plan implements:

1. **Skill tag chips** - Major skills show as primary badges (d6 dice), minor skills as secondary badges (flat bonus)
2. **Roll Initiative button** - Single button that rolls and shows detailed breakdown
3. **Manual/Digital toggle** - RadioGroup to switch between in-app rolling and manual entry
4. **Individual d6 display** - Each d6 shown in breakdown with highest highlighted
5. **Enemy initiative blank** - Input field starts empty, must be filled by player

The changes build on the existing initiative system without breaking backwards compatibility.
