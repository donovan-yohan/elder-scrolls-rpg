# Elder Scrolls RPG - Character Builder Design

**Date:** 2026-01-22
**Status:** Approved
**Scope:** Complete character builder with spells, subskills, equipment, and polished character sheet

## Overview

Build a complete character creation wizard and character sheet viewer for an Elder Scrolls-inspired TTRPG. The app uses SvelteKit + Skeleton UI with fantasy theming.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Framework | Skeleton UI (keep current) | Already configured, Svelte-native, zero migration cost |
| Creation Flow | Multi-step wizard | Complex form needs guided steps, dynamic based on choices |
| Data Persistence | localStorage + file export/import | Simple, offline-first, backup/sharing via JSON files |
| Game Data | Minimal starter set | Prove e2e flows first, expand data later |
| Future Scope | Combat utility | Architecture should support combat tracking later |

## Wizard Flow

| Step | Name | Conditional | Purpose |
|------|------|-------------|---------|
| 1 | Basics | No | Name, Race, Archetype, Birth Sign |
| 2 | Skills | No | Select 6 major + 6 minor skills |
| 3 | Subskills | No | Create specializations for chosen skills |
| 4 | Spells | Yes - magic skills only | Choose starting spells by school |
| 5 | Equipment | No | Select starting weapons, armor, items |
| 6 | Review | No | Summary, derived stats, confirm |

### Dynamic Behavior

- Step 4 (Spells) only appears if player selected magic skills (Alteration, Conjuration, Destruction, Illusion, Mysticism, Restoration)
- Spell allowance: 3 per major magic skill, 1 per minor magic skill
- Navigation sidebar shows progress with checkmarks for completed steps

## Data Models

### New Data Files (`src/lib/data/`)

| File | Purpose |
|------|---------|
| `spells.ts` | Spell definitions (school, level, AP/MP cost, range, effects) |
| `weapons.ts` | Weapon definitions (damage, AP cost, range, tier) |
| `armor.ts` | Armor definitions (AC, dodge modifier, movement penalty) |
| `materials.ts` | Material tiers (Iron → Dragonbone) with modifiers |
| `items.ts` | Consumables and misc items |

### Extended Player Model

```typescript
interface Player {
  // Identity
  id: string
  name: string
  level: number

  // Core choices
  race: Race
  archetype: Archetype
  birthSign: BirthSign

  // Skills
  majorSkills: Skill[]
  minorSkills: Skill[]
  subSkills: SubSkill[]

  // Magic
  knownSpells: string[]  // Spell IDs

  // Equipment
  equipment: {
    weapon: string | null
    offhand: string | null
    armor: string | null
    accessories: string[]
  }
  inventory: InventoryItem[]

  // Meta
  notes: string
  createdAt: string
  updatedAt: string
}
```

### Derived Stats Utilities (`src/lib/utils/stats.ts`)

- `calculateMaxHealth(player)` - Archetype base + race + birth sign
- `calculateMaxMagicka(player)` - Same pattern
- `calculateMaxAP(player)` - Same pattern
- `calculateSkillBonus(player, skill)` - Level scaling + major/minor + subskill
- `getAvailableSpellSlots(player)` - Count by magic school

## New Components

| Component | Purpose |
|-----------|---------|
| `Wizard.svelte` | Container with step navigation, progress |
| `WizardStep.svelte` | Step wrapper with validation |
| `SpellCard.svelte` | Spell display for selection |
| `EquipmentCard.svelte` | Weapon/armor/item display |
| `SubskillEditor.svelte` | Create/edit subskills |
| `StatBlock.svelte` | Derived stats with breakdown |
| `CharacterSheet.svelte` | Full printable sheet layout |

### Wizard Store (`src/lib/stores/wizard.store.ts`)

- Current step index
- Completed steps set
- Form data across all steps
- Validation state per step
- Reset/initialize functions

## File Export/Import

**Export Format:** `.esrpg` JSON file
```json
{
  "version": "1.0.0",
  "exportedAt": "ISO timestamp",
  "player": { /* full player model */ }
}
```

**Import Flow:**
1. Validate JSON structure
2. Check version compatibility
3. Show preview before confirming
4. Merge or replace existing character

## Implementation Tasks

### Phase 1: Data Layer
- [ ] Create spells.ts with starter spell set (2-3 per school)
- [ ] Create weapons.ts with starter weapons
- [ ] Create armor.ts with armor types
- [ ] Create materials.ts with tier system
- [ ] Create items.ts with basic consumables
- [ ] Update player model with new fields
- [ ] Create stats utility functions

### Phase 2: Wizard Infrastructure
- [ ] Create wizard store for state management
- [ ] Create Wizard.svelte container component
- [ ] Create WizardStep.svelte wrapper
- [ ] Set up wizard routing (/create/[step])

### Phase 3: Wizard Steps
- [ ] Step 1: Basics (refactor existing)
- [ ] Step 2: Skills (refactor existing)
- [ ] Step 3: Subskills (new)
- [ ] Step 4: Spells (new, conditional)
- [ ] Step 5: Equipment (new)
- [ ] Step 6: Review (new)

### Phase 4: Character Sheet
- [ ] Create StatBlock component
- [ ] Create CharacterSheet layout
- [ ] Update /[id] page with new sheet
- [ ] Add print styles

### Phase 5: Export/Import
- [ ] Create export utility
- [ ] Create import utility with validation
- [ ] Add export button to character sheet
- [ ] Add import UI to home page

## Tech Stack

- **Framework:** SvelteKit 2.0
- **UI:** Skeleton UI + Tailwind CSS
- **Forms:** sveltekit-superforms + Zod
- **State:** Svelte stores + localStorage
- **Types:** TypeScript strict mode
