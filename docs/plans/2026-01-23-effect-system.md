# Effect System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a general-purpose effect system that handles birth sign, race, spell, item, and condition effects with trigger-based execution and source attribution.

**Architecture:** A declarative effect system where effects define triggers (when they fire), conditions (prerequisites), and actions (what happens). Each action records its source for combat log attribution, enabling messages like "You healed 3 HP because magicka was full at turn end (Lord birth sign)."

**Tech Stack:** TypeScript, SvelteKit stores, existing combat system integration

---

## Scope Summary

Based on documentation analysis, the effect system must support:

### Effect Sources
- **Birth Signs**: Lord (HP regen + fire vulnerability), Atronach (50% magicka absorb), Apprentice (spell advantage/disadvantage), Tower (reflect damage on block), Serpent (fortune gambling), etc.
- **Races**: Breton (+1 MP regen), Nord (frost resist), Dunmer (fire resist), Argonian (disease/poison immunity), Redguard (disease/poison resist + AP), etc.
- **Conditions**: Burning (DOT 1/3/6/10), Slowed (AP reduction), Alacrity (AP boost), Frozen (slowed 4 + 3x bludgeon), Wet (2x cold/electric, 0.5x fire), Prone (3x movement), etc.
- **Equipment**: Material bonuses (Skyforge, Orcichalcum, Elven, Stalhrim), armor penalties (cast disadvantage, movement penalty)
- **Spells**: Buffs, debuffs, wards, concentration effects

### Triggers
- `turnStart` - Beginning of player's turn (AP reset, regen, DOT)
- `turnEnd` - End of player's turn (condition tick, concentration check)
- `onDamageTaken` - When receiving damage (type-specific reactions)
- `onDamageDealt` - When dealing damage (critical effects)
- `onSavingThrow` - When making a save (type-specific advantage)
- `onSkillCheck` - When rolling a skill (skill-specific advantage)
- `onAttack` - When attacking (weapon effects)
- `onSpellCast` - When casting (spell absorption, cast advantage)
- `onBlock` - When blocking (reflect damage)
- `onDodge` - When dodging
- `onConcentrationCheck` - When concentration is tested

### Conditions (Prerequisites)
- `always` - No condition
- `magickaFull` - MP = max MP
- `healthBelow` - HP below threshold %
- `hasCondition` - Has specific condition type
- `damageType` - Damage is specific element
- `skillType` - Check is specific skill
- `spellTarget` - Being targeted by spell

### Actions
- `heal` - Restore HP
- `damage` - Deal damage
- `restoreMP` - Restore magicka
- `modifyAP` - Add/remove AP
- `modifyDamage` - Multiply/add to damage
- `grantAdvantage` - Add advantage to roll
- `grantDisadvantage` - Add disadvantage to roll
- `applyCondition` - Apply a condition
- `removeCondition` - Remove a condition
- `absorbSpell` - Absorb spell MP
- `reflectDamage` - Reflect damage to attacker

---

## Phase 1: Core Effect Types

### Task 1: Create Effect Model Types

**Files:**
- Create: `src/lib/models/effect.ts`

**Step 1: Define EffectTrigger enum**

```typescript
// src/lib/models/effect.ts
export enum EffectTrigger {
  TurnStart = 'TurnStart',
  TurnEnd = 'TurnEnd',
  OnDamageTaken = 'OnDamageTaken',
  OnDamageDealt = 'OnDamageDealt',
  OnSavingThrow = 'OnSavingThrow',
  OnSkillCheck = 'OnSkillCheck',
  OnAttack = 'OnAttack',
  OnSpellCast = 'OnSpellCast',
  OnSpellTargeted = 'OnSpellTargeted',
  OnBlock = 'OnBlock',
  OnDodge = 'OnDodge',
  OnConcentrationCheck = 'OnConcentrationCheck',
  OnDeath = 'OnDeath',
  OnCritical = 'OnCritical',
  OnCriticalFail = 'OnCriticalFail',
}
```

**Step 2: Define EffectConditionType enum and interfaces**

```typescript
export enum EffectConditionType {
  Always = 'Always',
  MagickaFull = 'MagickaFull',
  MagickaEmpty = 'MagickaEmpty',
  HealthBelow = 'HealthBelow',
  HealthAbove = 'HealthAbove',
  HasCondition = 'HasCondition',
  LacksCondition = 'LacksCondition',
  DamageType = 'DamageType',
  SkillType = 'SkillType',
  SpellSchool = 'SpellSchool',
  WeaponType = 'WeaponType',
  IsConcentrating = 'IsConcentrating',
  Random = 'Random', // For percentage-based effects like Atronach 50%
}

export interface EffectCondition {
  type: EffectConditionType
  // Condition-specific parameters
  threshold?: number // For HealthBelow/Above (percentage 0-100)
  conditionType?: string // For HasCondition/LacksCondition
  damageType?: string // For DamageType (Element enum value)
  skillType?: string // For SkillType (Skill enum value)
  spellSchool?: string // For SpellSchool
  weaponType?: string // For WeaponType
  chance?: number // For Random (0-100 percentage)
}
```

**Step 3: Define EffectActionType enum and interfaces**

