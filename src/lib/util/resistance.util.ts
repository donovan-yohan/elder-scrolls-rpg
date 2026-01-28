// src/lib/util/resistance.util.ts
import type { RaceName } from '$lib/data/race'
import { DamageType, isMagicalDamage } from '$lib/data/element'
import {
	getRacialResistances,
	getResistanceForDamageType,
	type RacialResistanceData,
} from '$lib/data/racialResistances'

export interface DamageCalculationResult {
	originalDamage: number
	damageType: DamageType | string
	flatReduction: number
	percentReduction: number
	spellResistance: number
	finalDamage: number
	isImmune: boolean
	reductionSources: string[]
}

/**
 * Calculate damage after applying racial resistances
 *
 * Order of operations:
 * 1. Check for immunity
 * 2. Apply flat reductions (racial + spell resistance)
 * 3. Apply percentage reductions
 * 4. Floor to 0 minimum
 */
export function calculateDamageWithResistances(
	race: RaceName,
	damage: number,
	damageType: DamageType | string,
	isMagicSource: boolean = false
): DamageCalculationResult {
	const result: DamageCalculationResult = {
		originalDamage: damage,
		damageType,
		flatReduction: 0,
		percentReduction: 0,
		spellResistance: 0,
		finalDamage: damage,
		isImmune: false,
		reductionSources: [],
	}

	const resistanceData = getRacialResistances(race)
	const typeAsEnum = damageType as DamageType

	// Check for specific damage type resistance
	const typeResistance = getResistanceForDamageType(race, typeAsEnum)

	// Check for immunity first
	if (typeResistance?.immunity) {
		result.isImmune = true
		result.finalDamage = 0
		result.reductionSources.push(`${race} immunity to ${damageType}`)
		return result
	}

	let currentDamage = damage

	// Apply spell resistance if damage is magical
	if (resistanceData.spellResistance && (isMagicSource || isMagicalDamage(typeAsEnum))) {
		result.spellResistance = resistanceData.spellResistance
		currentDamage -= resistanceData.spellResistance

		if (resistanceData.spellResistance > 0) {
			result.reductionSources.push(`${race} spell resistance (-${resistanceData.spellResistance})`)
		} else {
			result.reductionSources.push(
				`${race} spell weakness (+${Math.abs(resistanceData.spellResistance)})`
			)
		}
	}

	// Apply flat reduction for specific type
	if (typeResistance?.flatReduction) {
		result.flatReduction = typeResistance.flatReduction
		currentDamage -= typeResistance.flatReduction
		result.reductionSources.push(`${race} ${damageType} resistance (-${typeResistance.flatReduction})`)
	}

	// Apply percentage reduction
	if (typeResistance?.percentReduction) {
		result.percentReduction = typeResistance.percentReduction
		const reduction = Math.floor(currentDamage * (typeResistance.percentReduction / 100))
		currentDamage -= reduction
		result.reductionSources.push(
			`${race} ${damageType} resistance (${typeResistance.percentReduction}% = -${reduction})`
		)
	}

	// Floor to 0
	result.finalDamage = Math.max(0, Math.floor(currentDamage))

	return result
}

/**
 * Format resistance for display (e.g., "Fire +10", "Poison 75%", "Disease Immune")
 */
export function formatResistance(resistance: {
	type: DamageType
	flatReduction?: number
	percentReduction?: number
	immunity?: boolean
}): string {
	if (resistance.immunity) {
		return `${resistance.type} Immune`
	}
	if (resistance.flatReduction) {
		const sign = resistance.flatReduction > 0 ? '+' : ''
		return `${resistance.type} ${sign}${resistance.flatReduction}`
	}
	if (resistance.percentReduction) {
		return `${resistance.type} ${resistance.percentReduction}%`
	}
	return resistance.type
}

/**
 * Get all resistances for display in character sheet
 */
export function getDisplayResistances(race: RaceName): string[] {
	const data = getRacialResistances(race)
	const displays: string[] = []

	// Add spell resistance
	if (data.spellResistance) {
		const sign = data.spellResistance > 0 ? '+' : ''
		displays.push(`Spell Resistance ${sign}${data.spellResistance}`)
	}

	// Add type resistances
	for (const resistance of data.resistances) {
		displays.push(formatResistance(resistance))
	}

	// Add descriptive immunities
	for (const immunity of data.immunities) {
		displays.push(`${immunity} (Immunity)`)
	}

	return displays
}
