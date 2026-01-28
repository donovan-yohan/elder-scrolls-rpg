# Racial Resistances System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a comprehensive racial resistances system that defines damage types, adds resistance data to race definitions, modifies damage calculations to apply resistances, displays resistances in the character sheet, and integrates with the existing `takeDamageWithEffects` method.

**Architecture:** Extend the existing effect system to support percentage-based resistances and immunities. Resistances are applied after magical DR effects, as specified in the game rules. The system uses a `DamageType` enum to categorize damage and a `RacialResistance` interface to define resistance values per race.

**Tech Stack:** TypeScript, SvelteKit, existing effect system integration

---

## Game Rules Reference

From `docs/Game Flow Rules (1).md`:
> "First any DR from an ongoing magical effect would be applied if possible. Than yout take into account racial resistances (Dunmer fire resistant, nord cold resistant etc.) The remaining damage is dealt to your HP."

**Damage Reduction Order:**
1. Magical effect DR (existing)
2. Racial resistances (this implementation)
3. Remaining damage applied to HP

---

## Scope Summary

### Damage Types to Define
Based on existing `element.ts` and game documentation:
- **Fire** - Dunmer resistant
- **Frost** - Nord resistant
- **Shock** - Electrical damage
- **Poison** - Argonian immune, Redguard/Bosmer resistant
- **Disease** - Argonian immune, Redguard/Altmer/Bosmer resistant
- **Physical** - Slashing, Piercing, Bludgeoning (no racial resistances)
- **Magic** - General spell damage (Breton/Orsimer spell resistance)

### Racial Resistances from race.ts Descriptions
| Race | Resistances |
|------|-------------|
| Breton | Spell Resistance +5 |
| Nord | Frost Resistance +10, Cold Immunity (non-magical) |
| Imperial | None |
| Redguard | Disease 75%, Poison 75% |
| Altmer | Disease 25%, Spell Weakness -5 |
| Bosmer | Poison 50%, Disease 50% |
| Dunmer | Fire Resistance +10, Heat Immunity (non-magical) |
| Orsimer | Spell Resistance +2 |
| Argonian | Disease Immunity, Poison Immunity |
| Khajiit | None |

---

## Phase 1: Extend Damage Type Definitions

### Task 1: Update Element/DamageType Enum

**Files:**
- Modify: `src/lib/data/element.ts`

**Step 1: Extend the Element enum with all damage types**

```typescript
// src/lib/data/element.ts
export enum DamageType {
  // Elemental
  Fire = 'Fire',
  Frost = 'Frost',
  Shock = 'Shock',

  // Status
  Poison = 'Poison',
  Disease = 'Disease',

  // Physical
  Slashing = 'Slashing',
  Piercing = 'Piercing',
  Bludgeoning = 'Bludgeoning',
  Physical = 'Physical', // Generic physical damage

  // Magical
  Magic = 'Magic', // Generic magical damage for spell resistance
}

// Keep Element as an alias for backwards compatibility
export const Element = DamageType

// Helper to check if damage type is elemental
export function isElementalDamage(type: DamageType): boolean {
  return type === DamageType.Fire || type === DamageType.Frost || type === DamageType.Shock
}

// Helper to check if damage type is physical
export function isPhysicalDamage(type: DamageType): boolean {
  return type === DamageType.Slashing ||
         type === DamageType.Piercing ||
         type === DamageType.Bludgeoning ||
         type === DamageType.Physical
}

// Helper to check if damage is magical (for spell resistance)
export function isMagicalDamage(type: DamageType): boolean {
  return type === DamageType.Magic || isElementalDamage(type)
}
```

**Step 2: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: May have errors in files using old Element enum - fix in next step

**Step 3: Update imports across codebase**

Search and update any files importing `Element` to ensure compatibility:
- `src/lib/data/conditionEffects.ts` - uses `Element.Fire`, `Element.Frost`
- `src/lib/data/raceEffects.ts` - may need updates

**Step 4: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/data/element.ts
git commit -m "feat(damage): extend DamageType enum with all damage categories

Adds Shock, Physical damage types (Slashing, Piercing, Bludgeoning),
and Magic type for spell resistance. Maintains backwards compatibility
with Element alias."
```

---

## Phase 2: Define Racial Resistance Data Structure

### Task 2: Create Racial Resistance Types and Data

**Files:**
- Create: `src/lib/data/racialResistances.ts`

**Step 1: Define resistance types**

```typescript
// src/lib/data/racialResistances.ts
import { RaceName } from './race'
import { DamageType } from './element'

/**
 * Resistance value interpretation:
 * - Positive number: flat damage reduction (e.g., +10 means reduce damage by 10)
 * - Negative number: vulnerability (e.g., -5 means take 5 more damage)
 * - 100 = immunity (percentage-based resistances)
 * - For percentage resistances, value is the percent reduced (75 = 75% reduced)
 */
