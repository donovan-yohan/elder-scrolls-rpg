# Various UI/UX Bug Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 6 distinct bugs identified through investigation: level-up stats, skill promotion data, equipment display, inventory UX, initiative calculation, and spells/shouts feature gaps.

**Architecture:** Each fix targets specific files identified through codebase exploration. Fixes are ordered by complexity (quick wins first). Issues #1 and #2 share the same root cause and are consolidated.

**Tech Stack:** Svelte 5, TypeScript, Vitest

---

## Task 1: Fix Level 6 Skill Promotion Data (Issue #3)

**Files:**
- Modify: `src/lib/data/level.ts:93`
- Test: Manual verification

**Step 1: Verify current incorrect value**

Open `src/lib/data/level.ts` and confirm line 93 shows `minorSkills: 6` for level 6.

**Step 2: Fix the data**

```typescript
// Change line 93 from:
minorSkills: 6,
// To:
minorSkills: 7,
```

**Step 3: Verify the fix**

Run: `npm run check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/lib/data/level.ts
git commit -m "fix: correct minorSkills count for level 6 skill promotion

Level 6 should allow gaining a new minor skill when promoting minor→major.
Per Character Creation Guide: 'Up to one untrained turned to minor and one minor to Major'"
```

---

## Task 2: Fix Equipment Display in ReviewStep (Issue #4)

**Files:**
- Modify: `src/lib/components/wizard/steps/ReviewStep.svelte:177-185`

**Step 1: Read current implementation**

Review `ReviewStep.svelte` lines 177-185 to understand current equipment display.

**Step 2: Import equipment utilities**

Add to script section:
```typescript
import { getEquippedWeapon, getEquippedArmor } from '$lib/util/equipment.util'
import { weapons } from '$lib/data/weapons'
import { armor } from '$lib/data/armor'
```

**Step 3: Add derived computations**

Add after imports in script:
```typescript
let weaponDisplay = $derived(() => {
  if (!formData.equipment?.weapon?.id) return 'None'
  const weapon = getEquippedWeapon(formData.equipment.weapon)
  return weapon?.name || 'None'
})

let offhandDisplay = $derived(() => {
  if (!formData.equipment?.offhand?.id) return 'None'
  const offhand = getEquippedWeapon(formData.equipment.offhand)
  return offhand?.name || 'None'
})

let armorDisplay = $derived(() => {
  if (!formData.equipment?.armor?.id) return 'None'
  const armorItem = getEquippedArmor(formData.equipment.armor)
  return armorItem?.name || 'None'
})
```

**Step 4: Update template**

Replace lines 177-185:
```svelte
<p><strong>Weapon:</strong> {weaponDisplay()}</p>
<p><strong>Off-hand:</strong> {offhandDisplay()}</p>
<p><strong>Armor:</strong> {armorDisplay()}</p>
```

**Step 5: Verify the fix**

Run: `npm run check`
Expected: No TypeScript errors

**Step 6: Commit**

```bash
git add src/lib/components/wizard/steps/ReviewStep.svelte
git commit -m "fix: display equipment names instead of [object Object] in review step

Equipment slots contain {id, materialId} objects. Now using equipment
utility functions to resolve to display names."
```

---

