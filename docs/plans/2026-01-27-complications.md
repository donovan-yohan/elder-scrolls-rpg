# Complications System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Complications system - cumulative wounds taken when HP drops to 0 and a spirit point is spent. Complications reduce stat maximums (HP/AP/MP) or damage equipment until healed/repaired.

**Game Rules Reference (from docs/Game Flow Rules (1).md):**
- Complications are cumulative wounds that are difficult to heal
- Triggered when HP drops to 0 and spirit point is spent
- Roll 1d10 to determine complication type:
  - 1-3: reduce HP maximum by one
  - 4-6: reduce AP maximum by one
  - 7-9: reduce MP maximum by one
  - 10: a piece of readied/equipped equipment becomes damaged until fixed
- After spirit point spent, HP/MP/AP reset to their new maximums

**Architecture:**
- Complications are stored on PlayerData (persistent across sessions) NOT CombatSession
- Stat maximum modifiers (hpMaxMod, apMaxMod, mpMaxMod) are negative values subtracted from calculated maximums
- Equipment damage is tracked via a `damagedEquipment` array of slot identifiers
- ComplicationRollModal handles the d10 roll flow with equipment selection for result 10
- Spirit point spending triggers complication flow when HP reaches 0

**Tech Stack:** Svelte 5 ($props, $state, $derived), Skeleton UI, TypeScript, existing DiceRoller patterns

---

## Task 1: Update Data Models

**Files:**
- Modify: `src/lib/models/player.ts`
- Modify: `src/lib/version.ts`
- Modify: `src/lib/util/migration.util.ts`

### Step 1.1: Add complication fields to PlayerData

Modify `src/lib/models/player.ts` to add complication tracking fields:

```typescript
// Add after OwnedWeapon interface (around line 16)
export interface Complication {
	id: string
	type: 'hp' | 'ap' | 'mp' | 'equipment'
	equipmentSlot?: 'weapon' | 'offhand' | 'armor' // Only for equipment type
	timestamp: string
}
```

Add to PlayerData type (after `notes: string`):

```typescript
export type PlayerData = {
	// ... existing fields ...
	notes: string
	spiritPoints: number
	maxSpiritPoints: number
	complications: Complication[]
	createdAt: string
	updatedAt: string
}
```

Update defaultPlayerData (add after `notes: ''`):

```typescript
export const defaultPlayerData: Omit<PlayerData, 'id'> = {
	// ... existing fields ...
	notes: '',
	spiritPoints: 1,
	maxSpiritPoints: 1,
	complications: [],
	createdAt: '',
	updatedAt: '',
}
```

### Step 1.2: Bump schema version

Modify `src/lib/version.ts`:

```typescript
export const CHARACTER_SCHEMA_VERSION = '0.2.0'
```

### Step 1.3: Add migration for new fields

Modify `src/lib/util/migration.util.ts` to handle existing characters:

Add after the existing migratePlayerData function body (before the return):

```typescript
// Migrate full player data
export function migratePlayerData(player: PlayerData): PlayerData {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const playerAny = player as any

	// Migrate ownedWeapons - add empty array if missing
	const ownedWeapons = playerAny.ownedWeapons ?? []

	// Migrate spirit points - add defaults if missing
	const maxSpiritPoints = playerAny.maxSpiritPoints ?? Math.max(1, Math.floor((playerAny.level ?? 1) / 4))
	const spiritPoints = playerAny.spiritPoints ?? maxSpiritPoints

	// Migrate complications - add empty array if missing
	const complications = playerAny.complications ?? []

	return {
		...player,
		equipment: migratePlayerEquipment(player.equipment as Equipment | LegacyEquipment),
		ownedWeapons,
		spiritPoints,
		maxSpiritPoints,
		complications,
	}
}
```

### Step 1.4: Run build to verify types

Run: `npm run build 2>&1 | head -50`
Expected: May have errors from components not passing new required props - that's expected, we'll fix in later tasks.

### Step 1.5: Commit

```bash
git add src/lib/models/player.ts src/lib/version.ts src/lib/util/migration.util.ts
git commit -m "feat: add complication and spirit point fields to PlayerData

- Add Complication interface with type and equipment slot tracking
- Add spiritPoints, maxSpiritPoints, and complications to PlayerData
- Bump schema version to 0.2.0
- Add migration for existing characters

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Stat Calculation Utilities

**Files:**
- Modify: `src/lib/util/stats.util.ts`

### Step 2.1: Add complication-aware stat calculations

Add to `src/lib/util/stats.util.ts` after the existing calculateMaxHealth function:

```typescript
/**
 * Calculate spirit points based on level.
 * Formula: floor(level / 4), minimum 1
 */
export function calculateMaxSpiritPoints(level: number): number {
	return Math.max(1, Math.floor(level / 4))
}

/**
 * Count complications by type for a player.
 */
export function countComplications(complications: Complication[]): {
	hp: number
	ap: number
	mp: number
	equipment: number
} {
	return complications.reduce(
		(acc, c) => {
			acc[c.type]++
			return acc
		},
		{ hp: 0, ap: 0, mp: 0, equipment: 0 }
	)
}

/**
 * Calculate effective max health after complications.
 */
export function calculateEffectiveMaxHealth(player: PlayerData): number {
	const baseMax = calculateMaxHealth(player)
	const hpComplications = player.complications.filter(c => c.type === 'hp').length
	return Math.max(1, baseMax - hpComplications)
}

/**
 * Calculate effective max magicka after complications.
 */
export function calculateEffectiveMaxMagicka(player: PlayerData): number {
	const baseMax = calculateMaxMagicka(player)
	const mpComplications = player.complications.filter(c => c.type === 'mp').length
	return Math.max(0, baseMax - mpComplications)
}