```typescript
export enum EffectActionType {
  Heal = 'Heal',
  Damage = 'Damage',
  RestoreMP = 'RestoreMP',
  DrainMP = 'DrainMP',
  ModifyAP = 'ModifyAP',
  ModifyIncomingDamage = 'ModifyIncomingDamage', // Multiplier for damage taken
  ModifyOutgoingDamage = 'ModifyOutgoingDamage', // Multiplier for damage dealt
  GrantAdvantage = 'GrantAdvantage',
  GrantDisadvantage = 'GrantDisadvantage',
  ApplyCondition = 'ApplyCondition',
  RemoveCondition = 'RemoveCondition',
  AbsorbSpellMP = 'AbsorbSpellMP', // Atronach: gain spell's MP cost
  ReflectDamage = 'ReflectDamage', // Tower: reflect missed attack damage
  ModifyMovementCost = 'ModifyMovementCost',
  PreventAction = 'PreventAction', // Block natural regen, etc.
  LogMessage = 'LogMessage', // Just log something without mechanical effect
}

export interface EffectAction {
  type: EffectActionType
  // Action-specific parameters
  value?: number // Flat amount for Heal, Damage, RestoreMP, etc.
  multiplier?: number // For ModifyDamage (1.0 = normal, 2.0 = double, 0.5 = half)
  usesLevel?: boolean // If true, value = player level
  conditionType?: string // For ApplyCondition/RemoveCondition
  conditionLevel?: number // Level to apply
  conditionDuration?: number // Duration in rounds
  damageType?: string // Element type for damage
  advantageCount?: number // Number of advantage/disadvantage dice
  skillType?: string // For skill-specific advantage
  message?: string // For LogMessage, supports {value} placeholder
}
```

**Step 4: Define Effect and EffectSource interfaces**

```typescript
export enum EffectSourceType {
  BirthSign = 'BirthSign',
  Race = 'Race',
  Condition = 'Condition',
  Spell = 'Spell',
  Equipment = 'Equipment',
  Item = 'Item',
  Ability = 'Ability',
}

export interface EffectSource {
  type: EffectSourceType
  id: string // e.g., 'lord', 'nord', 'burning', 'oakflesh'
  name: string // Human-readable: "Lord Birth Sign", "Nord Race", "Burning (Level 2)"
}

export interface Effect {
  id: string
  name: string
  description: string
  source: EffectSource
  trigger: EffectTrigger
  conditions: EffectCondition[] // All must be true (AND logic)
  actions: EffectAction[]
  priority?: number // Lower = executes first (for ordering effects)
}
```

**Step 5: Define EffectContext for runtime evaluation**

```typescript
import type { PlayerData } from './player'
import type { CombatSession, DiceRoll } from './combat'

export interface EffectContext {
  player: PlayerData
  session: CombatSession
  // Trigger-specific context
  damageAmount?: number
  damageType?: string
  healAmount?: number
  skill?: string
  spellId?: string
  spellMPCost?: number
  attackRoll?: DiceRoll
  isCritical?: boolean
  weaponId?: string
  blockMargin?: number // How much the block succeeded by
}

export interface EffectResult {
  effect: Effect
  success: boolean
  actions: {
    action: EffectAction
    applied: boolean
    value?: number
    message: string // For combat log attribution
  }[]
}
```

**Step 6: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors in effect.ts

**Step 7: Commit**

```bash
git add src/lib/models/effect.ts
git commit -m "feat(effects): add core effect system type definitions

Defines EffectTrigger, EffectCondition, EffectAction types for
general-purpose effect system. Includes source tracking for
combat log attribution."
```

---

## Phase 2: Effect Evaluation Utility

### Task 2: Create Effect Evaluation Functions

**Files:**
- Create: `src/lib/util/effect.util.ts`

**Step 1: Create condition evaluators**

```typescript
// src/lib/util/effect.util.ts
import type { PlayerData } from '$lib/models/player'
import type { CombatSession } from '$lib/models/combat'
import {
  EffectConditionType,
  type EffectCondition,
  type EffectContext,
} from '$lib/models/effect'

export function evaluateCondition(
  condition: EffectCondition,
  context: EffectContext
): boolean {
  switch (condition.type) {
    case EffectConditionType.Always:
      return true

    case EffectConditionType.MagickaFull:
      return context.session.currentMP >= context.player.maxMagicka

    case EffectConditionType.MagickaEmpty:
      return context.session.currentMP === 0

    case EffectConditionType.HealthBelow:
      const healthPercent = (context.session.currentHP / context.player.maxHealth) * 100
      return healthPercent < (condition.threshold ?? 50)

    case EffectConditionType.HealthAbove:
      const healthPct = (context.session.currentHP / context.player.maxHealth) * 100
      return healthPct > (condition.threshold ?? 50)

    case EffectConditionType.HasCondition:
      return context.session.conditions.some(c => c.type === condition.conditionType)

    case EffectConditionType.LacksCondition:
      return !context.session.conditions.some(c => c.type === condition.conditionType)

    case EffectConditionType.DamageType:
      return context.damageType === condition.damageType

    case EffectConditionType.SkillType:
      return context.skill === condition.skillType

    case EffectConditionType.SpellSchool:
      // Would need to look up spell by ID to get school
      return false // TODO: implement with spell lookup

    case EffectConditionType.IsConcentrating:
      return !!context.session.concentrationSpellId

    case EffectConditionType.Random:
      return Math.random() * 100 < (condition.chance ?? 50)

    default:
      return false
  }
}

export function evaluateAllConditions(
  conditions: EffectCondition[],
  context: EffectContext
): boolean {
  // Empty conditions array = always true
  if (conditions.length === 0) return true
  // All conditions must pass (AND logic)
  return conditions.every(c => evaluateCondition(c, context))
}
```

**Step 2: Create action result type and format message helper**