## Task 3: Fix Level-Up Stats Recalculation (Issues #1 + #2)

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte:112-140`

**Step 1: Read current handleLevelUpComplete function**

Review `CharacterSheet.svelte` lines 112-140 to understand current level-up handling.

**Step 2: Verify imports exist**

Confirm these are already imported (they should be):
```typescript
import { calculateMaxHealth, calculateMaxMagicka, calculateMaxAP, calculateMaxSpiritPoints } from '$lib/util/stats.util'
```

**Step 3: Update handleLevelUpComplete function**

Replace the function (approximately lines 112-140):
```typescript
function handleLevelUpComplete(data: {
  newLevel: number
  promotedToMajor: Skill[]
  promotedToMinor: Skill[]
  newSubskills: SubSkill[]
}) {
  const { newLevel, promotedToMajor, promotedToMinor, newSubskills } = data

  // Build updated skill arrays
  const newMajorSkills = [...player.majorSkills, ...promotedToMajor]
  const newMinorSkills = [
    ...player.minorSkills.filter(s => !promotedToMajor.includes(s)),
    ...promotedToMinor
  ]
  const updatedSubskills = [...(player.subSkills ?? []), ...newSubskills]

  // Create intermediate player object with new level and skills
  const updatedPlayer = {
    ...player,
    level: newLevel,
    majorSkills: newMajorSkills,
    minorSkills: newMinorSkills,
    subSkills: updatedSubskills,
  }

  // Recalculate derived stats based on new level
  const newMaxHealth = calculateMaxHealth(updatedPlayer)
  const newMaxMagicka = calculateMaxMagicka(updatedPlayer)
  const newMaxAP = calculateMaxAP(updatedPlayer)
  const newMaxSpiritPoints = calculateMaxSpiritPoints(newLevel)

  // Apply all changes including recalculated stats
  // Reset current values to new max on level-up (like a full rest)
  if (onUpdate) {
    onUpdate({
      ...updatedPlayer,
      maxHealth: newMaxHealth,
      health: newMaxHealth,
      maxMagicka: newMaxMagicka,
      magicka: newMaxMagicka,
      maxActionPoints: newMaxAP,
      actionPoints: newMaxAP,
      maxSpiritPoints: newMaxSpiritPoints,
    })
  }

  showLevelUpWizard = false
}
```

**Step 4: Verify the fix**

Run: `npm run check`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/lib/components/CharacterSheet.svelte
git commit -m "fix: recalculate and reset stats on level-up

Previously handleLevelUpComplete only updated level and skills without
recalculating derived stats (maxHealth, maxMagicka, maxActionPoints).
Now recalculates all stats and resets current values to new max."
```

---

## Task 4: Fix Initiative Success Calculation (Issue #6)

**Files:**
- Modify: `src/lib/util/initiative.util.ts`
- Modify: `src/lib/components/combat/modals/EnterCombatModal.svelte`
- Test: `src/lib/util/initiative.util.test.ts` (create if needed)

**Step 1: Write failing test**

Create or update `src/lib/util/initiative.util.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { rollToSuccesses } from './initiative.util'

describe('rollToSuccesses', () => {
  it('returns 0 for rolls below 13', () => {
    expect(rollToSuccesses(1)).toBe(0)
    expect(rollToSuccesses(12)).toBe(0)
  })

  it('returns 1 for rolls 13-19', () => {
    expect(rollToSuccesses(13)).toBe(1)
    expect(rollToSuccesses(19)).toBe(1)
  })

  it('returns 2 for rolls 20-29', () => {
    expect(rollToSuccesses(20)).toBe(2)
    expect(rollToSuccesses(29)).toBe(2)
  })

  it('returns 3 for rolls 30+', () => {
    expect(rollToSuccesses(30)).toBe(3)
    expect(rollToSuccesses(50)).toBe(3)
  })

  it('adds 1 for critical hits', () => {
    expect(rollToSuccesses(12, true)).toBe(1)  // 0 + 1 crit
    expect(rollToSuccesses(13, true)).toBe(2)  // 1 + 1 crit
    expect(rollToSuccesses(20, true)).toBe(3)  // 2 + 1 crit
    expect(rollToSuccesses(30, true)).toBe(4)  // 3 + 1 crit
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/util/initiative.util.test.ts`
Expected: FAIL with "rollToSuccesses is not exported"

**Step 3: Add rollToSuccesses function**

Add to `src/lib/util/initiative.util.ts`:
```typescript
/**
 * Converts a roll total to initiative successes per Combat 2.0 rules:
 * - Roll 13+ = 1 success
 * - Roll 20+ = 2 successes
 * - Roll 30+ = 3 successes
 * - Critical = +1 extra success
 */
export function rollToSuccesses(rollTotal: number, isCritical: boolean = false): number {
  let successes = 0

  if (rollTotal >= 30) {
    successes = 3
  } else if (rollTotal >= 20) {
    successes = 2
  } else if (rollTotal >= 13) {
    successes = 1
  }

  if (isCritical) {
    successes += 1
  }

  return successes
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/util/initiative.util.test.ts`
Expected: PASS

**Step 5: Update EnterCombatModal to use successes**

