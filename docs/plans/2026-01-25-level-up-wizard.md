# Level Up Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a level-up wizard that guides players through skill promotions when leveling up, replacing the manual level number input.

**Architecture:** Create a LevelUpWizard modal component that detects skill slot changes between current and target level, presents appropriate choices (promote minor→major, untrained→minor, add subskills), and applies changes atomically. Integrate into CharacterSheet via a "Level Up" button.

**Tech Stack:** Svelte 5, Skeleton UI, existing wizard patterns

---

## Level-Up Rules Summary

Based on `src/lib/data/level.ts`, skill slots change at these levels:

| Level | Major Slots | Minor Slots | Subskill Slots | Changes from Previous |
|-------|-------------|-------------|----------------|----------------------|
| 1-5   | 6           | 6           | 1→2 at L5      | L5: +1 subskill slot |
| 6     | **7**       | 6           | 2              | +1 major slot (promote 1 minor→major) |
| 7-10  | 7           | 6           | 2→3 at L10     | L10: +1 subskill slot |
| 11    | **8**       | **7**       | 3              | +1 major, +1 minor (promote 1 minor→major, 1 untrained→minor) |
| 12-15 | 8           | 7           | 3→4 at L15     | L15: +1 subskill slot |
| 16    | **9**       | **9**       | 4              | +1 major, +2 minor (promote 1 minor→major, 2 untrained→minor) |
| 17-20 | 9           | 9           | 4              | No skill slot changes |

**Level-up actions:**
- When major slots increase: Player must promote a minor skill to major
- When minor slots increase: Player must promote untrained skills to minor
- When subskill slots increase: Player CAN add a new subskill (optional)

---

## Task 1: Create getLevelUpChanges utility function

**Files:**
- Modify: `src/lib/util/stats.util.ts`

**Step 1: Add the utility function**

Add after `getSkillsWithLevels` function:

```typescript
/**
 * Calculate what changes need to happen when leveling up.
 * Returns null if no choices needed (just stat changes).
 */
export function getLevelUpChanges(
	currentLevel: number,
	targetLevel: number
): {
	majorSlotsGained: number
	minorSlotsGained: number
	subskillSlotsGained: number
	hasChoices: boolean
} | null {
	if (targetLevel <= currentLevel) return null
	if (targetLevel > 20) return null

	const currentData = Level[currentLevel] ?? Level[1]!
	const targetData = Level[targetLevel] ?? Level[20]!

	const majorSlotsGained = targetData.majorSkills - currentData.majorSkills
	const minorSlotsGained = targetData.minorSkills - currentData.minorSkills
	const subskillSlotsGained = targetData.subSkillSlots - currentData.subSkillSlots

	const hasChoices = majorSlotsGained > 0 || minorSlotsGained > 0 || subskillSlotsGained > 0

	if (!hasChoices) return null

	return {
		majorSlotsGained,
		minorSlotsGained,
		subskillSlotsGained,
		hasChoices,
	}
}

/**
 * Get the available skills that can be promoted.
 */
export function getPromotableSkills(player: PlayerData): {
	minorToMajor: Skill[]  // Minor skills that can become major
	untrainedToMinor: Skill[]  // Untrained skills that can become minor
} {
	const allSkills = Object.values(Skill)

	const minorToMajor = player.minorSkills.filter(s => !player.majorSkills.includes(s))
	const untrainedToMinor = allSkills.filter(
		s => !player.majorSkills.includes(s) && !player.minorSkills.includes(s)
	)

	return { minorToMajor, untrainedToMinor }
}
```

**Step 2: Run type check**

Run: `npm run check 2>&1 | grep -E "(stats.util|Error:)" | head -10`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/util/stats.util.ts
git commit -m "$(cat <<'EOF'
feat: add getLevelUpChanges and getPromotableSkills utilities

Calculates what skill promotions are needed when leveling up:
- Major slots gained (minor → major promotions required)
- Minor slots gained (untrained → minor promotions required)
- Subskill slots gained (optional new subskills)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create LevelUpWizard component

