# Skill Roll Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add clickable skill rows to the character sheet that open a skill roll modal with automatic bonus calculation and subskill selection.

**Architecture:** Create a new SkillRollModal component that wraps the existing DiceRoller. Refactor the skills section in CharacterSheet to display all skills in three columns (Major, Minor, Untrained) with click handlers. Calculate and display all applicable bonuses (base skill, birth sign advantage/disadvantage).

**Tech Stack:** Svelte 5, Skeleton UI, existing DiceRoller component, existing SubskillPicker component

---

## Task 1: Create SkillRollModal Component

**Files:**
- Create: `src/lib/components/skills/SkillRollModal.svelte`
- Create: `src/lib/components/skills/index.ts`

**Step 1: Create the barrel export**

```typescript
// src/lib/components/skills/index.ts
export { default as SkillRollModal } from './SkillRollModal.svelte'
```

**Step 2: Create the modal component**

```svelte
<!-- src/lib/components/skills/SkillRollModal.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { PlayerData } from '$lib/models/player'
	import type { Skill } from '$lib/data/skill'
	import type { DiceRoll } from '$lib/models/combat'
	import { BirthSigns } from '$lib/data/birthSign'
	import { calculateSkillBonus } from '$lib/util/stats.util'
	import { camelToTitleCase } from '$lib/util/string.util'
	import DiceRoller from '$lib/components/combat/DiceRoller/DiceRoller.svelte'

	export let player: PlayerData
	export let skill: Skill

	const dispatch = createEventDispatcher<{
		close: void
		rolled: { roll: DiceRoll; success: boolean; margin: number }
	}>()

	// Calculate base skill bonus
	$: skillBonus = calculateSkillBonus(player, skill)
	$: skillLevel = player.majorSkills.includes(skill)
		? 'Major'
		: player.minorSkills.includes(skill)
			? 'Minor'
			: 'Untrained'

	// Check for birth sign advantages/disadvantages
	$: birthSignData = BirthSigns[player.birthSign]
	$: hasAdvantage = birthSignData?.skillAdvantages?.includes(skill) ?? false
	$: hasDisadvantage = birthSignData?.skillDisadvantages?.includes(skill) ?? false
	$: advantageCount = hasAdvantage ? 1 : hasDisadvantage ? -1 : 0

	// Build bonus breakdown for display
	$: bonuses = [] as { source: string; value: number }[]

	function handleRoll(roll: DiceRoll, success: boolean, margin: number) {
		dispatch('rolled', { roll, success, margin })
	}

	function handleClose() {
		dispatch('close')
	}
</script>

<div class="card p-6 w-full max-w-lg">
	<header class="mb-4">
		<div class="flex justify-between items-start">
			<div>
				<h3 class="h3 font-bold">{camelToTitleCase(skill)} Check</h3>
				<p class="text-sm text-surface-500">
					{skillLevel} Skill
					{#if hasAdvantage}
						<span class="text-success-500">(Advantage from {player.birthSign})</span>
					{:else if hasDisadvantage}
						<span class="text-error-500">(Disadvantage from {player.birthSign})</span>
					{/if}
				</p>
			</div>
			<span class="badge variant-filled text-lg">+{skillBonus}</span>
		</div>
	</header>

	<div class="space-y-4">
		<!-- Bonus breakdown -->
		<div class="card p-3 variant-soft-surface">
			<h4 class="text-sm font-semibold mb-2">Bonus Breakdown</h4>
			<div class="space-y-1 text-sm">
				<div class="flex justify-between">
					<span>{skillLevel} Skill Bonus</span>
					<span class="font-mono">+{skillBonus}</span>
				</div>
				{#if hasAdvantage}
					<div class="flex justify-between text-success-500">
						<span>{player.birthSign} (Advantage)</span>
						<span>Roll twice, take higher</span>
					</div>
				{/if}
				{#if hasDisadvantage}
					<div class="flex justify-between text-error-500">
						<span>{player.birthSign} (Disadvantage)</span>
						<span>Roll twice, take lower</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Dice Roller with subskill support -->
		<DiceRoller
			onRoll={handleRoll}
			skillBonus={skillBonus}
			{bonuses}
			playerLevel={player.level}
			subSkills={player.subSkills ?? []}
			advantageCount={advantageCount}
			label="Roll {camelToTitleCase(skill)}"
		/>
	</div>

	<footer class="flex justify-end mt-6">
		<button type="button" class="btn variant-ghost" on:click={handleClose}>
			Close
		</button>
	</footer>
</div>
```

**Step 3: Verify file exists**

Run: `ls -la src/lib/components/skills/`
Expected: Shows `SkillRollModal.svelte` and `index.ts`

**Step 4: Commit**

```bash
git add src/lib/components/skills/
git commit -m "$(cat <<'EOF'
feat: add SkillRollModal component

Creates a modal for rolling skill checks with:
- Automatic bonus calculation based on major/minor/untrained
- Birth sign advantage/disadvantage display
- Integrated DiceRoller with subskill picker support

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add utility function for getting all skills with levels

**Files:**
- Modify: `src/lib/util/stats.util.ts`

**Step 1: Add getSkillsWithLevels function**

Add after the `calculateSkillBonus` function (around line 123):

```typescript
/**
 * Get all skills organized by their level (Major, Minor, Untrained)
 * along with their calculated bonuses for a player.
 */
