# Initiative System Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the initiative system to use a party-pooled d20 roll with d6 advantage dice for major skills and flat bonuses for minor skills, matching the Combat 2.0 rules.

**Architecture:** The new initiative system changes from individual skill rolls per character to a single party-wide d20 roll. Major initiative skills add d6 advantage dice (taking highest, with exploding 6s), while minor skills add flat +1 bonuses. Both party and enemy maintain initiative counters that track current/max values and can increase/decrease during combat.

**Tech Stack:** TypeScript, Svelte 5, existing dice utilities

---

## Current vs Desired System Analysis

### Current Implementation (Incorrect)
- Each player rolls multiple d20s (one per initiative skill they have)
- Major skills give d20 advantage (roll 2d20 take highest)
- Minor skills add level-based flat bonuses to d20 rolls
- Results converted to successes (13-19=1, 20-29=2, 30+=3)
- No party pooling - individual character contributions

### Desired Implementation (Per Combat 2.0 + User Clarification)
- **Single d20 roll per player** - each player contributes ONE roll to the party pool
- **Major skills add d6 advantage dice** - for each relevant major skill, roll a d6 and take the highest. If any d6 is a 6, use exploding dice rules
- **Minor skills add flat +1 each** - simple additive bonus per relevant minor skill
- **Party initiative pool** - sum all player contributions into a single party total
- **Track current/max initiative** - display as "X / Total" and track spending/gaining
- **Enemy party also has initiative counter** - DM manages enemy side

### Initiative-Relevant Skills (from Combat 2.0 docs)
- Notice
- Athletics
- Dexterity
- Acrobatics
- Sneak
- Intuition
- Deceive

---

## Task 1: Add Initiative Skills Constant

**Files:**
- Modify: `src/lib/data/skill.ts`

**Step 1: Write the failing test**

Create test file:
```typescript
// src/lib/util/__tests__/initiative.util.test.ts
import { describe, it, expect } from 'vitest'
import { InitiativeSkills } from '$lib/data/skill'
import { Skill } from '$lib/data/skill'

describe('InitiativeSkills constant', () => {
  it('contains exactly the 7 initiative-relevant skills', () => {
    expect(InitiativeSkills).toHaveLength(7)
    expect(InitiativeSkills).toContain(Skill.Notice)
    expect(InitiativeSkills).toContain(Skill.Athletics)
    expect(InitiativeSkills).toContain(Skill.Dexterity)
    expect(InitiativeSkills).toContain(Skill.Acrobatics)
    expect(InitiativeSkills).toContain(Skill.Sneak)
    expect(InitiativeSkills).toContain(Skill.Intuition)
    expect(InitiativeSkills).toContain(Skill.Deceive)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/util/__tests__/initiative.util.test.ts`
Expected: FAIL - InitiativeSkills not exported

**Step 3: Write minimal implementation**

Add to `src/lib/data/skill.ts` after SpellSkills:
```typescript
export const InitiativeSkills: Skill[] = [
  Skill.Acrobatics,
  Skill.Athletics,
  Skill.Deceive,
  Skill.Dexterity,
  Skill.Intuition,
  Skill.Notice,
  Skill.Sneak,
]
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/util/__tests__/initiative.util.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/data/skill.ts src/lib/util/__tests__/initiative.util.test.ts
git commit -m "feat: add InitiativeSkills constant for initiative-relevant skills"
```

---

## Task 2: Add D6 Rolling with Exploding Dice