export interface DamageResistance {
  type: DamageType
  flatReduction?: number    // Flat damage reduction (e.g., Nord frost +10)
  percentReduction?: number // Percentage reduction (e.g., Redguard poison 75%)
  immunity?: boolean        // Complete immunity (e.g., Argonian disease)
}

export interface RacialResistanceData {
  resistances: DamageResistance[]
  spellResistance?: number  // Flat reduction to all magical damage
  immunities: string[]      // Descriptive immunities (e.g., "non-magical cold")
}
```

**Step 2: Define resistance data for each race**

```typescript
// Breton: Spell resistance +5
export const BretonResistances: RacialResistanceData = {
  resistances: [],
  spellResistance: 5,
  immunities: [],
}

// Nord: Frost Resistance +10, Immunity to non-magical cold
export const NordResistances: RacialResistanceData = {
  resistances: [
    { type: DamageType.Frost, flatReduction: 10 },
  ],
  immunities: ['Non-magical cold'],
}

// Imperial: No resistances
export const ImperialResistances: RacialResistanceData = {
  resistances: [],
  immunities: [],
}

// Redguard: Disease 75%, Poison 75%
export const RedguardResistances: RacialResistanceData = {
  resistances: [
    { type: DamageType.Disease, percentReduction: 75 },
    { type: DamageType.Poison, percentReduction: 75 },
  ],
  immunities: [],
}

// Altmer: Disease 25%, Spell Weakness -5
export const AltmerResistances: RacialResistanceData = {
  resistances: [
    { type: DamageType.Disease, percentReduction: 25 },
  ],
  spellResistance: -5, // Weakness
  immunities: [],
}

// Bosmer: Poison 50%, Disease 50%
export const BosmerResistances: RacialResistanceData = {
  resistances: [
    { type: DamageType.Poison, percentReduction: 50 },
    { type: DamageType.Disease, percentReduction: 50 },
  ],
  immunities: [],
}

// Dunmer: Fire Resistance +10, Immunity to non-magical heat
export const DunmerResistances: RacialResistanceData = {
  resistances: [
    { type: DamageType.Fire, flatReduction: 10 },
  ],
  immunities: ['Non-magical heat'],
}

// Orsimer: Spell Resistance +2
export const OrsimerResistances: RacialResistanceData = {
  resistances: [],
  spellResistance: 2,
  immunities: [],
}

// Argonian: Disease Immunity, Poison Immunity
export const ArgonianResistances: RacialResistanceData = {
  resistances: [
    { type: DamageType.Disease, immunity: true },
    { type: DamageType.Poison, immunity: true },
  ],
  immunities: [],
}

// Khajiit: No resistances
export const KhajiitResistances: RacialResistanceData = {
  resistances: [],
  immunities: [],
}
```

**Step 3: Create master lookup**

```typescript
export const RacialResistances: Record<RaceName, RacialResistanceData> = {
  [RaceName.Breton]: BretonResistances,
  [RaceName.Nord]: NordResistances,
  [RaceName.Imperial]: ImperialResistances,
  [RaceName.Redguard]: RedguardResistances,
  [RaceName.Altmer]: AltmerResistances,
  [RaceName.Bosmer]: BosmerResistances,
  [RaceName.Dunmer]: DunmerResistances,
  [RaceName.Orsimer]: OrsimerResistances,
  [RaceName.Argonian]: ArgonianResistances,
  [RaceName.Khajiit]: KhajiitResistances,
}

/**
 * Get racial resistance data for a race
 */
export function getRacialResistances(race: RaceName): RacialResistanceData {
  return RacialResistances[race] ?? { resistances: [], immunities: [] }
}

/**
 * Get resistance for a specific damage type
 */
export function getResistanceForDamageType(
  race: RaceName,
  damageType: DamageType
): DamageResistance | undefined {
  const data = getRacialResistances(race)
  return data.resistances.find(r => r.type === damageType)
}

/**
 * Check if race is immune to damage type
 */
export function isImmuneToType(race: RaceName, damageType: DamageType): boolean {
  const resistance = getResistanceForDamageType(race, damageType)
  return resistance?.immunity === true
}
```

**Step 4: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/data/racialResistances.ts
git commit -m "feat(resistances): add racial resistance data definitions

Defines DamageResistance interface with flat reduction, percentage
reduction, and immunity support. Includes resistance data for all
10 races based on game documentation."
```

---

## Phase 3: Create Resistance Calculation Utility

### Task 3: Implement Damage Calculation with Resistances

**Files:**
- Create: `src/lib/util/resistance.util.ts`

**Step 1: Create resistance calculation functions**