export function getSkillsWithLevels(player: PlayerData): {
	major: { skill: Skill; bonus: number }[]
	minor: { skill: Skill; bonus: number }[]
	untrained: { skill: Skill; bonus: number }[]
} {
	const levelData = Level[player.level] ?? Level[1]!
	const allSkills = Object.values(Skill)

	const major = player.majorSkills.map((skill) => ({
		skill,
		bonus: levelData.majorSkillBonus,
	}))

	const minor = player.minorSkills.map((skill) => ({
		skill,
		bonus: levelData.minorSkillBonus,
	}))

	const untrained = allSkills
		.filter(
			(skill) =>
				!player.majorSkills.includes(skill) && !player.minorSkills.includes(skill)
		)
		.map((skill) => ({ skill, bonus: 0 }))

	return { major, minor, untrained }
}
```

**Step 2: Add imports at top of file if not present**

Ensure `Skill` is imported:
```typescript
import { Skill } from '$lib/data/skill'
```

**Step 3: Run type check**

Run: `npm run check 2>&1 | grep -E "(stats.util|Error:)"`
Expected: No new errors related to stats.util.ts

**Step 4: Commit**

```bash
git add src/lib/util/stats.util.ts
git commit -m "$(cat <<'EOF'
feat: add getSkillsWithLevels utility function

Returns all skills organized by level (major/minor/untrained)
with their calculated bonuses for display in the character sheet.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Refactor CharacterSheet skills section to three columns

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte`

**Step 1: Add imports**

Add near other imports at top:
```typescript
import { getSkillsWithLevels } from '$lib/util/stats.util'
import { SkillRollModal } from '$lib/components/skills'
```

**Step 2: Add state for modal**

Add after the existing computed stats section (around line 56):
```typescript
// Skill roll modal state
let showSkillRollModal = false
let selectedSkill: Skill | null = null

// All skills organized by level
$: skillsByLevel = getSkillsWithLevels(player)

// Birth sign skill modifiers for display
$: birthSignAdvantages = BirthSigns[player.birthSign]?.skillAdvantages ?? []
$: birthSignDisadvantages = BirthSigns[player.birthSign]?.skillDisadvantages ?? []

function openSkillRoll(skill: Skill) {
	selectedSkill = skill
	showSkillRollModal = true
}

