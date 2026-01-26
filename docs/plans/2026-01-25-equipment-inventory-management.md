# Equipment & Inventory Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow players to add weapons, armor, and items to their inventory with material selection for weapons/armor, including material special effects.

**Architecture:** Create an EquipmentManager component for the CharacterSheet that replaces the current read-only equipment display when in edit mode. This component will include material selection with calculated stats (value/weight modifiers) and display material special properties. Update the Equipment interface to store material information alongside equipment IDs.

**Tech Stack:** Svelte 5 (runes), TypeScript, Skeleton UI components, existing materials.ts/weapons.ts/armor.ts/items.ts data

---

## Task 1: Update Equipment Model to Include Material

**Files:**
- Modify: `src/lib/models/player.ts`
- Modify: `src/lib/schema/player.schema.ts`

**Step 1: Update Equipment interface**

In `src/lib/models/player.ts`, update the Equipment interface to store material with each equipment piece:

```typescript
export interface EquipmentSlot {
  id: string | null
  materialId: string | null
}

export interface Equipment {
  weapon: EquipmentSlot
  offhand: EquipmentSlot
  armor: EquipmentSlot
  accessories: string[]
}
```

**Step 2: Update default player data**

Update the `defaultPlayerData` in `src/lib/models/player.ts`:

```typescript
equipment: {
  weapon: { id: null, materialId: null },
  offhand: { id: null, materialId: null },
  armor: { id: null, materialId: null },
  accessories: [],
},
```

**Step 3: Update schema**

In `src/lib/schema/player.schema.ts`, update the equipment schema:

```typescript
const equipmentSlotSchema = z.object({
  id: z.string().nullable(),
  materialId: z.string().nullable(),
})

export const equipmentSchema = z.object({
  weapon: equipmentSlotSchema,
  offhand: equipmentSlotSchema,
  armor: equipmentSlotSchema,
  accessories: z.array(z.string()),
})
```

**Step 4: Verify types compile**