**Files:**
- Modify: `src/lib/util/dice.util.ts`
- Create: `src/lib/util/__tests__/dice.util.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/util/__tests__/dice.util.test.ts
import { describe, it, expect, vi } from 'vitest'
import { rollD6Exploding, rollD6Advantage } from '$lib/util/dice.util'

describe('rollD6Exploding', () => {
  it('returns a number between 1 and 6 for non-exploding rolls', () => {
    // Mock Math.random to return 0.5 (which gives 4 on d6)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const result = rollD6Exploding()
    expect(result).toBe(4)
    vi.restoreAllMocks()
  })

  it('explodes on a 6 and adds subsequent rolls', () => {
    // Mock: first roll 6, second roll 3
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99) // 6
      .mockReturnValueOnce(0.4)  // 3
    const result = rollD6Exploding()
    expect(result).toBe(9) // 6 + 3
    vi.restoreAllMocks()
  })

  it('chains multiple explosions', () => {
    // Mock: 6, 6, 4
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99) // 6
      .mockReturnValueOnce(0.99) // 6
      .mockReturnValueOnce(0.5)  // 4
    const result = rollD6Exploding()
    expect(result).toBe(16) // 6 + 6 + 4
    vi.restoreAllMocks()
  })
})

describe('rollD6Advantage', () => {
  it('returns 0 when no dice to roll', () => {
    const result = rollD6Advantage(0)
    expect(result).toBe(0)
  })

  it('rolls single d6 when count is 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const result = rollD6Advantage(1)
    expect(result).toBe(4)
    vi.restoreAllMocks()
  })

  it('takes highest of multiple d6 rolls', () => {
    // Mock: roll 2, then 5
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.2)  // 2
      .mockReturnValueOnce(0.7)  // 5
    const result = rollD6Advantage(2)
    expect(result).toBe(5)
    vi.restoreAllMocks()
  })

  it('uses exploding dice when any roll is 6', () => {
    // Mock: roll 3, then 6+2
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.4)  // 3
      .mockReturnValueOnce(0.99) // 6
      .mockReturnValueOnce(0.2)  // 2
    const result = rollD6Advantage(2)
    expect(result).toBe(8) // max(3, 6+2) = 8
    vi.restoreAllMocks()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/util/__tests__/dice.util.test.ts`
Expected: FAIL - functions not exported

**Step 3: Write minimal implementation**

Add to `src/lib/util/dice.util.ts`:
```typescript
/**
 * Roll a single d6
 */
function rollSingleD6(): number {
  return Math.floor(Math.random() * 6) + 1
}

/**
 * Roll a d6 with exploding dice rules
 * If a 6 is rolled, roll again and add to total
 */
export function rollD6Exploding(): number {
  let total = 0
  let roll = rollSingleD6()
  total += roll

  while (roll === 6) {
    roll = rollSingleD6()
    total += roll
  }

  return total
}

/**
 * Roll multiple d6s with advantage (take highest)
 * Uses exploding dice rules for each individual die
 * @param count Number of d6s to roll
 * @returns Highest result (with explosions applied)
 */
export function rollD6Advantage(count: number): number {
  if (count <= 0) return 0

  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    rolls.push(rollD6Exploding())
  }

  return Math.max(...rolls)
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/util/__tests__/dice.util.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/util/dice.util.ts src/lib/util/__tests__/dice.util.test.ts
git commit -m "feat: add d6 rolling with exploding dice and advantage"
```

---

## Task 3: Refactor Initiative Calculation Logic

**Files:**
- Modify: `src/lib/util/initiative.util.ts`
- Modify: `src/lib/util/__tests__/initiative.util.test.ts`

**Step 1: Write the failing tests**