/**
 * Calculate effective max AP after complications.
 */
export function calculateEffectiveMaxAP(player: PlayerData): number {
	const baseMax = calculateMaxAP(player)
	const apComplications = player.complications.filter(c => c.type === 'ap').length
	return Math.max(1, baseMax - apComplications)
}

/**
 * Check if an equipment slot is damaged.
 */
export function isEquipmentDamaged(
	complications: Complication[],
	slot: 'weapon' | 'offhand' | 'armor'
): boolean {
	return complications.some(c => c.type === 'equipment' && c.equipmentSlot === slot)
}

/**
 * Get all damaged equipment slots.
 */
export function getDamagedEquipmentSlots(complications: Complication[]): ('weapon' | 'offhand' | 'armor')[] {
	return complications
		.filter(c => c.type === 'equipment' && c.equipmentSlot)
		.map(c => c.equipmentSlot as 'weapon' | 'offhand' | 'armor')
}
```

Add the import at the top:

```typescript
import type { PlayerData } from '$lib/models/player'
import type { Complication } from '$lib/models/player'
```

### Step 2.2: Update calculateAllStats to include effective values

Modify the existing calculateAllStats function:

```typescript
/**
 * Calculate all derived stats for a player.
 * Convenience function that returns all calculated max stats.
 * Includes both base and effective (after complications) values.
 */
export function calculateAllStats(player: PlayerData): {
	maxHealth: number
	maxMagicka: number
	maxAP: number
	effectiveMaxHealth: number
	effectiveMaxMagicka: number
	effectiveMaxAP: number
	maxSpiritPoints: number
} {
	return {
		maxHealth: calculateMaxHealth(player),
		maxMagicka: calculateMaxMagicka(player),
		maxAP: calculateMaxAP(player),
		effectiveMaxHealth: calculateEffectiveMaxHealth(player),
		effectiveMaxMagicka: calculateEffectiveMaxMagicka(player),
		effectiveMaxAP: calculateEffectiveMaxAP(player),
		maxSpiritPoints: calculateMaxSpiritPoints(player.level),
	}
}
```

### Step 2.3: Run build to verify

Run: `npm run build 2>&1 | head -50`

### Step 2.4: Commit

```bash
git add src/lib/util/stats.util.ts
git commit -m "feat: add complication-aware stat calculation utilities

- Add calculateMaxSpiritPoints for spirit point calculation
- Add effective max calculations that subtract complications
- Add helpers for checking/listing damaged equipment
- Update calculateAllStats to include effective values

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create ComplicationRollModal

**Files:**
- Create: `src/lib/components/combat/modals/ComplicationRollModal.svelte`

### Step 3.1: Create the ComplicationRollModal component

Create file `src/lib/components/combat/modals/ComplicationRollModal.svelte`:

