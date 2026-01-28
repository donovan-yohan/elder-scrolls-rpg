// src/lib/data/racialResistances.ts
import { RaceName } from './race'
import { DamageType } from './element'

/**
 * Resistance value interpretation:
 * - Positive number: flat damage reduction (e.g., +10 means reduce damage by 10)
 * - Negative number: vulnerability (e.g., -5 means take 5 more damage)
 * - 100 = immunity (percentage-based resistances)
 * - For percentage resistances, value is the percent reduced (75 = 75% reduced)
 */
export interface DamageResistance {
	type: DamageType
	flatReduction?: number // Flat damage reduction (e.g., Nord frost +10)
	percentReduction?: number // Percentage reduction (e.g., Redguard poison 75%)
	immunity?: boolean // Complete immunity (e.g., Argonian disease)
}

export interface RacialResistanceData {
	resistances: DamageResistance[]
	spellResistance?: number // Flat reduction to all magical damage
	immunities: string[] // Descriptive immunities (e.g., "non-magical cold")
}

// Breton: Spell resistance +5
export const BretonResistances: RacialResistanceData = {
	resistances: [],
	spellResistance: 5,
	immunities: [],
}

// Nord: Frost Resistance +10, Immunity to non-magical cold
export const NordResistances: RacialResistanceData = {
	resistances: [{ type: DamageType.Frost, flatReduction: 10 }],
	immunities: ['Non-magical cold'],
}

// Imperial: No resistances
export const ImperialResistances: RacialResistanceData = {
	resistances: [],
	immunities: [],
}

// Redguard: Disease 75%, Poison 75%
export const RedguardResistances: RacialResistanceData = {
	resistances: [
		{ type: DamageType.Disease, percentReduction: 75 },
		{ type: DamageType.Poison, percentReduction: 75 },
	],
	immunities: [],
}

// Altmer: Disease 25%, Spell Weakness -5
export const AltmerResistances: RacialResistanceData = {
	resistances: [{ type: DamageType.Disease, percentReduction: 25 }],
	spellResistance: -5, // Weakness
	immunities: [],
}

// Bosmer: Poison 50%, Disease 50%
export const BosmerResistances: RacialResistanceData = {
	resistances: [
		{ type: DamageType.Poison, percentReduction: 50 },
		{ type: DamageType.Disease, percentReduction: 50 },
	],
	immunities: [],
}

// Dunmer: Fire Resistance +10, Immunity to non-magical heat
export const DunmerResistances: RacialResistanceData = {
	resistances: [{ type: DamageType.Fire, flatReduction: 10 }],
	immunities: ['Non-magical heat'],
}

// Orsimer: Spell Resistance +2
export const OrsimerResistances: RacialResistanceData = {
	resistances: [],
	spellResistance: 2,
	immunities: [],
}

// Argonian: Disease Immunity, Poison Immunity
export const ArgonianResistances: RacialResistanceData = {
	resistances: [
		{ type: DamageType.Disease, immunity: true },
		{ type: DamageType.Poison, immunity: true },
	],
	immunities: [],
}

// Khajiit: No resistances
export const KhajiitResistances: RacialResistanceData = {
	resistances: [],
	immunities: [],
}

export const RacialResistances: Record<RaceName, RacialResistanceData> = {
	[RaceName.Breton]: BretonResistances,
	[RaceName.Nord]: NordResistances,
	[RaceName.Imperial]: ImperialResistances,
	[RaceName.Redguard]: RedguardResistances,
	[RaceName.Altmer]: AltmerResistances,
	[RaceName.Bosmer]: BosmerResistances,
	[RaceName.Dunmer]: DunmerResistances,
	[RaceName.Orsimer]: OrsimerResistances,
	[RaceName.Argonian]: ArgonianResistances,
	[RaceName.Khajiit]: KhajiitResistances,
}

/**
 * Get racial resistance data for a race
 */
export function getRacialResistances(race: RaceName): RacialResistanceData {
	return RacialResistances[race] ?? { resistances: [], immunities: [] }
}

/**
 * Get resistance for a specific damage type
 */
export function getResistanceForDamageType(
	race: RaceName,
	damageType: DamageType
): DamageResistance | undefined {
	const data = getRacialResistances(race)
	return data.resistances.find((r) => r.type === damageType)
}

/**
 * Check if race is immune to damage type
 */
export function isImmuneToType(race: RaceName, damageType: DamageType): boolean {
	const resistance = getResistanceForDamageType(race, damageType)
	return resistance?.immunity === true
}