```typescript
export interface ActionResult {
  action: EffectAction
  applied: boolean
  value?: number
  message: string
}

export function formatEffectMessage(
  effect: Effect,
  action: EffectAction,
  value?: number
): string {
  const sourceName = effect.source.name
  let actionDesc = ''

  switch (action.type) {
    case EffectActionType.Heal:
      actionDesc = `healed ${value} HP`
      break
    case EffectActionType.Damage:
      actionDesc = `took ${value} ${action.damageType ?? ''} damage`
      break
    case EffectActionType.RestoreMP:
      actionDesc = `restored ${value} MP`
      break
    case EffectActionType.DrainMP:
      actionDesc = `lost ${value} MP`
      break
    case EffectActionType.ModifyAP:
      actionDesc = value && value > 0 ? `gained ${value} AP` : `lost ${Math.abs(value ?? 0)} AP`
      break
    case EffectActionType.GrantAdvantage:
      actionDesc = `gained ${action.advantageCount ?? 1} advantage`
      break
    case EffectActionType.GrantDisadvantage:
      actionDesc = `gained ${action.advantageCount ?? 1} disadvantage`
      break
    case EffectActionType.ApplyCondition:
      actionDesc = `gained ${action.conditionType}${action.conditionLevel ? ` (${action.conditionLevel})` : ''}`
      break
    case EffectActionType.RemoveCondition:
      actionDesc = `lost ${action.conditionType}`
      break
    case EffectActionType.ModifyIncomingDamage:
      const mult = action.multiplier ?? 1
      actionDesc = mult > 1 ? `takes ${mult}x damage` : `takes ${mult}x damage (reduced)`
      break
    case EffectActionType.AbsorbSpellMP:
      actionDesc = `absorbed ${value} MP from spell`
      break
    case EffectActionType.ReflectDamage:
      actionDesc = `reflected ${value} damage`
      break
    case EffectActionType.LogMessage:
      return action.message?.replace('{value}', String(value ?? '')) ?? effect.description
    default:
      actionDesc = effect.description
  }

  return `${actionDesc} (${sourceName})`
}
```

**Step 3: Create calculateActionValue helper**

```typescript
import type { EffectAction } from '$lib/models/effect'
import { EffectActionType } from '$lib/models/effect'

export function calculateActionValue(
  action: EffectAction,
  context: EffectContext
): number {
  let value = action.value ?? 0

  // If usesLevel, multiply by player level
  if (action.usesLevel) {
    value = context.player.level
  }

  return value
}
```

**Step 4: Create main effect processor**

```typescript
import type { Effect, EffectResult, EffectContext } from '$lib/models/effect'
import { EffectActionType } from '$lib/models/effect'

export function processEffect(
  effect: Effect,
  context: EffectContext
): EffectResult {
  // Check all conditions
  const conditionsPassed = evaluateAllConditions(effect.conditions, context)

  if (!conditionsPassed) {
    return {
      effect,
      success: false,
      actions: [],
    }
  }

  // Process each action
  const actionResults: ActionResult[] = effect.actions.map(action => {
    const value = calculateActionValue(action, context)
    const message = formatEffectMessage(effect, action, value)

    return {
      action,
      applied: true,
      value,
      message,
    }
  })

  return {
    effect,
    success: true,
    actions: actionResults,
  }
}

export function processEffects(
  effects: Effect[],
  context: EffectContext
): EffectResult[] {
  // Sort by priority (lower first)
  const sorted = [...effects].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))

  return sorted.map(effect => processEffect(effect, context))
}
```

**Step 5: Create trigger filter helper**

```typescript
import { EffectTrigger } from '$lib/models/effect'

export function getEffectsForTrigger(
  effects: Effect[],
  trigger: EffectTrigger
): Effect[] {
  return effects.filter(e => e.trigger === trigger)
}
```

**Step 6: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 7: Commit**

```bash
git add src/lib/util/effect.util.ts
git commit -m "feat(effects): add effect evaluation utility functions

Includes condition evaluators, action value calculators,
message formatters with source attribution, and effect processors."
```

---

## Phase 3: Birth Sign Effect Definitions

### Task 3: Create Birth Sign Effects

**Files:**
- Create: `src/lib/data/birthSignEffects.ts`
- Modify: `src/lib/data/birthSign.ts` (add effects reference)

**Step 1: Create Lord birth sign effects**

```typescript
// src/lib/data/birthSignEffects.ts
import { BirthSignName } from './birthSign'
import { Element } from './element'
import {
  EffectTrigger,
  EffectConditionType,
  EffectActionType,
  EffectSourceType,
  type Effect,
  type EffectSource,
} from '$lib/models/effect'

function createBirthSignSource(id: BirthSignName): EffectSource {
  return {
    type: EffectSourceType.BirthSign,
    id,
    name: `${id} Birth Sign`,
  }
}

// Lord: Regen level HP each round if magicka full, fire vulnerability
export const LordEffects: Effect[] = [
  {
    id: 'lord-hp-regen',
    name: 'Trollkin Regeneration',
    description: 'Regenerate HP equal to your level when magicka is full',
    source: createBirthSignSource(BirthSignName.Lord),
    trigger: EffectTrigger.TurnStart,
    conditions: [
      { type: EffectConditionType.MagickaFull },
    ],
    actions: [
      {
        type: EffectActionType.Heal,
        usesLevel: true,
      },
    ],
    priority: 10,
  },
  {
    id: 'lord-fire-save-disadvantage',
    name: 'Fire Weakness (Saves)',
    description: 'Disadvantage on all saves against fire',
    source: createBirthSignSource(BirthSignName.Lord),
    trigger: EffectTrigger.OnSavingThrow,
    conditions: [
      { type: EffectConditionType.DamageType, damageType: Element.Fire },
    ],
    actions: [
      {
        type: EffectActionType.GrantDisadvantage,
        advantageCount: 1,
      },
    ],
  },
  {
    id: 'lord-fire-damage-double',
    name: 'Fire Weakness (Damage)',
    description: 'Take double damage from fire',
    source: createBirthSignSource(BirthSignName.Lord),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.DamageType, damageType: Element.Fire },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        multiplier: 2.0,
      },
    ],
    priority: 5, // Apply damage multipliers early
  },
]
```

**Step 2: Create Atronach birth sign effects**