```svelte
<script lang="ts">
	import type { PlayerData, Equipment, Complication } from '$lib/models/player'
	import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton'

	interface Props {
		isOpen: boolean
		player: PlayerData
		equipment: Equipment
		onComplete: (complication: Complication) => void
		onCancel: () => void
	}

	let { isOpen, player, equipment, onComplete, onCancel }: Props = $props()

	type RollMode = 'digital' | 'manual'
	let mode: RollMode = $state('digital')

	type Step = 'roll' | 'equipment-select' | 'result'
	let step = $state<Step>('roll')

	let rollValue = $state<number | null>(null)
	let manualInput = $state('')
	let isRolling = $state(false)
	let selectedEquipmentSlot = $state<'weapon' | 'offhand' | 'armor' | null>(null)

	// Determine complication type from roll
	let complicationType = $derived.by(() => {
		if (rollValue === null) return null
		if (rollValue >= 1 && rollValue <= 3) return 'hp'
		if (rollValue >= 4 && rollValue <= 6) return 'ap'
		if (rollValue >= 7 && rollValue <= 9) return 'mp'
		if (rollValue === 10) return 'equipment'
		return null
	})

	// Get available equipment slots for damage
	let availableSlots = $derived.by(() => {
		const slots: { slot: 'weapon' | 'offhand' | 'armor'; name: string; equipped: boolean }[] = []

		if (equipment.weapon.id) {
			slots.push({ slot: 'weapon', name: 'Main Weapon', equipped: true })
		}
		if (equipment.offhand.id) {
			slots.push({ slot: 'offhand', name: 'Off-Hand', equipped: true })
		}
		if (equipment.armor.id) {
			slots.push({ slot: 'armor', name: 'Armor', equipped: true })
		}

		return slots
	})

	async function handleDigitalRoll() {
		if (isRolling) return
		isRolling = true

		// Brief animation delay
		await new Promise(r => setTimeout(r, 500))

		// Roll 1d10
		rollValue = Math.floor(Math.random() * 10) + 1
		isRolling = false

		if (rollValue === 10 && availableSlots.length > 0) {
			step = 'equipment-select'
		} else if (rollValue === 10 && availableSlots.length === 0) {
			// No equipment to damage - reroll to 1-9
			rollValue = Math.floor(Math.random() * 9) + 1
			step = 'result'
		} else {
			step = 'result'
		}
	}

	function handleManualSubmit() {
		const value = parseInt(manualInput)
		if (isNaN(value) || value < 1 || value > 10) return

		rollValue = value

		if (rollValue === 10 && availableSlots.length > 0) {
			step = 'equipment-select'
		} else if (rollValue === 10 && availableSlots.length === 0) {
			// No equipment - treat as reroll needed
			rollValue = null
			step = 'roll'
		} else {
			step = 'result'
		}
	}

	function handleEquipmentSelect(slot: 'weapon' | 'offhand' | 'armor') {
		selectedEquipmentSlot = slot
		step = 'result'
	}

	function handleConfirm() {
		if (complicationType === null) return

		const complication: Complication = {
			id: crypto.randomUUID(),
			type: complicationType as 'hp' | 'ap' | 'mp' | 'equipment',
			equipmentSlot: complicationType === 'equipment' ? selectedEquipmentSlot ?? undefined : undefined,
			timestamp: new Date().toISOString(),
		}

		onComplete(complication)
	}

	function resetState() {
		step = 'roll'
		rollValue = null
		manualInput = ''
		isRolling = false
		selectedEquipmentSlot = null
	}

	$effect(() => {
		if (!isOpen) resetState()
	})

	function getComplicationDescription(type: string | null): string {
		switch (type) {
			case 'hp': return 'Your maximum HP is reduced by 1.'
			case 'ap': return 'Your maximum AP is reduced by 1.'
			case 'mp': return 'Your maximum MP is reduced by 1.'
			case 'equipment': return 'A piece of your equipment becomes damaged.'
			default: return ''
		}
	}

	function getComplicationColor(type: string | null): string {
		switch (type) {
			case 'hp': return 'variant-filled-error'
			case 'ap': return 'variant-filled-warning'
			case 'mp': return 'variant-filled-primary'
			case 'equipment': return 'variant-filled-surface'
			default: return 'variant-filled'
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-md bg-surface-800">
			<header class="mb-4">
				<h2 class="h3 text-error-500 font-bold">Complication!</h2>
				<p class="text-sm opacity-75 mt-1">
					You've been reduced to 0 HP. Roll 1d10 to determine your complication.
				</p>
			</header>

			{#if step === 'roll'}
				<div class="space-y-4">
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

					<div class="card variant-soft-surface p-4 text-sm">
						<div class="font-semibold mb-2">Complication Table (1d10)</div>
						<div class="grid grid-cols-2 gap-2">
							<div><span class="badge variant-soft-error">1-3</span> -1 HP Max</div>
							<div><span class="badge variant-soft-warning">4-6</span> -1 AP Max</div>
							<div><span class="badge variant-soft-primary">7-9</span> -1 MP Max</div>
							<div><span class="badge variant-soft-surface">10</span> Equipment Damaged</div>
						</div>
					</div>

					{#if mode === 'digital'}
						<button
							type="button"
							class="btn variant-filled-error w-full"
							onclick={handleDigitalRoll}
							disabled={isRolling}
						>
							{#if isRolling}
								<span class="animate-spin mr-2">🎲</span> Rolling...
							{:else}
								🎲 Roll 1d10
							{/if}
						</button>
					{:else}
						<div class="flex gap-2">
							<input
								type="number"
								class="input flex-1"
								placeholder="Enter 1-10"
								min="1"
								max="10"
								bind:value={manualInput}
							/>
							<button
								type="button"
								class="btn variant-filled-error"
								onclick={handleManualSubmit}
								disabled={!manualInput}
							>
								Submit
							</button>
						</div>
					{/if}
				</div>

			{:else if step === 'equipment-select'}
				<div class="space-y-4">
					<div class="card variant-soft-warning p-4 text-center">
						<div class="text-2xl font-bold mb-2">Rolled: {rollValue}</div>
						<p class="text-sm">Equipment damage! Choose which item becomes damaged:</p>
					</div>

					<div class="space-y-2">
						{#each availableSlots as { slot, name }}
							<button
								type="button"
								class="btn variant-soft-surface w-full justify-start"
								onclick={() => handleEquipmentSelect(slot)}
							>
								<span class="font-semibold">{name}</span>
							</button>
						{/each}
					</div>
				</div>

			{:else if step === 'result'}
				<div class="space-y-4">
					<div class="card variant-soft-error p-4 text-center">
						<div class="text-4xl font-bold mb-2">{rollValue}</div>
						<span class="badge {getComplicationColor(complicationType)} text-lg px-4 py-2">
							{#if complicationType === 'hp'}
								-1 HP Maximum
							{:else if complicationType === 'ap'}
								-1 AP Maximum
							{:else if complicationType === 'mp'}
								-1 MP Maximum
							{:else if complicationType === 'equipment'}
								Equipment Damaged
							{/if}
						</span>
					</div>

					<div class="card variant-ghost-surface p-4">
						<p class="text-sm">{getComplicationDescription(complicationType)}</p>
						{#if complicationType === 'equipment' && selectedEquipmentSlot}
							<p class="text-sm mt-2 font-semibold">
								Damaged: {selectedEquipmentSlot === 'weapon' ? 'Main Weapon' : selectedEquipmentSlot === 'offhand' ? 'Off-Hand' : 'Armor'}
							</p>
						{/if}
						<p class="text-xs mt-2 opacity-75">
							This complication persists until healed through rest or medical treatment.
						</p>
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						onclick={handleConfirm}
					>
						Apply Complication
					</button>
				</div>
			{/if}

			<footer class="flex justify-end mt-4">
				{#if step === 'roll'}
					<button type="button" class="btn variant-ghost" onclick={onCancel}>
						Cancel
					</button>
				{/if}
			</footer>
		</div>
	</div>
{/if}
```

### Step 3.2: Run build to verify

Run: `npm run build 2>&1 | head -30`

### Step 3.3: Commit