function closeSkillRoll() {
	showSkillRollModal = false
	selectedSkill = null
}
```

**Step 3: Replace the Skills Section (lines ~384-425)**

Replace the entire skills section with:
```svelte
<!-- Skills Section -->
<section class="card p-4 variant-soft-surface">
	<h3 class="h4 font-bold mb-4">Skills</h3>
	<p class="text-sm text-surface-500 mb-4">Click any skill to roll a skill check</p>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Major Skills -->
		<div class="space-y-1">
			<h4 class="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-2">
				Major (+{levelData.majorSkillBonus})
			</h4>
			{#each skillsByLevel.major as { skill, bonus }}
				<button
					type="button"
					class="w-full flex justify-between items-center p-2 rounded hover:bg-primary-500/10 transition-colors text-left"
					on:click={() => openSkillRoll(skill)}
				>
					<span class="font-medium">
						{camelToTitleCase(skill)}
						{#if birthSignAdvantages.includes(skill)}
							<span class="text-success-500 text-xs ml-1" title="Advantage from {player.birthSign}">▲</span>
						{/if}
						{#if birthSignDisadvantages.includes(skill)}
							<span class="text-error-500 text-xs ml-1" title="Disadvantage from {player.birthSign}">▼</span>
						{/if}
					</span>
					<span class="badge variant-filled-primary">+{bonus}</span>
				</button>
			{/each}
			{#if skillsByLevel.major.length === 0}
				<p class="text-surface-500 text-sm italic">None</p>
			{/if}
		</div>

		<!-- Minor Skills -->
		<div class="space-y-1">
			<h4 class="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
				Minor (+{levelData.minorSkillBonus})
			</h4>
			{#each skillsByLevel.minor as { skill, bonus }}
				<button
					type="button"
					class="w-full flex justify-between items-center p-2 rounded hover:bg-secondary-500/10 transition-colors text-left"
					on:click={() => openSkillRoll(skill)}
				>
					<span class="font-medium">
						{camelToTitleCase(skill)}
						{#if birthSignAdvantages.includes(skill)}
							<span class="text-success-500 text-xs ml-1" title="Advantage from {player.birthSign}">▲</span>
						{/if}
						{#if birthSignDisadvantages.includes(skill)}
							<span class="text-error-500 text-xs ml-1" title="Disadvantage from {player.birthSign}">▼</span>
						{/if}
					</span>
					<span class="badge variant-filled-secondary">+{bonus}</span>
				</button>
			{/each}
			{#if skillsByLevel.minor.length === 0}
				<p class="text-surface-500 text-sm italic">None</p>
			{/if}
		</div>

		<!-- Untrained Skills -->
		<div class="space-y-1">
			<h4 class="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-2">
				Untrained (+0)
			</h4>
			<div class="max-h-64 overflow-y-auto">
				{#each skillsByLevel.untrained as { skill, bonus }}
					<button
						type="button"
						class="w-full flex justify-between items-center p-2 rounded hover:bg-surface-500/10 transition-colors text-left"
						on:click={() => openSkillRoll(skill)}
					>
						<span class="text-surface-600 dark:text-surface-400">
							{camelToTitleCase(skill)}
							{#if birthSignAdvantages.includes(skill)}
								<span class="text-success-500 text-xs ml-1" title="Advantage from {player.birthSign}">▲</span>
							{/if}
							{#if birthSignDisadvantages.includes(skill)}
								<span class="text-error-500 text-xs ml-1" title="Disadvantage from {player.birthSign}">▼</span>
							{/if}
						</span>
						<span class="badge variant-soft-surface">+{bonus}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
</section>
```

**Step 4: Add the modal at the end of the component (before closing </div>)**

```svelte
<!-- Skill Roll Modal -->
{#if showSkillRollModal && selectedSkill}
	<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
		<SkillRollModal
			{player}
			skill={selectedSkill}
			on:close={closeSkillRoll}
		/>
	</div>
{/if}
```

**Step 5: Run type check**

Run: `npm run check 2>&1 | grep -E "(CharacterSheet|Error:)"`
Expected: No new errors related to CharacterSheet.svelte

**Step 6: Commit**

```bash
git add src/lib/components/CharacterSheet.svelte
git commit -m "$(cat <<'EOF'
feat: refactor skills section to three-column layout with roll modal

- Displays all skills in Major/Minor/Untrained columns
- Skills are clickable to open the skill roll modal
- Shows birth sign advantage/disadvantage indicators
- Untrained column is scrollable for long lists

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Import Skill type in CharacterSheet

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte`

**Step 1: Add Skill import**

Add to imports at top of script:
```typescript
import { Skill } from '$lib/data/skill'
```

**Step 2: Update the selectedSkill type annotation**

Change from:
```typescript
let selectedSkill: Skill | null = null
```

This should already work with the import added.

**Step 3: Run type check**

Run: `npm run check 2>&1 | grep CharacterSheet`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/components/CharacterSheet.svelte
git commit -m "$(cat <<'EOF'
chore: add Skill type import to CharacterSheet

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Verify build and manual test

**Files:**
- None (verification only)

**Step 1: Run full type check**

Run: `npm run check`
Expected: Only pre-existing errors (Zod/superforms compatibility)

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Start dev server and test manually**

Run: `npm run dev`
Expected:
1. Navigate to a character page
2. See three-column skills layout (Major/Minor/Untrained)
3. Click any skill to open the roll modal
4. Modal shows:
   - Skill name and level
   - Bonus breakdown
   - Birth sign advantage/disadvantage if applicable
   - DiceRoller with subskill picker
5. Rolling works and shows results
6. Close button dismisses modal

**Step 4: Commit verification**

No commit needed for this task.

---

## Task 6: Remove duplicate skill calculations

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte`

**Step 1: Remove old skill calculations**

Remove these lines (around lines 44-52) since we now use `skillsByLevel`:
```typescript
// OLD - REMOVE THESE:
$: majorSkillsWithBonus = player.majorSkills.map((skill) => ({
	skill,
	bonus: calculateSkillBonus(player, skill),
}))

$: minorSkillsWithBonus = player.minorSkills.map((skill) => ({
	skill,
	bonus: calculateSkillBonus(player, skill),
}))
```

**Step 2: Verify no references to removed variables**

Run: `grep -n "majorSkillsWithBonus\|minorSkillsWithBonus" src/lib/components/CharacterSheet.svelte`
Expected: No matches (all references were replaced in Task 3)

**Step 3: Run type check**

Run: `npm run check 2>&1 | grep CharacterSheet`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/lib/components/CharacterSheet.svelte
git commit -m "$(cat <<'EOF'
refactor: remove duplicate skill calculations from CharacterSheet

Now using centralized getSkillsWithLevels utility function.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

This plan implements:

1. **SkillRollModal** - New modal component for skill checks
2. **getSkillsWithLevels** - Utility function to organize all skills by level
3. **Three-column skills display** - Major, Minor, and Untrained columns
4. **Clickable skills** - Each skill row opens the roll modal
5. **Automatic bonus calculation** - Based on major/minor/untrained status
6. **Birth sign integration** - Shows advantage/disadvantage indicators (▲/▼)
7. **Subskill picker** - Reuses existing SubskillPicker via DiceRoller

The modal leverages the existing DiceRoller component which already supports:
- Digital or manual roll modes
- Subskill selection with tooltips
- Advantage/disadvantage handling
- Critical success/failure detection