**Files:**
- Create: `src/lib/components/levelup/LevelUpWizard.svelte`
- Create: `src/lib/components/levelup/index.ts`

**Step 1: Create barrel export**

```typescript
// src/lib/components/levelup/index.ts
export { default as LevelUpWizard } from './LevelUpWizard.svelte'
```

**Step 2: Create the LevelUpWizard component**

```svelte
<!-- src/lib/components/levelup/LevelUpWizard.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import type { PlayerData } from '$lib/models/player'
	import type { Skill } from '$lib/data/skill'
	import type { SubSkill } from '$lib/models/subskill'
	import { Level } from '$lib/data/level'
	import { getLevelUpChanges, getPromotableSkills, getSubskillSlots, getSubskillBonus } from '$lib/util/stats.util'
	import { camelToTitleCase } from '$lib/util/string.util'

	export let player: PlayerData

	const dispatch = createEventDispatcher<{
		complete: {
			newLevel: number
			promotedToMajor: Skill[]
			promotedToMinor: Skill[]
			newSubskills: SubSkill[]
		}
		cancel: void
	}>()

	// Target level (next level up)
	let targetLevel = player.level + 1

	// Get changes needed
	$: changes = getLevelUpChanges(player.level, targetLevel)
	$: promotable = getPromotableSkills(player)
	$: targetLevelData = Level[targetLevel] ?? Level[20]!

	// Selection state
	let selectedMajorPromotions: Skill[] = []
	let selectedMinorPromotions: Skill[] = []
	let newSubskills: SubSkill[] = []

	// Validation
	$: majorPromotionsNeeded = changes?.majorSlotsGained ?? 0
	$: minorPromotionsNeeded = changes?.minorSlotsGained ?? 0
	$: subskillSlotsGained = changes?.subskillSlotsGained ?? 0

	$: majorPromotionsValid = selectedMajorPromotions.length === majorPromotionsNeeded
	$: minorPromotionsValid = selectedMinorPromotions.length === minorPromotionsNeeded
	$: isValid = majorPromotionsValid && minorPromotionsValid

	// Current step for multi-step wizard
	type WizardStep = 'overview' | 'major' | 'minor' | 'subskills' | 'confirm'
	let currentStep: WizardStep = 'overview'

	$: steps = buildSteps()

	function buildSteps(): WizardStep[] {
		const s: WizardStep[] = ['overview']
		if (majorPromotionsNeeded > 0) s.push('major')
		if (minorPromotionsNeeded > 0) s.push('minor')
		if (subskillSlotsGained > 0) s.push('subskills')
		s.push('confirm')
		return s
	}

	$: currentStepIndex = steps.indexOf(currentStep)
	$: isFirstStep = currentStepIndex === 0
	$: isLastStep = currentStepIndex === steps.length - 1

	function nextStep() {
		if (!isLastStep) {
			currentStep = steps[currentStepIndex + 1]
		}
	}

	function prevStep() {
		if (!isFirstStep) {
			currentStep = steps[currentStepIndex - 1]
		}
	}

	function toggleMajorPromotion(skill: Skill) {
		if (selectedMajorPromotions.includes(skill)) {
			selectedMajorPromotions = selectedMajorPromotions.filter(s => s !== skill)
		} else if (selectedMajorPromotions.length < majorPromotionsNeeded) {
			selectedMajorPromotions = [...selectedMajorPromotions, skill]
		}
	}

	function toggleMinorPromotion(skill: Skill) {
		if (selectedMinorPromotions.includes(skill)) {
			selectedMinorPromotions = selectedMinorPromotions.filter(s => s !== skill)
		} else if (selectedMinorPromotions.length < minorPromotionsNeeded) {
			selectedMinorPromotions = [...selectedMinorPromotions, skill]
		}
	}

	function addSubskill() {
		const maxSlots = getSubskillSlots(targetLevel)
		const currentCount = (player.subSkills?.length ?? 0) + newSubskills.length
		if (currentCount < maxSlots) {
			newSubskills = [...newSubskills, { name: '', description: '' }]
		}
	}

	function removeSubskill(index: number) {
		newSubskills = newSubskills.filter((_, i) => i !== index)
	}

	function updateSubskill(index: number, field: keyof SubSkill, value: string) {
		newSubskills = newSubskills.map((s, i) => (i === index ? { ...s, [field]: value } : s))
	}

	function handleComplete() {
		dispatch('complete', {
			newLevel: targetLevel,
			promotedToMajor: selectedMajorPromotions,
			promotedToMinor: selectedMinorPromotions,
			newSubskills: newSubskills.filter(s => s.name.trim() !== ''),
		})
	}

	function handleCancel() {
		dispatch('cancel')
	}

	// Check if can proceed from current step
	$: canProceedFromStep = (() => {
		switch (currentStep) {
			case 'overview': return true
			case 'major': return majorPromotionsValid
			case 'minor': return minorPromotionsValid
			case 'subskills': return true // Subskills are optional
			case 'confirm': return isValid
			default: return false
		}
	})()
</script>

<div class="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
	<header class="mb-6">
		<h2 class="h2 font-bold">Level Up!</h2>
		<p class="text-surface-500">
			Level {player.level} → Level {targetLevel}
		</p>
	</header>

	{#if currentStep === 'overview'}
		<!-- Overview Step -->
		<div class="space-y-4">
			<h3 class="h4 font-semibold">What's Changing</h3>

			<div class="grid grid-cols-2 gap-4">
				<div class="card p-4 variant-soft-surface">
					<div class="text-sm text-surface-500">Major Skill Bonus</div>
					<div class="text-xl font-bold">
						+{Level[player.level]?.majorSkillBonus} → +{targetLevelData.majorSkillBonus}
					</div>
				</div>
				<div class="card p-4 variant-soft-surface">
					<div class="text-sm text-surface-500">Minor Skill Bonus</div>
					<div class="text-xl font-bold">
						+{Level[player.level]?.minorSkillBonus} → +{targetLevelData.minorSkillBonus}
					</div>
				</div>
				<div class="card p-4 variant-soft-surface">
					<div class="text-sm text-surface-500">Critical Success Range</div>
					<div class="text-xl font-bold">
						{Level[player.level]?.critical}-20 → {targetLevelData.critical}-20
					</div>
				</div>
				<div class="card p-4 variant-soft-surface">
					<div class="text-sm text-surface-500">Critical Fail Range</div>
					<div class="text-xl font-bold">
						1-{Level[player.level]?.criticalFail} → 1-{targetLevelData.criticalFail}
					</div>
				</div>
			</div>

			{#if changes}
				<div class="card p-4 variant-soft-primary mt-4">
					<h4 class="font-semibold mb-2">Choices to Make</h4>
					<ul class="space-y-1 text-sm">
						{#if majorPromotionsNeeded > 0}
							<li class="flex items-center gap-2">
								<span class="badge variant-filled-primary">{majorPromotionsNeeded}</span>
								Promote {majorPromotionsNeeded} minor skill{majorPromotionsNeeded > 1 ? 's' : ''} to major
							</li>
						{/if}
						{#if minorPromotionsNeeded > 0}
							<li class="flex items-center gap-2">
								<span class="badge variant-filled-secondary">{minorPromotionsNeeded}</span>
								Promote {minorPromotionsNeeded} untrained skill{minorPromotionsNeeded > 1 ? 's' : ''} to minor
							</li>
						{/if}
						{#if subskillSlotsGained > 0}
							<li class="flex items-center gap-2">
								<span class="badge variant-filled-success">{subskillSlotsGained}</span>
								{subskillSlotsGained} new subskill slot{subskillSlotsGained > 1 ? 's' : ''} available (optional)
							</li>
						{/if}
					</ul>
				</div>
			{:else}
				<p class="text-surface-500 italic">No skill choices needed for this level.</p>
			{/if}
		</div>

	{:else if currentStep === 'major'}
		<!-- Major Skill Promotion Step -->
		<div class="space-y-4">
			<h3 class="h4 font-semibold">Promote to Major Skills</h3>
			<p class="text-sm text-surface-500">
				Select {majorPromotionsNeeded} minor skill{majorPromotionsNeeded > 1 ? 's' : ''} to promote to major.
				Selected: {selectedMajorPromotions.length}/{majorPromotionsNeeded}
			</p>

			<div class="grid grid-cols-2 gap-2">
				{#each promotable.minorToMajor as skill}
					{@const isSelected = selectedMajorPromotions.includes(skill)}
					<button
						type="button"
						class="p-3 rounded-lg text-left transition-colors {isSelected ? 'bg-primary-500 text-white' : 'bg-surface-700 hover:bg-surface-600'}"
						on:click={() => toggleMajorPromotion(skill)}
						disabled={!isSelected && selectedMajorPromotions.length >= majorPromotionsNeeded}
					>
						<span class="font-medium">{camelToTitleCase(skill)}</span>
						{#if isSelected}
							<span class="float-right">✓</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

	{:else if currentStep === 'minor'}
		<!-- Minor Skill Promotion Step -->
		<div class="space-y-4">
			<h3 class="h4 font-semibold">Promote to Minor Skills</h3>
			<p class="text-sm text-surface-500">
				Select {minorPromotionsNeeded} untrained skill{minorPromotionsNeeded > 1 ? 's' : ''} to promote to minor.
				Selected: {selectedMinorPromotions.length}/{minorPromotionsNeeded}
			</p>

			<div class="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
				{#each promotable.untrainedToMinor as skill}
					{@const isSelected = selectedMinorPromotions.includes(skill)}
					<button
						type="button"
						class="p-3 rounded-lg text-left transition-colors {isSelected ? 'bg-secondary-500 text-white' : 'bg-surface-700 hover:bg-surface-600'}"
						on:click={() => toggleMinorPromotion(skill)}
						disabled={!isSelected && selectedMinorPromotions.length >= minorPromotionsNeeded}
					>
						<span class="font-medium">{camelToTitleCase(skill)}</span>
						{#if isSelected}
							<span class="float-right">✓</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

	{:else if currentStep === 'subskills'}
		<!-- Subskills Step -->
		<div class="space-y-4">
			<h3 class="h4 font-semibold">Add Subskills (Optional)</h3>
			<p class="text-sm text-surface-500">
				You gained {subskillSlotsGained} new subskill slot{subskillSlotsGained > 1 ? 's' : ''}.
				Subskills give +{getSubskillBonus(targetLevel)} when invoked.
			</p>

			{#each newSubskills as subskill, index}
				<div class="card p-4 variant-soft-surface">
					<div class="flex gap-2 mb-2">
						<input
							type="text"
							class="input flex-1"
							placeholder="Subskill name"
							value={subskill.name}
							on:input={(e) => updateSubskill(index, 'name', e.currentTarget.value)}
						/>
						<button
							type="button"
							class="btn-icon variant-soft-error"
							on:click={() => removeSubskill(index)}
						>×</button>
					</div>
					<textarea
						class="textarea w-full"
						rows="2"
						placeholder="When does this subskill apply?"
						value={subskill.description}
						on:input={(e) => updateSubskill(index, 'description', e.currentTarget.value)}
					></textarea>
				</div>
			{/each}

			{@const maxNewSubskills = subskillSlotsGained}
			{#if newSubskills.length < maxNewSubskills}
				<button
					type="button"
					class="btn variant-soft-success w-full"
					on:click={addSubskill}
				>
					+ Add Subskill ({newSubskills.length}/{maxNewSubskills})
				</button>
			{/if}
		</div>

	{:else if currentStep === 'confirm'}
		<!-- Confirmation Step -->
		<div class="space-y-4">
			<h3 class="h4 font-semibold">Confirm Level Up</h3>

			<div class="card p-4 variant-soft-surface space-y-3">
				<div class="flex justify-between">
					<span>New Level:</span>
					<span class="font-bold">{targetLevel}</span>
				</div>

				{#if selectedMajorPromotions.length > 0}
					<div>
						<span class="text-sm text-surface-500">Promoted to Major:</span>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each selectedMajorPromotions as skill}
								<span class="badge variant-filled-primary">{camelToTitleCase(skill)}</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if selectedMinorPromotions.length > 0}
					<div>
						<span class="text-sm text-surface-500">Promoted to Minor:</span>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each selectedMinorPromotions as skill}
								<span class="badge variant-filled-secondary">{camelToTitleCase(skill)}</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if newSubskills.filter(s => s.name.trim()).length > 0}
					<div>
						<span class="text-sm text-surface-500">New Subskills:</span>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each newSubskills.filter(s => s.name.trim()) as subskill}
								<span class="badge variant-filled-success">{subskill.name}</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Footer Navigation -->
	<footer class="flex justify-between mt-6 pt-4 border-t border-surface-500/20">
		<button type="button" class="btn variant-ghost" on:click={handleCancel}>
			Cancel
		</button>

		<div class="flex gap-2">
			{#if !isFirstStep}
				<button type="button" class="btn variant-ghost" on:click={prevStep}>
					Back
				</button>
			{/if}

			{#if isLastStep}
				<button
					type="button"
					class="btn variant-filled-primary"
					disabled={!isValid}
					on:click={handleComplete}
				>
					Confirm Level Up
				</button>
			{:else}
				<button
					type="button"
					class="btn variant-filled-primary"
					disabled={!canProceedFromStep}
					on:click={nextStep}
				>
					Next
				</button>
			{/if}
		</div>
	</footer>
</div>
```