```typescript
// Atronach: 50% magicka from spells targeting you, no natural regen
export const AtronachEffects: Effect[] = [
  {
    id: 'atronach-spell-absorb',
    name: 'Spell Absorption',
    description: '50% chance to absorb spell MP cost when targeted',
    source: createBirthSignSource(BirthSignName.Atronach),
    trigger: EffectTrigger.OnSpellTargeted,
    conditions: [
      { type: EffectConditionType.Random, chance: 50 },
    ],
    actions: [
      {
        type: EffectActionType.AbsorbSpellMP,
      },
    ],
  },
  {
    id: 'atronach-no-regen',
    name: 'Magicka Stagnation',
    description: 'Do not regenerate magicka naturally',
    source: createBirthSignSource(BirthSignName.Atronach),
    trigger: EffectTrigger.TurnStart,
    conditions: [],
    actions: [
      {
        type: EffectActionType.PreventAction,
        message: 'Natural MP regen prevented (Atronach Birth Sign)',
      },
    ],
    priority: 1, // Very early to block regen
  },
]
```

**Step 3: Create Apprentice birth sign effects**

```typescript
// Apprentice: Advantage on spell attacks, disadvantage on spell defense
export const ApprenticeEffects: Effect[] = [
  {
    id: 'apprentice-spell-attack-advantage',
    name: 'Magical Affinity',
    description: 'Advantage on all spell attacks',
    source: createBirthSignSource(BirthSignName.Apprentice),
    trigger: EffectTrigger.OnSpellCast,
    conditions: [],
    actions: [
      {
        type: EffectActionType.GrantAdvantage,
        advantageCount: 1,
      },
    ],
  },
  {
    id: 'apprentice-spell-defense-disadvantage',
    name: 'Magical Vulnerability',
    description: 'Disadvantage on saves against spells',
    source: createBirthSignSource(BirthSignName.Apprentice),
    trigger: EffectTrigger.OnSpellTargeted,
    conditions: [],
    actions: [
      {
        type: EffectActionType.GrantDisadvantage,
        advantageCount: 1,
      },
    ],
  },
]
```

**Step 4: Create Tower birth sign effects**

```typescript
// Tower: Reflect damage on successful block
export const TowerEffects: Effect[] = [
  {
    id: 'tower-reflect-damage',
    name: 'Reflective Shield',
    description: 'Reflect damage equal to block margin on successful block',
    source: createBirthSignSource(BirthSignName.Tower),
    trigger: EffectTrigger.OnBlock,
    conditions: [],
    actions: [
      {
        type: EffectActionType.ReflectDamage,
        // Value will be calculated from blockMargin in context
      },
    ],
  },
]
```

**Step 5: Create remaining birth sign effects (Serpent, Ritual, Lover, etc.)**

```typescript
// Serpent: Gambling mechanic on crit success (complex - may need special handling)
export const SerpentEffects: Effect[] = [
  {
    id: 'serpent-fortune-gamble',
    name: 'Serpent\'s Luck',
    description: 'Gamble fortune points on critical success',
    source: createBirthSignSource(BirthSignName.Serpent),
    trigger: EffectTrigger.OnCritical,
    conditions: [],
    actions: [
      {
        type: EffectActionType.LogMessage,
        message: 'Serpent\'s Luck: You may gamble to keep the critical success',
      },
    ],
  },
]

// Ritual: Once per day any ritual (tracking needed - out of combat scope)
export const RitualEffects: Effect[] = []

// Lover: Social charm (out of combat scope)
export const LoverEffects: Effect[] = []
```

**Step 6: Create master export and lookup**

```typescript
// Birth sign effects by name
export const BirthSignEffects: Record<BirthSignName, Effect[]> = {
  [BirthSignName.Lord]: LordEffects,
  [BirthSignName.Atronach]: AtronachEffects,
  [BirthSignName.Apprentice]: ApprenticeEffects,
  [BirthSignName.Tower]: TowerEffects,
  [BirthSignName.Serpent]: SerpentEffects,
  [BirthSignName.Ritual]: RitualEffects,
  [BirthSignName.Lover]: LoverEffects,
  // Signs with typed benefits (no special combat effects)
  [BirthSignName.Lady]: [],
  [BirthSignName.Mage]: [],
  [BirthSignName.Shadow]: [],
  [BirthSignName.Steed]: [],
  [BirthSignName.Thief]: [],
  [BirthSignName.Warrior]: [],
}

export function getBirthSignEffects(birthSign: BirthSignName): Effect[] {
  return BirthSignEffects[birthSign] ?? []
}
```

**Step 7: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 8: Commit**

```bash
git add src/lib/data/birthSignEffects.ts
git commit -m "feat(effects): add birth sign combat effects

Implements Lord (HP regen, fire vulnerability), Atronach (spell absorb),
Apprentice (spell advantage/disadvantage), Tower (block reflect),
and Serpent (fortune gamble) effects."
```

---

## Phase 4: Race Effect Definitions

### Task 4: Create Race Effects

**Files:**
- Create: `src/lib/data/raceEffects.ts`

**Step 1: Create Breton race effects**

```typescript
// src/lib/data/raceEffects.ts
import { RaceName } from './race'
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

// Breton: +1 MP regen per round
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
    priority: 20, // After regen blockers
  },
]
```

**Step 2: Create Nord race effects**

```typescript
// Nord: Frost resist +10, cold immunity (non-magical)
export const NordEffects: Effect[] = [
  {
    id: 'nord-frost-resist',
    name: 'Nordic Resilience',
    description: 'Natural frost spell resistance +10',
    source: createRaceSource(RaceName.Nord),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.DamageType, damageType: 'Frost' },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        value: -10, // Flat reduction before multipliers
      },
    ],
    priority: 1, // Early for resist calculations
  },
]
```

**Step 3: Create Dunmer race effects**