Update test file:
```typescript
// src/lib/util/__tests__/initiative.util.test.ts
import { describe, it, expect, vi } from 'vitest'
import {
  getPlayerInitiativeModifiers,
  calculatePlayerInitiativeContribution,
  type InitiativeModifiers
} from '$lib/util/initiative.util'
import { Skill } from '$lib/data/skill'
import type { PlayerData } from '$lib/models/player'

// Helper to create mock player
function createMockPlayer(majorSkills: Skill[], minorSkills: Skill[]): PlayerData {
  return {
    id: 'test',
    level: 1,
    playerName: 'Test',
    characterName: 'Test',
    maxHealth: 10,
    health: 10,
    maxActionPoints: 4,
    actionPoints: 4,
    maxMagicka: 10,
    magicka: 10,
    birthSign: 'Apprentice' as any,
    archetype: 'Warrior' as any,
    race: 'Nord' as any,
    majorSkills,
    minorSkills,
    subSkills: [],
    knownSpells: [],
    equipment: {
      weapon: { id: null, materialId: null },
      offhand: { id: null, materialId: null },
      armor: { id: null, materialId: null },
      accessories: [],
    },
    inventory: [],
    notes: '',
    createdAt: '',
    updatedAt: '',
  }
}

describe('getPlayerInitiativeModifiers', () => {
  it('returns d6 count for major initiative skills', () => {
    const player = createMockPlayer([Skill.Notice, Skill.Athletics], [])
    const result = getPlayerInitiativeModifiers(player)
    expect(result.d6Count).toBe(2)
    expect(result.flatBonus).toBe(0)
  })

  it('returns flat bonus for minor initiative skills', () => {
    const player = createMockPlayer([], [Skill.Sneak, Skill.Intuition, Skill.Deceive])
    const result = getPlayerInitiativeModifiers(player)
    expect(result.d6Count).toBe(0)
    expect(result.flatBonus).toBe(3)
  })

  it('ignores non-initiative skills', () => {
    const player = createMockPlayer(
      [Skill.OneHanded, Skill.Notice], // OneHanded is not initiative skill
      [Skill.Smithing, Skill.Sneak]   // Smithing is not initiative skill
    )
    const result = getPlayerInitiativeModifiers(player)
    expect(result.d6Count).toBe(1) // Only Notice
    expect(result.flatBonus).toBe(1) // Only Sneak
  })

  it('combines major and minor initiative skills', () => {
    const player = createMockPlayer(
      [Skill.Notice, Skill.Athletics],
      [Skill.Sneak, Skill.Intuition]
    )
    const result = getPlayerInitiativeModifiers(player)
    expect(result.d6Count).toBe(2)
    expect(result.flatBonus).toBe(2)
  })
})

describe('calculatePlayerInitiativeContribution', () => {
  it('calculates d20 + d6 advantage + flat bonus', () => {
    // Mock dice: d20=15, d6s=[3,5] (highest=5)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.7)  // d20 = 15
      .mockReturnValueOnce(0.4) // d6 = 3
      .mockReturnValueOnce(0.7) // d6 = 5

    const modifiers: InitiativeModifiers = { d6Count: 2, flatBonus: 3 }
    const result = calculatePlayerInitiativeContribution(modifiers)

    expect(result.d20Roll).toBe(15)
    expect(result.d6AdvantageRoll).toBe(5)
    expect(result.flatBonus).toBe(3)
    expect(result.total).toBe(23) // 15 + 5 + 3

    vi.restoreAllMocks()
  })

  it('handles zero d6 count', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // d20 = 11

    const modifiers: InitiativeModifiers = { d6Count: 0, flatBonus: 2 }
    const result = calculatePlayerInitiativeContribution(modifiers)

    expect(result.d20Roll).toBe(11)
    expect(result.d6AdvantageRoll).toBe(0)
    expect(result.flatBonus).toBe(2)
    expect(result.total).toBe(13)

    vi.restoreAllMocks()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/util/__tests__/initiative.util.test.ts`
Expected: FAIL - new functions not exported

**Step 3: Write minimal implementation**

