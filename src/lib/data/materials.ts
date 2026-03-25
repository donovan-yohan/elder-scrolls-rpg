import { SpellLevel } from '$lib/data/spells'

export enum MaterialName {
	Iron = 'Iron',
	HideLeather = 'HideLeather',
	Steel = 'Steel',
	SkyforgeSteel = 'SkyforgeSteel',
	Orcish = 'Orcish',
	Dwarven = 'Dwarven',
	Elven = 'Elven',
	Atmoran = 'Atmoran',
	Glass = 'Glass',
	Ebony = 'Ebony',
	Stalhrim = 'Stalhrim',
	Daedric = 'Daedric',
	Dragonbone = 'Dragonbone',
}

export interface MaterialSpecialProperty {
	name: string
	description: string
}

export interface Material {
	id: string
	name: string
	tier: number // 1-8, higher is better
	spellTier: SpellLevel // Spell tier equivalent
	valueMultiplier: number
	weightMultiplier: number
	specialProperties: MaterialSpecialProperty[]
	isArmorOnly?: boolean // Some materials only apply to armor (Hide/Leather)
}

export const Materials: Material[] = [
	// ============================================
	// TIER 1 - NOVICE
	// ============================================
	{
		id: 'iron',
		name: 'Iron',
		tier: 1,
		spellTier: SpellLevel.Novice,
		valueMultiplier: 1,
		weightMultiplier: 1,
		specialProperties: [],
	},
	{
		id: 'hide-leather',
		name: 'Hide/Leather',
		tier: 1,
		spellTier: SpellLevel.Novice,
		valueMultiplier: 1,
		weightMultiplier: 1,
		specialProperties: [],
		isArmorOnly: true,
	},
	{
		id: 'steel',
		name: 'Steel',
		tier: 1,
		spellTier: SpellLevel.Novice,
		valueMultiplier: 1.8,
		weightMultiplier: 0.9,
		specialProperties: [],
	},
	{
		id: 'skyforge-steel',
		name: 'Skyforge Steel',
		tier: 1,
		spellTier: SpellLevel.Novice,
		valueMultiplier: 3,
		weightMultiplier: 0.5,
		specialProperties: [
			{
				name: 'Legendary Craftsmanship (Weapon)',
				description:
					'If you spend 1.5 times the AP on attack with this weapon, it counts as equal quality to any other armor or weapon for the purpose of damage.',
			},
			{
				name: 'Glancing Blow (Armor)',
				description:
					'When rolling a death roll, you may choose to have your armor break automatically and spare you as a glancing blow.',
			},
		],
	},

	// ============================================
	// TIER 2 - APPRENTICE
	// ============================================
	{
		id: 'orcish',
		name: 'Orichalcum',
		tier: 2,
		spellTier: SpellLevel.Apprentice,
		valueMultiplier: 3.2,
		weightMultiplier: 1.5,
		specialProperties: [
			{
				name: 'Brutal (Weapon)',
				description:
					'On critical hit, if it killed a creature, your next attack crit range increases by 1 (max half your level).',
			},
			{
				name: 'Spirit Surge (Armor)',
				description:
					'After spending a spirit point, you rise with bonus AP equal to the overflow damage dealt to you, to be used on your next turn for spells only.',
			},
		],
	},
	{
		id: 'dwarven',
		name: 'Dwarven Metal',
		tier: 2,
		spellTier: SpellLevel.Apprentice,
		valueMultiplier: 5.5,
		weightMultiplier: 1.75,
		specialProperties: [
			{
				name: 'Dismantler (Weapon)',
				description:
					'Attacks against objects and constructs made of this material or weaker deal half your level in bonus damage.',
			},
		],
	},
	{
		id: 'elven',
		name: 'Elven',
		tier: 2,
		spellTier: SpellLevel.Apprentice,
		valueMultiplier: 9.5,
		weightMultiplier: 0.6,
		specialProperties: [
			{
				name: 'Swift (Weapon)',
				description:
					'On critical hit, instead of regaining half the AP, you regain all AP for the attack.',
			},
			{
				name: 'Light (Armor)',
				description: 'Max dodge bonus increased by half (minimum +1).',
			},
		],
	},

	// ============================================
	// TIER 3 - ADEPT
	// ============================================
	{
		id: 'atmoran',
		name: 'Atmoran',
		tier: 3,
		spellTier: SpellLevel.Adept,
		valueMultiplier: 11.5,
		weightMultiplier: 1.75,
		specialProperties: [
			{
				name: 'Inspiring (Weapon)',
				description:
					'On a critical hit, one ally below half health who saw the attack may regain half your level (rounded down) in HP or MP immediately.',
			},
			{
				name: 'Blessed (Armor)',
				description:
					'When you would spend a spirit point, roll a d20. On a 20, you revive but the spirit point is not spent.',
			},
		],
	},
	{
		id: 'glass',
		name: 'Glass',
		tier: 3,
		spellTier: SpellLevel.Adept,
		valueMultiplier: 16.5,
		weightMultiplier: 2.25,
		specialProperties: [
			{
				name: 'Attuned',
				description: 'Enchantments are stronger on Glass equipment.',
			},
		],
	},

	// ============================================
	// TIER 4 - EXPERT
	// ============================================
	{
		id: 'ebony',
		name: 'Ebony',
		tier: 4,
		spellTier: SpellLevel.Expert,
		valueMultiplier: 29,
		weightMultiplier: 2,
		specialProperties: [
			{
				name: 'Mortal Pinnacle',
				description: 'Always counts as a higher equipment tier than any other material.',
			},
		],
	},
	{
		id: 'stalhrim',
		name: 'Stalhrim',
		tier: 4,
		spellTier: SpellLevel.Expert,
		valueMultiplier: 39.5,
		weightMultiplier: 2.25,
		specialProperties: [
			{
				name: 'Frozen (Weapon)',
				description:
					'On critical hit, you may forgo double damage for normal damage, dealing the extra damage to their AP instead. Overflow reduces their AP next round as well.',
			},
		],
	},

	// ============================================
	// TIER 5 - MASTER
	// ============================================
	{
		id: 'daedric',
		name: 'Daedric',
		tier: 5,
		spellTier: SpellLevel.Master,
		valueMultiplier: 50,
		weightMultiplier: 1.5,
		specialProperties: [
			{
				name: 'Destruction Incarnate (Weapon)',
				description: 'Critical hits deal triple damage instead of double.',
			},
		],
	},
	{
		id: 'dragonbone',
		name: 'Dragonbone',
		tier: 5,
		spellTier: SpellLevel.Master,
		valueMultiplier: 60,
		weightMultiplier: 3.5,
		specialProperties: [
			{
				name: 'Dovah Souled',
				description:
					'Can house dragon souls provided by the Dragonborn. Up to three words (one soul per word). Each word or complete shout can be done for no additional AP and at half normal MP costs.',
			},
		],
	},
]

export function getMaterialByName(name: MaterialName): Material | undefined {
	return Materials.find((material) => material.id === name.toLowerCase().replace(/\s/g, '-'))
}

export function getMaterialById(id: string): Material | undefined {
	return Materials.find((material) => material.id === id)
}

export function getMaterialsByTier(tier: number): Material[] {
	return Materials.filter((material) => material.tier === tier)
}

export function getMaterialsBySpellTier(spellTier: SpellLevel): Material[] {
	return Materials.filter((material) => material.spellTier === spellTier)
}

export function calculateMaterialValue(baseValue: number, material: Material): number {
	return Math.floor(baseValue * material.valueMultiplier)
}

export function calculateMaterialWeight(baseWeight: number, material: Material): number {
	return Math.round(baseWeight * material.weightMultiplier * 10) / 10
}

export function compareMaterialTiers(
	attackerMaterial: Material,
	defenderMaterial: Material
): 'higher' | 'equal' | 'lower' {
	if (attackerMaterial.tier > defenderMaterial.tier) return 'higher'
	if (attackerMaterial.tier < defenderMaterial.tier) return 'lower'
	return 'equal'
}
