# Combat Mode Sync & Mode Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make combat a sub-mode of Playing that syncs bidirectionally with player data, while redesigning Editing mode as an admin-only manual override.

**Architecture:** Combat becomes a modal state within Playing mode rather than a separate tab. When combat starts, it reads current player HP/MP/AP. When combat ends, it writes final values back. Playing mode retains resource adjustment controls. Editing mode becomes a restricted admin panel for manual stat overrides.

**Tech Stack:** SvelteKit, Svelte stores, TypeScript, localStorage persistence

---

## Current State Analysis

- **Combat state is ephemeral**: `combatStore` maintains session in localStorage but never syncs back to `playersStore`
- **Three separate modes**: Playing, Editing, Combat are peer-level tabs
- **No resource controls in Playing**: Players can only adjust stats in Editing mode
- **Data loss on combat end**: HP/MP changes during combat are discarded

## Target State

1. **Two main modes**: Playing and Editing (admin)
2. **Combat as sub-state of Playing**: Enter/exit combat within Playing mode
3. **Bidirectional sync**: Combat reads player state on start, writes back on end
4. **Playing mode resource controls**: +/- buttons for HP/MP (not AP) in Playing mode
5. **Editing as admin mode**: Full manual control, labeled as "GM/Admin" mode

---

## Task 1: Add Sync Functions to Combat Store

**Files:**
- Modify: `src/lib/stores/combat.store.ts`

**Step 1: Add startCombat sync parameter**

Add a new parameter to `startCombat()` that accepts current player resources instead of separate params:

```typescript
// In combat.store.ts, modify startCombat function (around line 85)
// Change from:
startCombat: (
  playerId: string,
  partyInitiative: number,
  enemyInitiative: number,
  initialHP: number,
  initialMP: number,
  initialAP: number
): void => {

// Change to:
startCombat: (
  playerId: string,
  partyInitiative: number,
  enemyInitiative: number,
  playerData: { health: number; magicka: number; maxActionPoints: number }
): void => {
```

Update the session creation to use `playerData`:

```typescript
const session: CombatSession = {
  id: crypto.randomUUID(),
  playerId,
  round: 1,
  isPlayerTurn: partyInitiative >= enemyInitiative,
  partyInitiative,
  enemyInitiative,
  currentHP: playerData.health,
  currentMP: playerData.magicka,
  currentAP: playerData.maxActionPoints,
  maxAP: playerData.maxActionPoints,
  conditions: [],
  log: [{ timestamp: new Date().toISOString(), message: 'Combat started!' }],
  distance: CombatDistance.Medium,
  isConcentrationBroken: false,
}
```

**Step 2: Add endCombat return value**

Modify `endCombat()` to return final combat state before deletion:

```typescript
// Change from:
endCombat: (playerId: string): void => {

// Change to:
endCombat: (playerId: string): { health: number; magicka: number } | null => {
  let finalState: { health: number; magicka: number } | null = null

  update((state) => {
    const session = state[playerId]
    if (session) {
      finalState = {
        health: session.currentHP,
        magicka: session.currentMP,
      }
    }
    const newState = { ...state }
    delete newState[playerId]
    return newState
  })

  return finalState
}
```

**Step 3: Verify changes compile**

Run: `npm run check 2>&1 | grep -E "(combat\.store|error)" | head -20`