In `src/lib/components/combat/modals/EnterCombatModal.svelte`, find where `onstart` is called with `playerRollResult.total` and modify to convert:

```typescript
import { rollToSuccesses } from '$lib/util/initiative.util'

// Where onstart is called, change from:
// onstart?.({ partyInit: playerRollResult.total, ... })
// To:
const isCritical = playerRollResult.d20Roll >= critRange  // Determine if crit
const partySuccesses = rollToSuccesses(playerRollResult.total, isCritical)
onstart?.({ partyInit: partySuccesses, enemyInit: enemyInitiative, ... })
```

**Step 6: Verify compilation**

Run: `npm run check`
Expected: No TypeScript errors

**Step 7: Commit**

```bash
git add src/lib/util/initiative.util.ts src/lib/util/initiative.util.test.ts src/lib/components/combat/modals/EnterCombatModal.svelte
git commit -m "fix: convert initiative rolls to success-based count

Per Combat 2.0 rules: 13+=1, 20+=2, 30+=3, crit=+1 extra success.
Initiative pools now use success count instead of raw roll total."
```

---

## Task 5: Add Inventory Section Edit Mode Guidance (Issue #5)

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte:883-912`

**Step 1: Read current inventory section**

Review `CharacterSheet.svelte` lines 883-912 to understand current structure.

**Step 2: Add editMode guidance**

Update the Inventory section to show guidance in edit mode:
```svelte
<section class="inventory-section">
  <h3>Inventory</h3>
  {#if editMode}
    <p class="edit-hint">
      <em>Edit inventory items in the Equipment section above (Items tab)</em>
    </p>
  {/if}
  {#if inventoryItems.length > 0}
    <ul>
      {#each inventoryItems as item}
        <li>{item.name} x{item.quantity}</li>
      {/each}
    </ul>
  {:else}
    <p>No items in inventory</p>
  {/if}
</section>
```

**Step 3: Verify compilation**

Run: `npm run check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/lib/components/CharacterSheet.svelte
git commit -m "fix: add edit mode guidance to inventory section

In GM/edit mode, show hint directing users to Equipment section's
Items tab for inventory management."
```

---

## Task 6: Add Spell Management UI (Issue #7 - Part A)

**Files:**
- Create: `src/lib/components/spells/SpellPicker.svelte`
- Modify: `src/lib/components/CharacterSheet.svelte`

**Step 1: Create SpellPicker component**

Create `src/lib/components/spells/SpellPicker.svelte`:
```svelte
<script lang="ts">
  import { spells, getSpellsBySchool, type Spell, type SpellSchool } from '$lib/data/spells'

  interface Props {
    knownSpells: string[]
    onchange: (spells: string[]) => void
  }

  let { knownSpells, onchange }: Props = $props()

  const schools: SpellSchool[] = ['Alteration', 'Conjuration', 'Destruction', 'Illusion', 'Mysticism', 'Restoration']

  function toggleSpell(spellId: string) {
    if (knownSpells.includes(spellId)) {
      onchange(knownSpells.filter(id => id !== spellId))
    } else {
      onchange([...knownSpells, spellId])
    }
  }
</script>

<div class="spell-picker">
  {#each schools as school}
    {@const schoolSpells = getSpellsBySchool(school)}
    {#if schoolSpells.length > 0}
      <details>
        <summary>{school}</summary>
        <ul>
          {#each schoolSpells as spell}
            <li>
              <label>
                <input
                  type="checkbox"
                  checked={knownSpells.includes(spell.id)}
                  onchange={() => toggleSpell(spell.id)}
                />
                {spell.name} ({spell.level}) - {spell.apCost} AP, {spell.mpCost} MP
              </label>
            </li>
          {/each}
        </ul>
      </details>
    {/if}
  {/each}
</div>

<style>
  .spell-picker details {
    margin-bottom: 0.5rem;
  }
  .spell-picker ul {
    list-style: none;
    padding-left: 1rem;
  }
  .spell-picker label {
    cursor: pointer;
  }
</style>
```

**Step 2: Verify compilation**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Add SpellPicker to CharacterSheet**

In `CharacterSheet.svelte`, find the Spells section and add edit mode:
```svelte
{#if editMode}
  <SpellPicker
    knownSpells={player.knownSpells}
    onchange={(spells) => onUpdate?.({ ...player, knownSpells: spells })}
  />
{:else}
  <!-- existing spell display -->
{/if}
```

**Step 4: Verify compilation**

Run: `npm run check`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/lib/components/spells/SpellPicker.svelte src/lib/components/CharacterSheet.svelte
git commit -m "feat: add spell management UI in edit mode

New SpellPicker component allows adding/removing known spells.
Integrated into CharacterSheet's Spells section when in edit mode."
```

---

## Task 7: Add Dragon Shouts System (Issue #7 - Part B)

**Files:**
- Create: `src/lib/data/shouts.ts`
- Modify: `src/lib/models/player.ts`
- Create: `src/lib/components/shouts/ShoutPicker.svelte`
- Modify: `src/lib/components/CharacterSheet.svelte`

**Step 1: Create shouts data file**

Create `src/lib/data/shouts.ts`:
```typescript
export interface ShoutWord {
  word: string
  translation: string
  range: string
  effect: string
}

export interface Shout {
  id: string
  name: string
  description: string
  words: ShoutWord[]
  resolve?: string
}

export const shouts: Shout[] = [
  {
    id: 'unrelenting-force',
    name: 'Unrelenting Force',
    description: 'A great thundering shout that demolishes all in its path',
    resolve: 'Opponent must roll Athletics to stand firm, or Acrobatics to dodge. DC 10 + Character level.',
    words: [
      { word: 'Fus', translation: 'Force', range: 'Short', effect: 'Push up to 40 feet, 2 force damage' },
      { word: 'Roh', translation: 'Balance', range: 'Medium', effect: 'Push up to 85 feet, 4 force damage' },
      { word: 'Dah', translation: 'Push', range: 'Long', effect: 'Push up to 200 feet, 8 force damage' },
    ]
  },
  {
    id: 'become-ethereal',
    name: 'Become Ethereal',
    description: 'A guttural whisper that rends what was apart from Mundus for just a moment',
    resolve: 'No save. Unwilling targets may dodge (your Will vs their dodge).',
    words: [
      { word: 'Feim', translation: 'Fade', range: 'Immediate', effect: '1 round invisible/intangible, +6 advantage Sneak' },
      { word: 'Zii', translation: 'Spirit', range: 'Adjacent', effect: '2 rounds invisible/intangible, +8 advantage Sneak' },
      { word: 'Gron', translation: 'Bind', range: 'Short', effect: '4 rounds invisible/intangible, +8 advantage Sneak' },
    ]
  },
  {
    id: 'whirlwind-sprint',
    name: 'Whirlwind Sprint',
    description: 'A sharp yell that propels the user forwards with the storm at their back',
    resolve: 'Creatures in path must roll Athletics vs you. Fail = pushed and prone.',
    words: [
      { word: 'Wuld', translation: 'Whirlwind', range: 'Self', effect: 'Move 25 feet, auto-dodge, trample +2 advantage' },
      { word: 'Nah', translation: 'Fury', range: 'Self', effect: 'Move 25 feet, auto-dodge, trample +4 advantage' },
      { word: 'Kest', translation: 'Tempest', range: 'Self', effect: 'Move 40 feet, auto-dodge, trample +6 advantage' },
    ]
  },
  {
    id: 'kyne-emissary',
    name: "Summon Emissary of Kyne",
    description: "From your breath, give life to Kyne's holy emissary",
    resolve: 'Requires Conjuration check. Must have space to summon.',
    words: [
      { word: 'Bo', translation: 'Move', range: 'Short', effect: 'Summon spectral Hawk (Lesser)' },
      { word: 'Ven', translation: 'Wind', range: 'Short', effect: 'Summon spectral Hawk' },
      { word: 'Stin', translation: 'Free', range: 'Medium', effect: 'Summon spectral Hawk (Greater)' },
    ]
  },
]

export function getShoutById(id: string): Shout | undefined {
  return shouts.find(s => s.id === id)
}
```

**Step 2: Add knownShouts to PlayerData**

In `src/lib/models/player.ts`, add to PlayerData interface:
```typescript
knownShouts: string[]
```

And add to defaultPlayerData:
```typescript
knownShouts: []
```

**Step 3: Create ShoutPicker component**

Create `src/lib/components/shouts/ShoutPicker.svelte`:
```svelte
<script lang="ts">
  import { shouts, type Shout } from '$lib/data/shouts'

  interface Props {
    knownShouts: string[]
    onchange: (shouts: string[]) => void
  }

  let { knownShouts, onchange }: Props = $props()

  function toggleShout(shoutId: string) {
    if (knownShouts.includes(shoutId)) {
      onchange(knownShouts.filter(id => id !== shoutId))
    } else {
      onchange([...knownShouts, shoutId])
    }
  }
</script>

<div class="shout-picker">
  <p class="info">Dragon Shouts cost 1 AP and 2 MP per word spoken.</p>
  {#each shouts as shout}
    <label class="shout-option">
      <input
        type="checkbox"
        checked={knownShouts.includes(shout.id)}
        onchange={() => toggleShout(shout.id)}
      />
      <strong>{shout.name}</strong> - {shout.description}
    </label>
  {/each}
</div>

<style>
  .shout-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .shout-option {
    cursor: pointer;
  }
  .info {
    font-style: italic;
    color: var(--text-muted);
  }
</style>
```

**Step 4: Add Dragon Shouts section to CharacterSheet**

Add a new section in CharacterSheet.svelte for Dragon Shouts (after Spells):
```svelte
<!-- Dragon Shouts Section -->
<section class="shouts-section">
  <h3>Dragon Shouts</h3>
  {#if editMode}
    <ShoutPicker
      knownShouts={player.knownShouts ?? []}
      onchange={(shouts) => onUpdate?.({ ...player, knownShouts: shouts })}
    />
  {:else if player.knownShouts?.length > 0}
    {#each player.knownShouts as shoutId}
      {@const shout = getShoutById(shoutId)}
      {#if shout}
        <details>
          <summary>{shout.name}</summary>
          <p>{shout.description}</p>
          <ul>
            {#each shout.words as word, i}
              <li>
                <strong>{word.word}</strong> ({word.translation}) -
                Range: {word.range}, Effect: {word.effect}
                <em>(Cost: {i + 1} AP, {(i + 1) * 2} MP)</em>
              </li>
            {/each}
          </ul>
          {#if shout.resolve}
            <p><em>Resolve: {shout.resolve}</em></p>
          {/if}
        </details>
      {/if}
    {/each}
  {:else}
    <p>No dragon shouts known</p>
  {/if}
</section>
```

**Step 5: Verify compilation**

Run: `npm run check`
Expected: No TypeScript errors

**Step 6: Commit**

```bash
git add src/lib/data/shouts.ts src/lib/models/player.ts src/lib/components/shouts/ShoutPicker.svelte src/lib/components/CharacterSheet.svelte
git commit -m "feat: add dragon shouts system

- New shouts data file with Unrelenting Force, Become Ethereal, Whirlwind Sprint, Kyne's Emissary
- Added knownShouts field to PlayerData
- ShoutPicker component for edit mode
- Dragon Shouts section in CharacterSheet with word-by-word details
Per Dragon Shouts doc: 1 AP + 2 MP per word, can use single word as reaction"
```

---

## Validation Checklist

After all tasks complete, verify against source docs:

- [ ] Level 6 allows gaining new minor skill when promoting (Character Creation Guide)
- [ ] Equipment names display in character creation review
- [ ] Level-up recalculates and resets all stats
- [ ] Initiative uses success count: 13+=1, 20+=2, 30+=3, crit=+1 (Combat 2.0)
- [ ] Inventory section provides edit guidance
- [ ] Spells can be added/removed in edit mode
- [ ] Dragon Shouts display with word costs: 1 AP + 2 MP per word (Dragon Shouts doc)

---

## Final Commit

```bash
git add -A
git commit -m "chore: complete various UI/UX bug fixes

Fixes:
- Level 6 skill promotion data (minorSkills: 7)
- Equipment display in review step
- Level-up stats recalculation
- Initiative success calculation
- Inventory edit mode guidance
- Spell management UI
- Dragon shouts system"
```
