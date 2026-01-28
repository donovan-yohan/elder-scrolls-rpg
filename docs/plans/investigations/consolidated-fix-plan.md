# Consolidated Bug Fix Plan

**Date:** 2026-01-28
**Branch:** fix/various-ui-ux-bugs

## Summary

Investigation of 7 reported issues revealed 6 distinct fixes needed (Issues #1 and #2 share the same root cause).

---

## Fix 1: Level-Up Stats & AP (Issues #1 + #2)

**Root Cause:** `handleLevelUpComplete()` in `CharacterSheet.svelte:112-140` doesn't recalculate derived stats when level increases.

**Files to Modify:**
- `src/lib/components/CharacterSheet.svelte`

**Fix:**
```typescript
// In handleLevelUpComplete(), after building updatedPlayer object:
const newMaxHealth = calculateMaxHealth(updatedPlayer)
const newMaxMagicka = calculateMaxMagicka(updatedPlayer)
const newMaxAP = calculateMaxAP(updatedPlayer)
const newMaxSpiritPoints = calculateMaxSpiritPoints(newLevel)

onUpdate({
  ...updatedPlayer,
  maxHealth: newMaxHealth,
  health: newMaxHealth,  // Reset to full on level-up
  maxMagicka: newMaxMagicka,
  magicka: newMaxMagicka,  // Reset to full on level-up
  maxActionPoints: newMaxAP,
  actionPoints: newMaxAP,  // Reset to full on level-up
  maxSpiritPoints: newMaxSpiritPoints,
})
```

**Validation:** Per Character Creation Guide - stats should match level table for archetype.

---

## Fix 2: Level 6 Skill Promotion (Issue #3)

**Root Cause:** `level.ts:93` has `minorSkills: 6` but should be `7` for level 6.

**Files to Modify:**
- `src/lib/data/level.ts` (line 93)

**Fix:**
```typescript
// Change from:
minorSkills: 6,
// To:
minorSkills: 7,
```

**Validation:** Per Character Creation Guide - "Up to one untrained turned to minor and one minor to Major"

---

## Fix 3: Equipment Display in Review (Issue #4)

**Root Cause:** `ReviewStep.svelte:177-185` displays raw `EquipmentSlot` objects instead of weapon/armor names.

**Files to Modify:**
- `src/lib/components/wizard/steps/ReviewStep.svelte`

**Fix:**
- Import `getEquippedWeapon`, `getEquippedArmor` from `equipment.util.ts`
- Use these functions to get display names instead of raw objects

---

## Fix 4: Inventory Section UX (Issue #5)

**Root Cause:** Inventory section (`CharacterSheet.svelte:883-912`) has no edit mode - users must use Equipment→Items tab.

**Files to Modify:**
- `src/lib/components/CharacterSheet.svelte`

**Fix Options:**
- A) Add editMode indicator with link to Equipment section
- B) Add inline editing to Inventory section
- C) Add informational text guiding users

**Note:** Notes section already works correctly in editMode.

---

## Fix 5: Initiative Calculation (Issue #6)

**Root Cause:** System uses raw roll total as initiative instead of success-based count.

**Correct Formula (per Combat 2.0.md):**
- Roll 13+ = 1 success
- Roll 20+ = 2 successes
- Roll 30+ = 3 successes
- Critical = +1 extra success

**Files to Modify:**
- `src/lib/util/initiative.util.ts` - Add `rollToSuccesses()` function
- `src/lib/components/combat/modals/EnterCombatModal.svelte` - Convert total to successes

**Fix:**
```typescript
export function rollToSuccesses(rollTotal: number, isCritical: boolean = false): number {
  let successes = 0;
  if (rollTotal >= 30) successes = 3;
  else if (rollTotal >= 20) successes = 2;
  else if (rollTotal >= 13) successes = 1;

  if (isCritical) successes += 1;

  return successes;
}
```

---

## Fix 6: Spells & Dragon Shouts (Issue #7)

**Root Cause:** Feature gaps - spells have no edit UI, dragon shouts completely missing.

### 6A: Spell Management

**Files to Create:**
- `src/lib/components/spells/SpellPicker.svelte`

**Files to Modify:**
- `src/lib/components/CharacterSheet.svelte` - Add edit mode to Spells section

### 6B: Dragon Shouts System

**Files to Create:**
- `src/lib/data/shouts.ts` - Shout data (per Dragon Shouts doc)
- `src/lib/components/shouts/ShoutPicker.svelte`

**Files to Modify:**
- `src/lib/models/player.ts` - Add `knownShouts: string[]` field
- `src/lib/components/CharacterSheet.svelte` - Add Dragon Shouts section

**Data Model (per Dragon Shouts (1).md):**
```typescript
interface Shout {
  id: string
  name: string
  description: string
  words: ShoutWord[]
}

interface ShoutWord {
  word: string
  translation: string
  apCost: number  // Always 1
  mpCost: number  // Always 2 per word
  range: string
  effect: string
}
```

---

## Implementation Priority

1. **Quick Wins (< 30 min each):**
   - Fix 2: Level data (1 line change)
   - Fix 3: Equipment display (import + template change)

2. **Medium Effort:**
   - Fix 1: Level-up stats (function update)
   - Fix 5: Initiative calculation (new function + integration)
   - Fix 4: Inventory UX (UI enhancement)

3. **Large Effort:**
   - Fix 6: Spells/Shouts (new components + data)

---

## Validation References

All fixes should be validated against source-of-truth docs:
- `docs/Character Creation Guide.md` - Level progression, stats, skills
- `docs/Combat 2.0.md` - Initiative formula
- `docs/Dragon Shouts (1).md` - Shout mechanics
- `docs/Equipment Simplified (1).md` - Equipment data