```typescript
// Dunmer: Fire resist +10, heat immunity (non-magical)
export const DunmerEffects: Effect[] = [
  {
    id: 'dunmer-fire-resist',
    name: 'Ashen Blood',
    description: 'Natural fire spell resistance +10',
    source: createRaceSource(RaceName.Dunmer),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.DamageType, damageType: 'Fire' },
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
```

**Step 4: Create Altmer race effects**

```typescript
// Altmer: Disease resist 25%, Spell weakness -5
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
        value: 5, // Take 5 more damage from spells
      },
    ],
    priority: 50,
  },
]
```

**Step 5: Create remaining race effects**

```typescript
// Redguard: Disease/Poison resist 75% (passive - tracked differently)
export const RedguardEffects: Effect[] = []

// Bosmer: Poison/Disease resist 50%, Beast Tongue (out of combat)
export const BosmerEffects: Effect[] = []

// Orsimer: No special combat effects (HP/spell resist are base stats)
export const OrsimerEffects: Effect[] = []

// Argonian: Disease/Poison immunity (passive check modifiers)
export const ArgonianEffects: Effect[] = []

// Imperial: No combat effects (+HP, language)
export const ImperialEffects: Effect[] = []

// Khajiit: No combat effects (claws, night eye)
export const KhajiitEffects: Effect[] = []
```

**Step 6: Create master export and lookup**

```typescript
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

**Step 7: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 8: Commit**

```bash
git add src/lib/data/raceEffects.ts
git commit -m "feat(effects): add race combat effects

Implements Breton (+1 MP regen), Nord (frost resist),
Dunmer (fire resist), and Altmer (spell weakness) effects."
```

---

## Phase 5: Condition Effects

### Task 5: Create Condition Effects

**Files:**
- Create: `src/lib/data/conditionEffects.ts`
- Modify: `src/lib/models/combat.ts` (extend ConditionType enum)

**Step 1: Extend ConditionType enum**

```typescript
// Add to src/lib/models/combat.ts
export enum ConditionType {
  // Existing
  Stunned = 'Stunned',
  Prone = 'Prone',
  Grappled = 'Grappled',
  Frightened = 'Frightened',
  Poisoned = 'Poisoned',
  Burning = 'Burning',
  Frozen = 'Frozen',
  Bleeding = 'Bleeding',
  Concentrating = 'Concentrating',
  // New from docs
  Chilled = 'Chilled',
  Slowed = 'Slowed',
  Alacrity = 'Alacrity',
  Wet = 'Wet',
  Flying = 'Flying',
  Concealment = 'Concealment',
  Blindness = 'Blindness',
  Slowfall = 'Slowfall',
  Encumbrance = 'Encumbrance',
  Sickened = 'Sickened',
  SoulTrapped = 'SoulTrapped',
}
```

**Step 2: Create Burning condition effects**

```typescript
// src/lib/data/conditionEffects.ts
import { ConditionType } from '$lib/models/combat'
import {
  EffectTrigger,
  EffectConditionType,
  EffectActionType,
  EffectSourceType,
  type Effect,
  type EffectSource,
} from '$lib/models/effect'
import { Element } from './element'

function createConditionSource(type: ConditionType, level?: number): EffectSource {
  return {
    type: EffectSourceType.Condition,
    id: type,
    name: level ? `${type} (Level ${level})` : type,
  }
}

// Burning damage by level: 1/3/6/10
const BURNING_DAMAGE = [0, 1, 3, 6, 10]

export function createBurningEffects(level: number): Effect[] {
  const damage = BURNING_DAMAGE[Math.min(level, 4)] ?? 10
  return [
    {
      id: `burning-dot-${level}`,
      name: 'Burning',
      description: `Take ${damage} fire damage at start of turn`,
      source: createConditionSource(ConditionType.Burning, level),
      trigger: EffectTrigger.TurnStart,
      conditions: [
        { type: EffectConditionType.HasCondition, conditionType: ConditionType.Burning },
      ],
      actions: [
        {
          type: EffectActionType.Damage,
          value: damage,
          damageType: Element.Fire,
        },
      ],
      priority: 5,
    },
  ]
}
```

**Step 3: Create Slowed condition effects**

```typescript
// Slowed AP reduction: 25%/50%/75%/100%
const SLOWED_AP_MULTIPLIER = [1, 0.75, 0.5, 0.25, 0]