```typescript
// src/lib/util/resistance.util.ts
import type { RaceName } from '$lib/data/race'
import { DamageType, isMagicalDamage } from '$lib/data/element'
import {
  getRacialResistances,
  getResistanceForDamageType,
  type RacialResistanceData,
} from '$lib/data/racialResistances'

export interface DamageCalculationResult {
  originalDamage: number
  damageType: DamageType | string
  flatReduction: number
  percentReduction: number
  spellResistance: number
  finalDamage: number
  isImmune: boolean
  reductionSources: string[]
}

/**
 * Calculate damage after applying racial resistances
 *
 * Order of operations:
 * 1. Check for immunity
 * 2. Apply flat reductions (racial + spell resistance)
 * 3. Apply percentage reductions
 * 4. Floor to 0 minimum
 */
export function calculateDamageWithResistances(
  race: RaceName,
  damage: number,
  damageType: DamageType | string,
  isMagicSource: boolean = false
): DamageCalculationResult {
  const result: DamageCalculationResult = {
    originalDamage: damage,
    damageType,
    flatReduction: 0,
    percentReduction: 0,
    spellResistance: 0,
    finalDamage: damage,
    isImmune: false,
    reductionSources: [],
  }

  const resistanceData = getRacialResistances(race)
  const typeAsEnum = damageType as DamageType

  // Check for specific damage type resistance
  const typeResistance = getResistanceForDamageType(race, typeAsEnum)

  // Check for immunity first
  if (typeResistance?.immunity) {
    result.isImmune = true
    result.finalDamage = 0
    result.reductionSources.push(`${race} immunity to ${damageType}`)
    return result
  }

  let currentDamage = damage

  // Apply spell resistance if damage is magical
  if (resistanceData.spellResistance && (isMagicSource || isMagicalDamage(typeAsEnum))) {
    result.spellResistance = resistanceData.spellResistance
    currentDamage -= resistanceData.spellResistance

    if (resistanceData.spellResistance > 0) {
      result.reductionSources.push(`${race} spell resistance (-${resistanceData.spellResistance})`)
    } else {
      result.reductionSources.push(`${race} spell weakness (+${Math.abs(resistanceData.spellResistance)})`)
    }
  }

  // Apply flat reduction for specific type
  if (typeResistance?.flatReduction) {
    result.flatReduction = typeResistance.flatReduction
    currentDamage -= typeResistance.flatReduction
    result.reductionSources.push(`${race} ${damageType} resistance (-${typeResistance.flatReduction})`)
  }

  // Apply percentage reduction
  if (typeResistance?.percentReduction) {
    result.percentReduction = typeResistance.percentReduction
    const reduction = Math.floor(currentDamage * (typeResistance.percentReduction / 100))
    currentDamage -= reduction
    result.reductionSources.push(`${race} ${damageType} resistance (${typeResistance.percentReduction}% = -${reduction})`)
  }

  // Floor to 0
  result.finalDamage = Math.max(0, Math.floor(currentDamage))

  return result
}

/**
 * Format resistance for display (e.g., "Fire +10", "Poison 75%", "Disease Immune")
 */
export function formatResistance(resistance: {
  type: DamageType
  flatReduction?: number
  percentReduction?: number
  immunity?: boolean
}): string {
  if (resistance.immunity) {
    return `${resistance.type} Immune`
  }
  if (resistance.flatReduction) {
    const sign = resistance.flatReduction > 0 ? '+' : ''
    return `${resistance.type} ${sign}${resistance.flatReduction}`
  }
  if (resistance.percentReduction) {
    return `${resistance.type} ${resistance.percentReduction}%`
  }
  return resistance.type
}

/**
 * Get all resistances for display in character sheet
 */
export function getDisplayResistances(race: RaceName): string[] {
  const data = getRacialResistances(race)
  const displays: string[] = []

  // Add spell resistance
  if (data.spellResistance) {
    const sign = data.spellResistance > 0 ? '+' : ''
    displays.push(`Spell Resistance ${sign}${data.spellResistance}`)
  }

  // Add type resistances
  for (const resistance of data.resistances) {
    displays.push(formatResistance(resistance))
  }

  // Add descriptive immunities
  for (const immunity of data.immunities) {
    displays.push(`${immunity} (Immunity)`)
  }

  return displays
}
```

**Step 2: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/util/resistance.util.ts
git commit -m "feat(resistances): add resistance calculation utility

Implements calculateDamageWithResistances function with support for
immunity, flat reduction, percentage reduction, and spell resistance.
Includes formatting helpers for character sheet display."
```

---

## Phase 4: Write Unit Tests

### Task 4: Create Resistance System Tests

**Files:**
- Create: `src/lib/util/resistance.util.test.ts`

**Step 1: Write comprehensive tests**

```typescript
// src/lib/util/resistance.util.test.ts
import { describe, it, expect } from 'vitest'
import { RaceName } from '$lib/data/race'
import { DamageType } from '$lib/data/element'
import {
  calculateDamageWithResistances,
  getDisplayResistances,
  formatResistance,
} from './resistance.util'

