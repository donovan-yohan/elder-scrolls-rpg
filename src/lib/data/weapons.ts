import { Skill } from '$lib/data/skill'

export enum WeaponType {
	// One-Handed
	Dagger = 'Dagger',
	Sword = 'Sword',
	Mace = 'Mace',
	WarAxe = 'WarAxe',
	// Two-Handed
	Greatsword = 'Greatsword',
	Battleaxe = 'Battleaxe',
	Warhammer = 'Warhammer',
	Polearm = 'Polearm',
	Quarterstaff = 'Quarterstaff',
	// Marksmanship
	Bow = 'Bow',
	Crossbow = 'Crossbow',
	Sling = 'Sling',
	// Ammunition
	Arrow = 'Arrow',
	Bolt = 'Bolt',
	// Shields
	LightShield = 'LightShield',
	MediumShield = 'MediumShield',
	HeavyShield = 'HeavyShield',
}

export enum WeaponSkill {
	OneHanded = 'OneHanded',
	TwoHanded = 'TwoHanded',
	Marksmanship = 'Marksmanship',
	Blocking = 'Blocking',
}

export enum WeaponRange {
	Immediate = 'Immediate', // Same space, daggers and hand-to-hand
	Adjacent = 'Adjacent', // 1-5 feet, most melee
	Large = 'Large', // Close range, greatswords and battleaxes
	Reach = 'Reach', // Close range, polearms and quarterstaves
	Short = 'Short', // Thrown weapons, 11-25 feet
	Ranged = 'Ranged', // Bows and crossbows, variable by ammo
}

export interface Weapon {
	id: string
	name: string
	type: WeaponType
	skill: WeaponSkill
	relatedSkill: Skill
	baseDamageLethal: number | null // null means cannot deal lethal
	baseDamageBlunted: number
	maxBonusDamage: number
	apCost: number
	apReload?: number // For crossbows
	focusCost: number | null // null means no focus cost (daggers)
	range: WeaponRange
	value: number // Base value in gold
	weight: number // Base weight in pounds
	isAmmunition?: boolean
	isTwoHanded?: boolean
	isShield?: boolean
}