Run: `npm run check 2>&1 | grep -i "equipment" | head -20`
Expected: Type errors in components using old equipment shape (this is expected, we'll fix in later tasks)

**Step 5: Commit**

```bash
git add src/lib/models/player.ts src/lib/schema/player.schema.ts
git commit -m "feat: add material support to Equipment interface

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Equipment Utility Functions

**Files:**
- Create: `src/lib/util/equipment.util.ts`

**Step 1: Create the utility file**

```typescript
import type { Equipment, EquipmentSlot } from '$lib/models/player'
import { getWeaponById, type Weapon } from '$lib/data/weapons'
import { ArmorTypes, type ArmorType } from '$lib/data/armor'
import { getMaterialById, calculateMaterialValue, calculateMaterialWeight, type Material } from '$lib/data/materials'

export interface EquippedWeapon {
  weapon: Weapon
  material: Material | null
  adjustedValue: number
  adjustedWeight: number
}

export interface EquippedArmor {
  armor: ArmorType
  material: Material | null
  adjustedValue: number
  adjustedWeight: number
}

/**
 * Get equipped weapon with material adjustments
 */
export function getEquippedWeapon(slot: EquipmentSlot): EquippedWeapon | null {
  if (!slot.id) return null
  const weapon = getWeaponById(slot.id)
  if (!weapon) return null

  const material = slot.materialId ? getMaterialById(slot.materialId) : null
  const adjustedValue = material ? calculateMaterialValue(weapon.value, material) : weapon.value
  const adjustedWeight = material ? calculateMaterialWeight(weapon.weight, material) : weapon.weight

  return { weapon, material, adjustedValue, adjustedWeight }
}

/**
 * Get equipped armor with material adjustments
 */
export function getEquippedArmor(slot: EquipmentSlot): EquippedArmor | null {
  if (!slot.id) return null
  const armor = ArmorTypes.find(a => a.id === slot.id)
  if (!armor) return null

  const material = slot.materialId ? getMaterialById(slot.materialId) : null
  // Armor types don't have base value/weight in current data, use defaults
  const baseValue = 100 // TODO: Add value to ArmorType if needed
  const baseWeight = 20  // TODO: Add weight to ArmorType if needed
  const adjustedValue = material ? calculateMaterialValue(baseValue, material) : baseValue
  const adjustedWeight = material ? calculateMaterialWeight(baseWeight, material) : baseWeight

  return { armor, material, adjustedValue, adjustedWeight }
}

/**
 * Get available materials for a weapon (excludes armor-only materials)
 */
export function getWeaponMaterials(): Material[] {
  const { Materials } = await import('$lib/data/materials')
  return Materials.filter(m => !m.isArmorOnly)
}

/**
 * Get available materials for armor (all materials)
 */
export function getArmorMaterials(): Material[] {
  const { Materials } = await import('$lib/data/materials')
  return Materials
}

/**
 * Get material special properties for weapon
 */
export function getWeaponMaterialProperties(material: Material): string[] {
  return material.specialProperties
    .filter(p => p.name.includes('Weapon') || !p.name.includes('Armor'))
    .map(p => p.description)
}

/**
 * Get material special properties for armor
 */
export function getArmorMaterialProperties(material: Material): string[] {
  return material.specialProperties
    .filter(p => p.name.includes('Armor') || !p.name.includes('Weapon'))
    .map(p => p.description)
}

/**
 * Create an empty equipment slot
 */
export function createEmptySlot(): EquipmentSlot {
  return { id: null, materialId: null }
}

/**
 * Create an equipment slot with item and optional material
 */
export function createEquipmentSlot(id: string, materialId?: string): EquipmentSlot {
  return { id, materialId: materialId ?? null }
}
```

**Step 2: Fix the import for Materials (make it synchronous)**

Update the utility to use synchronous imports:

```typescript
import { Materials, getMaterialById, calculateMaterialValue, calculateMaterialWeight, type Material } from '$lib/data/materials'

// ...

export function getWeaponMaterials(): Material[] {
  return Materials.filter(m => !m.isArmorOnly)
}

export function getArmorMaterials(): Material[] {
  return Materials
}
```

**Step 3: Verify the file compiles**

Run: `npm run check 2>&1 | grep "equipment.util" | head -10`
Expected: No errors from equipment.util.ts

**Step 4: Commit**

```bash
git add src/lib/util/equipment.util.ts
git commit -m "feat: add equipment utility functions for material calculations

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create MaterialSelector Component

**Files:**
- Create: `src/lib/components/equipment/MaterialSelector.svelte`
- Create: `src/lib/components/equipment/index.ts`

**Step 1: Create the MaterialSelector component**

```svelte
<!-- src/lib/components/equipment/MaterialSelector.svelte -->
<script lang="ts">
  import { Materials, type Material } from '$lib/data/materials'
  import { SpellLevel } from '$lib/data/spells'

  interface Props {
    selectedMaterialId: string | null
    onSelect: (materialId: string | null) => void
    excludeArmorOnly?: boolean
    disabled?: boolean
  }

  let { selectedMaterialId, onSelect, excludeArmorOnly = false, disabled = false }: Props = $props()

  let availableMaterials = $derived(
    excludeArmorOnly ? Materials.filter(m => !m.isArmorOnly) : Materials
  )

  let selectedMaterial = $derived(
    selectedMaterialId ? Materials.find(m => m.id === selectedMaterialId) : null
  )

  // Group materials by tier
  let materialsByTier = $derived.by(() => {
    const grouped: Record<number, Material[]> = {}
    for (const material of availableMaterials) {
      if (!grouped[material.tier]) grouped[material.tier] = []
      grouped[material.tier].push(material)
    }
    return grouped
  })

  function getTierLabel(tier: number): string {
    switch (tier) {
      case 1: return 'Novice'
      case 2: return 'Apprentice'
      case 3: return 'Adept'
      case 4: return 'Expert'
      case 5: return 'Master'
      default: return `Tier ${tier}`
    }
  }

  function handleSelect(materialId: string | null) {
    if (!disabled) {
      onSelect(materialId)
    }
  }
</script>

<div class="material-selector">
  <label class="label mb-2">
    <span class="text-sm font-semibold">Material</span>
  </label>

  <select
    class="select"
    value={selectedMaterialId ?? ''}
    onchange={(e) => handleSelect(e.currentTarget.value || null)}
    {disabled}
  >
    <option value="">No Material (Base)</option>
    {#each Object.entries(materialsByTier) as [tier, materials]}
      <optgroup label={getTierLabel(Number(tier))}>
        {#each materials as material}
          <option value={material.id}>
            {material.name} ({material.valueMultiplier}x value, {material.weightMultiplier}x weight)
          </option>
        {/each}
      </optgroup>
    {/each}
  </select>

  {#if selectedMaterial && selectedMaterial.specialProperties.length > 0}
    <div class="mt-2 card p-2 variant-soft-warning text-sm">
      <span class="font-semibold">Special Properties:</span>
      <ul class="list-disc list-inside mt-1 space-y-1">
        {#each selectedMaterial.specialProperties as prop}
          <li>
            <span class="font-medium">{prop.name}:</span>
            <span class="text-surface-400">{prop.description}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
```

**Step 2: Create barrel export**

```typescript
// src/lib/components/equipment/index.ts
export { default as MaterialSelector } from './MaterialSelector.svelte'
```

**Step 3: Verify component compiles**

Run: `npm run check 2>&1 | grep "MaterialSelector" | head -10`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/components/equipment/
git commit -m "feat: add MaterialSelector component for equipment materials

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create EquipmentEditor Component

**Files:**
- Create: `src/lib/components/equipment/EquipmentEditor.svelte`
- Modify: `src/lib/components/equipment/index.ts`

**Step 1: Create the EquipmentEditor component**

```svelte
<!-- src/lib/components/equipment/EquipmentEditor.svelte -->
<script lang="ts">
  import { TabGroup, Tab } from '@skeletonlabs/skeleton'
  import type { Equipment, EquipmentSlot, InventoryItem } from '$lib/models/player'
  import { Weapons, WeaponSkill, getWeaponById, type Weapon } from '$lib/data/weapons'
  import { ArmorTypes, ArmorCategory, type ArmorType } from '$lib/data/armor'
  import { Items, ItemType, getItemById, type Item } from '$lib/data/items'
  import { Materials, getMaterialById, calculateMaterialValue, calculateMaterialWeight } from '$lib/data/materials'
  import { MaterialSelector } from '$lib/components/equipment'
  import { createEmptySlot, createEquipmentSlot, getWeaponMaterials, getArmorMaterials } from '$lib/util/equipment.util'

  interface Props {
    equipment: Equipment
    inventory: InventoryItem[]
    onEquipmentChange: (equipment: Equipment) => void
    onInventoryChange: (inventory: InventoryItem[]) => void
  }

  let { equipment, inventory, onEquipmentChange, onInventoryChange }: Props = $props()

  let selectedTabIndex = $state(0)

  // Weapon helpers
  let weaponMaterials = $derived(Materials.filter(m => !m.isArmorOnly))
  let armorMaterials = $derived(Materials)

  function getWeaponsBySkill(skill: WeaponSkill): Weapon[] {
    return Weapons.filter(w => w.skill === skill && !w.isAmmunition)
  }

  let oneHandedWeapons = $derived(getWeaponsBySkill(WeaponSkill.OneHanded))
  let twoHandedWeapons = $derived(getWeaponsBySkill(WeaponSkill.TwoHanded))
  let rangedWeapons = $derived(getWeaponsBySkill(WeaponSkill.Marksmanship))
  let shields = $derived(Weapons.filter(w => w.isShield))

  let selectedWeapon = $derived(equipment.weapon.id ? getWeaponById(equipment.weapon.id) : null)
  let selectedOffhand = $derived(equipment.offhand.id ? getWeaponById(equipment.offhand.id) : null)
  let selectedArmor = $derived(equipment.armor.id ? ArmorTypes.find(a => a.id === equipment.armor.id) : null)

  let canSelectOffhand = $derived(selectedWeapon && !selectedWeapon.isTwoHanded && !selectedWeapon.isShield)

  // Selection handlers
  function selectWeapon(weaponId: string | null) {
    const newEquipment = { ...equipment }
    if (weaponId) {
      const weapon = getWeaponById(weaponId)
      newEquipment.weapon = createEquipmentSlot(weaponId, equipment.weapon.materialId ?? undefined)
      // Clear offhand if two-handed
      if (weapon?.isTwoHanded) {
        newEquipment.offhand = createEmptySlot()
      }
    } else {
      newEquipment.weapon = createEmptySlot()
    }
    onEquipmentChange(newEquipment)
  }

  function selectWeaponMaterial(materialId: string | null) {
    const newEquipment = { ...equipment }
    newEquipment.weapon = { ...equipment.weapon, materialId }
    onEquipmentChange(newEquipment)
  }

  function selectOffhand(weaponId: string | null) {
    const newEquipment = { ...equipment }
    newEquipment.offhand = weaponId ? createEquipmentSlot(weaponId, equipment.offhand.materialId ?? undefined) : createEmptySlot()
    onEquipmentChange(newEquipment)
  }

  function selectOffhandMaterial(materialId: string | null) {
    const newEquipment = { ...equipment }
    newEquipment.offhand = { ...equipment.offhand, materialId }
    onEquipmentChange(newEquipment)
  }

  function selectArmor(armorId: string | null) {
    const newEquipment = { ...equipment }
    newEquipment.armor = armorId ? createEquipmentSlot(armorId, equipment.armor.materialId ?? undefined) : createEmptySlot()
    onEquipmentChange(newEquipment)
  }

  function selectArmorMaterial(materialId: string | null) {
    const newEquipment = { ...equipment }
    newEquipment.armor = { ...equipment.armor, materialId }
    onEquipmentChange(newEquipment)
  }

  // Inventory helpers
  function getItemQuantity(itemId: string): number {
    return inventory.find(i => i.itemId === itemId)?.quantity ?? 0
  }

  function addItem(itemId: string) {
    const item = getItemById(itemId)
    if (!item) return

    const existing = inventory.find(i => i.itemId === itemId)
    if (existing) {
      const maxStack = item.maxStack ?? 99
      if (existing.quantity < maxStack) {
        const newInventory = inventory.map(i =>
          i.itemId === itemId ? { ...i, quantity: i.quantity + 1 } : i
        )
        onInventoryChange(newInventory)
      }
    } else {
      onInventoryChange([...inventory, { itemId, quantity: 1 }])
    }
  }

  function removeItem(itemId: string) {
    const existing = inventory.find(i => i.itemId === itemId)
    if (existing) {
      if (existing.quantity > 1) {
        const newInventory = inventory.map(i =>
          i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i
        )
        onInventoryChange(newInventory)
      } else {
        onInventoryChange(inventory.filter(i => i.itemId !== itemId))
      }
    }
  }

  // Calculate adjusted stats
  function getAdjustedValue(baseValue: number, materialId: string | null): number {
    if (!materialId) return baseValue
    const material = getMaterialById(materialId)
    return material ? calculateMaterialValue(baseValue, material) : baseValue
  }

  function getAdjustedWeight(baseWeight: number, materialId: string | null): number {
    if (!materialId) return baseWeight
    const material = getMaterialById(materialId)
    return material ? calculateMaterialWeight(baseWeight, material) : baseWeight
  }
</script>

<div class="equipment-editor">
  <TabGroup>
    <Tab bind:group={selectedTabIndex} name="weapons" value={0}>Weapons</Tab>
    <Tab bind:group={selectedTabIndex} name="armor" value={1}>Armor</Tab>
    <Tab bind:group={selectedTabIndex} name="items" value={2}>Items</Tab>
  </TabGroup>

  <div class="mt-4">
    {#if selectedTabIndex === 0}
      <!-- Weapons Tab -->
      <div class="space-y-6">
        <!-- Main Weapon -->
        <div class="card p-4 variant-soft-surface">
          <h4 class="h4 font-semibold mb-3">Main Weapon</h4>

          <div class="space-y-4">
            <!-- One-Handed -->
            <div>
              <h5 class="text-sm font-medium text-surface-500 mb-2">One-Handed</h5>
              <div class="flex flex-wrap gap-2">
                {#each oneHandedWeapons as weapon}
                  <button
                    type="button"
                    class="btn btn-sm {equipment.weapon.id === weapon.id ? 'variant-filled-primary' : 'variant-soft'}"
                    onclick={() => selectWeapon(equipment.weapon.id === weapon.id ? null : weapon.id)}
                  >
                    {weapon.name}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Two-Handed -->
            <div>
              <h5 class="text-sm font-medium text-surface-500 mb-2">Two-Handed</h5>
              <div class="flex flex-wrap gap-2">
                {#each twoHandedWeapons as weapon}
                  <button
                    type="button"
                    class="btn btn-sm {equipment.weapon.id === weapon.id ? 'variant-filled-primary' : 'variant-soft'}"
                    onclick={() => selectWeapon(equipment.weapon.id === weapon.id ? null : weapon.id)}
                  >
                    {weapon.name}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Ranged -->
            <div>
              <h5 class="text-sm font-medium text-surface-500 mb-2">Ranged</h5>
              <div class="flex flex-wrap gap-2">
                {#each rangedWeapons as weapon}
                  <button
                    type="button"
                    class="btn btn-sm {equipment.weapon.id === weapon.id ? 'variant-filled-primary' : 'variant-soft'}"
                    onclick={() => selectWeapon(equipment.weapon.id === weapon.id ? null : weapon.id)}
                  >
                    {weapon.name}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Material Selection -->
            {#if selectedWeapon}
              <div class="border-t border-surface-500/20 pt-4">
                <MaterialSelector
                  selectedMaterialId={equipment.weapon.materialId}
                  onSelect={selectWeaponMaterial}
                  excludeArmorOnly={true}
                />

                {#if equipment.weapon.materialId}
                  <div class="mt-2 text-sm text-surface-400">
                    <span>Adjusted Value: {getAdjustedValue(selectedWeapon.value, equipment.weapon.materialId)} gold</span>
                    <span class="mx-2">|</span>
                    <span>Adjusted Weight: {getAdjustedWeight(selectedWeapon.weight, equipment.weapon.materialId)} lbs</span>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- Off-Hand -->
        <div class="card p-4 variant-soft-surface {!canSelectOffhand ? 'opacity-50' : ''}">
          <h4 class="h4 font-semibold mb-3">Off-Hand</h4>
          {#if !canSelectOffhand}
            <p class="text-sm text-surface-500">Select a one-handed weapon to enable off-hand.</p>
          {:else}
            <div class="space-y-4">
              <!-- Shields -->
              <div>
                <h5 class="text-sm font-medium text-surface-500 mb-2">Shields</h5>
                <div class="flex flex-wrap gap-2">
                  {#each shields as shield}
                    <button
                      type="button"
                      class="btn btn-sm {equipment.offhand.id === shield.id ? 'variant-filled-secondary' : 'variant-soft'}"
                      onclick={() => selectOffhand(equipment.offhand.id === shield.id ? null : shield.id)}
                    >
                      {shield.name}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Dual Wield -->
              <div>
                <h5 class="text-sm font-medium text-surface-500 mb-2">Dual Wield</h5>
                <div class="flex flex-wrap gap-2">
                  {#each oneHandedWeapons as weapon}
                    <button
                      type="button"
                      class="btn btn-sm {equipment.offhand.id === weapon.id ? 'variant-filled-secondary' : 'variant-soft'}"
                      onclick={() => selectOffhand(equipment.offhand.id === weapon.id ? null : weapon.id)}
                    >
                      {weapon.name}
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Material Selection -->
              {#if selectedOffhand}
                <div class="border-t border-surface-500/20 pt-4">
                  <MaterialSelector
                    selectedMaterialId={equipment.offhand.materialId}
                    onSelect={selectOffhandMaterial}
                    excludeArmorOnly={true}
                  />
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>

    {:else if selectedTabIndex === 1}
      <!-- Armor Tab -->
      <div class="card p-4 variant-soft-surface">
        <h4 class="h4 font-semibold mb-3">Armor Type</h4>

        <div class="space-y-4">
          {#each [ArmorCategory.Light, ArmorCategory.Medium, ArmorCategory.Heavy] as category}
            {@const armor = ArmorTypes.find(a => a.category === category)}
            {#if armor}
              <button
                type="button"
                class="w-full card p-3 text-left {equipment.armor.id === armor.id ? 'variant-filled-tertiary' : 'variant-ghost-surface hover:variant-soft-surface'}"
                onclick={() => selectArmor(equipment.armor.id === armor.id ? null : armor.id)}
              >
                <div class="flex justify-between items-center">
                  <span class="font-semibold">{armor.name}</span>
                  <div class="flex gap-2 text-sm">
                    <span>AC +{armor.acBonus}</span>
                    <span>Dodge {armor.dodgeBonus >= 0 ? '+' : ''}{armor.dodgeBonus}</span>
                  </div>
                </div>
                <div class="text-sm text-surface-400 mt-1">
                  Spell: {armor.magickaCastModifier} | Movement: {armor.movementModifier}
                </div>
              </button>
            {/if}
          {/each}

          <button
            type="button"
            class="w-full card p-3 text-left {!equipment.armor.id ? 'variant-filled-success' : 'variant-ghost-surface hover:variant-soft-surface'}"
            onclick={() => selectArmor(null)}
          >
            <div class="flex justify-between items-center">
              <span class="font-semibold">Unarmored</span>
              <div class="flex gap-2 text-sm">
                <span>AC +0</span>
                <span>Dodge +10</span>
              </div>
            </div>
            <div class="text-sm text-surface-400 mt-1">
              Spell: advantage | Movement: advantage
            </div>
          </button>

          <!-- Material Selection -->
          {#if selectedArmor}
            <div class="border-t border-surface-500/20 pt-4">
              <MaterialSelector
                selectedMaterialId={equipment.armor.materialId}
                onSelect={selectArmorMaterial}
              />
            </div>
          {/if}
        </div>
      </div>

    {:else}
      <!-- Items Tab -->
      <div class="space-y-4">
        <div class="card p-4 variant-soft-surface">
          <h4 class="h4 font-semibold mb-3">Add Items</h4>

          {#each [ItemType.Potion, ItemType.Consumable, ItemType.Material, ItemType.Misc] as type}
            {@const typeItems = Items.filter(i => i.type === type)}
            {#if typeItems.length > 0}
              <div class="mb-4">
                <h5 class="text-sm font-medium text-surface-500 mb-2 capitalize">{type}s</h5>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {#each typeItems as item}
                    {@const qty = getItemQuantity(item.id)}
                    <div class="flex items-center justify-between p-2 rounded bg-surface-700/50">
                      <div>
                        <span class="font-medium">{item.name}</span>
                        <span class="text-sm text-surface-400 ml-2">{item.value}g</span>
                      </div>
                      <div class="flex items-center gap-2">
                        {#if qty > 0}
                          <button
                            type="button"
                            class="btn-icon btn-icon-sm variant-soft-error"
                            onclick={() => removeItem(item.id)}
                          >-</button>
                        {/if}
                        <span class="w-6 text-center">{qty}</span>
                        <button
                          type="button"
                          class="btn-icon btn-icon-sm variant-soft-success"
                          onclick={() => addItem(item.id)}
                        >+</button>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>

        <!-- Current Inventory -->
        {#if inventory.length > 0}
          <div class="card p-4 variant-soft-tertiary">
            <h4 class="h4 font-semibold mb-3">Current Inventory</h4>
            <div class="space-y-2">
              {#each inventory as invItem}
                {@const item = getItemById(invItem.itemId)}
                {#if item}
                  <div class="flex justify-between items-center">
                    <span>{item.name}</span>
                    <span class="badge variant-filled">{invItem.quantity}x</span>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
```

**Step 2: Update barrel export**

```typescript
// src/lib/components/equipment/index.ts
export { default as MaterialSelector } from './MaterialSelector.svelte'
export { default as EquipmentEditor } from './EquipmentEditor.svelte'
```

**Step 3: Verify component compiles**

Run: `npm run check 2>&1 | grep "EquipmentEditor" | head -10`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/components/equipment/
git commit -m "feat: add EquipmentEditor component with material selection

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update CharacterSheet Equipment Display

**Files:**
- Modify: `src/lib/components/CharacterSheet.svelte`

**Step 1: Update imports and derived values**

Add imports for the new equipment utilities and update the equipment-related derived values to handle the new EquipmentSlot structure.

**Step 2: Update equipment section in template**

When in edit mode, show the EquipmentEditor component. When in view mode, show the equipment with material information and special properties.

**Step 3: Add material display to equipment cards**

Update the weapon, offhand, and armor display cards to show:
- Material name (if selected)
- Adjusted value and weight
- Material special properties

**Step 4: Verify the build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build completes successfully

**Step 5: Commit**

```bash
git add src/lib/components/CharacterSheet.svelte
git commit -m "feat: integrate EquipmentEditor into CharacterSheet edit mode

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update Wizard EquipmentStep

**Files:**
- Modify: `src/lib/components/wizard/steps/EquipmentStep.svelte`

**Step 1: Update to use new Equipment interface**

Update the EquipmentStep to use the new `EquipmentSlot` structure with material support.

**Step 2: Add material selection to weapon/armor choices**

Integrate the MaterialSelector component into the wizard step for weapon and armor selection.

**Step 3: Update validation and form data sync**

Ensure the wizard store correctly syncs the equipment with materials.

**Step 4: Verify wizard flow**

Run: `npm run dev` and manually test the character creation wizard equipment step.

**Step 5: Commit**

```bash
git add src/lib/components/wizard/steps/EquipmentStep.svelte
git commit -m "feat: add material selection to character creation wizard

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Handle Data Migration for Existing Characters

**Files:**
- Create: `src/lib/util/migration.util.ts`
- Modify: `src/routes/[id]/+page.svelte` (if needed)

**Step 1: Create migration utility**

```typescript
// src/lib/util/migration.util.ts
import type { Equipment, EquipmentSlot, PlayerData } from '$lib/models/player'

interface LegacyEquipment {
  weapon: string | null
  offhand: string | null
  armor: string | null
  accessories: string[]
}

function isLegacyEquipment(equipment: Equipment | LegacyEquipment): equipment is LegacyEquipment {
  return typeof equipment.weapon === 'string' || equipment.weapon === null
}

function migrateEquipmentSlot(value: string | null | EquipmentSlot): EquipmentSlot {
  if (value === null || typeof value === 'string') {
    return { id: value, materialId: null }
  }
  return value
}

export function migratePlayerEquipment(equipment: Equipment | LegacyEquipment): Equipment {
  if (!isLegacyEquipment(equipment)) {
    return equipment
  }

  return {
    weapon: migrateEquipmentSlot(equipment.weapon),
    offhand: migrateEquipmentSlot(equipment.offhand),
    armor: migrateEquipmentSlot(equipment.armor),
    accessories: equipment.accessories,
  }
}

export function migratePlayerData(player: PlayerData): PlayerData {
  return {
    ...player,
    equipment: migratePlayerEquipment(player.equipment as Equipment | LegacyEquipment),
  }
}
```

**Step 2: Apply migration when loading characters**

Update the character loading logic to run the migration on load.

**Step 3: Verify existing characters load correctly**

Test with existing saved characters to ensure migration works.

**Step 4: Commit**

```bash
git add src/lib/util/migration.util.ts src/routes/[id]/+page.svelte
git commit -m "feat: add migration utility for legacy equipment format

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Build Verification and Testing

**Files:**
- All modified files

**Step 1: Run full build**

Run: `npm run build`
Expected: Build completes with no new errors

**Step 2: Run type check**

Run: `npm run check`
Expected: No new type errors introduced

**Step 3: Manual testing checklist**

- [ ] Create new character, select weapon with material, verify special properties display
- [ ] Create new character, select armor with material, verify special properties display
- [ ] Edit existing character, add equipment with material
- [ ] Verify material modifiers apply to value/weight correctly
- [ ] Verify material-only armor materials (Hide/Leather) don't show for weapons
- [ ] Test inventory add/remove functionality
- [ ] Load existing character (pre-migration), verify equipment displays correctly

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues found during testing

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Update Equipment model | player.ts, player.schema.ts |
| 2 | Create equipment utilities | equipment.util.ts |
| 3 | Create MaterialSelector | MaterialSelector.svelte, index.ts |
| 4 | Create EquipmentEditor | EquipmentEditor.svelte |
| 5 | Update CharacterSheet | CharacterSheet.svelte |
| 6 | Update Wizard EquipmentStep | EquipmentStep.svelte |
| 7 | Handle data migration | migration.util.ts |
| 8 | Build verification | All files |