describe('resistance.util', () => {
  describe('calculateDamageWithResistances', () => {
    describe('Argonian immunity', () => {
      it('should be immune to poison damage', () => {
        const result = calculateDamageWithResistances(
          RaceName.Argonian,
          20,
          DamageType.Poison
        )
        expect(result.isImmune).toBe(true)
        expect(result.finalDamage).toBe(0)
        expect(result.reductionSources).toContain('Argonian immunity to Poison')
      })

      it('should be immune to disease damage', () => {
        const result = calculateDamageWithResistances(
          RaceName.Argonian,
          15,
          DamageType.Disease
        )
        expect(result.isImmune).toBe(true)
        expect(result.finalDamage).toBe(0)
      })

      it('should take normal fire damage', () => {
        const result = calculateDamageWithResistances(
          RaceName.Argonian,
          20,
          DamageType.Fire,
          true
        )
        expect(result.isImmune).toBe(false)
        expect(result.finalDamage).toBe(20)
      })
    })

    describe('Nord frost resistance', () => {
      it('should reduce frost damage by 10', () => {
        const result = calculateDamageWithResistances(
          RaceName.Nord,
          25,
          DamageType.Frost
        )
        expect(result.flatReduction).toBe(10)
        expect(result.finalDamage).toBe(15)
        expect(result.reductionSources).toContain('Nord Frost resistance (-10)')
      })

      it('should floor damage to 0 if resistance exceeds damage', () => {
        const result = calculateDamageWithResistances(
          RaceName.Nord,
          5,
          DamageType.Frost
        )
        expect(result.finalDamage).toBe(0)
      })

      it('should not affect fire damage', () => {
        const result = calculateDamageWithResistances(
          RaceName.Nord,
          20,
          DamageType.Fire,
          true
        )
        expect(result.flatReduction).toBe(0)
        expect(result.finalDamage).toBe(20)
      })
    })

    describe('Dunmer fire resistance', () => {
      it('should reduce fire damage by 10', () => {
        const result = calculateDamageWithResistances(
          RaceName.Dunmer,
          30,
          DamageType.Fire
        )
        expect(result.flatReduction).toBe(10)
        expect(result.finalDamage).toBe(20)
      })
    })

    describe('Redguard percentage resistance', () => {
      it('should reduce poison damage by 75%', () => {
        const result = calculateDamageWithResistances(
          RaceName.Redguard,
          20,
          DamageType.Poison
        )
        expect(result.percentReduction).toBe(75)
        expect(result.finalDamage).toBe(5) // 20 - 15 (75% of 20)
      })

      it('should reduce disease damage by 75%', () => {
        const result = calculateDamageWithResistances(
          RaceName.Redguard,
          40,
          DamageType.Disease
        )
        expect(result.finalDamage).toBe(10) // 40 - 30 (75% of 40)
      })
    })

    describe('Breton spell resistance', () => {
      it('should reduce magical damage by 5', () => {
        const result = calculateDamageWithResistances(
          RaceName.Breton,
          20,
          DamageType.Fire,
          true // magic source
        )
        expect(result.spellResistance).toBe(5)
        expect(result.finalDamage).toBe(15)
      })

      it('should apply to elemental magic damage', () => {
        const result = calculateDamageWithResistances(
          RaceName.Breton,
          20,
          DamageType.Frost,
          true
        )
        expect(result.spellResistance).toBe(5)
        expect(result.finalDamage).toBe(15)
      })

      it('should not apply to physical damage', () => {
        const result = calculateDamageWithResistances(
          RaceName.Breton,
          20,
          DamageType.Physical,
          false
        )
        expect(result.spellResistance).toBe(0)
        expect(result.finalDamage).toBe(20)
      })
    })

    describe('Altmer spell weakness', () => {
      it('should increase magical damage by 5', () => {
        const result = calculateDamageWithResistances(
          RaceName.Altmer,
          20,
          DamageType.Fire,
          true
        )
        expect(result.spellResistance).toBe(-5)
        expect(result.finalDamage).toBe(25)
        expect(result.reductionSources).toContain('Altmer spell weakness (+5)')
      })

      it('should still have disease resistance', () => {
        const result = calculateDamageWithResistances(
          RaceName.Altmer,
          20,
          DamageType.Disease
        )
        expect(result.percentReduction).toBe(25)
        expect(result.finalDamage).toBe(15) // 20 - 5 (25% of 20)
      })
    })

    describe('Bosmer resistances', () => {
      it('should reduce poison by 50%', () => {
        const result = calculateDamageWithResistances(
          RaceName.Bosmer,
          20,
          DamageType.Poison
        )
        expect(result.finalDamage).toBe(10)
      })

      it('should reduce disease by 50%', () => {
        const result = calculateDamageWithResistances(
          RaceName.Bosmer,
          30,
          DamageType.Disease
        )
        expect(result.finalDamage).toBe(15)
      })
    })

    describe('Orsimer spell resistance', () => {
      it('should reduce magical damage by 2', () => {
        const result = calculateDamageWithResistances(
          RaceName.Orsimer,
          20,
          DamageType.Shock,
          true
        )
        expect(result.spellResistance).toBe(2)
        expect(result.finalDamage).toBe(18)
      })
    })

    describe('races without resistances', () => {
      it('Imperial should take full damage', () => {
        const result = calculateDamageWithResistances(
          RaceName.Imperial,
          20,
          DamageType.Fire,
          true
        )
        expect(result.finalDamage).toBe(20)
        expect(result.reductionSources).toHaveLength(0)
      })

      it('Khajiit should take full damage', () => {
        const result = calculateDamageWithResistances(
          RaceName.Khajiit,
          20,
          DamageType.Poison
        )
        expect(result.finalDamage).toBe(20)
      })
    })
  })

  describe('getDisplayResistances', () => {
    it('should return formatted resistances for Argonian', () => {
      const displays = getDisplayResistances(RaceName.Argonian)
      expect(displays).toContain('Disease Immune')
      expect(displays).toContain('Poison Immune')
    })

    it('should return formatted resistances for Nord', () => {
      const displays = getDisplayResistances(RaceName.Nord)
      expect(displays).toContain('Frost +10')
      expect(displays).toContain('Non-magical cold (Immunity)')
    })

    it('should return formatted resistances for Breton', () => {
      const displays = getDisplayResistances(RaceName.Breton)
      expect(displays).toContain('Spell Resistance +5')
    })

    it('should return spell weakness for Altmer', () => {
      const displays = getDisplayResistances(RaceName.Altmer)
      expect(displays).toContain('Spell Resistance -5')
      expect(displays).toContain('Disease 25%')
    })

    it('should return empty array for Imperial', () => {
      const displays = getDisplayResistances(RaceName.Imperial)
      expect(displays).toHaveLength(0)
    })
  })

  describe('formatResistance', () => {
    it('should format immunity', () => {
      expect(formatResistance({ type: DamageType.Poison, immunity: true }))
        .toBe('Poison Immune')
    })

    it('should format flat reduction', () => {
      expect(formatResistance({ type: DamageType.Fire, flatReduction: 10 }))
        .toBe('Fire +10')
    })

    it('should format percentage reduction', () => {
      expect(formatResistance({ type: DamageType.Disease, percentReduction: 75 }))
        .toBe('Disease 75%')
    })
  })
})
```

**Step 2: Run tests**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/util/resistance.util.test.ts
git commit -m "test(resistances): add comprehensive resistance calculation tests

Tests immunity, flat reduction, percentage reduction, spell resistance,
spell weakness, and display formatting for all races."
```