Replace `src/lib/util/initiative.util.ts`:
```typescript
import type { PlayerData } from '$lib/models/player'
import type { Skill } from '$lib/data/skill'
import { InitiativeSkills } from '$lib/data/skill'
import { rollD20, rollD6Advantage } from '$lib/util/dice.util'

export interface InitiativeModifiers {
  d6Count: number    // Number of d6 advantage dice (from major skills)
  flatBonus: number  // Flat bonus (from minor skills)
}

export interface InitiativeRollResult {
  d20Roll: number
  d6AdvantageRoll: number
  flatBonus: number
  total: number
}

/**
 * Get initiative modifiers for a player based on their skills
 * Major initiative skills grant +1 d6 advantage die each
 * Minor initiative skills grant +1 flat bonus each
 */
export function getPlayerInitiativeModifiers(player: PlayerData): InitiativeModifiers {
  let d6Count = 0
  let flatBonus = 0

  for (const skill of player.majorSkills) {
    if (InitiativeSkills.includes(skill)) {
      d6Count++
    }
  }

  for (const skill of player.minorSkills) {
    if (InitiativeSkills.includes(skill)) {
      flatBonus++
    }
  }

  return { d6Count, flatBonus }
}

/**
 * Calculate a player's initiative contribution
 * Rolls d20 + d6 advantage (from major skills) + flat bonus (from minor skills)
 */
export function calculatePlayerInitiativeContribution(
  modifiers: InitiativeModifiers
): InitiativeRollResult {
  const d20Roll = rollD20()
  const d6AdvantageRoll = rollD6Advantage(modifiers.d6Count)
  const { flatBonus } = modifiers
  const total = d20Roll + d6AdvantageRoll + flatBonus

  return {
    d20Roll,
    d6AdvantageRoll,
    flatBonus,
    total,
  }
}

// Keep legacy exports for backwards compatibility during migration
// These can be removed once EnterCombatModal is updated

export interface InitiativeSkillInfo {
  skill: Skill
  isMajor: boolean
  isMinor: boolean
  advantageCount: number
  flatBonus: number
}

/** @deprecated Use getPlayerInitiativeModifiers instead */
export function getInitiativeSkills(player: PlayerData): InitiativeSkillInfo[] {
  const result: InitiativeSkillInfo[] = []

  for (const skill of player.majorSkills) {
    if (InitiativeSkills.includes(skill)) {
      result.push({
        skill,
        isMajor: true,
        isMinor: false,
        advantageCount: 1,
        flatBonus: 0,
      })
    }
  }

  for (const skill of player.minorSkills) {
    if (InitiativeSkills.includes(skill)) {
      result.push({
        skill,
        isMajor: false,
        isMinor: true,
        advantageCount: 0,
        flatBonus: 1,
      })
    }
  }

  return result
}

/** @deprecated No longer used in new initiative system */
export function calculateSuccessesFromRoll(rollTotal: number): number {
  if (rollTotal >= 30) return 3
  if (rollTotal >= 20) return 2
  if (rollTotal >= 13) return 1
  return 0
}

/** @deprecated No longer used in new initiative system */
export function calculateInitiativeContribution(
  rollResults: { total: number; isCritical: boolean }[]
): number {
  let totalSuccesses = 0
  for (const result of rollResults) {
    totalSuccesses += calculateSuccessesFromRoll(result.total)
    if (result.isCritical) {
      totalSuccesses += 1
    }
  }
  return totalSuccesses
}

/** @deprecated No longer used in new initiative system */
export function getSkillBonus(player: PlayerData, skill: Skill): number {
  return 0
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/util/__tests__/initiative.util.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/util/initiative.util.ts src/lib/util/__tests__/initiative.util.test.ts
git commit -m "feat: refactor initiative calculation to d20 + d6 advantage + flat bonus"
```

---

## Task 4: Update Combat Model for Initiative Pool Tracking

**Files:**
- Modify: `src/lib/models/combat.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/models/__tests__/combat.test.ts
import { describe, it, expect } from 'vitest'
import type { CombatSession, InitiativePool } from '$lib/models/combat'

describe('InitiativePool interface', () => {
  it('tracks current and max values', () => {
    const pool: InitiativePool = {
      current: 5,
      max: 12,
    }
    expect(pool.current).toBe(5)
    expect(pool.max).toBe(12)
  })
})

describe('CombatSession with initiative pools', () => {
  it('has partyInitiativePool with current/max', () => {
    const session: Partial<CombatSession> = {
      partyInitiativePool: { current: 8, max: 15 },
      enemyInitiativePool: { current: 6, max: 10 },
    }
    expect(session.partyInitiativePool?.current).toBe(8)
    expect(session.partyInitiativePool?.max).toBe(15)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/models/__tests__/combat.test.ts`
Expected: FAIL - InitiativePool not exported

**Step 3: Write minimal implementation**

Add to `src/lib/models/combat.ts` before CombatSession:
```typescript
export interface InitiativePool {
  current: number
  max: number
}
```

Update CombatSession interface:
```typescript
export interface CombatSession {
  id: string
  playerId: string
  round: number
  isPlayerTurn: boolean
  // Legacy fields (keep for backwards compatibility during migration)
  partyInitiative: number
  enemyInitiative: number
  // New initiative pool fields
  partyInitiativePool: InitiativePool
  enemyInitiativePool: InitiativePool
  currentHP: number
  currentMP: number
  currentAP: number
  maxAP: number
  conditions: ActiveCondition[]
  log: CombatLogEntry[]
  distance: CombatDistance
  concentrationSpellId?: string
  isConcentrationBroken: boolean
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/models/__tests__/combat.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/models/combat.ts src/lib/models/__tests__/combat.test.ts
git commit -m "feat: add InitiativePool interface with current/max tracking"
```