export function createSlowedEffects(level: number): Effect[] {
  const multiplier = SLOWED_AP_MULTIPLIER[Math.min(level, 4)] ?? 0
  return [
    {
      id: `slowed-ap-${level}`,
      name: 'Slowed',
      description: `AP reduced to ${multiplier * 100}%`,
      source: createConditionSource(ConditionType.Slowed, level),
      trigger: EffectTrigger.TurnStart,
      conditions: [
        { type: EffectConditionType.HasCondition, conditionType: ConditionType.Slowed },
      ],
      actions: [
        {
          type: EffectActionType.ModifyAP,
          multiplier,
        },
        {
          type: EffectActionType.ModifyMovementCost,
          multiplier: 2, // Movement costs doubled
        },
      ],
      priority: 3,
    },
  ]
}
```

**Step 4: Create Wet condition effects**

```typescript
export const WetEffects: Effect[] = [
  {
    id: 'wet-cold-vulnerability',
    name: 'Wet (Cold Vulnerability)',
    description: 'Take double cold/electric damage while wet',
    source: createConditionSource(ConditionType.Wet),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Wet },
      { type: EffectConditionType.DamageType, damageType: 'Frost' },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        multiplier: 2,
      },
    ],
    priority: 5,
  },
  {
    id: 'wet-fire-resist',
    name: 'Wet (Fire Resistance)',
    description: 'Take half fire damage while wet',
    source: createConditionSource(ConditionType.Wet),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Wet },
      { type: EffectConditionType.DamageType, damageType: 'Fire' },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        multiplier: 0.5,
      },
    ],
    priority: 5,
  },
]
```

**Step 5: Create Prone condition effects**

```typescript
export const ProneEffects: Effect[] = [
  {
    id: 'prone-movement-penalty',
    name: 'Prone (Movement)',
    description: 'Movement costs tripled while prone',
    source: createConditionSource(ConditionType.Prone),
    trigger: EffectTrigger.TurnStart,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Prone },
    ],
    actions: [
      {
        type: EffectActionType.ModifyMovementCost,
        multiplier: 3,
      },
    ],
  },
  {
    id: 'prone-melee-vulnerability',
    name: 'Prone (Melee Vulnerability)',
    description: 'Melee attacks against you have +2 advantage',
    source: createConditionSource(ConditionType.Prone),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Prone },
      // Would need to check if melee attack
    ],
    actions: [
      {
        type: EffectActionType.LogMessage,
        message: 'Attacker gains +2 advantage (target is Prone)',
      },
    ],
  },
]
```

**Step 6: Create Frozen condition effects**

```typescript
export const FrozenEffects: Effect[] = [
  {
    id: 'frozen-paralysis',
    name: 'Frozen (Paralysis)',
    description: 'Receive Slowed 4 while frozen',
    source: createConditionSource(ConditionType.Frozen),
    trigger: EffectTrigger.TurnStart,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Frozen },
    ],
    actions: [
      {
        type: EffectActionType.ApplyCondition,
        conditionType: ConditionType.Slowed,
        conditionLevel: 4,
      },
    ],
    priority: 2,
  },
  {
    id: 'frozen-bludgeon-vulnerability',
    name: 'Frozen (Shatter)',
    description: 'Take triple bludgeoning damage while frozen',
    source: createConditionSource(ConditionType.Frozen),
    trigger: EffectTrigger.OnDamageTaken,
    conditions: [
      { type: EffectConditionType.HasCondition, conditionType: ConditionType.Frozen },
      { type: EffectConditionType.DamageType, damageType: 'Bludgeoning' },
    ],
    actions: [
      {
        type: EffectActionType.ModifyIncomingDamage,
        multiplier: 3,
      },
    ],
    priority: 5,
  },
]
```

**Step 7: Export condition effect lookup**

```typescript
export function getConditionEffects(type: ConditionType, level?: number): Effect[] {
  switch (type) {
    case ConditionType.Burning:
      return createBurningEffects(level ?? 1)
    case ConditionType.Slowed:
      return createSlowedEffects(level ?? 1)
    case ConditionType.Wet:
      return WetEffects
    case ConditionType.Prone:
      return ProneEffects
    case ConditionType.Frozen:
      return FrozenEffects
    default:
      return []
  }
}
```

**Step 8: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 9: Commit**

```bash
git add src/lib/data/conditionEffects.ts src/lib/models/combat.ts
git commit -m "feat(effects): add condition combat effects

Implements Burning (DOT by level), Slowed (AP reduction),
Wet (element vulnerabilities), Prone (movement/melee penalty),
and Frozen (paralysis + shatter) condition effects."
```

---

## Phase 6: Effect Aggregation

### Task 6: Create Effect Aggregation Service

**Files:**
- Create: `src/lib/services/effectAggregator.ts`

**Step 1: Create effect aggregator that collects all applicable effects**

```typescript
// src/lib/services/effectAggregator.ts
import type { PlayerData } from '$lib/models/player'
import type { CombatSession } from '$lib/models/combat'
import type { Effect } from '$lib/models/effect'
import { getBirthSignEffects } from '$lib/data/birthSignEffects'
import { getRaceEffects } from '$lib/data/raceEffects'
import { getConditionEffects } from '$lib/data/conditionEffects'

export function getPlayerEffects(player: PlayerData, session: CombatSession): Effect[] {
  const effects: Effect[] = []

  // Birth sign effects
  if (player.birthSign) {
    effects.push(...getBirthSignEffects(player.birthSign))
  }

  // Race effects
  if (player.race) {
    effects.push(...getRaceEffects(player.race))
  }

  // Condition effects
  for (const condition of session.conditions) {
    effects.push(...getConditionEffects(condition.type as any, condition.level))
  }

  // TODO: Equipment effects
  // TODO: Spell buff effects

  return effects
}
```

**Step 2: Create trigger-specific effect getters**

```typescript
import { EffectTrigger, type EffectContext, type EffectResult } from '$lib/models/effect'
import { getEffectsForTrigger, processEffects } from '$lib/util/effect.util'

export function getTurnStartEffects(player: PlayerData, session: CombatSession): Effect[] {
  const allEffects = getPlayerEffects(player, session)
  return getEffectsForTrigger(allEffects, EffectTrigger.TurnStart)
}

export function getTurnEndEffects(player: PlayerData, session: CombatSession): Effect[] {
  const allEffects = getPlayerEffects(player, session)
  return getEffectsForTrigger(allEffects, EffectTrigger.TurnEnd)
}

export function getDamageTakenEffects(player: PlayerData, session: CombatSession): Effect[] {
  const allEffects = getPlayerEffects(player, session)
  return getEffectsForTrigger(allEffects, EffectTrigger.OnDamageTaken)
}

export function getSpellTargetedEffects(player: PlayerData, session: CombatSession): Effect[] {
  const allEffects = getPlayerEffects(player, session)
  return getEffectsForTrigger(allEffects, EffectTrigger.OnSpellTargeted)
}

export function getBlockEffects(player: PlayerData, session: CombatSession): Effect[] {
  const allEffects = getPlayerEffects(player, session)
  return getEffectsForTrigger(allEffects, EffectTrigger.OnBlock)
}
```

**Step 3: Create effect execution function**

```typescript
export function executeTurnStartEffects(
  player: PlayerData,
  session: CombatSession
): EffectResult[] {
  const effects = getTurnStartEffects(player, session)
  const context: EffectContext = { player, session }
  return processEffects(effects, context)
}

