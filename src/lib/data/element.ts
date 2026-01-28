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
	return (
		type === DamageType.Slashing ||
		type === DamageType.Piercing ||
		type === DamageType.Bludgeoning ||
		type === DamageType.Physical
	)
}

// Helper to check if damage is magical (for spell resistance)
export function isMagicalDamage(type: DamageType): boolean {
	return type === DamageType.Magic || isElementalDamage(type)
}
