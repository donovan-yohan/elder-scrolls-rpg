export enum ArmorCategory {
	Unarmored = 'Unarmored',
	Light = 'Light',
	Medium = 'Medium',
	Heavy = 'Heavy',
}

export enum ArmorSlot {
	Head = 'Head',
	Body = 'Body',
	Hands = 'Hands',
	Feet = 'Feet',
}

export interface ArmorType {
	id: string
	name: string
	category: ArmorCategory
	acBonus: number
	dodgeBonus: number // Added to dodge rolls, can be negative
	magickaCastModifier: 'advantage' | 'none' | 'disadvantage' | 'disadvantage2'
	movementModifier: 'advantage' | 'none' | 'disadvantage' | 'disadvantage2'
	movementApPenalty: number // Multiplier: 1 = none, 2 = doubled, 3 = tripled
	handToHandApBonus: number
	handToHandDamageBonus: number
	handToHandDamageType: 'blunted' | 'lethal'
}

export const ArmorTypes: ArmorType[] = [
	{
		id: 'unarmored',
		name: 'Unarmored',
		category: ArmorCategory.Unarmored,
		acBonus: 0,
		dodgeBonus: 10,
		magickaCastModifier: 'advantage',
		movementModifier: 'advantage',
		movementApPenalty: 1,
		handToHandApBonus: 0,
		handToHandDamageBonus: 0,
		handToHandDamageType: 'blunted',
	},
	{
		id: 'light',
		name: 'Light Armor',
		category: ArmorCategory.Light,
		acBonus: 2,
		dodgeBonus: 6,
		magickaCastModifier: 'none',
		movementModifier: 'none',
		movementApPenalty: 1, // +1 AP penalty per movement (additive, not multiplier)
		handToHandApBonus: 1,
		handToHandDamageBonus: 3,
		handToHandDamageType: 'blunted',
	},
	{
		id: 'medium',
		name: 'Medium Armor',
		category: ArmorCategory.Medium,
		acBonus: 6,
		dodgeBonus: 2,
		magickaCastModifier: 'disadvantage',
		movementModifier: 'disadvantage',
		movementApPenalty: 2, // Doubled movement AP cost
		handToHandApBonus: 2,
		handToHandDamageBonus: 6,
		handToHandDamageType: 'lethal',
	},
	{
		id: 'heavy',
		name: 'Heavy Armor',
		category: ArmorCategory.Heavy,
		acBonus: 10,
		dodgeBonus: -2,
		magickaCastModifier: 'disadvantage2',
		movementModifier: 'disadvantage2',
		movementApPenalty: 3, // Tripled movement AP cost
		handToHandApBonus: 3,
		handToHandDamageBonus: 9,
		handToHandDamageType: 'lethal',
	},
]

// Individual armor pieces with their stats
export interface ArmorPiece {
	id: string
	name: string
	category: ArmorCategory
	slot: ArmorSlot
	acContribution: number // Portion of total AC from this piece
	value: number
	weight: number
}

export const ArmorPieces: ArmorPiece[] = [
	// ============================================
	// LIGHT ARMOR PIECES
	// ============================================
	{
		id: 'light-helmet',
		name: 'Light Helmet',
		category: ArmorCategory.Light,
		slot: ArmorSlot.Head,
		acContribution: 0.5,
		value: 25,
		weight: 2,
	},
	{
		id: 'light-cuirass',
		name: 'Light Cuirass',
		category: ArmorCategory.Light,
		slot: ArmorSlot.Body,
		acContribution: 1,
		value: 75,
		weight: 8,
	},
	{
		id: 'light-gauntlets',
		name: 'Light Gauntlets',
		category: ArmorCategory.Light,
		slot: ArmorSlot.Hands,
		acContribution: 0.25,
		value: 15,
		weight: 1,
	},
	{
		id: 'light-boots',
		name: 'Light Boots',
		category: ArmorCategory.Light,
		slot: ArmorSlot.Feet,
		acContribution: 0.25,
		value: 15,
		weight: 2,
	},

	// ============================================
	// MEDIUM ARMOR PIECES
	// ============================================
	{
		id: 'medium-helmet',
		name: 'Medium Helmet',
		category: ArmorCategory.Medium,
		slot: ArmorSlot.Head,
		acContribution: 1.5,
		value: 50,
		weight: 5,
	},
	{
		id: 'medium-cuirass',
		name: 'Medium Cuirass',
		category: ArmorCategory.Medium,
		slot: ArmorSlot.Body,
		acContribution: 3,
		value: 150,
		weight: 20,
	},
	{
		id: 'medium-gauntlets',
		name: 'Medium Gauntlets',
		category: ArmorCategory.Medium,
		slot: ArmorSlot.Hands,
		acContribution: 0.75,
		value: 35,
		weight: 3,
	},
	{
		id: 'medium-boots',
		name: 'Medium Boots',
		category: ArmorCategory.Medium,
		slot: ArmorSlot.Feet,
		acContribution: 0.75,
		value: 35,
		weight: 5,
	},

	// ============================================
	// HEAVY ARMOR PIECES
	// ============================================
	{
		id: 'heavy-helmet',
		name: 'Heavy Helmet',
		category: ArmorCategory.Heavy,
		slot: ArmorSlot.Head,
		acContribution: 2.5,
		value: 100,
		weight: 8,
	},
	{
		id: 'heavy-cuirass',
		name: 'Heavy Cuirass',
		category: ArmorCategory.Heavy,
		slot: ArmorSlot.Body,
		acContribution: 5,
		value: 300,
		weight: 35,
	},
	{
		id: 'heavy-gauntlets',
		name: 'Heavy Gauntlets',
		category: ArmorCategory.Heavy,
		slot: ArmorSlot.Hands,
		acContribution: 1.25,
		value: 70,
		weight: 5,
	},
	{
		id: 'heavy-boots',
		name: 'Heavy Boots',
		category: ArmorCategory.Heavy,
		slot: ArmorSlot.Feet,
		acContribution: 1.25,
		value: 70,
		weight: 8,
	},
]

export function getArmorTypeByCategory(category: ArmorCategory): ArmorType | undefined {
	return ArmorTypes.find((armor) => armor.category === category)
}

export function getArmorPiecesByCategory(category: ArmorCategory): ArmorPiece[] {
	return ArmorPieces.filter((piece) => piece.category === category)
}

export function getArmorPiecesBySlot(slot: ArmorSlot): ArmorPiece[] {
	return ArmorPieces.filter((piece) => piece.slot === slot)
}

export function calculateTotalAC(pieces: ArmorPiece[]): number {
	return pieces.reduce((total, piece) => total + piece.acContribution, 0)
}

export function getDominantArmorCategory(pieces: ArmorPiece[]): ArmorCategory {
	if (pieces.length === 0) return ArmorCategory.Unarmored

	const categories = pieces.map((p) => p.category)
	const heavyCount = categories.filter((c) => c === ArmorCategory.Heavy).length
	const mediumCount = categories.filter((c) => c === ArmorCategory.Medium).length
	const lightCount = categories.filter((c) => c === ArmorCategory.Light).length

	// Return the heaviest category that has at least 2 pieces, or the heaviest single piece
	if (heavyCount >= 2) return ArmorCategory.Heavy
	if (mediumCount >= 2) return ArmorCategory.Medium
	if (lightCount >= 2) return ArmorCategory.Light
	if (heavyCount >= 1) return ArmorCategory.Heavy
	if (mediumCount >= 1) return ArmorCategory.Medium
	if (lightCount >= 1) return ArmorCategory.Light

	return ArmorCategory.Unarmored
}