export function executeDamageEffects(
  player: PlayerData,
  session: CombatSession,
  damageAmount: number,
  damageType: string
): EffectResult[] {
  const effects = getDamageTakenEffects(player, session)
  const context: EffectContext = {
    player,
    session,
    damageAmount,
    damageType,
  }
  return processEffects(effects, context)
}

export function executeSpellTargetedEffects(
  player: PlayerData,
  session: CombatSession,
  spellMPCost: number
): EffectResult[] {
  const effects = getSpellTargetedEffects(player, session)
  const context: EffectContext = {
    player,
    session,
    spellMPCost,
  }
  return processEffects(effects, context)
}

export function executeBlockEffects(
  player: PlayerData,
  session: CombatSession,
  blockMargin: number
): EffectResult[] {
  const effects = getBlockEffects(player, session)
  const context: EffectContext = {
    player,
    session,
    blockMargin,
  }
  return processEffects(effects, context)
}
```

**Step 4: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/services/effectAggregator.ts
git commit -m "feat(effects): add effect aggregation service

Collects effects from birth signs, races, and conditions.
Provides trigger-specific effect getters and executors."
```

---

## Phase 7: Combat Store Integration

### Task 7: Integrate Effects into Combat Store

**Files:**
- Modify: `src/lib/stores/combat.store.ts`

**Step 1: Import effect utilities**

```typescript
// Add to top of combat.store.ts
import {
  executeTurnStartEffects,
  executeDamageEffects,
  executeSpellTargetedEffects,
  executeBlockEffects,
} from '$lib/services/effectAggregator'
import type { EffectResult } from '$lib/models/effect'
import { EffectActionType } from '$lib/models/effect'
```

**Step 2: Add effect result processing helper**

```typescript
function applyEffectResults(
  session: CombatSession,
  results: EffectResult[],
  player: PlayerData
): { updatedSession: CombatSession; logEntries: CombatLogEntry[] } {
  let updatedSession = { ...session }
  const logEntries: CombatLogEntry[] = []

  for (const result of results) {
    if (!result.success) continue

    for (const actionResult of result.actions) {
      if (!actionResult.applied) continue

      const { action, value, message } = actionResult

      switch (action.type) {
        case EffectActionType.Heal:
          const healAmount = Math.min(value ?? 0, player.maxHealth - updatedSession.currentHP)
          updatedSession.currentHP += healAmount
          if (healAmount > 0) {
            logEntries.push(createCombatLogEntry('healing', message, { healing: healAmount }))
          }
          break

        case EffectActionType.Damage:
          updatedSession.currentHP = Math.max(0, updatedSession.currentHP - (value ?? 0))
          logEntries.push(createCombatLogEntry('damage', message, { damage: value }))
          break

        case EffectActionType.RestoreMP:
          const restoreAmount = Math.min(value ?? 0, player.maxMagicka - updatedSession.currentMP)
          updatedSession.currentMP += restoreAmount
          if (restoreAmount > 0) {
            logEntries.push(createCombatLogEntry('system', message))
          }
          break

        case EffectActionType.DrainMP:
          updatedSession.currentMP = Math.max(0, updatedSession.currentMP - (value ?? 0))
          logEntries.push(createCombatLogEntry('system', message))
          break

        case EffectActionType.LogMessage:
          logEntries.push(createCombatLogEntry('system', message))
          break

        // Other actions would need special handling
      }
    }
  }

  return { updatedSession, logEntries }
}
```

**Step 3: Modify startPlayerTurn to process turn start effects**

```typescript
// In combat.store.ts, modify startPlayerTurn method
startPlayerTurn: (playerId: string, player: PlayerData) => {
  update((sessions) => {
    const session = sessions[playerId]
    if (!session) return sessions

    // Reset AP
    let updatedSession = {
      ...session,
      currentAP: session.maxAP,
      isPlayerTurn: true,
    }

    // Execute turn start effects
    const results = executeTurnStartEffects(player, updatedSession)
    const { updatedSession: finalSession, logEntries } = applyEffectResults(
      updatedSession,
      results,
      player
    )

    // Add standard turn start log
    const turnLog = createCombatLogEntry('turn', `Turn ${session.round} started`)

    return {
      ...sessions,
      [playerId]: {
        ...finalSession,
        log: [...finalSession.log, turnLog, ...logEntries],
      },
    }
  })
},
```

**Step 4: Add takeDamageWithEffects method**

```typescript
takeDamageWithEffects: (
  playerId: string,
  player: PlayerData,
  amount: number,
  damageType: string
) => {
  update((sessions) => {
    const session = sessions[playerId]
    if (!session) return sessions

    // Execute damage effects (may modify damage)
    const results = executeDamageEffects(player, session, amount, damageType)

    // Calculate final damage after effects
    let finalDamage = amount
    for (const result of results) {
      if (!result.success) continue
      for (const actionResult of result.actions) {
        if (actionResult.action.type === EffectActionType.ModifyIncomingDamage) {
          if (actionResult.action.multiplier !== undefined) {
            finalDamage *= actionResult.action.multiplier
          }
          if (actionResult.action.value !== undefined) {
            finalDamage += actionResult.action.value
          }
        }
      }
    }

    finalDamage = Math.max(0, Math.floor(finalDamage))

    const newHP = Math.max(0, session.currentHP - finalDamage)
    const logEntries: CombatLogEntry[] = []

    // Log damage with source attribution
    for (const result of results) {
      if (!result.success) continue
      for (const actionResult of result.actions) {
        if (actionResult.message && actionResult.applied) {
          logEntries.push(createCombatLogEntry('system', actionResult.message))
        }
      }
    }

    logEntries.push(
      createCombatLogEntry('damage', `Took ${finalDamage} ${damageType} damage`, {
        damage: finalDamage,
      })
    )

    return {
      ...sessions,
      [playerId]: {
        ...session,
        currentHP: newHP,
        log: [...session.log, ...logEntries],
      },
    }
  })
},
```