export const Weapons: Weapon[] = [
	// ============================================
	// ONE-HANDED WEAPONS
	// ============================================
	{
		id: 'dagger',
		name: 'Dagger',
		type: WeaponType.Dagger,
		skill: WeaponSkill.OneHanded,
		relatedSkill: Skill.OneHanded,
		baseDamageLethal: 1,
		baseDamageBlunted: 1,
		maxBonusDamage: 0, // Daggers deal difference between attack and AC as bonus damage with advantage
		apCost: 1,
		focusCost: null,
		range: WeaponRange.Adjacent,
		value: 10,
		weight: 2,
	},
	{
		id: 'sword',
		name: 'Sword',
		type: WeaponType.Sword,
		skill: WeaponSkill.OneHanded,
		relatedSkill: Skill.OneHanded,
		baseDamageLethal: 3,
		baseDamageBlunted: 3,
		maxBonusDamage: 10,
		apCost: 2,
		focusCost: 4,
		range: WeaponRange.Adjacent,
		value: 25,
		weight: 9,
	},
	{
		id: 'mace',
		name: 'Mace',
		type: WeaponType.Mace,
		skill: WeaponSkill.OneHanded,
		relatedSkill: Skill.OneHanded,
		baseDamageLethal: 5,
		baseDamageBlunted: 2,
		maxBonusDamage: 7,
		apCost: 3,
		focusCost: 6,
		range: WeaponRange.Adjacent,
		value: 35,
		weight: 13,
	},
	{
		id: 'war-axe',
		name: 'War Axe',
		type: WeaponType.WarAxe,
		skill: WeaponSkill.OneHanded,
		relatedSkill: Skill.OneHanded,
		baseDamageLethal: 4,
		baseDamageBlunted: 2,
		maxBonusDamage: 8,
		apCost: 2,
		focusCost: 5,
		range: WeaponRange.Adjacent,
		value: 30,
		weight: 11,
	},

	// ============================================
	// TWO-HANDED WEAPONS
	// ============================================
	{
		id: 'greatsword',
		name: 'Greatsword',
		type: WeaponType.Greatsword,
		skill: WeaponSkill.TwoHanded,
		relatedSkill: Skill.TwoHanded,
		baseDamageLethal: 7,
		baseDamageBlunted: 3,
		maxBonusDamage: 12,
		apCost: 4,
		focusCost: 6,
		range: WeaponRange.Large,
		value: 50,
		weight: 16,
		isTwoHanded: true,
	},
	{
		id: 'battleaxe',
		name: 'Battleaxe',
		type: WeaponType.Battleaxe,
		skill: WeaponSkill.TwoHanded,
		relatedSkill: Skill.TwoHanded,
		baseDamageLethal: 8,
		baseDamageBlunted: 4,
		maxBonusDamage: 10,
		apCost: 5,
		focusCost: 7,
		range: WeaponRange.Large,
		value: 55,
		weight: 20,
		isTwoHanded: true,
	},
	{
		id: 'warhammer',
		name: 'Warhammer',
		type: WeaponType.Warhammer,
		skill: WeaponSkill.TwoHanded,
		relatedSkill: Skill.TwoHanded,
		baseDamageLethal: 9,
		baseDamageBlunted: 3,
		maxBonusDamage: 6,
		apCost: 5,
		focusCost: 8,
		range: WeaponRange.Large,
		value: 60,
		weight: 24,
		isTwoHanded: true,
	},
	{
		id: 'polearm',
		name: 'Polearm',
		type: WeaponType.Polearm,
		skill: WeaponSkill.TwoHanded,
		relatedSkill: Skill.TwoHanded,
		baseDamageLethal: 6,
		baseDamageBlunted: 6,
		maxBonusDamage: 9,
		apCost: 4,
		focusCost: 7,
		range: WeaponRange.Reach,
		value: 40,
		weight: 14,
		isTwoHanded: true,
	},
	{
		id: 'quarterstaff',
		name: 'Quarterstaff',
		type: WeaponType.Quarterstaff,
		skill: WeaponSkill.TwoHanded,
		relatedSkill: Skill.TwoHanded,
		baseDamageLethal: null,
		baseDamageBlunted: 5,
		maxBonusDamage: 10,
		apCost: 4,
		focusCost: 6,
		range: WeaponRange.Reach,
		value: 20,
		weight: 11,
		isTwoHanded: true,
	},

	// ============================================
	// MARKSMANSHIP WEAPONS
	// ============================================
	{
		id: 'bow',
		name: 'Bow',
		type: WeaponType.Bow,
		skill: WeaponSkill.Marksmanship,
		relatedSkill: Skill.Marksmanship,
		baseDamageLethal: null, // Damage comes from arrows
		baseDamageBlunted: 1,
		maxBonusDamage: 2,
		apCost: 3,
		focusCost: 6,
		range: WeaponRange.Ranged,
		value: 30,
		weight: 5,
		isTwoHanded: true,
	},
	{
		id: 'crossbow',
		name: 'Crossbow',
		type: WeaponType.Crossbow,
		skill: WeaponSkill.Marksmanship,
		relatedSkill: Skill.Marksmanship,
		baseDamageLethal: null, // Damage comes from bolts
		baseDamageBlunted: 2,
		maxBonusDamage: 2,
		apCost: 2,
		apReload: 4,
		focusCost: 8,
		range: WeaponRange.Ranged,
		value: 60,
		weight: 24,
		isTwoHanded: true,
	},
	{
		id: 'sling',
		name: 'Sling',
		type: WeaponType.Sling,
		skill: WeaponSkill.Marksmanship,
		relatedSkill: Skill.Marksmanship,
		baseDamageLethal: 3,
		baseDamageBlunted: 2,
		maxBonusDamage: 13,
		apCost: 3,
		focusCost: 5,
		range: WeaponRange.Short,
		value: 15,
		weight: 3,
	},

	// ============================================
	// AMMUNITION
	// ============================================
	{
		id: 'arrow',
		name: 'Arrow',
		type: WeaponType.Arrow,
		skill: WeaponSkill.Marksmanship,
		relatedSkill: Skill.Marksmanship,
		baseDamageLethal: 4,
		baseDamageBlunted: 0,
		maxBonusDamage: 15,
		apCost: 0,
		focusCost: null,
		range: WeaponRange.Ranged,
		value: 1,
		weight: 0.25,
		isAmmunition: true,
	},
	{
		id: 'bolt',
		name: 'Bolt',
		type: WeaponType.Bolt,
		skill: WeaponSkill.Marksmanship,
		relatedSkill: Skill.Marksmanship,
		baseDamageLethal: 6,
		baseDamageBlunted: 0,
		maxBonusDamage: 10,
		apCost: 0,
		focusCost: null,
		range: WeaponRange.Ranged,
		value: 2,
		weight: 0.1,
		isAmmunition: true,
	},

	// ============================================
	// SHIELDS
	// ============================================
	{
		id: 'light-shield',
		name: 'Light Shield',
		type: WeaponType.LightShield,
		skill: WeaponSkill.Blocking,
		relatedSkill: Skill.Blocking,
		baseDamageLethal: null,
		baseDamageBlunted: 3,
		maxBonusDamage: 5,
		apCost: 2,
		focusCost: null,
		range: WeaponRange.Adjacent,
		value: 25,
		weight: 8,
		isShield: true,
	},
	{
		id: 'medium-shield',
		name: 'Medium Shield',
		type: WeaponType.MediumShield,
		skill: WeaponSkill.Blocking,
		relatedSkill: Skill.Blocking,
		baseDamageLethal: null,
		baseDamageBlunted: 4,
		maxBonusDamage: 5,
		apCost: 3,
		focusCost: null,
		range: WeaponRange.Adjacent,
		value: 45,
		weight: 12,
		isShield: true,
	},
	{
		id: 'heavy-shield',
		name: 'Heavy Shield',
		type: WeaponType.HeavyShield,
		skill: WeaponSkill.Blocking,
		relatedSkill: Skill.Blocking,
		baseDamageLethal: null,
		baseDamageBlunted: 6,
		maxBonusDamage: 5,
		apCost: 4,
		focusCost: null,
		range: WeaponRange.Adjacent,
		value: 65,
		weight: 16,
		isShield: true,
	},
]

export function getWeaponsByType(type: WeaponType): Weapon[] {
	return Weapons.filter((weapon) => weapon.type === type)
}

export function getWeaponsBySkill(skill: WeaponSkill): Weapon[] {
	return Weapons.filter((weapon) => weapon.skill === skill)
}

export function getWeaponById(id: string): Weapon | undefined {
	return Weapons.find((weapon) => weapon.id === id)
}

// Helper to get shield heft AP cost
export function getShieldHeftCost(type: WeaponType): number {
	switch (type) {
		case WeaponType.LightShield:
			return 0
		case WeaponType.MediumShield:
			return 1
		case WeaponType.HeavyShield:
			return 3
		default:
			return 0
	}
}

// Helper to get shield block advantage bonus
export function getShieldBlockAdvantage(type: WeaponType): number {
	switch (type) {
		case WeaponType.LightShield:
			return 1
		case WeaponType.MediumShield:
			return 3
		case WeaponType.HeavyShield:
			return 5
		default:
			return 0
	}
}
