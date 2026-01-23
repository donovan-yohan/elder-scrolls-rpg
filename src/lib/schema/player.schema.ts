import { z } from 'zod'
import { RaceName } from '$lib/data/race'
import { ArchetypeName } from '$lib/data/archetype'
import { BirthSignName } from '$lib/data/birthSign'
import { Skill } from '$lib/data/skill'

// Subskill schema
export const subSkillSchema = z.object({
	name: z.string().min(1),
	parentSkill: z.nativeEnum(Skill),
	description: z.string(),
})

// Inventory item schema
export const inventoryItemSchema = z.object({
	itemId: z.string().min(1),
	quantity: z.number().int().positive(),
})

// Equipment schema
export const equipmentSchema = z.object({
	weapon: z.string().nullable(),
	offhand: z.string().nullable(),
	armor: z.string().nullable(),
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
			weapon: null,
			offhand: null,
			armor: null,
			accessories: [],
		}),
		// Inventory
		inventory: z.array(inventoryItemSchema).default([]),
		// Meta
		notes: z.string().default(''),
	})
	.refine((data) => {
		const majorSkills = new Set(data.majorSkills)
		const minorSkills = new Set(data.minorSkills)
		const allSkills = new Set([...majorSkills, ...minorSkills])

		return majorSkills.size === 6 && minorSkills.size === 6 && allSkills.size === 12
	})
