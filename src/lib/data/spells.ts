import { Skill } from '$lib/data/skill'
import { DamageType, Element } from '$lib/data/element'

export enum SpellLevel {
	Novice = 'Novice',
	Apprentice = 'Apprentice',
	Adept = 'Adept',
	Expert = 'Expert',
	Master = 'Master',
}

export enum SpellSchool {
	Alteration = 'Alteration',
	Conjuration = 'Conjuration',
	Destruction = 'Destruction',
	Illusion = 'Illusion',
	Mysticism = 'Mysticism',
	Restoration = 'Restoration',
}

export enum SpellRange {
	Self = 'Self',
	Touch = 'Touch',
	Immediate = 'Immediate',
	Adjacent = 'Adjacent',
	Close = 'Close',
	Short = 'Short',
	Medium = 'Medium',
	Long = 'Long',
	Extreme = 'Extreme',
}

export enum SpellShape {
	Single = 'Single',
	Cone = 'Cone',
	Sphere = 'Sphere',
	Line = 'Line',
	Wall = 'Wall',
	Aura = 'Aura',
}

export interface SpellEffect {
	type: 'damage' | 'healing' | 'buff' | 'debuff' | 'summon' | 'utility' | 'ward'
	value?: number
	element?: DamageType
	duration?: number
	description: string
}

export interface Spell {
	id: string
	name: string
	school: SpellSchool
	skill: Skill
	level: SpellLevel
	apCost: number
	mpCost: number
	range: SpellRange
	shape: SpellShape
	duration: number // 0 for instant, rounds otherwise
	description: string
	effects: SpellEffect[]
	isConcentration?: boolean
	isReaction?: boolean
}

// Spell DC by level: Novice=10, Apprentice=15, Adept=20, Expert=25, Master=30
export const SpellDC: Record<SpellLevel, number> = {
	[SpellLevel.Novice]: 10,
	[SpellLevel.Apprentice]: 15,
	[SpellLevel.Adept]: 20,
	[SpellLevel.Expert]: 25,
	[SpellLevel.Master]: 30,
}

