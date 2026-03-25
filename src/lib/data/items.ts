import { CoreStat } from '$lib/data/coreStat'

export enum ItemType {
	Potion = 'Potion',
	Consumable = 'Consumable',
	Material = 'Material',
	Misc = 'Misc',
}

export enum PotionTier {
	Lesser = 'Lesser',
	Average = 'Average',
	Greater = 'Greater',
	Exceptional = 'Exceptional',
}

export interface ItemEffect {
	type: 'restore' | 'regen' | 'apReduction' | 'buff' | 'cure'
	stat?: CoreStat
	value: number
	duration?: number // In rounds, for effects over time
	actionCount?: number // For stamina potions: number of actions affected
}

export interface Item {
	id: string
	name: string
	type: ItemType
	description: string
	value: number // Gold value
	weight: number
	apToUse: number
	stackable: boolean
	maxStack?: number
	effects: ItemEffect[]
}

export const Items: Item[] = [
	// ============================================
	// HEALTH POTIONS
	// ============================================
	{
		id: 'lesser-health-potion',
		name: 'Lesser Health Potion',
		type: ItemType.Potion,
		description: 'A small vial of red liquid that restores a minor amount of health.',
		value: 30,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'restore',
				stat: CoreStat.Health,
				value: 2,
			},
		],
	},
	{
		id: 'average-health-potion',
		name: 'Average Health Potion',
		type: ItemType.Potion,
		description: 'A flask of healing elixir that restores a moderate amount of health.',
		value: 60,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'restore',
				stat: CoreStat.Health,
				value: 5,
			},
		],
	},
	{
		id: 'greater-health-potion',
		name: 'Greater Health Potion',
		type: ItemType.Potion,
		description: 'A potent restorative draught that heals significant wounds.',
		value: 120,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'restore',
				stat: CoreStat.Health,
				value: 7,
			},
		],
	},
	{
		id: 'exceptional-health-potion',
		name: 'Exceptional Health Potion',
		type: ItemType.Potion,
		description:
			'A masterfully crafted elixir that can mend even the most grievous injuries.',
		value: 250,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'restore',
				stat: CoreStat.Health,
				value: 10,
			},
		],
	},

	// ============================================
	// MAGICKA POTIONS
	// ============================================
	{
		id: 'lesser-magicka-potion',
		name: 'Lesser Magicka Potion',
		type: ItemType.Potion,
		description: 'A small blue vial that replenishes magical reserves.',
		value: 20,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'regen',
				stat: CoreStat.Magicka,
				value: 2,
			},
		],
	},
	{
		id: 'average-magicka-potion',
		name: 'Average Magicka Potion',
		type: ItemType.Potion,
		description: 'A flask of azure liquid that restores magical energy.',
		value: 50,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'regen',
				stat: CoreStat.Magicka,
				value: 5,
			},
		],
	},
	{
		id: 'greater-magicka-potion',
		name: 'Greater Magicka Potion',
		type: ItemType.Potion,
		description: 'A powerful brew that significantly replenishes magicka.',
		value: 100,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'regen',
				stat: CoreStat.Magicka,
				value: 7,
			},
		],
	},
	{
		id: 'exceptional-magicka-potion',
		name: 'Exceptional Magicka Potion',
		type: ItemType.Potion,
		description: 'An exquisite elixir that floods the body with magical power.',
		value: 200,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'regen',
				stat: CoreStat.Magicka,
				value: 10,
			},
		],
	},

	// ============================================
	// STAMINA POTIONS
	// ============================================
	{
		id: 'lesser-stamina-potion',
		name: 'Lesser Stamina Potion',
		type: ItemType.Potion,
		description: 'A mild stimulant that provides a brief surge of energy.',
		value: 40,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'apReduction',
				stat: CoreStat.ActionPoints,
				value: 1,
				actionCount: 3,
			},
		],
	},
	{
		id: 'average-stamina-potion',
		name: 'Average Stamina Potion',
		type: ItemType.Potion,
		description: 'A stimulating brew that provides sustained energy.',
		value: 80,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'apReduction',
				stat: CoreStat.ActionPoints,
				value: 1,
				actionCount: 5,
			},
		],
	},
	{
		id: 'greater-stamina-potion',
		name: 'Greater Stamina Potion',
		type: ItemType.Potion,
		description: 'A potent tonic that significantly reduces action costs.',
		value: 160,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'apReduction',
				stat: CoreStat.ActionPoints,
				value: 2,
				actionCount: 3,
			},
		],
	},
	{
		id: 'exceptional-stamina-potion',
		name: 'Exceptional Stamina Potion',
		type: ItemType.Potion,
		description: 'A masterwork elixir that grants incredible endurance.',
		value: 320,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 10,
		effects: [
			{
				type: 'apReduction',
				stat: CoreStat.ActionPoints,
				value: 2,
				actionCount: 5,
			},
		],
	},

	// ============================================
	// CURE POTIONS
	// ============================================
	{
		id: 'cure-poison',
		name: 'Cure Poison',
		type: ItemType.Potion,
		description: 'A cleansing draught that neutralizes poisons in the body.',
		value: 50,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 5,
		effects: [
			{
				type: 'cure',
				value: 1,
			},
		],
	},
	{
		id: 'cure-disease',
		name: 'Cure Disease',
		type: ItemType.Potion,
		description: 'A potent medicine that cures common diseases.',
		value: 75,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 5,
		effects: [
			{
				type: 'cure',
				value: 1,
			},
		],
	},
	{
		id: 'cure-magicka-burn',
		name: 'Cure Magicka Burn Potion',
		type: ItemType.Potion,
		description:
			'A specialized elixir that heals the damage caused by magical overexertion.',
		value: 100,
		weight: 0.5,
		apToUse: 2,
		stackable: true,
		maxStack: 5,
		effects: [
			{
				type: 'cure',
				value: 1,
			},
		],
	},

	// ============================================
	// BASIC CONSUMABLES
	// ============================================
	{
		id: 'healers-kit',
		name: "Healer's Kit",
		type: ItemType.Consumable,
		description:
			'A kit containing bandages, salves, and tools for treating wounds. Has 5 uses before needing to be restocked.',
		value: 50,
		weight: 3,
		apToUse: 4,
		stackable: false,
		effects: [],
	},
	{
		id: 'lockpick',
		name: 'Lockpick',
		type: ItemType.Consumable,
		description: 'A slender metal tool for picking locks. May break on use.',
		value: 5,
		weight: 0.1,
		apToUse: 0,
		stackable: true,
		maxStack: 99,
		effects: [],
	},
	{
		id: 'torch',
		name: 'Torch',
		type: ItemType.Consumable,
		description: 'A wooden torch that provides light for about an hour.',
		value: 2,
		weight: 1,
		apToUse: 1,
		stackable: true,
		maxStack: 10,
		effects: [],
	},
	{
		id: 'soul-gem-petty',
		name: 'Petty Soul Gem',
		type: ItemType.Misc,
		description: 'A small crystal that can capture the souls of lesser creatures.',
		value: 10,
		weight: 0.2,
		apToUse: 0,
		stackable: true,
		maxStack: 20,
		effects: [],
	},
	{
		id: 'soul-gem-lesser',
		name: 'Lesser Soul Gem',
		type: ItemType.Misc,
		description: 'A crystal capable of holding the souls of moderately powerful creatures.',
		value: 25,
		weight: 0.2,
		apToUse: 0,
		stackable: true,
		maxStack: 20,
		effects: [],
	},
	{
		id: 'soul-gem-common',
		name: 'Common Soul Gem',
		type: ItemType.Misc,
		description: 'A standard soul gem used by enchanters throughout Tamriel.',
		value: 50,
		weight: 0.2,
		apToUse: 0,
		stackable: true,
		maxStack: 20,
		effects: [],
	},
	{
		id: 'soul-gem-greater',
		name: 'Greater Soul Gem',
		type: ItemType.Misc,
		description: 'A large crystal that can contain the souls of powerful creatures.',
		value: 150,
		weight: 0.3,
		apToUse: 0,
		stackable: true,
		maxStack: 10,
		effects: [],
	},
	{
		id: 'soul-gem-grand',
		name: 'Grand Soul Gem',
		type: ItemType.Misc,
		description: 'A magnificent crystal capable of capturing the mightiest of souls.',
		value: 500,
		weight: 0.5,
		apToUse: 0,
		stackable: true,
		maxStack: 5,
		effects: [],
	},
]

