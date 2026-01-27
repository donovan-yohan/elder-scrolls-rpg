# Combat Action Modals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the remaining unimplemented combat action modals (Focus Attack, Focus Spell, Heft Shield, Block, Dodge, Use Item) so all action tiles in the ActionsPanel are functional.

**Architecture:** Each modal follows the existing pattern: callback props for utility modals, multi-step flows for skill-check-based actions, and integration with the combat store for resource spending. Modals are wired through CombatMode.svelte via the `activeModal` state.

**Tech Stack:** Svelte 5 ($props, $state, $derived), Skeleton UI (cards, badges, buttons), existing DiceRoller component, combat.store.ts

---

## Task 1: HeftShieldModal

**Files:**
- Create: `src/lib/components/combat/modals/HeftShieldModal.svelte`
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 1.1: Create the HeftShieldModal component

Create file `src/lib/components/combat/modals/HeftShieldModal.svelte`:

```svelte
<script lang="ts">
	import { Weapons, getShieldHeftCost, type WeaponType } from '$lib/data/weapons'

	interface Props {
		isOpen: boolean
		currentAP: number
		shieldId: string | null
		hasHeftedShield: boolean
		onHeft: (apCost: number) => void
		onClose: () => void
	}

	let { isOpen, currentAP, shieldId, hasHeftedShield, onHeft, onClose }: Props = $props()

	let shield = $derived(shieldId ? Weapons[shieldId] : null)
	let heftCost = $derived(shield ? getShieldHeftCost(shield.type as WeaponType) : 0)
	let canAfford = $derived(currentAP >= heftCost)

	function handleHeft() {
		if (canAfford && !hasHeftedShield) {
			onHeft(heftCost)
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-md bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Heft Shield</h2>
				<span class="badge variant-filled-warning">AP: {currentAP}</span>
			</header>

			{#if !shield}
				<p class="text-error-500 mb-4">No shield equipped in offhand.</p>
			{:else if hasHeftedShield}
				<div class="card variant-soft-success p-4 mb-4">
					<p class="text-success-500 font-semibold">Shield Already Hefted</p>
					<p class="text-sm opacity-75">Your {shield.name} is ready for blocking.</p>
				</div>
			{:else}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<div class="flex justify-between items-center">
							<div>
								<p class="font-semibold">{shield.name}</p>
								<p class="text-sm opacity-75">Ready your shield for blocking</p>
							</div>
							<span class="badge variant-filled">{heftCost} AP</span>
						</div>
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						class:opacity-50={!canAfford}
						disabled={!canAfford}
						onclick={handleHeft}
					>
						{#if canAfford}
							Heft Shield
						{:else}
							Not Enough AP
						{/if}
					</button>
				</div>
			{/if}

			<footer class="flex justify-end mt-4">
				<button type="button" class="btn variant-ghost" onclick={onClose}>
					{hasHeftedShield || !shield ? 'Close' : 'Cancel'}
				</button>
			</footer>
		</div>
	</div>
{/if}
```

### Step 1.2: Wire HeftShieldModal into CombatMode

Modify `src/lib/components/combat/CombatMode.svelte`:

Add import at top with other modal imports:
```typescript
import HeftShieldModal from './modals/HeftShieldModal.svelte'
```

Add state for tracking hefted shield (after `let activeModal`):
```typescript
let hasHeftedShield = $state(false)
```

Add handler function (after `handleSwapWeapon`):
```typescript
function handleHeftShield(apCost: number) {
	combatStore.spendAP(player.id, apCost)
	hasHeftedShield = true
	activeModal = null
}
```

Add to ActionsPanel props (update the existing call):
```svelte
<ActionsPanel
	currentAP={session.currentAP}
	currentMP={session.currentMP}
	currentInitiative={session.partyInitiativePool.current}
	hasHeftedShield={hasHeftedShield}
	hasShieldEquipped={hasShieldEquipped()}
	onActionSelect={handleActionSelect}
/>
```

Add modal at bottom with other ActionsPanel modals (inside `{#if session}`):
```svelte
<HeftShieldModal
	isOpen={activeModal === 'heftShield'}
	currentAP={session.currentAP}
	shieldId={session.combatEquipment?.offhand?.id ?? player.equipment?.offhand?.id ?? null}
	{hasHeftedShield}
	onHeft={handleHeftShield}
	onClose={handleCloseModal}
/>
```

### Step 1.3: Run build to verify

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds with no errors