---

## Task 5: Update Combat Store for Initiative Pool Operations

**Files:**
- Modify: `src/lib/stores/combat.store.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/stores/__tests__/combat.store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { combatStore } from '$lib/stores/combat.store'
import { get } from 'svelte/store'

describe('combatStore initiative pool operations', () => {
  const playerId = 'test-player'

  beforeEach(() => {
    // Clear any existing session
    combatStore.endCombat(playerId)
  })

  it('starts combat with initiative pools', () => {
    combatStore.startCombat(playerId, 12, 8, {
      health: 10,
      magicka: 10,
      maxActionPoints: 4,
    })

    const session = combatStore.getSession(playerId)
    expect(session?.partyInitiativePool).toEqual({ current: 12, max: 12 })
    expect(session?.enemyInitiativePool).toEqual({ current: 8, max: 8 })
  })

  it('spends party initiative from pool', () => {
    combatStore.startCombat(playerId, 10, 5, {
      health: 10,
      magicka: 10,
      maxActionPoints: 4,
    })

    combatStore.spendInitiative(playerId, 2)

    const session = combatStore.getSession(playerId)
    expect(session?.partyInitiativePool.current).toBe(8)
    expect(session?.partyInitiativePool.max).toBe(10)
  })

  it('gains party initiative up to max', () => {
    combatStore.startCombat(playerId, 10, 5, {
      health: 10,
      magicka: 10,
      maxActionPoints: 4,
    })

    combatStore.spendInitiative(playerId, 3)
    combatStore.gainInitiative(playerId, 5)

    const session = combatStore.getSession(playerId)
    // Started at 10, spent 3 (=7), gained 5 but capped at max (=10)
    expect(session?.partyInitiativePool.current).toBe(10)
  })

  it('adjusts enemy initiative', () => {
    combatStore.startCombat(playerId, 10, 8, {
      health: 10,
      magicka: 10,
      maxActionPoints: 4,
    })

    combatStore.adjustEnemyInitiative(playerId, -2)

    const session = combatStore.getSession(playerId)
    expect(session?.enemyInitiativePool.current).toBe(6)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/stores/__tests__/combat.store.test.ts`
Expected: FAIL - new methods not implemented

**Step 3: Write minimal implementation**

Update `startCombat` in `src/lib/stores/combat.store.ts`:
```typescript
startCombat: (
  playerId: string,
  partyInitiative: number,
  enemyInitiative: number,
  playerData: { health: number; magicka: number; maxActionPoints: number }
): void => {
  update((state) => {
    const session: CombatSession = {
      id: crypto.randomUUID(),
      playerId,
      round: 1,
      isPlayerTurn: partyInitiative >= enemyInitiative,
      // Legacy fields
      partyInitiative,
      enemyInitiative,
      // New initiative pool fields
      partyInitiativePool: { current: partyInitiative, max: partyInitiative },
      enemyInitiativePool: { current: enemyInitiative, max: enemyInitiative },
      currentHP: playerData.health,
      currentMP: playerData.magicka,
      currentAP: playerData.maxActionPoints,
      maxAP: playerData.maxActionPoints,
      conditions: [],
      log: [createCombatLogEntry('system', 'Combat started!')],
      distance: CombatDistance.Medium,
      concentrationSpellId: undefined,
      isConcentrationBroken: false
    }
    return { ...state, [playerId]: session }
  })
},
```

Update `spendInitiative`:
```typescript
spendInitiative: (playerId: string, amount: number): void => {
  update((state) => {
    const session = state[playerId]
    if (!session) return state
    const newCurrent = Math.max(0, session.partyInitiativePool.current - amount)
    return {
      ...state,
      [playerId]: {
        ...session,
        partyInitiative: newCurrent, // Legacy
        partyInitiativePool: {
          ...session.partyInitiativePool,
          current: newCurrent,
        },
      }
    }
  })
},
```