**Step 3: Verify files exist**

Run: `ls -la src/lib/components/levelup/`
Expected: Shows both files

**Step 4: Commit**

```bash
git add src/lib/components/levelup/
git commit -m "$(cat <<'EOF'
feat: add LevelUpWizard component

Multi-step wizard for leveling up characters:
- Shows stat changes preview (bonuses, crit ranges)
- Guides through skill promotions (minor→major, untrained→minor)
- Optional subskill creation for new slots
- Confirmation step with summary

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Integrate LevelUpWizard into CharacterSheet

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte`

**Step 1: Add imports**

Add near other imports:
```typescript
import { LevelUpWizard } from '$lib/components/levelup'
import { getLevelUpChanges } from '$lib/util/stats.util'
```

**Step 2: Add state for level up wizard**

Add after the skill roll modal state:
```typescript
// Level up wizard state
let showLevelUpWizard = false

// Check if level up has choices
$: canLevelUp = player.level < 20
$: levelUpChanges = canLevelUp ? getLevelUpChanges(player.level, player.level + 1) : null

function openLevelUpWizard() {
	showLevelUpWizard = true
}

function closeLevelUpWizard() {
	showLevelUpWizard = false
}

function handleLevelUpComplete(event: CustomEvent<{
	newLevel: number
	promotedToMajor: Skill[]
	promotedToMinor: Skill[]
	newSubskills: SubSkill[]
}>) {
	const { newLevel, promotedToMajor, promotedToMinor, newSubskills } = event.detail

	// Build updated skill arrays
	const newMajorSkills = [...player.majorSkills, ...promotedToMajor]
	const newMinorSkills = [
		...player.minorSkills.filter(s => !promotedToMajor.includes(s)),
		...promotedToMinor
	]
	const updatedSubskills = [...(player.subSkills ?? []), ...newSubskills]

	// Apply all changes
	if (onUpdate) {
		onUpdate({
			...player,
			level: newLevel,
			majorSkills: newMajorSkills,
			minorSkills: newMinorSkills,
			subSkills: updatedSubskills,
		})
	}

	showLevelUpWizard = false
}
```