---

## Phase 5: Update Race Effects to Use New Resistance System

### Task 5: Refactor raceEffects.ts to Use Racial Resistances

**Files:**
- Modify: `src/lib/data/raceEffects.ts`

**Step 1: Update existing race effects to use resistance data**

The existing `raceEffects.ts` has Nord and Dunmer effects hardcoded. We need to ensure they work with the new system. The existing effects use `ModifyIncomingDamage` with a `value` of -10, which is correct for flat reduction.

However, we should add the missing percentage-based resistances (Redguard, Bosmer) and immunities (Argonian) as effects.

```typescript
// src/lib/data/raceEffects.ts
import { RaceName } from './race'
import { DamageType } from './element'
import {
  EffectTrigger,
  EffectConditionType,
  EffectActionType,
  EffectSourceType,
  type Effect,
  type EffectSource,
} from '$lib/models/effect'

function createRaceSource(id: RaceName): EffectSource {
  return {
    type: EffectSourceType.Race,
    id,
    name: `${id} Race`,
  }
}

// Breton: +1 MP regen per round, +5 spell resistance
export const BretonEffects: Effect[] = [
  {
    id: 'breton-mp-regen',
    name: 'Magical Blood',
    description: 'Regenerate +1 MP per round',
    source: createRaceSource(RaceName.Breton),
    trigger: EffectTrigger.TurnStart,
    conditions: [],
    actions: [
      {
        type: EffectActionType.RestoreMP,
        value: 1,
      },
    ],
    priority: 20,
  },
  // Spell resistance is handled by resistance system, not effects
]

// Nord: Frost resist +10
export const NordEffects: Effect[] = [
  {
    id: 'nord-frost-resist',
    name: 'Nordic Resilience',
    description: 'Natural frost spell resistance +10',
    source: createRaceSource(RaceName.Nord),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.DamageType, damageType: DamageType.Frost },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        value: -10,
      },
    ],
    priority: 1,
  },
]

// Dunmer: Fire resist +10
export const DunmerEffects: Effect[] = [
  {
    id: 'dunmer-fire-resist',
    name: 'Ashen Blood',
    description: 'Natural fire spell resistance +10',
    source: createRaceSource(RaceName.Dunmer),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.DamageType, damageType: DamageType.Fire },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        value: -10,
      },
    ],
    priority: 1,
  },
]

// Altmer: Spell weakness -5 (applied via effect system for visibility)
export const AltmerEffects: Effect[] = [
  {
    id: 'altmer-spell-weakness',
    name: 'Magical Sensitivity',
    description: 'Spell weakness -5',
    source: createRaceSource(RaceName.Altmer),
    trigger: EffectTrigger.OnSpellTargeted,
    conditions: [],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        value: 5,
      },
    ],
    priority: 50,
  },
]

// Redguard: Disease/Poison 75% - percentage resistances handled by resistance system
export const RedguardEffects: Effect[] = []

// Bosmer: Disease/Poison 50% - percentage resistances handled by resistance system
export const BosmerEffects: Effect[] = []

// Orsimer: Spell resistance +2 - handled by resistance system
export const OrsimerEffects: Effect[] = []

// Argonian: Immunities - handled by resistance system
export const ArgonianEffects: Effect[] = []

// Imperial: No special combat effects
export const ImperialEffects: Effect[] = []

// Khajiit: No special combat effects
export const KhajiitEffects: Effect[] = []

// Master export
export const RaceEffects: Record<RaceName, Effect[]> = {
  [RaceName.Breton]: BretonEffects,
  [RaceName.Nord]: NordEffects,
  [RaceName.Dunmer]: DunmerEffects,
  [RaceName.Altmer]: AltmerEffects,
  [RaceName.Redguard]: RedguardEffects,
  [RaceName.Bosmer]: BosmerEffects,
  [RaceName.Orsimer]: OrsimerEffects,
  [RaceName.Argonian]: ArgonianEffects,
  [RaceName.Imperial]: ImperialEffects,
  [RaceName.Khajiit]: KhajiitEffects,
}

export function getRaceEffects(race: RaceName): Effect[] {
  return RaceEffects[race] ?? []
}
```