```bash
git add src/lib/components/combat/modals/ComplicationRollModal.svelte
git commit -m "feat: create ComplicationRollModal for complication rolls

- Support digital and manual d10 roll modes
- Show complication table reference
- Equipment selection step for roll of 10
- Clear result display with complication type

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create SpiritPointsTracker Component

**Files:**
- Create: `src/lib/components/combat/SpiritPointsTracker.svelte`

### Step 4.1: Create the SpiritPointsTracker component

Create file `src/lib/components/combat/SpiritPointsTracker.svelte`:

```svelte
<script lang="ts">
	interface Props {
		current: number
		max: number
		onSpend?: () => void
		disabled?: boolean
	}

	let { current, max, onSpend, disabled = false }: Props = $props()

	let canSpend = $derived(current > 0 && !disabled)
</script>

<div class="spirit-tracker card p-4 variant-soft-secondary">
	<div class="flex justify-between items-center mb-2">
		<h4 class="font-bold text-secondary-700 dark:text-secondary-300">Spirit Points</h4>
		<span class="text-lg font-bold">{current} / {max}</span>
	</div>

	<div class="flex gap-1 mb-3">
		{#each Array(max) as _, i}
			<div
				class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
				class:bg-secondary-500={i < current}
				class:bg-surface-500/30={i >= current}
			>
				{#if i < current}
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
					</svg>
				{/if}
			</div>
		{/each}
	</div>

	{#if onSpend}
		<button
			type="button"
			class="btn btn-sm variant-filled-secondary w-full"
			onclick={onSpend}
			disabled={!canSpend}
		>
			{#if canSpend}
				Spend Spirit Point (Revive)
			{:else if current === 0}
				No Spirit Points Remaining
			{:else}
				Cannot Spend
			{/if}
		</button>
	{/if}

	<p class="text-xs opacity-75 mt-2">
		Spend when HP reaches 0 to revive with a complication.
	</p>
</div>
```

### Step 4.2: Run build to verify

Run: `npm run build 2>&1 | head -20`

### Step 4.3: Commit

```bash
git add src/lib/components/combat/SpiritPointsTracker.svelte
git commit -m "feat: create SpiritPointsTracker component

- Visual display of spirit points as filled/empty circles
- Spend button with disabled states
- Help text explaining spirit point usage

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create ComplicationsDisplay Component

**Files:**
- Create: `src/lib/components/combat/ComplicationsDisplay.svelte`

### Step 5.1: Create the ComplicationsDisplay component

Create file `src/lib/components/combat/ComplicationsDisplay.svelte`:

```svelte
<script lang="ts">
	import type { Complication, Equipment } from '$lib/models/player'
	import { Weapons } from '$lib/data/weapons'
	import { ArmorTypes } from '$lib/data/armor'

	interface Props {
		complications: Complication[]
		equipment: Equipment
		onHeal?: (complicationId: string) => void
	}

	let { complications, equipment, onHeal }: Props = $props()

	// Count complications by type
	let hpReduction = $derived(complications.filter(c => c.type === 'hp').length)
	let apReduction = $derived(complications.filter(c => c.type === 'ap').length)
	let mpReduction = $derived(complications.filter(c => c.type === 'mp').length)
	let equipmentDamage = $derived(complications.filter(c => c.type === 'equipment'))

	function getEquipmentName(slot: 'weapon' | 'offhand' | 'armor' | undefined): string {
		if (!slot) return 'Unknown'

		switch (slot) {
			case 'weapon':
				const weaponId = equipment.weapon.id
				return weaponId ? (Weapons[weaponId]?.name ?? 'Weapon') : 'Weapon'
			case 'offhand':
				const offhandId = equipment.offhand.id
				return offhandId ? (Weapons[offhandId]?.name ?? 'Off-Hand') : 'Off-Hand'
			case 'armor':
				const armorId = equipment.armor.id
				return armorId ? (ArmorTypes[armorId]?.name ?? 'Armor') : 'Armor'
		}
	}

	function getComplicationLabel(c: Complication): string {
		switch (c.type) {
			case 'hp': return '-1 HP Max'
			case 'ap': return '-1 AP Max'
			case 'mp': return '-1 MP Max'
			case 'equipment': return `${getEquipmentName(c.equipmentSlot)} Damaged`
		}
	}

	function getComplicationColor(type: string): string {
		switch (type) {
			case 'hp': return 'variant-filled-error'
			case 'ap': return 'variant-filled-warning'
			case 'mp': return 'variant-filled-primary'
			case 'equipment': return 'variant-filled-surface'
			default: return 'variant-filled'
		}
	}

	function formatDate(timestamp: string): string {
		return new Date(timestamp).toLocaleDateString()
	}
</script>

<div class="complications-display">
	{#if complications.length === 0}
		<p class="text-surface-500 text-sm italic">No active complications</p>
	{:else}
		<!-- Summary -->
		<div class="flex flex-wrap gap-2 mb-3">
			{#if hpReduction > 0}
				<span class="badge variant-filled-error">HP: -{hpReduction}</span>
			{/if}
			{#if apReduction > 0}
				<span class="badge variant-filled-warning">AP: -{apReduction}</span>
			{/if}
			{#if mpReduction > 0}
				<span class="badge variant-filled-primary">MP: -{mpReduction}</span>
			{/if}
			{#if equipmentDamage.length > 0}
				<span class="badge variant-filled-surface">{equipmentDamage.length} Damaged Item(s)</span>
			{/if}
		</div>

		<!-- Detailed list -->
		<div class="space-y-2">
			{#each complications as complication}
				<div class="flex items-center justify-between p-2 rounded bg-surface-500/10">
					<div class="flex items-center gap-2">
						<span class="badge {getComplicationColor(complication.type)}">
							{getComplicationLabel(complication)}
						</span>
						<span class="text-xs opacity-50">{formatDate(complication.timestamp)}</span>
					</div>
					{#if onHeal}
						<button
							type="button"
							class="btn btn-sm variant-soft-success"
							onclick={() => onHeal(complication.id)}
							title="Heal this complication"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
							</svg>
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
```

### Step 5.2: Run build to verify

Run: `npm run build 2>&1 | head -20`

### Step 5.3: Commit

```bash
git add src/lib/components/combat/ComplicationsDisplay.svelte
git commit -m "feat: create ComplicationsDisplay component

- Summary badges showing stat reductions
- Detailed list of each complication with date
- Optional heal button for removing complications

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Integrate Spirit Points and Complications into CombatMode

**Files:**
- Modify: `src/lib/components/combat/CombatMode.svelte`
- Modify: `src/lib/stores/combat.store.ts`

### Step 6.1: Add spirit point and complication handling to combat store

Modify `src/lib/stores/combat.store.ts` to add helper for detecting HP reaching 0:

After the `heal` function, add:

```typescript
/**
 * Check if damage would reduce HP to 0 or below
 */
checkLethalDamage: (playerId: string, damage: number): boolean => {
	const session = get({ subscribe })[playerId]
	if (!session) return false
	return session.currentHP - damage <= 0
},
```

### Step 6.2: Update CombatMode to handle spirit points and complications

Modify `src/lib/components/combat/CombatMode.svelte`:

Add imports at the top:

```typescript
import ComplicationRollModal from './modals/ComplicationRollModal.svelte'
import SpiritPointsTracker from './SpiritPointsTracker.svelte'
import ComplicationsDisplay from './ComplicationsDisplay.svelte'
import type { Complication } from '$lib/models/player'
import { calculateEffectiveMaxHealth, calculateEffectiveMaxMagicka, calculateEffectiveMaxAP } from '$lib/util/stats.util'
```

Add state variables (after the existing modal states around line 58):

```typescript
// Complication modal state
let showComplicationModal = $state(false)
let pendingDamageAmount = $state(0)
```

Add derived values for effective stats (after the hasShieldEquipped derived):

```typescript
// Effective max stats after complications
let effectiveMaxHP = $derived(calculateEffectiveMaxHealth(player))
let effectiveMaxMP = $derived(calculateEffectiveMaxMagicka(player))
let effectiveMaxAP = $derived(calculateEffectiveMaxAP(player))
```

Add handler functions (after handleUseItem):

```typescript
// Handle damage that might trigger spirit point usage
function handlePotentialLethalDamage(damage: number) {
	if (!session) return

	if (combatStore.checkLethalDamage(player.id, damage)) {
		// Check if player has spirit points
		if (player.spiritPoints > 0) {
			pendingDamageAmount = damage
			showComplicationModal = true
		} else {
			// No spirit points - player is dying/unconscious
			combatStore.takeDamage(player.id, damage)
			// Could trigger unconscious state here
		}
	} else {
		combatStore.takeDamage(player.id, damage)
	}
}

// Handle complication roll completion
function handleComplicationComplete(complication: Complication) {
	// Add complication to player
	if (onPlayerUpdate) {
		const newComplications = [...player.complications, complication]
		const newSpiritPoints = Math.max(0, player.spiritPoints - 1)

		onPlayerUpdate({
			...player,
			complications: newComplications,
			spiritPoints: newSpiritPoints,
			// Reset HP/MP/AP to new effective maximums
			health: calculateEffectiveMaxHealth({ ...player, complications: newComplications }),
			magicka: calculateEffectiveMaxMagicka({ ...player, complications: newComplications }),
			actionPoints: calculateEffectiveMaxAP({ ...player, complications: newComplications }),
		})
	}

	// Update combat session HP to new max
	if (session) {
		const newEffectiveMaxHP = calculateEffectiveMaxHealth({ ...player, complications: [...player.complications, complication] })
		// Reset combat HP to new max
		combatStore.heal(player.id, newEffectiveMaxHP, newEffectiveMaxHP)
	}

	showComplicationModal = false
	pendingDamageAmount = 0
}

function handleComplicationCancel() {
	// Player chose not to spend spirit point - apply the damage normally
	combatStore.takeDamage(player.id, pendingDamageAmount)
	showComplicationModal = false
	pendingDamageAmount = 0
}

// Handle healing a complication (outside combat, typically)
function handleHealComplication(complicationId: string) {
	if (onPlayerUpdate) {
		onPlayerUpdate({
			...player,
			complications: player.complications.filter(c => c.id !== complicationId),
		})
	}
}
```

Update the Props interface to add onPlayerUpdate:

```typescript
interface Props {
	player: PlayerData
	onCombatEnded?: (data: { health: number; magicka: number; equipment: Equipment }) => void
	onPlayerUpdate?: (player: PlayerData) => void
}

let { player, onCombatEnded, onPlayerUpdate }: Props = $props()
```

Update handleAdjustHP to check for lethal damage:

```typescript
function handleAdjustHP(amount: number) {
	if (amount > 0) {
		combatStore.heal(player.id, amount, effectiveMaxHP)
	} else {
		handlePotentialLethalDamage(Math.abs(amount))
	}
}
```

Update ResourceBars to use effective max values:

```svelte
<ResourceBars
	{session}
	maxHP={effectiveMaxHP}
	maxMP={effectiveMaxMP}
	onAdjustHP={handleAdjustHP}
	onAdjustMP={handleAdjustMP}
	onAdjustAP={handleAdjustAP}
/>
```

Add Spirit Points and Complications display in the UI (after the Conditions card, around line 378):

```svelte
<div class="card p-4">
	<h3 class="h4 mb-3">Spirit & Wounds</h3>
	<SpiritPointsTracker
		current={player.spiritPoints}
		max={player.maxSpiritPoints}
	/>
	<div class="mt-4">
		<h4 class="font-semibold text-sm mb-2">Active Complications</h4>
		<ComplicationsDisplay
			complications={player.complications}
			equipment={player.equipment}
		/>
	</div>
</div>
```

Add the ComplicationRollModal at the bottom with other modals:

```svelte
{#if showComplicationModal}
	<ComplicationRollModal
		isOpen={showComplicationModal}
		{player}
		equipment={session?.combatEquipment ?? player.equipment}
		onComplete={handleComplicationComplete}
		onCancel={handleComplicationCancel}
	/>
{/if}
```

### Step 6.3: Run build to verify

Run: `npm run build 2>&1 | head -50`

### Step 6.4: Commit

```bash
git add src/lib/components/combat/CombatMode.svelte src/lib/stores/combat.store.ts
git commit -m "feat: integrate spirit points and complications into combat

- Add checkLethalDamage helper to combat store
- Handle lethal damage triggering spirit point spend
- Display spirit points tracker and complications in combat UI
- Reset stats to effective maximums after complication applied

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update CharacterSheet to Display Complications

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte`

### Step 7.1: Add complications display to CharacterSheet

Modify `src/lib/components/CharacterSheet.svelte`:

Add imports:

```typescript
import {
	calculateMaxHealth,
	calculateMaxMagicka,
	calculateMaxAP,
	calculateEffectiveMaxHealth,
	calculateEffectiveMaxMagicka,
	calculateEffectiveMaxAP,
	calculateMaxSpiritPoints,
	getStatBreakdown,
	getSubskillBonus,
	getSkillsWithLevels,
	getLevelUpChanges,
} from '$lib/util/stats.util'
import ComplicationsDisplay from './combat/ComplicationsDisplay.svelte'
```

Add derived values for effective stats (after existing maxHealth, maxMagicka, maxAP):

```typescript
// Effective stats after complications
let effectiveMaxHealth = $derived(calculateEffectiveMaxHealth(player))
let effectiveMaxMagicka = $derived(calculateEffectiveMaxMagicka(player))
let effectiveMaxAP = $derived(calculateEffectiveMaxAP(player))
let maxSpiritPoints = $derived(calculateMaxSpiritPoints(player.level))

// Check if player has any stat-reducing complications
let hasStatComplications = $derived(
	player.complications.some(c => c.type === 'hp' || c.type === 'ap' || c.type === 'mp')
)
```

Update the stat cards to show both base and effective max (update Health card):

```svelte
<!-- Health -->
<div class="card p-4 variant-soft-error">
	<div class="flex justify-between items-center mb-2">
		<h3 class="h4 font-bold text-error-700 dark:text-error-300">Health</h3>
		<div class="flex items-center gap-2">
			{#if editMode}
				<input
					type="number"
					class="input w-16 h-8 text-center"
					min="0"
					max={effectiveMaxHealth}
					value={player.health}
					onchange={(e) => updateCurrentStat('health', parseInt(e.currentTarget.value) || 0)}
				/>
				<span class="text-xl font-bold">/ {effectiveMaxHealth}</span>
			{:else}
				<div class="flex items-center gap-2">
					{#if showResourceControls}
						<button
							type="button"
							class="btn-icon btn-icon-sm variant-soft-error"
							onclick={() => adjustResource('health', -1)}
							disabled={player.health <= 0}
						>-</button>
					{/if}
					<span class="text-2xl font-bold">
						{player.health} / {effectiveMaxHealth}
						{#if effectiveMaxHealth < maxHealth}
							<span class="text-sm text-error-400">({maxHealth})</span>
						{/if}
					</span>
					{#if showResourceControls}
						<button
							type="button"
							class="btn-icon btn-icon-sm variant-soft-error"
							onclick={() => adjustResource('health', 1)}
							disabled={player.health >= effectiveMaxHealth}
						>+</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<ProgressBar
		value={player.health}
		max={effectiveMaxHealth}
		meter="bg-error-500"
		track="bg-error-500/20"
		height="h-4"
		rounded="rounded-full"
	/>
	<div class="mt-2 text-sm text-surface-600-300-token">
		<span class="cursor-help" title="Base from {player.archetype}: {healthBreakdown.base}, Race bonus: +{healthBreakdown.racial}, Birth Sign: {healthBreakdown.birthSign !== 0 ? (healthBreakdown.birthSign > 0 ? '+' : '') + healthBreakdown.birthSign : 'none'}">
			Base: {healthBreakdown.base}
			{#if healthBreakdown.racial > 0}
				<span class="text-success-600 dark:text-success-400">+{healthBreakdown.racial} race</span>
			{/if}
			{#if healthBreakdown.birthSign !== 0}
				<span class="text-warning-600 dark:text-warning-400">{healthBreakdown.birthSign > 0 ? '+' : ''}{healthBreakdown.birthSign} sign</span>
			{/if}
			{#if effectiveMaxHealth < maxHealth}
				<span class="text-error-400">-{maxHealth - effectiveMaxHealth} wounds</span>
			{/if}
		</span>
	</div>
</div>
```

Apply similar updates to Magicka and Action Points cards (use effectiveMaxMagicka and effectiveMaxAP).

Add Spirit Points and Complications section (before Notes section, around line 880):

```svelte
<!-- Spirit Points & Complications -->
<section class="card p-4 variant-soft-secondary">
	<h3 class="h4 font-bold mb-3 text-secondary-700 dark:text-secondary-300">Spirit & Wounds</h3>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Spirit Points -->
		<div>
			<h4 class="font-semibold text-sm mb-2">Spirit Points</h4>
			<div class="flex items-center gap-2">
				<div class="flex gap-1">
					{#each Array(maxSpiritPoints) as _, i}
						<div
							class="w-6 h-6 rounded-full flex items-center justify-center"
							class:bg-secondary-500={i < player.spiritPoints}
							class:bg-surface-500/30={i >= player.spiritPoints}
						>
							{#if i < player.spiritPoints}
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
								</svg>
							{/if}
						</div>
					{/each}
				</div>
				<span class="text-sm">{player.spiritPoints} / {maxSpiritPoints}</span>
			</div>
			<p class="text-xs opacity-75 mt-1">
				Recover 1 after a full night's rest in comfort.
			</p>
		</div>

		<!-- Complications -->
		<div>
			<h4 class="font-semibold text-sm mb-2">Active Complications</h4>
			{#if editMode}
				<ComplicationsDisplay
					complications={player.complications}
					equipment={player.equipment}
					onHeal={(id) => {
						if (onUpdate) {
							onUpdate({
								...player,
								complications: player.complications.filter(c => c.id !== id)
							})
						}
					}}
				/>
			{:else}
				<ComplicationsDisplay
					complications={player.complications}
					equipment={player.equipment}
				/>
			{/if}
		</div>
	</div>
</section>
```

### Step 7.2: Update adjustResource function to use effective max

```typescript
function adjustResource(stat: 'health' | 'magicka', delta: number) {
	const maxValue = stat === 'health' ? effectiveMaxHealth : effectiveMaxMagicka
	const currentValue = player[stat]
	const newValue = Math.max(0, Math.min(maxValue, currentValue + delta))
	if (newValue !== currentValue && onUpdate) {
		onUpdate({ ...player, [stat]: newValue })
	}
}
```

### Step 7.3: Run build to verify

Run: `npm run build 2>&1 | head -50`

### Step 7.4: Commit

```bash
git add src/lib/components/CharacterSheet.svelte
git commit -m "feat: display spirit points and complications in character sheet

- Show effective max stats with wound penalties indicated
- Add Spirit & Wounds section with spirit point display
- Show complications list with optional heal buttons in edit mode
- Update resource adjustments to use effective maximums

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Player Page Integration

**Files:**
- Modify: `src/routes/player/[id]/+page.svelte` (or wherever player page is located)

### Step 8.1: Find and update the player page

First, locate the player page file:

Run: `find src -name "*.svelte" | xargs grep -l "CombatMode" | head -5`

Update the player page to pass onPlayerUpdate to CombatMode:

```svelte
<CombatMode
	{player}
	onCombatEnded={handleCombatEnded}
	onPlayerUpdate={handlePlayerUpdate}
/>
```

Add handler if not present:

```typescript
function handlePlayerUpdate(updatedPlayer: PlayerData) {
	playersStore.update(players => ({
		...players,
		[updatedPlayer.id]: updatedPlayer
	}))
}
```

### Step 8.2: Run build to verify

Run: `npm run build 2>&1 | head -30`

### Step 8.3: Commit

```bash
git add src/routes/player/
git commit -m "feat: connect player page to complication system

- Pass onPlayerUpdate to CombatMode for complication persistence
- Ensure player data updates propagate to store

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Add Tests

**Files:**
- Create: `src/lib/util/stats.util.test.ts`

### Step 9.1: Create unit tests for complication calculations

Create file `src/lib/util/stats.util.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
	calculateMaxSpiritPoints,
	calculateEffectiveMaxHealth,
	calculateEffectiveMaxMagicka,
	calculateEffectiveMaxAP,
	countComplications,
	isEquipmentDamaged,
	getDamagedEquipmentSlots,
} from './stats.util'
import type { PlayerData, Complication } from '$lib/models/player'
import { defaultPlayerData } from '$lib/models/player'

// Helper to create a test player
function createTestPlayer(overrides: Partial<PlayerData> = {}): PlayerData {
	return {
		...defaultPlayerData,
		id: 'test-player',
		level: 4,
		...overrides,
	} as PlayerData
}

// Helper to create a complication
function createComplication(type: 'hp' | 'ap' | 'mp' | 'equipment', slot?: 'weapon' | 'offhand' | 'armor'): Complication {
	return {
		id: crypto.randomUUID(),
		type,
		equipmentSlot: slot,
		timestamp: new Date().toISOString(),
	}
}

describe('calculateMaxSpiritPoints', () => {
	it('returns 1 for levels 1-3', () => {
		expect(calculateMaxSpiritPoints(1)).toBe(1)
		expect(calculateMaxSpiritPoints(2)).toBe(1)
		expect(calculateMaxSpiritPoints(3)).toBe(1)
	})

	it('returns floor(level/4) for higher levels', () => {
		expect(calculateMaxSpiritPoints(4)).toBe(1)
		expect(calculateMaxSpiritPoints(8)).toBe(2)
		expect(calculateMaxSpiritPoints(12)).toBe(3)
		expect(calculateMaxSpiritPoints(16)).toBe(4)
		expect(calculateMaxSpiritPoints(20)).toBe(5)
	})
})

describe('countComplications', () => {
	it('counts complications by type', () => {
		const complications: Complication[] = [
			createComplication('hp'),
			createComplication('hp'),
			createComplication('ap'),
			createComplication('mp'),
			createComplication('equipment', 'weapon'),
		]

		const counts = countComplications(complications)
		expect(counts.hp).toBe(2)
		expect(counts.ap).toBe(1)
		expect(counts.mp).toBe(1)
		expect(counts.equipment).toBe(1)
	})

	it('returns zeros for empty array', () => {
		const counts = countComplications([])
		expect(counts.hp).toBe(0)
		expect(counts.ap).toBe(0)
		expect(counts.mp).toBe(0)
		expect(counts.equipment).toBe(0)
	})
})

describe('isEquipmentDamaged', () => {
	it('returns true when slot has equipment damage', () => {
		const complications: Complication[] = [
			createComplication('equipment', 'weapon'),
		]
		expect(isEquipmentDamaged(complications, 'weapon')).toBe(true)
	})

	it('returns false when slot is not damaged', () => {
		const complications: Complication[] = [
			createComplication('equipment', 'weapon'),
		]
		expect(isEquipmentDamaged(complications, 'armor')).toBe(false)
	})

	it('returns false for stat complications', () => {
		const complications: Complication[] = [
			createComplication('hp'),
			createComplication('ap'),
		]
		expect(isEquipmentDamaged(complications, 'weapon')).toBe(false)
	})
})

describe('getDamagedEquipmentSlots', () => {
	it('returns all damaged slots', () => {
		const complications: Complication[] = [
			createComplication('equipment', 'weapon'),
			createComplication('equipment', 'armor'),
			createComplication('hp'),
		]
		const slots = getDamagedEquipmentSlots(complications)
		expect(slots).toContain('weapon')
		expect(slots).toContain('armor')
		expect(slots).not.toContain('offhand')
		expect(slots.length).toBe(2)
	})
})

describe('effective stat calculations', () => {
	it('calculateEffectiveMaxHealth reduces by HP complications', () => {
		const player = createTestPlayer({
			complications: [
				createComplication('hp'),
				createComplication('hp'),
			],
		})

		const baseMax = calculateEffectiveMaxHealth({ ...player, complications: [] })
		const effectiveMax = calculateEffectiveMaxHealth(player)

		expect(effectiveMax).toBe(baseMax - 2)
	})

	it('calculateEffectiveMaxHealth has minimum of 1', () => {
		const player = createTestPlayer({
			complications: Array(100).fill(null).map(() => createComplication('hp')),
		})

		expect(calculateEffectiveMaxHealth(player)).toBe(1)
	})

	it('calculateEffectiveMaxAP reduces by AP complications', () => {
		const player = createTestPlayer({
			complications: [createComplication('ap')],
		})

		const baseMax = calculateEffectiveMaxAP({ ...player, complications: [] })
		const effectiveMax = calculateEffectiveMaxAP(player)

		expect(effectiveMax).toBe(baseMax - 1)
	})

	it('calculateEffectiveMaxMagicka reduces by MP complications', () => {
		const player = createTestPlayer({
			complications: [
				createComplication('mp'),
				createComplication('mp'),
				createComplication('mp'),
			],
		})

		const baseMax = calculateEffectiveMaxMagicka({ ...player, complications: [] })
		const effectiveMax = calculateEffectiveMaxMagicka(player)

		expect(effectiveMax).toBe(baseMax - 3)
	})
})
```

### Step 9.2: Run tests

Run: `npm run test 2>&1 | head -50`

### Step 9.3: Commit

```bash
git add src/lib/util/stats.util.test.ts
git commit -m "test: add unit tests for complication calculations

- Test spirit point calculation at various levels
- Test complication counting by type
- Test equipment damage detection
- Test effective stat calculations with complications

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Final Integration & Cleanup

**Files:**
- Verify all files compile
- Manual testing checklist

### Step 10.1: Run full build verification

Run: `npm run build`

### Step 10.2: Run all tests

Run: `npm run test`

### Step 10.3: Create exports for new components

If needed, add exports to component index files.

### Step 10.4: Manual Testing Checklist

Create a manual test script:

1. Start combat with a character
2. Take damage to reduce HP to 0
3. Verify ComplicationRollModal appears
4. Test digital roll mode
5. Test manual roll mode
6. Verify equipment selection for roll of 10
7. Verify complication is added to player
8. Verify stats are updated (reduced maximums)
9. Verify spirit points decrease
10. End combat and verify complications persist
11. Check character sheet shows complications
12. Test healing a complication in edit mode

### Step 10.5: Final commit

```bash
git add .
git commit -m "feat: complete complications system implementation

Implements the Complications system per game rules:
- Roll 1d10 when HP drops to 0 and spirit point is spent
- 1-3: reduce HP max by 1
- 4-6: reduce AP max by 1
- 7-9: reduce MP max by 1
- 10: equipment becomes damaged

Components:
- ComplicationRollModal for d10 roll flow
- SpiritPointsTracker for visual spirit point display
- ComplicationsDisplay for showing active complications

Integration:
- Combat mode triggers complication on lethal damage
- Character sheet displays complications and spirit points
- Stats show effective maximums after complications
- Complications persist across sessions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This plan implements the full Complications system in 10 tasks:

1. **Data Models** - Add Complication type, spirit points, and complications array to PlayerData
2. **Stat Utilities** - Add complication-aware stat calculations (effective maximums)
3. **ComplicationRollModal** - 1d10 roll modal with equipment selection
4. **SpiritPointsTracker** - Visual spirit point display component
5. **ComplicationsDisplay** - List of active complications with heal option
6. **CombatMode Integration** - Handle lethal damage triggering spirit point spend
7. **CharacterSheet Update** - Display spirit points and complications
8. **Player Page Integration** - Connect updates to persist
9. **Tests** - Unit tests for calculation functions
10. **Final Cleanup** - Build verification and manual testing

**Key Design Decisions:**
- Complications stored on PlayerData (not CombatSession) for persistence
- Effective max stats = base max - complication count
- Spirit points: floor(level/4), min 1
- Equipment damage tracked by slot (weapon/offhand/armor)
- Healing complications via edit mode or dedicated heal action