**Step 3: Replace level input in header with Level Up button**

Find the level display in the header (around line 170-183) and replace:

```svelte
<span class="badge variant-filled-primary text-lg px-4 py-2">
	Level {player.level}
	{#if canLevelUp && !editMode}
		<button
			type="button"
			class="ml-2 btn btn-sm variant-filled-success"
			on:click={openLevelUpWizard}
		>
			Level Up
		</button>
	{/if}
</span>
```

Keep the editMode version with the number input for GM adjustments.

**Step 4: Add the modal at end of component**

Add before the closing `</div>`:
```svelte
<!-- Level Up Wizard Modal -->
{#if showLevelUpWizard}
	<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
		<LevelUpWizard
			{player}
			on:complete={handleLevelUpComplete}
			on:cancel={closeLevelUpWizard}
		/>
	</div>
{/if}
```

**Step 5: Add SubSkill type import if not present**

```typescript
import type { SubSkill } from '$lib/models/subskill'
```

**Step 6: Run type check**

Run: `npm run check 2>&1 | grep CharacterSheet`
Expected: No new errors

**Step 7: Commit**

```bash
git add src/lib/components/CharacterSheet.svelte
git commit -m "$(cat <<'EOF'
feat: integrate LevelUpWizard into CharacterSheet

- Adds "Level Up" button next to level display
- Opens wizard modal for guided level progression
- Applies skill promotions and new subskills atomically
- GM Mode still allows direct level editing

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update Combat Statistics display to show crit fail range

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte`