**Step 2: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/data/raceEffects.ts
git commit -m "refactor(resistances): update race effects to use DamageType enum

Updates damage type references to use DamageType enum.
Percentage-based and immunity resistances handled by resistance system."
```

---

## Phase 6: Integrate Resistances into Combat Store

### Task 6: Update takeDamageWithEffects Method

**Files:**
- Modify: `src/lib/stores/combat.store.ts`

**Step 1: Import resistance utilities**

```typescript
// Add to top of combat.store.ts
import {
  calculateDamageWithResistances,
  type DamageCalculationResult,
} from '$lib/util/resistance.util'
import { DamageType } from '$lib/data/element'
```

**Step 2: Update takeDamageWithEffects to apply resistances after effects**

```typescript
/**
 * Take damage with effect processing (damage modifiers, resistances)
 *
 * Damage reduction order:
 * 1. Magical effect DR (existing effects system)
 * 2. Racial resistances (new resistance system)
 * 3. Remaining damage applied to HP
 */
takeDamageWithEffects: (
  playerId: string,
  player: PlayerData,
  amount: number,
  damageType: string,
  isMagicSource: boolean = false
): void => {
  update((state) => {
    const session = state[playerId]
    if (!session) return state

    // Step 1: Execute damage effects (may modify damage)
    const results = executeDamageTakenEffects(player, session, amount, damageType)

    // Calculate damage after effects (existing logic)
    let damageAfterEffects = amount
    for (const result of results) {
      if (!result.success) continue
      for (const actionResult of result.actions) {
        if (actionResult.action.type === EffectActionType.ModifyIncomingDamage) {
          if (actionResult.action.multiplier !== undefined) {
            damageAfterEffects *= actionResult.action.multiplier
          }
          if (actionResult.action.value !== undefined) {
            damageAfterEffects += actionResult.action.value
          }
        }
      }
    }

    damageAfterEffects = Math.max(0, Math.floor(damageAfterEffects))

    // Step 2: Apply racial resistances
    const resistanceResult = calculateDamageWithResistances(
      player.race,
      damageAfterEffects,
      damageType as DamageType,
      isMagicSource
    )

    const finalDamage = resistanceResult.finalDamage
    const newHP = Math.max(0, session.currentHP - finalDamage)
    const logEntries: CombatLogEntry[] = []

    // Log effect sources
    for (const result of results) {
      if (!result.success) continue
      for (const actionResult of result.actions) {
        if (actionResult.message && actionResult.applied) {
          logEntries.push(createCombatLogEntry('system', actionResult.message))
        }
      }
    }

    // Log resistance reductions
    if (resistanceResult.isImmune) {
      logEntries.push(
        createCombatLogEntry('system', `Immune to ${damageType} (${player.race})`)
      )
    } else if (resistanceResult.reductionSources.length > 0) {
      for (const source of resistanceResult.reductionSources) {
        logEntries.push(createCombatLogEntry('system', source))
      }
    }

    // Log final damage
    if (!resistanceResult.isImmune) {
      logEntries.push(
        createCombatLogEntry('damage', `Took ${finalDamage} ${damageType} damage`, {
          damage: finalDamage,
        })
      )
    }

    return {
      ...state,
      [playerId]: {
        ...session,
        currentHP: newHP,
        log: [...session.log, ...logEntries],
      },
    }
  })
},
```

**Step 3: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 4: Run tests**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/lib/stores/combat.store.ts
git commit -m "feat(resistances): integrate racial resistances into damage calculation

takeDamageWithEffects now applies resistances after effect DR.
Combat log shows resistance reduction sources and immunities.
Supports isMagicSource flag for spell resistance calculations."
```