Update `gainInitiative`:
```typescript
gainInitiative: (playerId: string, amount: number): void => {
  update((state) => {
    const session = state[playerId]
    if (!session) return state
    const newCurrent = Math.min(
      session.partyInitiativePool.max,
      session.partyInitiativePool.current + amount
    )
    return {
      ...state,
      [playerId]: {
        ...session,
        partyInitiative: newCurrent, // Legacy
        partyInitiativePool: {
          ...session.partyInitiativePool,
          current: newCurrent,
        },
      }
    }
  })
},
```

Add new method:
```typescript
adjustEnemyInitiative: (playerId: string, delta: number): void => {
  update((state) => {
    const session = state[playerId]
    if (!session) return state
    const newCurrent = Math.max(0, Math.min(
      session.enemyInitiativePool.max,
      session.enemyInitiativePool.current + delta
    ))
    return {
      ...state,
      [playerId]: {
        ...session,
        enemyInitiative: newCurrent, // Legacy
        enemyInitiativePool: {
          ...session.enemyInitiativePool,
          current: newCurrent,
        },
      }
    }
  })
},
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/stores/__tests__/combat.store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/stores/combat.store.ts src/lib/stores/__tests__/combat.store.test.ts
git commit -m "feat: update combat store with initiative pool tracking"
```

---

## Task 6: Redesign EnterCombatModal for New Initiative System

**Files:**
- Modify: `src/lib/components/combat/modals/EnterCombatModal.svelte`

**Step 1: Read existing implementation**

Already reviewed above. The modal needs to:
1. Show each player's initiative modifiers (d6 count, flat bonus)
2. Roll a single d20 + d6 advantage + flat for each player
3. Sum all player contributions for party total
4. Accept enemy initiative input
5. Pass both values to start combat

**Step 2: Write the new implementation**

Replace `src/lib/components/combat/modals/EnterCombatModal.svelte`:
```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { PlayerData } from '$lib/models/player'
  import {
    getPlayerInitiativeModifiers,
    calculatePlayerInitiativeContribution,
    type InitiativeRollResult
  } from '$lib/util/initiative.util'

  export let player: PlayerData

  const dispatch = createEventDispatcher<{
    start: { partyInit: number; enemyInit: number }
    cancel: void
  }>()

  let enemyInitiative = 0
  let hasRolled = false
  let rollResult: InitiativeRollResult | null = null

  // Get modifiers for display
  const modifiers = getPlayerInitiativeModifiers(player)

  function rollInitiative() {
    rollResult = calculatePlayerInitiativeContribution(modifiers)
    hasRolled = true
  }

  function handleConfirm() {
    if (!rollResult) return
    dispatch('start', {
      partyInit: rollResult.total,
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
    <!-- Initiative Modifiers Display -->
    <div class="card variant-soft p-3">
      <h4 class="font-semibold mb-2">Your Initiative Modifiers</h4>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span class="opacity-75">Major Initiative Skills:</span>
          <span class="font-bold">{modifiers.d6Count}</span>
          {#if modifiers.d6Count > 0}
            <span class="text-xs opacity-60">(roll {modifiers.d6Count}d6, take highest)</span>
          {/if}
        </div>
        <div>
          <span class="opacity-75">Minor Initiative Skills:</span>
          <span class="font-bold">+{modifiers.flatBonus}</span>
        </div>
      </div>
    </div>

    <!-- Roll Button -->
    <div class="text-center">
      <button
        type="button"
        class="btn variant-filled-primary"
        on:click={rollInitiative}
        disabled={hasRolled}
      >
        Roll Initiative (1d20 + {modifiers.d6Count}d6 + {modifiers.flatBonus})
      </button>
    </div>

    <!-- Roll Results -->
    {#if rollResult}
      <div class="card variant-soft-primary p-4">
        <h4 class="font-semibold mb-2 text-center">Roll Results</h4>
        <div class="grid grid-cols-3 gap-2 text-center mb-3">
          <div>
            <div class="text-xs opacity-75">d20</div>
            <div class="text-2xl font-bold">{rollResult.d20Roll}</div>
          </div>
          <div>
            <div class="text-xs opacity-75">d6 Adv</div>
            <div class="text-2xl font-bold">
              {#if rollResult.d6AdvantageRoll > 0}
                +{rollResult.d6AdvantageRoll}
              {:else}
                -
              {/if}
            </div>
          </div>
          <div>
            <div class="text-xs opacity-75">Flat</div>
            <div class="text-2xl font-bold">
              {#if rollResult.flatBonus > 0}
                +{rollResult.flatBonus}
              {:else}
                -
              {/if}
            </div>
          </div>
        </div>
        <div class="text-center border-t border-surface-500/20 pt-2">
          <span class="text-sm opacity-75">Total:</span>
          <span class="text-3xl font-bold text-primary-500 ml-2">{rollResult.total}</span>
        </div>
      </div>
    {/if}

    <!-- Party Initiative (editable after roll) -->
    {#if hasRolled}
      <label class="label">
        <span>Party Initiative Total</span>
        <input
          type="number"
          class="input"
          bind:value={rollResult.total}
          min="1"
        />
        <span class="text-xs opacity-60">Adjust if multiple party members or other bonuses apply</span>
      </label>
    {/if}

    <!-- Enemy Initiative -->
    <label class="label">
      <span>Enemy Initiative</span>
      <input
        type="number"
        class="input"
        bind:value={enemyInitiative}
        min="0"
      />
    </label>
  </div>

  <footer class="flex justify-end gap-2 mt-6">
    <button type="button" class="btn variant-ghost" on:click={handleCancel}>
      Cancel
    </button>
    <button
      type="button"
      class="btn variant-filled-primary"
      on:click={handleConfirm}
      disabled={!hasRolled}
    >
      Start Combat
    </button>
  </footer>
</div>
```