export function getItemsByType(type: ItemType): Item[] {
	return Items.filter((item) => item.type === type)
}

export function getItemById(id: string): Item | undefined {
	return Items.find((item) => item.id === id)
}

export function getPotions(): Item[] {
	return Items.filter((item) => item.type === ItemType.Potion)
}

export function getHealthPotions(): Item[] {
	return Items.filter(
		(item) =>
			item.type === ItemType.Potion &&
			item.effects.some((e) => e.type === 'restore' && e.stat === CoreStat.Health)
	)
}

export function getMagickaPotions(): Item[] {
	return Items.filter(
		(item) =>
			item.type === ItemType.Potion &&
			item.effects.some((e) => e.type === 'regen' && e.stat === CoreStat.Magicka)
	)
}

export function getStaminaPotions(): Item[] {
	return Items.filter(
		(item) =>
			item.type === ItemType.Potion &&
			item.effects.some((e) => e.type === 'apReduction' && e.stat === CoreStat.ActionPoints)
	)
}

// Helper to get potion tier from name
export function getPotionTier(item: Item): PotionTier | null {
	if (item.type !== ItemType.Potion) return null
	if (item.name.includes('Lesser')) return PotionTier.Lesser
	if (item.name.includes('Average')) return PotionTier.Average
	if (item.name.includes('Greater')) return PotionTier.Greater
	if (item.name.includes('Exceptional')) return PotionTier.Exceptional
	return null
}