Expected: Type errors for callers of startCombat/endCombat (we'll fix those next)

---

## Task 2: Update CombatMode to Use New Sync API

**Files:**
- Modify: `src/lib/components/combat/CombatMode.svelte`

**Step 1: Update handleCombatStarted to pass player data**

Find the `handleCombatStarted` function and update it:

```typescript
// Change from something like:
function handleCombatStarted(event: CustomEvent<{ partyInitiative: number; enemyInitiative: number }>) {
  const { partyInitiative, enemyInitiative } = event.detail
  combatStore.startCombat(
    player.id,
    partyInitiative,
    enemyInitiative,
    player.health,
    player.magicka,
    player.actionPoints
  )
}

// Change to:
function handleCombatStarted(event: CustomEvent<{ partyInitiative: number; enemyInitiative: number }>) {
  const { partyInitiative, enemyInitiative } = event.detail
  combatStore.startCombat(
    player.id,
    partyInitiative,
    enemyInitiative,
    {
      health: player.health,
      magicka: player.magicka,
      maxActionPoints: player.maxActionPoints,
    }
  )
}
```

**Step 2: Update handleCombatEnded to sync back and emit event**

```typescript
// Change from:
function handleCombatEnded() {
  combatStore.endCombat(player.id)
  showEndCombatModal = false
}

// Change to:
import { createEventDispatcher } from 'svelte'

const dispatch = createEventDispatcher<{
  combatEnded: { health: number; magicka: number }
}>()

function handleCombatEnded() {
  const finalState = combatStore.endCombat(player.id)
  showEndCombatModal = false

  if (finalState) {
    dispatch('combatEnded', finalState)
  }
}
```

**Step 3: Verify changes compile**

Run: `npm run check 2>&1 | grep -E "(CombatMode|error)" | head -20`

Expected: No errors in CombatMode.svelte

---

## Task 3: Update Character Page to Handle Combat Sync

**Files:**
- Modify: `src/routes/[id]/+page.svelte`

**Step 1: Add combat end handler that updates player**

Find where `<CombatMode>` is rendered and add the event handler:

```typescript
// Add this function near other handlers (around line 40):
function handleCombatEnded(event: CustomEvent<{ health: number; magicka: number }>) {
  const { health, magicka } = event.detail
  updatePlayer({
    health,
    magicka,
  })
}
```

**Step 2: Wire up the event in the template**

```svelte
<!-- Change from: -->
<CombatMode {player} />

<!-- Change to: -->
<CombatMode {player} on:combatEnded={handleCombatEnded} />
```

**Step 3: Verify changes compile**

Run: `npm run check 2>&1 | grep -E "(\[id\]|error)" | head -20`

Expected: No new errors

---

## Task 4: Redesign Mode UI - Combat as Sub-Mode of Playing

**Files:**
- Modify: `src/routes/[id]/+page.svelte`

**Step 1: Change ViewMode type and add combat state**

```typescript
// Change from:
type ViewMode = 'playing' | 'editing' | 'combat'
let viewMode: ViewMode = 'playing'

// Change to:
type ViewMode = 'playing' | 'editing'
let viewMode: ViewMode = 'playing'

// The isInCombat store already exists, we'll use it to show combat UI within playing mode
```

**Step 2: Update the RadioGroup to only show Playing and Editing**

Find the RadioGroup (around line 116-146) and simplify:

```svelte
<RadioGroup>
  <RadioItem bind:group={viewMode} name="mode" value="playing">
    <span class="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      Playing
      {#if $isInCombat}
        <span class="badge variant-filled-warning text-xs">In Combat</span>
      {/if}
    </span>
  </RadioItem>
  <RadioItem bind:group={viewMode} name="mode" value="editing">
    <span class="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      GM Mode
    </span>
  </RadioItem>
</RadioGroup>
```

**Step 3: Update the content rendering logic**

```svelte
<!-- Change the main content area from checking viewMode === 'combat' to checking isInCombat within playing -->

{#if viewMode === 'playing'}
  {#if $isInCombat}
    <CombatMode {player} on:combatEnded={handleCombatEnded} />
  {:else}
    <CharacterSheet {player} on:update={handlePlayerUpdate} showResourceControls={true} />

    <!-- Enter Combat Button -->
    <div class="mt-6">
      <button
        type="button"
        class="btn variant-filled-warning w-full"
        on:click={() => showEnterCombatModal = true}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Enter Combat
      </button>
    </div>
  {/if}
{:else if viewMode === 'editing'}
  <!-- Admin/GM editing mode -->
  <div class="card p-4 variant-soft-warning mb-4">
    <p class="text-sm">
      <strong>GM Mode:</strong> Use this mode to manually adjust character stats for homebrew rules or to fix mistakes.
    </p>
  </div>
  <CharacterSheet {player} on:update={handlePlayerUpdate} editMode={true} />

  <!-- Existing skill selection and other edit panels... -->
{/if}
```

**Step 4: Add EnterCombatModal import and state (if not already present at page level)**

```typescript
import EnterCombatModal from '$lib/components/combat/EnterCombatModal.svelte'

let showEnterCombatModal = false

function handleEnterCombatFromPage(event: CustomEvent<{ partyInitiative: number; enemyInitiative: number }>) {
  const { partyInitiative, enemyInitiative } = event.detail
  combatStore.startCombat(
    player.id,
    partyInitiative,
    enemyInitiative,
    {
      health: player.health,
      magicka: player.magicka,
      maxActionPoints: player.maxActionPoints,
    }
  )
  showEnterCombatModal = false
}
```

Add the modal to the template:

```svelte
{#if showEnterCombatModal}
  <EnterCombatModal
    {player}
    on:confirm={handleEnterCombatFromPage}
    on:cancel={() => showEnterCombatModal = false}
  />
{/if}
```

---

## Task 5: Add Resource Controls to CharacterSheet for Playing Mode

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte`

**Step 1: Add showResourceControls prop**

```typescript
// Add to the props (around line 10-15):
export let showResourceControls: boolean = false
```

**Step 2: Add resource adjustment functions**

```typescript
// Add these functions (around line 50):
function adjustHealth(delta: number) {
  const newHealth = Math.max(0, Math.min(player.maxHealth, player.health + delta))
  if (newHealth !== player.health) {
    dispatch('update', { ...player, health: newHealth })
  }
}

function adjustMagicka(delta: number) {
  const newMagicka = Math.max(0, Math.min(player.maxMagicka, player.magicka + delta))
  if (newMagicka !== player.magicka) {
    dispatch('update', { ...player, magicka: newMagicka })
  }
}
```

**Step 3: Add +/- buttons to Health and Magicka cards**

Find the Health card (around line 195-220) and add controls:

```svelte
<!-- Health Card -->
<div class="card p-4 variant-soft-error">
  <div class="flex justify-between items-center mb-2">
    <h3 class="h4 font-bold text-error-700 dark:text-error-300">Health</h3>
    <div class="flex items-center gap-2">
      {#if showResourceControls}
        <button
          type="button"
          class="btn-icon btn-icon-sm variant-soft-error"
          on:click={() => adjustHealth(-1)}
          disabled={player.health <= 0}
        >
          -
        </button>
      {/if}
      <span class="text-xl font-bold">{player.health} / {player.maxHealth}</span>
      {#if showResourceControls}
        <button
          type="button"
          class="btn-icon btn-icon-sm variant-soft-error"
          on:click={() => adjustHealth(1)}
          disabled={player.health >= player.maxHealth}
        >
          +
        </button>
      {/if}
    </div>
  </div>
  <!-- Progress bar... -->
</div>
```

Apply same pattern to Magicka card. Do NOT add controls to Action Points (AP resets each turn in combat).

---

## Task 6: Clean Up Legacy Combat Tab References

**Files:**
- Modify: `src/routes/[id]/+page.svelte`

**Step 1: Remove 'combat' from ViewMode references**

Search for any remaining `viewMode === 'combat'` checks and remove them.

**Step 2: Remove the old Combat tab RadioItem**

Ensure the third RadioItem for Combat is fully removed from the RadioGroup.

**Step 3: Update editMode computed variable**

```typescript
// Change from:
$: editMode = viewMode === 'editing'

// This is fine, but ensure it's not checking for 'combat' anywhere
```

**Step 4: Verify no TypeScript errors**

Run: `npm run check`

Expected: Clean compile with no errors related to ViewMode

---

## Task 7: Test Full Combat Flow

**Manual Testing Steps:**

1. **Start app**: `npm run dev`
2. **Navigate to a character**: Click on an existing character
3. **Verify Playing mode**: Should see CharacterSheet with +/- buttons on Health and Magicka
4. **Test resource adjustment**: Click - on Health, verify it decreases and persists on refresh
5. **Enter combat**: Click "Enter Combat" button, roll initiative
6. **Verify combat state**: Should show CombatMode with HP matching the adjusted value from step 4
7. **Take damage in combat**: Use an action or manually adjust HP in combat
8. **End combat**: Click End Combat, confirm
9. **Verify sync back**: HP in Playing mode should match final combat HP
10. **Test GM Mode**: Switch to GM Mode, verify full editing capabilities
11. **Refresh page**: Verify all changes persisted

---

## Task 8: Update Component Exports (if needed)

**Files:**
- Check: `src/lib/components/combat/index.ts`

**Step 1: Ensure EnterCombatModal is exported**

If there's an index.ts barrel file, ensure EnterCombatModal is exported for use in the page:

```typescript
export { default as EnterCombatModal } from './EnterCombatModal.svelte'
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/lib/stores/combat.store.ts` | Modified `startCombat()` to accept playerData object, `endCombat()` returns final state |
| `src/lib/components/combat/CombatMode.svelte` | Updated to use new API, emits `combatEnded` event with final HP/MP |
| `src/routes/[id]/+page.svelte` | Removed Combat tab, Combat is now sub-state of Playing, handles sync on combat end |
| `src/lib/components/CharacterSheet.svelte` | Added `showResourceControls` prop, +/- buttons for HP/MP in Playing mode |

## Architecture Diagram (After)

```
CHARACTER PAGE (/[id])
    ↓
MODE SELECTION (Playing / GM Mode)
    ↓
┌─────────────────────────────────────────────────────────────┐
│ PLAYING MODE                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ NOT IN COMBAT                    │ IN COMBAT            │ │
│ │ ┌───────────────────────────┐   │ ┌──────────────────┐ │ │
│ │ │ CharacterSheet            │   │ │ CombatMode       │ │ │
│ │ │ - Display stats           │   │ │ - Full combat UI │ │ │
│ │ │ - +/- HP/MP controls      │   │ │ - Uses player HP │ │ │
│ │ │ - "Enter Combat" button   │   │ │ - Syncs back     │ │ │
│ │ └───────────────────────────┘   │ └──────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                        ↕ sync                                │
│                 playersStore                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ GM MODE (Admin/Editing)                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CharacterSheet (editMode=true)                          │ │
│ │ - Full manual stat editing                              │ │
│ │ - Skill reassignment                                    │ │
│ │ - Equipment changes                                     │ │
│ │ - For homebrew/fixes only                               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```