**Step 3: Manual test**

1. Open the app
2. Navigate to a character with some initiative skills (Notice, Athletics, etc.)
3. Enter combat
4. Verify the modal shows correct d6 count and flat bonus
5. Click roll and verify the calculation is correct
6. Confirm combat starts with correct values

**Step 4: Commit**

```bash
git add src/lib/components/combat/modals/EnterCombatModal.svelte
git commit -m "feat: redesign EnterCombatModal for new initiative system"
```

---

## Task 7: Update InitiativeTracker for Current/Max Display

**Files:**
- Modify: `src/lib/components/combat/InitiativeTracker.svelte`

**Step 1: Update the component**

Replace `src/lib/components/combat/InitiativeTracker.svelte`:
```svelte
<script lang="ts">
  import type { InitiativePool } from '$lib/models/combat'

  export let partyPool: InitiativePool
  export let enemyPool: InitiativePool
  export let onAdjustParty: (delta: number) => void
  export let onAdjustEnemy: (delta: number) => void
</script>

<div class="initiative-tracker card p-4 variant-soft-surface">
  <h4 class="font-semibold text-center mb-4">Initiative</h4>

  <div class="grid grid-cols-2 gap-4">
    <!-- Party Initiative -->
    <div class="text-center">
      <div class="text-xs uppercase tracking-wide opacity-75 mb-1">Party</div>
      <div class="text-4xl font-bold text-primary-500">
        {partyPool.current}
      </div>
      <div class="text-sm opacity-60 mb-2">/ {partyPool.max}</div>
      <div class="flex justify-center gap-1">
        <button
          type="button"
          class="btn btn-sm variant-ghost-error"
          on:click={() => onAdjustParty(-1)}
          disabled={partyPool.current <= 0}
        >
          -
        </button>
        <button
          type="button"
          class="btn btn-sm variant-ghost-success"
          on:click={() => onAdjustParty(1)}
          disabled={partyPool.current >= partyPool.max}
        >
          +
        </button>
      </div>
    </div>

    <!-- Enemy Initiative -->
    <div class="text-center">
      <div class="text-xs uppercase tracking-wide opacity-75 mb-1">Enemy</div>
      <div class="text-4xl font-bold text-error-500">
        {enemyPool.current}
      </div>
      <div class="text-sm opacity-60 mb-2">/ {enemyPool.max}</div>
      <div class="flex justify-center gap-1">
        <button
          type="button"
          class="btn btn-sm variant-ghost-error"
          on:click={() => onAdjustEnemy(-1)}
          disabled={enemyPool.current <= 0}
        >
          -
        </button>
        <button
          type="button"
          class="btn btn-sm variant-ghost-success"
          on:click={() => onAdjustEnemy(1)}
          disabled={enemyPool.current >= enemyPool.max}
        >
          +
        </button>
      </div>
    </div>
  </div>

  <!-- Advantage Indicator -->
  <div class="mt-4 pt-3 border-t border-surface-500/20 text-center text-sm">
    {#if partyPool.current > enemyPool.current}
      <span class="text-primary-500 font-semibold">Party has initiative advantage!</span>
    {:else if enemyPool.current > partyPool.current}
      <span class="text-error-500 font-semibold">Enemy has initiative advantage!</span>
    {:else}
      <span class="opacity-75">Initiative is tied</span>
    {/if}
  </div>

  <!-- Warning when initiative is low -->
  {#if partyPool.current <= 2 && partyPool.current > 0}
    <div class="mt-2 text-center text-warning-500 text-xs">
      Warning: Low initiative! If it reaches 0, enemy gets a bonus attack.
    </div>
  {/if}
</div>
```

