# Character Schema Versioning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a versioning system for character sheets that detects version mismatches and clears old data during pre-release development.

**Architecture:** Store a `schemaVersion` field in each character's `PlayerData`. On homepage load, check if any stored characters have a different version than the current app version. If mismatch detected, clear all characters and show a warning modal.

**Tech Stack:** SvelteKit, Svelte stores, Skeleton UI (modals/toasts), TypeScript, Zod

---

### Task 1: Create Version Constant File

**Files:**
- Create: `src/lib/version.ts`

**Step 1: Create the version file**

```typescript
/**
 * Character schema version - bump this when PlayerData structure changes
 *
 * TODO [v1.0.0]: Replace deletion logic in persisted.store.ts with proper
 * per-character migration functions. Currently we wipe all characters on
 * version mismatch during pre-release development.
 */
export const CHARACTER_SCHEMA_VERSION = '0.1.0'
```

**Step 2: Verify file created**

Run: `cat src/lib/version.ts`
Expected: File contents displayed

---

### Task 2: Add schemaVersion to PlayerData Type

**Files:**
- Modify: `src/lib/models/player.ts:29-53`

**Step 1: Add schemaVersion field to PlayerData type**

Add `schemaVersion: string` field to the `PlayerData` type after the `id` field:

```typescript
export type PlayerData = {
	id: string
	schemaVersion: string
	level: number
	// ... rest of fields unchanged
}
```

**Step 2: Add schemaVersion to defaultPlayerData**

Import the version constant and add to defaults:

```typescript
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'

// In defaultPlayerData, add after id is omitted:
export const defaultPlayerData: Omit<PlayerData, 'id'> = {
	schemaVersion: CHARACTER_SCHEMA_VERSION,
	level: 1,
	// ... rest unchanged
}
```

**Step 3: Verify TypeScript compiles**