**Step 1: Find the Combat Statistics section**

Look for the section with "Critical Range" display (around line 362-382).

**Step 2: Verify crit fail is displayed**

The section should already show `1-{levelData.criticalFail}`. If it only shows "Critical Fail Range: 1-1", update to use `levelData.criticalFail`:

```svelte
<div>
	<div class="text-sm text-surface-600-300-token">Critical Fail Range</div>
	<div class="text-xl font-bold">1-{levelData.criticalFail}</div>
</div>
```

**Step 3: Run type check**

Run: `npm run check 2>&1 | grep CharacterSheet`
Expected: No errors

**Step 4: Commit (if changes made)**

```bash
git add src/lib/components/CharacterSheet.svelte
git commit -m "$(cat <<'EOF'
fix: display dynamic critical fail range in combat stats

Shows 1-{criticalFail} instead of hardcoded 1-1.
Range increases at levels 10 (1-2) and 17 (1-3).

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Build verification and testing

**Files:**
- None (verification only)

**Step 1: Run type check**

Run: `npm run check`
Expected: Only pre-existing errors

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Manual testing checklist**

Start dev server: `npm run dev`

Test scenarios:
1. Navigate to a level 5 character
2. Click "Level Up" button
3. Verify overview shows correct changes (L5→L6: +1 major slot)
4. Complete the wizard by promoting a minor skill to major
5. Verify the skill arrays are updated correctly
6. Test level 10→11 transition (both major and minor slot increases)
7. Test subskill addition at level 5/10/15
8. Verify GM Mode still allows direct level editing

**Step 4: No commit needed**

---

## Summary

This plan implements:

1. **getLevelUpChanges utility** - Calculates what promotions are needed between levels
2. **getPromotableSkills utility** - Lists skills available for promotion
3. **LevelUpWizard component** - Multi-step wizard with:
   - Overview of stat changes (including crit fail range)
   - Major skill promotion step (minor → major)
   - Minor skill promotion step (untrained → minor)
   - Optional subskill creation step
   - Confirmation with summary
4. **CharacterSheet integration** - "Level Up" button replaces direct level input (GM Mode keeps it)
5. **Crit fail display** - Ensures the combat stats show dynamic critical fail range

**Level-up triggers:**
- Level 6: Promote 1 minor → major
- Level 11: Promote 1 minor → major, 1 untrained → minor
- Level 16: Promote 1 minor → major, 2 untrained → minor
- Levels 5, 10, 15: New subskill slot available
