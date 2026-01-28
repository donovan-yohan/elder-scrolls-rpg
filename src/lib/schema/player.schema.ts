import { z } from 'zod'
import { RaceName } from '$lib/data/race'
import { ArchetypeName } from '$lib/data/archetype'
import { BirthSignName } from '$lib/data/birthSign'
import { Skill } from '$lib/data/skill'
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'

// Subskill schema - standalone character traits (Lancer-style triggers)
export const subSkillSchema = z.object({
	name: z.string().min(1),
	description: z.string(),
})

// Inventory item schema
export const inventoryItemSchema = z.object({
	itemId: z.string().min(1),
	quantity: z.number().int().positive(),
})

// Equipment slot schema (for weapon, offhand, armor with material support)
const equipmentSlotSchema = z.object({
	id: z.string().nullable(),
	materialId: z.string().nullable(),
})

// Owned weapon schema (weapons in player's inventory)
const ownedWeaponSchema = z.object({
	weaponId: z.string(),
	materialId: z.string().nullable()
})

// Equipment schema
export const equipmentSchema = z.object({
	weapon: equipmentSlotSchema,
	offhand: equipmentSlotSchema,
	armor: equipmentSlotSchema,
	accessories: z.array(z.string()),
})

// Full player schema for creation/validation
export const playerSchema = z
	.object({
		characterName: z.string().min(1).default('John Scrolls'),
		race: z.nativeEnum(RaceName),
		archetype: z.nativeEnum(ArchetypeName),
		birthSign: z.nativeEnum(BirthSignName),
		majorSkills: z.array(z.nativeEnum(Skill)).max(6).min(6),
		minorSkills: z.array(z.nativeEnum(Skill)).max(6).min(6),
		subSkills: z.array(subSkillSchema).default([]),
		// Magic
		knownSpells: z.array(z.string()).default([]),
		// Equipment
		equipment: equipmentSchema.default({
			weapon: { id: null, materialId: null },
			offhand: { id: null, materialId: null },
			armor: { id: null, materialId: null },
			accessories: [],
		}),
		// Inventory
		inventory: z.array(inventoryItemSchema).default([]),
		// Owned weapons (weapons player can equip in combat)
		ownedWeapons: z.array(ownedWeaponSchema).default([]),
		// Meta
		notes: z.string().default(''),
		fortunePoints: z.number().int().min(0).default(0),
		misfortunePoints: z.number().int().min(0).default(0),
		schemaVersion: z.string().default(CHARACTER_SCHEMA_VERSION),
	})
	.refine((data) => {
		const majorSkills = new Set(data.majorSkills)
		const minorSkills = new Set(data.minorSkills)
		const allSkills = new Set([...majorSkills, ...minorSkills])

		return majorSkills.size === 6 && minorSkills.size === 6 && allSkills.size === 12
	})