**Step 2: Manual test**

1. Start combat
2. Verify tracker shows "X / Max" format
3. Test +/- buttons respect max limit
4. Verify warning appears when party initiative is low

**Step 3: Commit**

```bash
git add src/lib/components/combat/InitiativeTracker.svelte
git commit -m "feat: update InitiativeTracker to show current/max initiative pools"
```

---

## Task 8: Update Parent Components to Use New Props

**Files:**
- Find and modify any components that use InitiativeTracker

**Step 1: Search for usages**

Run: `grep -r "InitiativeTracker" src/`

**Step 2: Update each parent component**

For each component that uses InitiativeTracker, update the props from:
```svelte
<InitiativeTracker
  partyInitiative={session.partyInitiative}
  enemyInitiative={session.enemyInitiative}
  onAdjustParty={(delta) => ...}
  onAdjustEnemy={(delta) => ...}
/>
```

To:
```svelte
<InitiativeTracker
  partyPool={session.partyInitiativePool}
  enemyPool={session.enemyInitiativePool}
  onAdjustParty={(delta) => combatStore.gainInitiative(player.id, delta)}
  onAdjustEnemy={(delta) => combatStore.adjustEnemyInitiative(player.id, delta)}
/>
```

**Step 3: Manual test**

1. Start combat and verify tracker works
2. Spend initiative via reactions
3. Verify values sync correctly

**Step 4: Commit**

```bash
git add src/lib/components/combat/
git commit -m "feat: update combat components to use new initiative pool props"
```

---

## Task 9: Clean Up Legacy Code

**Files:**
- Modify: `src/lib/util/initiative.util.ts` - Remove deprecated functions
- Modify: `src/lib/models/combat.ts` - Remove legacy fields if no longer used

**Step 1: Verify no remaining usages of legacy functions**

Run: `grep -r "getInitiativeSkills\|calculateSuccessesFromRoll\|calculateInitiativeContribution\|getSkillBonus" src/`

If no results (or only the deprecated definitions), proceed to remove.

**Step 2: Remove deprecated exports from initiative.util.ts**

Remove the following from the file:
- `InitiativeSkillInfo` interface
- `getInitiativeSkills` function
- `calculateSuccessesFromRoll` function
- `calculateInitiativeContribution` function
- `getSkillBonus` function

**Step 3: Verify tests still pass**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/lib/util/initiative.util.ts
git commit -m "chore: remove deprecated initiative calculation functions"
```

---

## Summary

This plan implements the redesigned initiative system where:

1. **Initiative skills** (Notice, Athletics, Dexterity, Acrobatics, Sneak, Intuition, Deceive) are explicitly defined
2. **Major skills** grant d6 advantage dice with exploding 6s
3. **Minor skills** grant flat +1 bonuses
4. **Single d20 roll per player** plus d6 advantage plus flat bonus
5. **Party pool tracks current/max** values
6. **UI shows "X / Max"** format with warnings when low

The changes maintain backwards compatibility during migration, with legacy fields kept until all consumers are updated.