### Step 1.4: Commit

```bash
git add src/lib/components/combat/modals/HeftShieldModal.svelte src/lib/components/combat/CombatMode.svelte
git commit -m "feat: add HeftShieldModal for readying shield

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: FocusAttackModal

**Files:**
- Create: `src/lib/components/combat/modals/FocusAttackModal.svelte`
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 2.1: Create FocusAttackModal component

Create file `src/lib/components/combat/modals/FocusAttackModal.svelte`:

```svelte
<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { DiceRoll } from '$lib/models/combat'
	import { Weapons } from '$lib/data/weapons'
	import { getSkillBonus } from '$lib/util/combat.util'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		player: PlayerData
		weaponId: string | null
		currentAP: number
		onFocus: (result: { success: boolean; isCritical: boolean }) => void
		onClose: () => void
	}

	let { isOpen, player, weaponId, currentAP, onFocus, onClose }: Props = $props()

	let weapon = $derived(weaponId ? Weapons[weaponId] : null)
	let focusDC = $derived(weapon ? 10 + (weapon.focusCost ?? 2) : 12)
	let skillBonus = $derived(weapon ? getSkillBonus(player, weapon.relatedSkill) : 0)

	let step = $state<'roll' | 'result'>('roll')
	let focusRoll = $state<DiceRoll | undefined>(undefined)
	let focusSuccess = $state(false)

	const AP_COST = 1

	function handleFocusRoll(roll: DiceRoll, success: boolean) {
		focusRoll = roll
		focusSuccess = success
		step = 'result'
	}

	function handleConfirm() {
		onFocus({
			success: focusSuccess,
			isCritical: focusRoll?.isCritical ?? false
		})
	}

	function resetState() {
		step = 'roll'
		focusRoll = undefined
		focusSuccess = false
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Focus Attack</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-warning">AP: {currentAP}</span>
					<span class="badge variant-filled">Cost: {AP_COST} AP</span>
				</div>
			</header>

			{#if currentAP < AP_COST}
				<p class="text-error-500 mb-4">Not enough AP to focus.</p>
			{:else if !weapon}
				<p class="text-error-500 mb-4">No weapon equipped.</p>
			{:else if step === 'roll'}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<p class="text-sm opacity-75 mb-2">Focusing with: <strong>{weapon.name}</strong></p>
						<p class="text-sm">Roll a skill check to focus your attack. Success grants double base damage on your next attack with this weapon.</p>
					</div>

					<DiceRoller
						onRoll={handleFocusRoll}
						skillBonus={skillBonus}
						targetDC={focusDC}
						playerLevel={player.level}
						label="Roll Focus Check"
					/>
				</div>
			{:else}
				<div class="space-y-4">
					{#if focusRoll}
						<RollResult roll={focusRoll} targetDC={focusDC} />
					{/if}

					{#if focusSuccess}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Focus Achieved!</p>
							<p class="text-sm opacity-75">
								{#if focusRoll?.isCritical}
									Critical! All attacks this round deal double damage with advantage.
								{:else}
									Your next attack with {weapon.name} deals double base damage.
								{/if}
							</p>
						</div>
					{:else}
						<div class="card variant-soft-error p-4 text-center">
							<p class="font-bold text-error-500">Focus Failed</p>
							<p class="text-sm opacity-75">
								{#if focusRoll?.isCriticalFail}
									Critical fail! You are disoriented. Party loses 1 initiative, enemy gains 1.
								{:else}
									You become disoriented. Spend 2 AP to Resteady before focusing again.
								{/if}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<footer class="flex justify-end gap-2 mt-6">
				<button type="button" class="btn variant-ghost" onclick={onClose}>Cancel</button>
				{#if step === 'result'}
					<button type="button" class="btn variant-filled-primary" onclick={handleConfirm}>
						Apply Result
					</button>
				{/if}
			</footer>
		</div>
	</div>
{/if}
```

### Step 2.2: Wire FocusAttackModal into CombatMode

Modify `src/lib/components/combat/CombatMode.svelte`:

Add import:
```typescript
import FocusAttackModal from './modals/FocusAttackModal.svelte'
```

Add state for focus tracking (after hasHeftedShield):
```typescript
let hasFocusedAttack = $state(false)
```

Add handler (after handleHeftShield):
```typescript
function handleFocusAttack(result: { success: boolean; isCritical: boolean }) {
	combatStore.spendAP(player.id, 1)
	if (result.success) {
		hasFocusedAttack = true
		// Could add condition for critical success bonus
	} else {
		// Add disoriented condition
		combatStore.addCondition(player.id, { type: 'Disoriented', duration: undefined })
		if (result.isCritical === false && !result.success) {
			// Check if critical fail - adjust initiative
		}
	}
	activeModal = null
}
```

Update handleActionSelect to handle focusAttack:
```typescript
} else if (action === 'focusAttack') {
	activeModal = action
}
```

Add modal (inside `{#if session}`):
```svelte
<FocusAttackModal
	isOpen={activeModal === 'focusAttack'}
	{player}
	weaponId={session.combatEquipment?.weapon?.id ?? player.equipment?.weapon?.id ?? null}
	currentAP={session.currentAP}
	onFocus={handleFocusAttack}
	onClose={handleCloseModal}
/>
```

### Step 2.3: Run build to verify

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds

### Step 2.4: Commit

```bash
git add src/lib/components/combat/modals/FocusAttackModal.svelte src/lib/components/combat/CombatMode.svelte
git commit -m "feat: add FocusAttackModal for focusing weapon attacks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: FocusSpellModal

**Files:**
- Create: `src/lib/components/combat/modals/FocusSpellModal.svelte`
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 3.1: Create FocusSpellModal component

Create file `src/lib/components/combat/modals/FocusSpellModal.svelte`:

```svelte
<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { DiceRoll } from '$lib/models/combat'
	import { getSkillBonus } from '$lib/util/combat.util'
	import { Skill } from '$lib/data/skill'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		player: PlayerData
		currentAP: number
		currentMP: number
		onFocus: (result: { success: boolean; extraMPCost: number }) => void
		onClose: () => void
	}

	let { isOpen, player, currentAP, currentMP, onFocus, onClose }: Props = $props()

	// Spell tier affects extra MP cost
	const spellTiers = [
		{ name: 'Novice', extraMP: 1, dc: 12 },
		{ name: 'Apprentice', extraMP: 2, dc: 14 },
		{ name: 'Adept', extraMP: 3, dc: 16 },
		{ name: 'Expert', extraMP: 5, dc: 18 },
		{ name: 'Master', extraMP: 10, dc: 20 }
	]

	let selectedTier = $state(0)
	let step = $state<'select' | 'roll' | 'result'>('select')
	let focusRoll = $state<DiceRoll | undefined>(undefined)
	let focusSuccess = $state(false)

	let currentTier = $derived(spellTiers[selectedTier])
	let skillBonus = $derived(getSkillBonus(player, Skill.Conjuration)) // Default magic skill
	let canAfford = $derived(currentAP >= 1 && currentMP >= currentTier.extraMP)

	const AP_COST = 1

	function handleProceedToRoll() {
		if (canAfford) {
			step = 'roll'
		}
	}

	function handleFocusRoll(roll: DiceRoll, success: boolean) {
		focusRoll = roll
		focusSuccess = success
		step = 'result'
	}

	function handleConfirm() {
		onFocus({
			success: focusSuccess,
			extraMPCost: focusSuccess ? currentTier.extraMP : 0
		})
	}

	function resetState() {
		selectedTier = 0
		step = 'select'
		focusRoll = undefined
		focusSuccess = false
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Focus Spell</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-warning">AP: {currentAP}</span>
					<span class="badge variant-filled-tertiary">MP: {currentMP}</span>
				</div>
			</header>

			{#if step === 'select'}
				<div class="space-y-4">
					<p class="text-sm opacity-75">Select the tier of spell you want to empower. Higher tiers cost more MP but provide greater bonuses.</p>

					<div class="flex flex-col gap-2">
						{#each spellTiers as tier, i}
							{@const affordable = currentMP >= tier.extraMP && currentAP >= 1}
							<button
								type="button"
								class="btn w-full justify-between"
								class:variant-filled-primary={selectedTier === i}
								class:variant-soft-surface={selectedTier !== i}
								class:opacity-50={!affordable}
								disabled={!affordable}
								onclick={() => selectedTier = i}
							>
								<span>{tier.name}</span>
								<div class="flex gap-2">
									<span class="badge variant-filled">DC {tier.dc}</span>
									<span class="badge variant-filled-tertiary">+{tier.extraMP} MP</span>
								</div>
							</button>
						{/each}
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full mt-4"
						class:opacity-50={!canAfford}
						disabled={!canAfford}
						onclick={handleProceedToRoll}
					>
						Proceed to Focus Check
					</button>
				</div>
			{:else if step === 'roll'}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<p class="text-sm">Focusing {currentTier.name} spell</p>
						<p class="text-sm opacity-75">Cost: 1 AP + {currentTier.extraMP} MP on success</p>
					</div>

					<DiceRoller
						onRoll={handleFocusRoll}
						skillBonus={skillBonus}
						targetDC={currentTier.dc}
						playerLevel={player.level}
						label="Roll Focus Check"
					/>
				</div>
			{:else}
				<div class="space-y-4">
					{#if focusRoll}
						<RollResult roll={focusRoll} targetDC={currentTier.dc} />
					{/if}

					{#if focusSuccess}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Spell Focused!</p>
							<p class="text-sm opacity-75">
								Your next spell gains advantage and enhanced effects.
								Extra cost: {currentTier.extraMP} MP
							</p>
						</div>
					{:else}
						<div class="card variant-soft-error p-4 text-center">
							<p class="font-bold text-error-500">Focus Failed</p>
							<p class="text-sm opacity-75">
								You become unfocused. Disadvantage on spell checks until you spend 1 AP + 1 MP to refocus.
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<footer class="flex justify-end gap-2 mt-6">
				<button type="button" class="btn variant-ghost" onclick={onClose}>Cancel</button>
				{#if step === 'result'}
					<button type="button" class="btn variant-filled-primary" onclick={handleConfirm}>
						Apply Result
					</button>
				{/if}
			</footer>
		</div>
	</div>
{/if}
```

### Step 3.2: Wire FocusSpellModal into CombatMode

Add import:
```typescript
import FocusSpellModal from './modals/FocusSpellModal.svelte'
```

Add state:
```typescript
let hasFocusedSpell = $state(false)
```

Add handler:
```typescript
function handleFocusSpell(result: { success: boolean; extraMPCost: number }) {
	combatStore.spendAP(player.id, 1)
	if (result.success) {
		hasFocusedSpell = true
		combatStore.spendMP(player.id, result.extraMPCost)
	} else {
		combatStore.addCondition(player.id, { type: 'Unfocused', duration: undefined })
	}
	activeModal = null
}
```

Update handleActionSelect:
```typescript
} else if (action === 'focusSpell') {
	activeModal = action
}
```

Add modal:
```svelte
<FocusSpellModal
	isOpen={activeModal === 'focusSpell'}
	{player}
	currentAP={session.currentAP}
	currentMP={session.currentMP}
	onFocus={handleFocusSpell}
	onClose={handleCloseModal}
/>
```

### Step 3.3: Run build and commit

```bash
npm run build 2>&1 | tail -10
git add src/lib/components/combat/modals/FocusSpellModal.svelte src/lib/components/combat/CombatMode.svelte
git commit -m "feat: add FocusSpellModal for empowering spells

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: DodgeModal

**Files:**
- Create: `src/lib/components/combat/modals/DodgeModal.svelte`
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 4.1: Create DodgeModal component

Create file `src/lib/components/combat/modals/DodgeModal.svelte`:

```svelte
<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { DiceRoll } from '$lib/models/combat'
	import { getSkillBonus } from '$lib/util/combat.util'
	import { Skill } from '$lib/data/skill'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		player: PlayerData
		currentInitiative: number
		onDodge: (result: { success: boolean; damageReduction: 'full' | 'half' | 'none'; disoriented: boolean }) => void
		onClose: () => void
	}

	let { isOpen, player, currentInitiative, onDodge, onClose }: Props = $props()

	let step = $state<'setup' | 'roll' | 'result'>('setup')
	let attackRoll = $state(15) // Enemy attack roll to dodge against
	let dodgeRoll = $state<DiceRoll | undefined>(undefined)
	let useAcrobatics = $state(true) // Acrobatics (normal) vs Athletics (disadvantage)

	let skillBonus = $derived(
		useAcrobatics
			? getSkillBonus(player, Skill.Acrobatics)
			: getSkillBonus(player, Skill.Athletics)
	)

	let dodgeSuccess = $derived.by(() => {
		if (!dodgeRoll) return false
		return dodgeRoll.total >= attackRoll
	})

	let dodgeResult = $derived.by(() => {
		if (!dodgeRoll) return { damageReduction: 'none' as const, disoriented: false }
		const margin = dodgeRoll.total - attackRoll
		if (dodgeRoll.isCriticalFail) {
			return { damageReduction: 'none' as const, disoriented: true }
		}
		if (margin >= 0) {
			return { damageReduction: 'full' as const, disoriented: false }
		}
		if (margin >= -10) {
			// Failed by less than 10 - player chooses half damage or disoriented
			return { damageReduction: 'half' as const, disoriented: false }
		}
		return { damageReduction: 'none' as const, disoriented: false }
	})

	const INIT_COST = 1

	function handleProceedToRoll() {
		step = 'roll'
	}

	function handleDodgeRoll(roll: DiceRoll) {
		dodgeRoll = roll
		step = 'result'
	}

	function handleConfirm() {
		onDodge({
			success: dodgeSuccess,
			...dodgeResult
		})
	}

	function resetState() {
		step = 'setup'
		attackRoll = 15
		dodgeRoll = undefined
		useAcrobatics = true
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Dodge</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-success">Initiative: {currentInitiative}</span>
					<span class="badge variant-filled">Cost: {INIT_COST} Init</span>
				</div>
			</header>

			{#if currentInitiative < INIT_COST}
				<p class="text-error-500 mb-4">Not enough initiative to dodge.</p>
			{:else if step === 'setup'}
				<div class="space-y-4">
					<label class="label">
						<span>Enemy Attack Roll</span>
						<input type="number" class="input" bind:value={attackRoll} min="1" />
					</label>

					<div class="space-y-2">
						<span class="text-sm font-semibold">Dodge Skill</span>
						<div class="flex gap-2">
							<button
								type="button"
								class="btn flex-1"
								class:variant-filled-primary={useAcrobatics}
								class:variant-soft-surface={!useAcrobatics}
								onclick={() => useAcrobatics = true}
							>
								Acrobatics (Normal)
							</button>
							<button
								type="button"
								class="btn flex-1"
								class:variant-filled-primary={!useAcrobatics}
								class:variant-soft-surface={useAcrobatics}
								onclick={() => useAcrobatics = false}
							>
								Athletics (Disadvantage)
							</button>
						</div>
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						onclick={handleProceedToRoll}
					>
						Roll Dodge
					</button>
				</div>
			{:else if step === 'roll'}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<p class="text-sm">Dodging attack roll of <strong>{attackRoll}</strong></p>
						<p class="text-sm opacity-75">Using {useAcrobatics ? 'Acrobatics' : 'Athletics (Disadvantage)'}</p>
					</div>

					<DiceRoller
						onRoll={handleDodgeRoll}
						skillBonus={skillBonus}
						targetDC={attackRoll}
						playerLevel={player.level}
						label="Roll Dodge"
						disadvantage={!useAcrobatics}
					/>
				</div>
			{:else}
				<div class="space-y-4">
					{#if dodgeRoll}
						<RollResult roll={dodgeRoll} targetDC={attackRoll} />
					{/if}

					{#if dodgeSuccess}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Dodge Successful!</p>
							<p class="text-sm opacity-75">No damage taken. You may move up to 10 feet.</p>
						</div>
					{:else if dodgeResult.damageReduction === 'half'}
						<div class="card variant-soft-warning p-4 text-center">
							<p class="font-bold text-warning-500">Partial Dodge</p>
							<p class="text-sm opacity-75">Choose: Take half damage OR become disoriented.</p>
						</div>
					{:else}
						<div class="card variant-soft-error p-4 text-center">
							<p class="font-bold text-error-500">Dodge Failed</p>
							<p class="text-sm opacity-75">
								{#if dodgeResult.disoriented}
									Full damage taken and you are disoriented.
								{:else}
									Full damage taken.
								{/if}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<footer class="flex justify-end gap-2 mt-6">
				<button type="button" class="btn variant-ghost" onclick={onClose}>Cancel</button>
				{#if step === 'result'}
					<button type="button" class="btn variant-filled-primary" onclick={handleConfirm}>
						Apply Result
					</button>
				{/if}
			</footer>
		</div>
	</div>
{/if}
```

### Step 4.2: Wire DodgeModal into CombatMode

Add import:
```typescript
import DodgeModal from './modals/DodgeModal.svelte'
```

Add handler:
```typescript
function handleDodge(result: { success: boolean; damageReduction: 'full' | 'half' | 'none'; disoriented: boolean }) {
	combatStore.spendInitiative(player.id, 1)
	if (result.disoriented) {
		combatStore.addCondition(player.id, { type: 'Disoriented', duration: 1 })
	}
	activeModal = null
}
```

Update handleActionSelect:
```typescript
} else if (action === 'dodge') {
	activeModal = action
}
```

Add modal:
```svelte
<DodgeModal
	isOpen={activeModal === 'dodge'}
	{player}
	currentInitiative={session.partyInitiativePool.current}
	onDodge={handleDodge}
	onClose={handleCloseModal}
/>
```

### Step 4.3: Run build and commit

```bash
npm run build 2>&1 | tail -10
git add src/lib/components/combat/modals/DodgeModal.svelte src/lib/components/combat/CombatMode.svelte
git commit -m "feat: add DodgeModal for dodging attacks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: BlockModal

**Files:**
- Create: `src/lib/components/combat/modals/BlockModal.svelte`
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 5.1: Create BlockModal component

Create file `src/lib/components/combat/modals/BlockModal.svelte`:

```svelte
<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { DiceRoll } from '$lib/models/combat'
	import { Weapons, getShieldBlockAdvantage, type WeaponType } from '$lib/data/weapons'
	import { getSkillBonus } from '$lib/util/combat.util'
	import { Skill } from '$lib/data/skill'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		player: PlayerData
		shieldId: string | null
		currentInitiative: number
		hasHeftedShield: boolean
		onBlock: (result: { success: boolean; damageReduction: 'full' | 'half' | 'minimal' | 'none' }) => void
		onClose: () => void
	}

	let { isOpen, player, shieldId, currentInitiative, hasHeftedShield, onBlock, onClose }: Props = $props()

	let shield = $derived(shieldId ? Weapons[shieldId] : null)
	let shieldAdvantage = $derived(shield ? getShieldBlockAdvantage(shield.type as WeaponType) : 0)
	let skillBonus = $derived(getSkillBonus(player, Skill.Block))

	let step = $state<'setup' | 'roll' | 'result'>('setup')
	let attackRoll = $state(15)
	let blockRoll = $state<DiceRoll | undefined>(undefined)

	let blockSuccess = $derived.by(() => {
		if (!blockRoll) return false
		return blockRoll.total >= attackRoll
	})

	let blockResult = $derived.by(() => {
		if (!blockRoll) return { damageReduction: 'none' as const }
		const margin = blockRoll.total - attackRoll

		if (blockRoll.isCriticalFail) {
			return { damageReduction: 'none' as const }
		}
		if (blockRoll.isCritical) {
			return { damageReduction: 'full' as const }
		}
		if (margin >= 10) {
			return { damageReduction: 'full' as const } // Also regain 1 initiative
		}
		if (margin >= 0) {
			return { damageReduction: 'minimal' as const } // 1 damage only
		}
		if (margin >= -10) {
			return { damageReduction: 'half' as const }
		}
		return { damageReduction: 'none' as const }
	})

	const INIT_COST = 1

	function handleProceedToRoll() {
		step = 'roll'
	}

	function handleBlockRoll(roll: DiceRoll) {
		blockRoll = roll
		step = 'result'
	}

	function handleConfirm() {
		onBlock({
			success: blockSuccess,
			...blockResult
		})
	}

	function resetState() {
		step = 'setup'
		attackRoll = 15
		blockRoll = undefined
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Block</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-success">Initiative: {currentInitiative}</span>
					<span class="badge variant-filled">Cost: {INIT_COST} Init</span>
				</div>
			</header>

			{#if currentInitiative < INIT_COST}
				<p class="text-error-500 mb-4">Not enough initiative to block.</p>
			{:else if !hasHeftedShield}
				<p class="text-error-500 mb-4">Shield not hefted. Use Heft Shield first.</p>
			{:else if step === 'setup'}
				<div class="space-y-4">
					{#if shield}
						<div class="card variant-soft-surface p-4">
							<p class="font-semibold">{shield.name}</p>
							<p class="text-sm opacity-75">Block Advantage: +{shieldAdvantage}</p>
						</div>
					{/if}

					<label class="label">
						<span>Enemy Attack Roll</span>
						<input type="number" class="input" bind:value={attackRoll} min="1" />
					</label>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						onclick={handleProceedToRoll}
					>
						Roll Block
					</button>
				</div>
			{:else if step === 'roll'}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<p class="text-sm">Blocking attack roll of <strong>{attackRoll}</strong></p>
						{#if shield}
							<p class="text-sm opacity-75">Shield bonus: +{shieldAdvantage} advantage</p>
						{/if}
					</div>

					<DiceRoller
						onRoll={handleBlockRoll}
						skillBonus={skillBonus}
						targetDC={attackRoll}
						playerLevel={player.level}
						label="Roll Block"
						advantageCount={shieldAdvantage}
					/>
				</div>
			{:else}
				<div class="space-y-4">
					{#if blockRoll}
						<RollResult roll={blockRoll} targetDC={attackRoll} />
					{/if}

					{#if blockResult.damageReduction === 'full'}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Perfect Block!</p>
							<p class="text-sm opacity-75">No damage taken.</p>
						</div>
					{:else if blockResult.damageReduction === 'minimal'}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Block Successful!</p>
							<p class="text-sm opacity-75">Only 1 damage taken.</p>
						</div>
					{:else if blockResult.damageReduction === 'half'}
						<div class="card variant-soft-warning p-4 text-center">
							<p class="font-bold text-warning-500">Partial Block</p>
							<p class="text-sm opacity-75">Half damage taken.</p>
						</div>
					{:else}
						<div class="card variant-soft-error p-4 text-center">
							<p class="font-bold text-error-500">Block Failed</p>
							<p class="text-sm opacity-75">Full damage taken.</p>
						</div>
					{/if}
				</div>
			{/if}

			<footer class="flex justify-end gap-2 mt-6">
				<button type="button" class="btn variant-ghost" onclick={onClose}>Cancel</button>
				{#if step === 'result'}
					<button type="button" class="btn variant-filled-primary" onclick={handleConfirm}>
						Apply Result
					</button>
				{/if}
			</footer>
		</div>
	</div>
{/if}
```

### Step 5.2: Wire BlockModal into CombatMode

Add import:
```typescript
import BlockModal from './modals/BlockModal.svelte'
```

Add handler:
```typescript
function handleBlock(result: { success: boolean; damageReduction: 'full' | 'half' | 'minimal' | 'none' }) {
	combatStore.spendInitiative(player.id, 1)
	// Damage reduction would be applied by the attack resolver
	activeModal = null
}
```

Update handleActionSelect:
```typescript
} else if (action === 'block') {
	activeModal = action
}
```

Add modal:
```svelte
<BlockModal
	isOpen={activeModal === 'block'}
	{player}
	shieldId={session.combatEquipment?.offhand?.id ?? player.equipment?.offhand?.id ?? null}
	currentInitiative={session.partyInitiativePool.current}
	{hasHeftedShield}
	onBlock={handleBlock}
	onClose={handleCloseModal}
/>
```

### Step 5.3: Run build and commit

```bash
npm run build 2>&1 | tail -10
git add src/lib/components/combat/modals/BlockModal.svelte src/lib/components/combat/CombatMode.svelte
git commit -m "feat: add BlockModal for blocking attacks with shield

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: UseItemModal

**Files:**
- Create: `src/lib/components/combat/modals/UseItemModal.svelte`
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 6.1: Create UseItemModal component

Create file `src/lib/components/combat/modals/UseItemModal.svelte`:

```svelte
<script lang="ts">
	import type { PlayerData, InventoryItem } from '$lib/models/player'
	import { Items } from '$lib/data/items'

	interface Props {
		isOpen: boolean
		player: PlayerData
		currentAP: number
		onUseItem: (itemId: string) => void
		onClose: () => void
	}

	let { isOpen, player, currentAP, onUseItem, onClose }: Props = $props()

	// Filter to consumable items only
	let consumables = $derived(
		(player.inventory ?? []).filter(inv => {
			const item = Items[inv.itemId]
			return item?.consumable && inv.quantity > 0
		})
	)

	let selectedItemId = $state<string | null>(null)

	const AP_COST = 1
	let canAfford = $derived(currentAP >= AP_COST)

	function handleUseItem() {
		if (selectedItemId && canAfford) {
			onUseItem(selectedItemId)
		}
	}

	function resetState() {
		selectedItemId = null
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Use Item</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-warning">AP: {currentAP}</span>
					<span class="badge variant-filled">Cost: {AP_COST} AP</span>
				</div>
			</header>

			{#if !canAfford}
				<p class="text-error-500 mb-4">Not enough AP to use an item.</p>
			{:else if consumables.length === 0}
				<p class="text-surface-500 mb-4">No consumable items in inventory.</p>
			{:else}
				<div class="space-y-4">
					<p class="text-sm opacity-75">Select an item to use:</p>

					<div class="flex flex-col gap-2 max-h-64 overflow-y-auto">
						{#each consumables as inv}
							{@const item = Items[inv.itemId]}
							{#if item}
								<button
									type="button"
									class="btn w-full justify-between text-left"
									class:variant-filled-primary={selectedItemId === inv.itemId}
									class:variant-soft-surface={selectedItemId !== inv.itemId}
									onclick={() => selectedItemId = inv.itemId}
								>
									<div>
										<p class="font-semibold">{item.name}</p>
										<p class="text-xs opacity-75">{item.description ?? ''}</p>
									</div>
									<span class="badge variant-filled">x{inv.quantity}</span>
								</button>
							{/if}
						{/each}
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						class:opacity-50={!selectedItemId}
						disabled={!selectedItemId}
						onclick={handleUseItem}
					>
						Use Item
					</button>
				</div>
			{/if}

			<footer class="flex justify-end mt-4">
				<button type="button" class="btn variant-ghost" onclick={onClose}>
					Cancel
				</button>
			</footer>
		</div>
	</div>
{/if}
```

### Step 6.2: Wire UseItemModal into CombatMode

Add import:
```typescript
import UseItemModal from './modals/UseItemModal.svelte'
```

Add handler:
```typescript
function handleUseItem(itemId: string) {
	combatStore.spendAP(player.id, 1)
	// TODO: Apply item effects and remove from inventory
	// For now, just log it
	activeModal = null
}
```

Update handleActionSelect:
```typescript
} else if (action === 'useItem') {
	activeModal = action
}
```

Add modal:
```svelte
<UseItemModal
	isOpen={activeModal === 'useItem'}
	{player}
	currentAP={session.currentAP}
	onUseItem={handleUseItem}
	onClose={handleCloseModal}
/>
```

### Step 6.3: Run build and commit

```bash
npm run build 2>&1 | tail -10
git add src/lib/components/combat/modals/UseItemModal.svelte src/lib/components/combat/CombatMode.svelte
git commit -m "feat: add UseItemModal for using consumable items

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Final Integration & Cleanup

**Files:**
- Modify: `src/lib/components/combat/CombatMode.svelte`

### Step 7.1: Ensure all action types are handled

Verify handleActionSelect covers all cases:

```typescript
function handleActionSelect(action: ActionsPanelActionType) {
	if (action === 'attack') {
		const weaponId = session?.combatEquipment?.weapon?.id ?? player.equipment?.weapon?.id
		if (weaponId) {
			selectedAction = {
				type: ActionType.Attack,
				name: 'Attack',
				apCost: 2,
				isAvailable: true,
				weaponId
			}
			showAttackResolver = true
		}
	} else if (action === 'castSpell') {
		selectedAction = {
			type: ActionType.CastSpell,
			name: 'Cast Spell',
			apCost: 1,
			mpCost: 1,
			isAvailable: true
		}
		showSpellResolver = true
	} else {
		// All other actions use activeModal
		activeModal = action
	}
}
```

### Step 7.2: Reset states at turn end

Update turn end handler to reset focus states:

```typescript
function handleEndTurn() {
	combatStore.endPlayerTurn(player.id, player)
	// Reset turn-based states
	hasHeftedShield = false
	hasFocusedAttack = false
	hasFocusedSpell = false
}
```

### Step 7.3: Run full build verification

```bash
npm run build
```

### Step 7.4: Final commit

```bash
git add src/lib/components/combat/CombatMode.svelte
git commit -m "feat: complete combat action modals integration

- All action tiles now functional
- Turn-based state resets properly
- Full modal flow for all combat actions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This plan implements 6 new combat modals:
1. **HeftShieldModal** - Ready shield for blocking (0-3 AP based on weight)
2. **FocusAttackModal** - Focus for double damage (1 AP, skill check)
3. **FocusSpellModal** - Empower next spell (1 AP + extra MP, skill check)
4. **DodgeModal** - Evade attacks (1 Initiative, acrobatics/athletics check)
5. **BlockModal** - Block with shield (1 Initiative, block check with shield advantage)
6. **UseItemModal** - Use consumable items (1 AP)

All modals follow the established patterns and integrate with the combat store for resource management.