**Step 5: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 6: Commit**

```bash
git add src/lib/stores/combat.store.ts
git commit -m "feat(effects): integrate effect system into combat store

Turn start effects now process automatically (HP regen, DOT).
Damage effects modify incoming damage with source attribution.
Combat log shows effect sources for all changes."
```

---

## Phase 8: UI Integration

### Task 8: Update Combat UI to Show Effect Sources

**Files:**
- Modify: `src/lib/components/combat/CombatLog.svelte`
- Modify: `src/lib/components/combat/ResourceBars.svelte`

**Step 1: Enhance CombatLog to highlight effect sources**

```svelte
<!-- In CombatLog.svelte, update entry rendering -->
{#each log as entry}
  <div class="log-entry {entry.type}" class:has-source={entry.description.includes('(')}>
    <span class="timestamp">{formatTime(entry.timestamp)}</span>
    <span class="description">
      {#if entry.description.includes('(')}
        {@const [main, source] = entry.description.split('(')}
        {main}
        <span class="effect-source">({source}</span>
      {:else}
        {entry.description}
      {/if}
    </span>
    {#if entry.damage}
      <span class="damage">-{entry.damage}</span>
    {/if}
    {#if entry.healing}
      <span class="healing">+{entry.healing}</span>
    {/if}
  </div>
{/each}

<style>
  .effect-source {
    color: var(--color-surface-500);
    font-style: italic;
  }
</style>
```

**Step 2: Update CombatMode to pass player to store methods**

```svelte
<!-- In CombatMode.svelte, update handlers -->
<script>
  // Modify handleStartTurn to pass player
  function handleStartTurn() {
    combatStore.startPlayerTurn(player.id, player)
  }
</script>
```

**Step 3: Run TypeScript check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/components/combat/CombatLog.svelte src/lib/components/combat/CombatMode.svelte
git commit -m "feat(effects): update UI to show effect source attribution

Combat log highlights effect sources in italics.
Turn start now processes effects with player context."
```

---

## Phase 9: Testing & Verification

### Task 9: Manual Integration Testing

**Step 1: Test Lord birth sign HP regen**

1. Create/load a character with Lord birth sign
2. Enter combat mode
3. Ensure magicka is at max
4. Click "Start Turn"
5. Verify: HP increases by character level
6. Verify: Combat log shows "healed X HP (Lord Birth Sign)"

**Step 2: Test Lord birth sign fire vulnerability**

1. Same Lord character in combat
2. Take fire damage (adjust HP with fire damage type)
3. Verify: Damage is doubled
4. Verify: Combat log shows "takes 2x damage (Lord Birth Sign)"

**Step 3: Test Burning condition DOT**

1. Any character in combat
2. Apply Burning condition (level 2)
3. Start new turn
4. Verify: Takes 3 fire damage automatically
5. Verify: Combat log shows "took 3 Fire damage (Burning Level 2)"

**Step 4: Test Breton MP regen**

1. Create/load a Breton character
2. Enter combat with MP below max
3. Start new turn
4. Verify: MP increases by 1
5. Verify: Combat log shows "restored 1 MP (Breton Race)"

**Step 5: Run full type check**

Run: `cd /Users/donovanyohan/Documents/Programs/personal/elder-scrolls-rpg && npm run check`
Expected: No errors

**Step 6: Commit verification results**

```bash
git add -A
git commit -m "test(effects): verify effect system integration

Tested Lord HP regen/fire vulnerability, Burning DOT,
and Breton MP regen. All effects apply correctly with
proper combat log attribution."
```

---

## Files Summary

### New Files (5):
- `src/lib/models/effect.ts` - Core effect type definitions
- `src/lib/util/effect.util.ts` - Effect evaluation utilities
- `src/lib/data/birthSignEffects.ts` - Birth sign combat effects
- `src/lib/data/raceEffects.ts` - Race combat effects
- `src/lib/data/conditionEffects.ts` - Condition combat effects
- `src/lib/services/effectAggregator.ts` - Effect collection service

### Modified Files (3):
- `src/lib/models/combat.ts` - Extended ConditionType enum
- `src/lib/stores/combat.store.ts` - Effect integration
- `src/lib/components/combat/CombatLog.svelte` - Source attribution display
- `src/lib/components/combat/CombatMode.svelte` - Pass player to handlers

---

## Implementation Dependencies

```
Task 1: Effect Model Types (no deps)
    ↓
Task 2: Effect Evaluation Utils (depends on Task 1)
    ↓
Task 3: Birth Sign Effects (depends on Task 1)
Task 4: Race Effects (depends on Task 1)
Task 5: Condition Effects (depends on Task 1)
    ↓
Task 6: Effect Aggregator (depends on Tasks 2-5)
    ↓
Task 7: Combat Store Integration (depends on Task 6)
    ↓
Task 8: UI Integration (depends on Task 7)
    ↓
Task 9: Testing (depends on Task 8)
```

---

## Future Expansion

This effect system can be extended to support:

1. **Equipment Effects**: Material bonuses (Skyforge, Stalhrim freeze AP), armor penalties
2. **Spell Buff Effects**: Oakflesh (+2 AC), concentration tracking
3. **Dragon Shout Effects**: Become Ethereal, Whirlwind Sprint
4. **Potion Effects**: Temporary stat boosts
5. **Enchantment Effects**: Weapon enchants, armor enchants

Each would follow the same pattern:
1. Create `*Effects.ts` data file with Effect definitions
2. Add to `effectAggregator.ts` collection
3. Effects automatically process at appropriate triggers