---

## Phase 7: Display Resistances in Character Sheet

### Task 7: Add Resistances Display to CharacterSheet Component

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte`

**Step 1: Import resistance utilities**

```typescript
// Add to script imports in CharacterSheet.svelte
import { getDisplayResistances } from '$lib/util/resistance.util'
```

**Step 2: Add derived state for resistances**

```typescript
// Add to derived states section
let racialResistances = $derived(getDisplayResistances(player.race))
let hasResistances = $derived(racialResistances.length > 0)
```

**Step 3: Add resistances display section in Race Details card**

Find the "Race & Birth Sign Details" section and update the Race Details card:

```svelte
<!-- Race Details -->
<div class="card p-4 variant-soft-surface">
  <h3 class="h4 font-bold mb-2">{player.race} Traits</h3>
  <p class="text-sm whitespace-pre-line text-surface-600-300-token">
    {Race[player.race]?.description ?? 'No description available'}
  </p>

  {#if hasResistances}
    <div class="mt-3 pt-3 border-t border-surface-300-600-token">
      <h4 class="text-sm font-semibold text-surface-600-300-token mb-2">Resistances</h4>
      <div class="flex flex-wrap gap-2">
        {#each racialResistances as resistance}
          <span class="badge variant-soft-tertiary text-xs">{resistance}</span>
        {/each}
      </div>
    </div>
  {/if}
</div>
```

**Step 4: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/components/CharacterSheet.svelte
git commit -m "feat(resistances): display racial resistances in character sheet

Shows resistance badges in Race Traits section including immunities,
flat reductions, percentage reductions, and spell resistance."
```

---

## Phase 8: Add Damage Type Selection to Combat UI

### Task 8: Update Damage Input to Include Damage Type

**Files:**
- Search for damage input components in combat UI
- Likely: `src/lib/components/combat/DamageInput.svelte` or similar

**Step 1: Locate damage input component**

Search the codebase for where damage is input during combat to identify the component that needs updating.

**Step 2: Add damage type selector**

```svelte
<!-- Example DamageTypeSelector component -->
<script lang="ts">
  import { DamageType } from '$lib/data/element'

  interface Props {
    value: DamageType
    onchange: (type: DamageType) => void
  }

  let { value, onchange }: Props = $props()

  const damageTypes = Object.values(DamageType)
</script>

<select
  class="select"
  value={value}
  onchange={(e) => onchange(e.currentTarget.value as DamageType)}
>
  {#each damageTypes as type}
    <option value={type}>{type}</option>
  {/each}
</select>
```

**Step 3: Add magic source checkbox for spell damage**

```svelte
<label class="flex items-center gap-2">
  <input
    type="checkbox"
    class="checkbox"
    checked={isMagicSource}
    onchange={(e) => isMagicSource = e.currentTarget.checked}
  />
  <span class="text-sm">Magic Source</span>
</label>
```

**Step 4: Update damage submission to include type and source**

```typescript
function handleTakeDamage() {
  combatStore.takeDamageWithEffects(
    player.id,
    player,
    damageAmount,
    selectedDamageType,
    isMagicSource
  )
}
```

**Step 5: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 6: Commit**

```bash
git add src/lib/components/combat/*.svelte
git commit -m "feat(resistances): add damage type selector to combat damage input

Allows selecting damage type and marking damage as magic source.
Resistances are automatically applied based on selections."
```

---

## Phase 9: Testing & Verification

### Task 9: Manual Integration Testing

**Step 1: Test Argonian immunity**

1. Create/load an Argonian character
2. Enter combat mode
3. Take Poison damage (any amount)
4. Verify: Combat log shows "Immune to Poison (Argonian)"
5. Verify: HP unchanged
6. Repeat with Disease damage

**Step 2: Test Nord frost resistance**

1. Create/load a Nord character
2. Enter combat mode
3. Take 25 Frost damage
4. Verify: Combat log shows "Nord Frost resistance (-10)"
5. Verify: Combat log shows "Took 15 Frost damage"
6. Take 5 Frost damage
7. Verify: HP unchanged (resistance exceeds damage)

**Step 3: Test Dunmer fire resistance**

1. Create/load a Dunmer character
2. Enter combat mode
3. Take 30 Fire damage
4. Verify: Combat log shows "Dunmer Fire resistance (-10)"
5. Verify: Combat log shows "Took 20 Fire damage"

**Step 4: Test Redguard percentage resistance**

1. Create/load a Redguard character
2. Enter combat mode
3. Take 20 Poison damage
4. Verify: Combat log shows "Redguard Poison resistance (75% = -15)"
5. Verify: Combat log shows "Took 5 Poison damage"

**Step 5: Test Breton spell resistance**

1. Create/load a Breton character
2. Enter combat mode
3. Take 20 Fire damage with "Magic Source" checked
4. Verify: Combat log shows "Breton spell resistance (-5)"
5. Verify: Combat log shows "Took 15 Fire damage"
6. Take 20 Physical damage (unchecked)
7. Verify: No spell resistance applied

**Step 6: Test Altmer spell weakness**

1. Create/load an Altmer character
2. Enter combat mode
3. Take 20 Fire damage with "Magic Source" checked
4. Verify: Combat log shows "Altmer spell weakness (+5)"
5. Verify: Combat log shows "Took 25 Fire damage"

**Step 7: Test character sheet display**

1. View Argonian character sheet
2. Verify: Race Traits shows "Disease Immune" and "Poison Immune" badges
3. View Nord character sheet
4. Verify: Race Traits shows "Frost +10" and "Non-magical cold (Immunity)" badges
5. View Breton character sheet
6. Verify: Race Traits shows "Spell Resistance +5" badge
7. View Altmer character sheet
8. Verify: Race Traits shows "Spell Resistance -5" and "Disease 25%" badges

**Step 8: Run full test suite**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run test`
Expected: All tests pass

**Step 9: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 10: Final commit**

```bash
git add -A
git commit -m "test(resistances): verify racial resistance system integration

Tested all racial resistances including immunities, flat reductions,
percentage reductions, spell resistance, and spell weakness.
Character sheet displays resistances correctly."
```

---

## Files Summary

### New Files (3):
- `src/lib/data/racialResistances.ts` - Resistance data for all races
- `src/lib/util/resistance.util.ts` - Resistance calculation functions
- `src/lib/util/resistance.util.test.ts` - Comprehensive unit tests

### Modified Files (4):
- `src/lib/data/element.ts` - Extended with DamageType enum
- `src/lib/data/raceEffects.ts` - Updated to use DamageType
- `src/lib/stores/combat.store.ts` - Integrated resistance calculations
- `src/lib/components/CharacterSheet.svelte` - Display resistances

### Potentially Modified (combat UI):
- Combat damage input component(s) - Add damage type selector

---

## Implementation Dependencies

```
Task 1: Extend DamageType Enum (no deps)
    |
Task 2: Create Racial Resistance Data (depends on Task 1)
    |
Task 3: Create Resistance Calculation Utility (depends on Task 2)
    |
Task 4: Write Unit Tests (depends on Task 3)
    |
Task 5: Update Race Effects (depends on Task 1)
    |
Task 6: Integrate into Combat Store (depends on Tasks 3, 5)
    |
Task 7: Display in Character Sheet (depends on Task 3)
    |
Task 8: Add Damage Type Selector (depends on Task 1)
    |
Task 9: Testing & Verification (depends on Tasks 6, 7, 8)
```

---

## Future Expansion

This resistance system can be extended to support:

1. **Equipment Resistances**: Armor with elemental protection
2. **Spell Buff Resistances**: Temporary resistance from spells (e.g., Resist Fire)
3. **Condition-Based Resistances**: Wet condition fire resistance
4. **Enchantment Resistances**: Magical item resistances
5. **Stacking Rules**: Define how multiple resistance sources combine

Each would follow the same pattern:
1. Define resistance data
2. Add to damage calculation pipeline
3. Display in appropriate UI location