Run: `npm run check`
Expected: Type errors in files that create PlayerData without schemaVersion (this is expected, we'll fix in subsequent tasks)

---

### Task 3: Add schemaVersion to Zod Schema

**Files:**
- Modify: `src/lib/schema/player.schema.ts`

**Step 1: Import version constant**

Add import at top of file:

```typescript
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'
```

**Step 2: Add schemaVersion to playerSchema**

Add to the schema object (after existing fields):

```typescript
export const playerSchema = z
	.object({
		characterName: z.string().min(1).default('John Scrolls'),
		// ... existing fields ...
		notes: z.string().default(''),
		// Add this:
		schemaVersion: z.string().default(CHARACTER_SCHEMA_VERSION),
	})
	// ... rest unchanged
```

---

### Task 4: Stamp New Characters with Version

**Files:**
- Modify: `src/routes/create/+page.server.ts:25-50`

**Step 1: Import version constant**

Add import at top:

```typescript
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'
```

**Step 2: Add schemaVersion when creating new player**

In the `newPlayer` object creation, add `schemaVersion` after `id`:

```typescript
const newPlayer: PlayerData = {
	// Spread form data first
	...form.data,
	// Then override with computed/default values
	id: crypto.randomUUID(),
	schemaVersion: CHARACTER_SCHEMA_VERSION,
	level: 1,
	// ... rest unchanged
}
```

---

### Task 5: Add Version Check and Reset Logic to Store

**Files:**
- Modify: `src/lib/stores/persisted.store.ts`

**Step 1: Import version constant**

Add import at top:

```typescript
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'
```

**Step 2: Create versionResetOccurred store**

Add after imports:

```typescript
/**
 * Flag indicating whether characters were cleared due to version mismatch.
 * Homepage subscribes to this to show warning modal.
 */
export const versionResetOccurred = writable<boolean>(false)
```

**Step 3: Update loadPlayers with version check**

Replace the existing `loadPlayers` function:

```typescript
// Load and migrate player data from localStorage
function loadPlayers(): Record<string, PlayerData> {
	if (!browser) return {}

	const raw = JSON.parse(localStorage.getItem('players') ?? '{}') as Record<string, PlayerData>

	// TODO [v1.0.0]: Replace this deletion logic with proper per-character migrations.
	// Currently we wipe all characters on version mismatch during pre-release development.
	// When we reach v1.0.0, implement migration functions that upgrade character data
	// from older schema versions to the current version instead of deleting.
	const hasVersionMismatch = Object.values(raw).some(
		(player) => player.schemaVersion !== CHARACTER_SCHEMA_VERSION
	)

	if (hasVersionMismatch && Object.keys(raw).length > 0) {
		// Clear localStorage and signal reset occurred
		localStorage.removeItem('players')
		versionResetOccurred.set(true)
		return {}
	}

	// Migrate each player's data to the latest format
	return Object.fromEntries(
		Object.entries(raw).map(([id, player]) => [id, migratePlayerData(player)])
	)
}
```

**Step 4: Verify store compiles**

Run: `npm run check`
Expected: No errors in persisted.store.ts

---

### Task 6: Add Warning Modal to Homepage

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Import versionResetOccurred store**

Update the imports:

```typescript
import { playersStore, versionResetOccurred } from '$lib/stores/persisted.store'
```

**Step 2: Add onMount and modal state**

Add after existing imports:

```typescript
import { onMount } from 'svelte'

let showVersionWarning = false

onMount(() => {
	if ($versionResetOccurred) {
		showVersionWarning = true
	}
})

function dismissVersionWarning() {
	showVersionWarning = false
	versionResetOccurred.set(false)
}
```

**Step 3: Add warning modal markup**

Add before the closing `</div>` of the container:

```svelte
<!-- Version Reset Warning Modal -->
{#if showVersionWarning}
	<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
		<div class="card p-6 max-w-md w-full space-y-4 variant-filled-warning">
			<h3 class="h3">Characters Reset</h3>
			<p>
				Your saved characters were created with an older version and have been removed.
				Please create new characters.
			</p>
			<div class="flex justify-end">
				<button
					class="btn variant-filled"
					on:click={dismissVersionWarning}
				>
					OK
				</button>
			</div>
		</div>
	</div>
{/if}
```

---

### Task 7: Update Export Utility Version

**Files:**
- Modify: `src/lib/util/export.util.ts:1-6`

**Step 1: Replace hardcoded version with import**

Change:

```typescript
import type { PlayerData } from '$lib/models/player'

/**
 * Current app version for export format migration support
 */
export const APP_VERSION = '1.0.0'
```

To:

```typescript
import type { PlayerData } from '$lib/models/player'
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'

/**
 * Current app version for export format migration support
 */
export const APP_VERSION = CHARACTER_SCHEMA_VERSION
```

---

### Task 8: Update Import Utility Version Compatibility

**Files:**
- Modify: `src/lib/util/import.util.ts:168-177`

**Step 1: Update isCompatibleVersion function**

Change the version compatibility check to accept `0.x.x`:

```typescript
/**
 * Validate version compatibility
 * Currently accepts version 0.x.x (pre-release)
 *
 * TODO [v1.0.0]: Update to accept 1.x.x when releasing
 */
function isCompatibleVersion(version: string): boolean {
	if (typeof version !== 'string') {
		return false
	}

	const [major] = version.split('.')
	// Accept version 0.x.x for pre-release
	return major === '0'
}
```

**Step 2: Update error message**

In `validateImport` function, update the error message around line 205:

```typescript
if (!isCompatibleVersion(obj.version)) {
	return {
		success: false,
		error: `Incompatible version: ${obj.version}. Expected version 0.x.x`,
	}
}
```

---

### Task 9: Verify Full Build and Test

**Step 1: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Manual test (if dev server available)**

1. Start dev server: `npm run dev`
2. Create a character
3. Verify character has `schemaVersion: "0.1.0"` in localStorage (DevTools > Application > Local Storage)
4. Manually edit localStorage to change schemaVersion to `"0.0.1"`
5. Refresh page
6. Verify warning modal appears
7. Click OK
8. Verify characters are cleared

---

### Task 10: Commit Changes

**Step 1: Stage all changed files**

```bash
git add src/lib/version.ts \
  src/lib/models/player.ts \
  src/lib/schema/player.schema.ts \
  src/lib/stores/persisted.store.ts \
  src/routes/create/+page.server.ts \
  src/routes/+page.svelte \
  src/lib/util/export.util.ts \
  src/lib/util/import.util.ts \
  docs/plans/2026-01-26-character-schema-versioning.md
```

**Step 2: Commit**

```bash
git commit -m "feat: add character schema versioning system (v0.1.0)

- Add CHARACTER_SCHEMA_VERSION constant in src/lib/version.ts
- Add schemaVersion field to PlayerData type
- Clear characters and show warning on version mismatch
- TODO markers for v1.0.0 migration implementation"
```
