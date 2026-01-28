import { RaceName } from './race'
import { DamageType } from './element'
import {
	EffectTrigger,
	EffectConditionType,
	EffectActionType,
	EffectSourceType,
	type Effect,
	type EffectSource,
} from '$lib/models/effect'

function createRaceSource(id: RaceName): EffectSource {
	return {
		type: EffectSourceType.Race,
		id,
		name: `${id} Race`,
	}
}

// Breton: +1 MP regen per round
// Note: Spell resistance +5 is now handled by the racial resistance system
export const BretonEffects: Effect[] = [
	{
		id: 'breton-mp-regen',
		name: 'Magical Blood',
		description: 'Regenerate +1 MP per round',
		source: createRaceSource(RaceName.Breton),
		trigger: EffectTrigger.TurnStart,
		conditions: [],
		actions: [
			{
				type: EffectActionType.RestoreMP,
				value: 1,
			},
		],
		priority: 20,
	},
]

// Nord: Frost resist +10 is now handled by the racial resistance system
// Keeping empty array - resistance handled by racialResistances.ts
export const NordEffects: Effect[] = []

// Dunmer: Fire resist +10 is now handled by the racial resistance system
// Keeping empty array - resistance handled by racialResistances.ts
export const DunmerEffects: Effect[] = []

// Altmer: Spell weakness -5 is now handled by the racial resistance system
// Keeping empty array - weakness handled by racialResistances.ts
export const AltmerEffects: Effect[] = []

// Empty arrays for races with passive benefits (not combat triggers)
// Resistances handled by the racial resistance system in racialResistances.ts
export const RedguardEffects: Effect[] = []
export const BosmerEffects: Effect[] = []
export const OrsimerEffects: Effect[] = []
export const ArgonianEffects: Effect[] = []
export const ImperialEffects: Effect[] = []
export const KhajiitEffects: Effect[] = []

// Master export
export const RaceEffects: Record<RaceName, Effect[]> = {
	[RaceName.Breton]: BretonEffects,
	[RaceName.Nord]: NordEffects,
	[RaceName.Dunmer]: DunmerEffects,
	[RaceName.Altmer]: AltmerEffects,
	[RaceName.Redguard]: RedguardEffects,
	[RaceName.Bosmer]: BosmerEffects,
	[RaceName.Orsimer]: OrsimerEffects,
	[RaceName.Argonian]: ArgonianEffects,
	[RaceName.Imperial]: ImperialEffects,
	[RaceName.Khajiit]: KhajiitEffects,
}

export function getRaceEffects(race: RaceName): Effect[] {
	return RaceEffects[race] ?? []
}