export const Spells: Spell[] = [
	// ============================================
	// ALTERATION SPELLS
	// ============================================
	{
		id: 'oakflesh',
		name: 'Oakflesh',
		school: SpellSchool.Alteration,
		skill: Skill.Alteration,
		level: SpellLevel.Novice,
		apCost: 2,
		mpCost: 2,
		range: SpellRange.Self,
		shape: SpellShape.Single,
		duration: 5,
		description: 'Harden your skin like oak bark, gaining +2 AC for the duration.',
		effects: [
			{
				type: 'buff',
				value: 2,
				duration: 5,
				description: '+2 AC',
			},
		],
	},
	{
		id: 'candlelight',
		name: 'Candlelight',
		school: SpellSchool.Alteration,
		skill: Skill.Alteration,
		level: SpellLevel.Novice,
		apCost: 1,
		mpCost: 1,
		range: SpellRange.Self,
		shape: SpellShape.Aura,
		duration: 10,
		description:
			'Create a hovering ball of light that follows you, illuminating the area around you.',
		effects: [
			{
				type: 'utility',
				duration: 10,
				description: 'Illuminates a 15-foot radius around you',
			},
		],
	},
	{
		id: 'arcane-shield',
		name: 'Arcane Shield',
		school: SpellSchool.Alteration,
		skill: Skill.Alteration,
		level: SpellLevel.Apprentice,
		apCost: 2,
		mpCost: 3,
		range: SpellRange.Self,
		shape: SpellShape.Single,
		duration: 3,
		description:
			'Conjure a magical shield. While active, you may use your Alteration skill for blocking weapon attacks.',
		effects: [
			{
				type: 'buff',
				duration: 3,
				description: 'Use Alteration for blocking weapon attacks',
			},
		],
	},

	// ============================================
	// CONJURATION SPELLS
	// ============================================
	{
		id: 'bound-dagger',
		name: 'Bound Dagger',
		school: SpellSchool.Conjuration,
		skill: Skill.Conjuration,
		level: SpellLevel.Novice,
		apCost: 2,
		mpCost: 2,
		range: SpellRange.Self,
		shape: SpellShape.Single,
		duration: 5,
		description:
			'Summon a magical dagger from Oblivion. The weapon counts as Daedric quality for attack tiers.',
		effects: [
			{
				type: 'summon',
				duration: 5,
				description: 'Summon Daedric-quality dagger (1 damage, 1 AP)',
			},
		],
	},
	{
		id: 'summon-familiar',
		name: 'Summon Familiar',
		school: SpellSchool.Conjuration,
		skill: Skill.Conjuration,
		level: SpellLevel.Novice,
		apCost: 3,
		mpCost: 3,
		range: SpellRange.Close,
		shape: SpellShape.Single,
		duration: 10,
		description:
			'Summon a spectral wolf familiar to fight by your side. HP: 3, AP: 3, Damage: 2.',
		effects: [
			{
				type: 'summon',
				duration: 10,
				description: 'Summon familiar (HP: 3, AP: 3, Damage: 2)',
			},
		],
	},
	{
		id: 'conjure-flame-atronach',
		name: 'Conjure Flame Atronach',
		school: SpellSchool.Conjuration,
		skill: Skill.Conjuration,
		level: SpellLevel.Apprentice,
		apCost: 4,
		mpCost: 5,
		range: SpellRange.Short,
		shape: SpellShape.Single,
		duration: 10,
		description:
			'Summon a Flame Atronach to fight for you. HP: 5, AP: 4, MP: 3, can cast Firebolt.',
		effects: [
			{
				type: 'summon',
				element: Element.Fire,
				duration: 10,
				description: 'Summon Flame Atronach (HP: 5, AP: 4, MP: 3, casts Firebolt)',
			},
		],
	},

	// ============================================
	// DESTRUCTION SPELLS
	// ============================================
	{
		id: 'flames',
		name: 'Flames',
		school: SpellSchool.Destruction,
		skill: Skill.Destruction,
		level: SpellLevel.Novice,
		apCost: 1,
		mpCost: 1,
		range: SpellRange.Close,
		shape: SpellShape.Cone,
		duration: 0,
		description: 'A gout of fire that inflicts 1 fire damage. Can be cast consecutively.',
		effects: [
			{
				type: 'damage',
				value: 1,
				element: Element.Fire,
				description: '1 fire damage',
			},
		],
		isConcentration: true,
	},
	{
		id: 'frostbite',
		name: 'Frostbite',
		school: SpellSchool.Destruction,
		skill: Skill.Destruction,
		level: SpellLevel.Novice,
		apCost: 1,
		mpCost: 1,
		range: SpellRange.Close,
		shape: SpellShape.Cone,
		duration: 0,
		description: 'A blast of cold that deals 1 frost damage. Can be cast consecutively.',
		effects: [
			{
				type: 'damage',
				value: 1,
				element: Element.Frost,
				description: '1 frost damage',
			},
		],
		isConcentration: true,
	},
	{
		id: 'firebolt',
		name: 'Firebolt',
		school: SpellSchool.Destruction,
		skill: Skill.Destruction,
		level: SpellLevel.Apprentice,
		apCost: 2,
		mpCost: 3,
		range: SpellRange.Medium,
		shape: SpellShape.Single,
		duration: 0,
		description: 'Hurl a bolt of fire at your target, dealing 4 fire damage.',
		effects: [
			{
				type: 'damage',
				value: 4,
				element: Element.Fire,
				description: '4 fire damage',
			},
		],
	},

	// ============================================
	// ILLUSION SPELLS
	// ============================================
	{
		id: 'courage',
		name: 'Courage',
		school: SpellSchool.Illusion,
		skill: Skill.Illusion,
		level: SpellLevel.Novice,
		apCost: 2,
		mpCost: 2,
		range: SpellRange.Close,
		shape: SpellShape.Single,
		duration: 5,
		description: 'Target ally gains advantage on Will checks against fear effects.',
		effects: [
			{
				type: 'buff',
				duration: 5,
				description: 'Advantage on Will checks vs fear',
			},
		],
	},
	{
		id: 'fury',
		name: 'Fury',
		school: SpellSchool.Illusion,
		skill: Skill.Illusion,
		level: SpellLevel.Novice,
		apCost: 2,
		mpCost: 2,
		range: SpellRange.Short,
		shape: SpellShape.Single,
		duration: 3,
		description:
			'Target creature attacks the nearest creature, friend or foe, for the duration.',
		effects: [
			{
				type: 'debuff',
				duration: 3,
				description: 'Target attacks nearest creature',
			},
		],
	},
	{
		id: 'calm',
		name: 'Calm',
		school: SpellSchool.Illusion,
		skill: Skill.Illusion,
		level: SpellLevel.Apprentice,
		apCost: 3,
		mpCost: 4,
		range: SpellRange.Short,
		shape: SpellShape.Single,
		duration: 5,
		description:
			'Creatures up to level 6 will not fight for the duration unless provoked.',
		effects: [
			{
				type: 'debuff',
				duration: 5,
				description: 'Pacify creatures up to level 6',
			},
		],
	},

	// ============================================
	// MYSTICISM SPELLS
	// ============================================
	{
		id: 'lesser-ward',
		name: 'Lesser Ward',
		school: SpellSchool.Mysticism,
		skill: Skill.Mysticism,
		level: SpellLevel.Novice,
		apCost: 1,
		mpCost: 1,
		range: SpellRange.Self,
		shape: SpellShape.Single,
		duration: 0,
		description:
			'Attempt a block check using Mysticism against an attacking spell with +1 bonus.',
		effects: [
			{
				type: 'ward',
				value: 1,
				description: 'Block spell attack with Mysticism +1',
			},
		],
		isReaction: true,
	},
	{
		id: 'soul-trap',
		name: 'Soul Trap',
		school: SpellSchool.Mysticism,
		skill: Skill.Mysticism,
		level: SpellLevel.Novice,
		apCost: 2,
		mpCost: 2,
		range: SpellRange.Short,
		shape: SpellShape.Single,
		duration: 5,
		description:
			"If target creature dies while affected, its soul fills an empty soul gem in your inventory.",
		effects: [
			{
				type: 'debuff',
				duration: 5,
				description: 'Capture soul on death',
			},
		],
	},
	{
		id: 'ward',
		name: 'Ward',
		school: SpellSchool.Mysticism,
		skill: Skill.Mysticism,
		level: SpellLevel.Apprentice,
		apCost: 1,
		mpCost: 2,
		range: SpellRange.Self,
		shape: SpellShape.Single,
		duration: 0,
		description:
			'Attempt a block check using Mysticism against an attacking spell with advantage.',
		effects: [
			{
				type: 'ward',
				description: 'Block spell attack with Mysticism, 1 advantage',
			},
		],
		isReaction: true,
	},

	// ============================================
	// RESTORATION SPELLS
	// ============================================
	{
		id: 'healing',
		name: 'Healing',
		school: SpellSchool.Restoration,
		skill: Skill.Restoration,
		level: SpellLevel.Novice,
		apCost: 2,
		mpCost: 2,
		range: SpellRange.Self,
		shape: SpellShape.Single,
		duration: 0,
		description: 'Restore 2 HP to yourself.',
		effects: [
			{
				type: 'healing',
				value: 2,
				description: 'Heal 2 HP',
			},
		],
	},
	{
		id: 'lesser-restoration',
		name: 'Lesser Restoration',
		school: SpellSchool.Restoration,
		skill: Skill.Restoration,
		level: SpellLevel.Novice,
		apCost: 2,
		mpCost: 2,
		range: SpellRange.Touch,
		shape: SpellShape.Single,
		duration: 0,
		description: 'Restore 2 HP to a touched creature.',
		effects: [
			{
				type: 'healing',
				value: 2,
				description: 'Heal 2 HP (touch)',
			},
		],
	},
	{
		id: 'fast-healing',
		name: 'Fast Healing',
		school: SpellSchool.Restoration,
		skill: Skill.Restoration,
		level: SpellLevel.Apprentice,
		apCost: 3,
		mpCost: 4,
		range: SpellRange.Self,
		shape: SpellShape.Single,
		duration: 0,
		description: 'Restore 5 HP to yourself.',
		effects: [
			{
				type: 'healing',
				value: 5,
				description: 'Heal 5 HP',
			},
		],
	},
]

// Helper function to get spells by school
export function getSpellsBySchool(school: SpellSchool): Spell[] {
	return Spells.filter((spell) => spell.school === school)
}

// Helper function to get spells by level
export function getSpellsByLevel(level: SpellLevel): Spell[] {
	return Spells.filter((spell) => spell.level === level)
}

// Helper function to get spell by id
export function getSpellById(id: string): Spell | undefined {
	return Spells.find((spell) => spell.id === id)
}
