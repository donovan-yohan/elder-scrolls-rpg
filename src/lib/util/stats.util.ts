import type { PlayerData } from '$lib/models/player'
import type { Skill } from '$lib/data/skill'
import { SpellSkills } from '$lib/data/skill'
import { Archetypes } from '$lib/data/archetype'
import { BirthSigns } from '$lib/data/birthSign'
import { RaceName } from '$lib/data/race'
import { Level } from '$lib/data/level'

/**
 * Racial stat bonuses parsed from race descriptions.
 * These are flat bonuses added to the base stats.
 */
export const RacialStatBonuses: Record<RaceName, { health: number; magicka: number; actionPoints: number }> = {
	[RaceName.Breton]: { health: 0, magicka: 0, actionPoints: 0 },
	[RaceName.Nord]: { health: 0, magicka: 0, actionPoints: 0 },
	[RaceName.Imperial]: { health: 1, magicka: 0, actionPoints: 0 },
	[RaceName.Redguard]: { health: 0, magicka: 0, actionPoints: 1 },
	[RaceName.Altmer]: { health: 0, magicka: 4, actionPoints: 0 },
	[RaceName.Bosmer]: { health: 0, magicka: 0, actionPoints: 0 },
	[RaceName.Dunmer]: { health: 0, magicka: 0, actionPoints: 0 },
	[RaceName.Orsimer]: { health: 2, magicka: 0, actionPoints: 0 },
	[RaceName.Argonian]: { health: 0, magicka: 0, actionPoints: 0 },
	[RaceName.Khajiit]: { health: 0, magicka: 0, actionPoints: 1 },
}

/**
 * Get the base stat value from level data based on archetype stat priority.
 * Archetypes map stats to 'highStat', 'mediumStat', or 'lowStat'.
 */
function getArchetypeBaseStat(
	player: PlayerData,
	statKey: 'maxHealth' | 'maxMagicka' | 'maxActionPoints'
): number {
	const archetype = Archetypes[player.archetype]
	const levelData = Level[player.level] ?? Level[1]
	if (!levelData) {
		throw new Error(`Level data not found for level ${player.level}`)
	}
	const statPriority = archetype[statKey] // 'highStat' | 'mediumStat' | 'lowStat'
	return levelData[statPriority]
}

/**
 * Calculate max health from archetype base + race bonus + birth sign modifiers.
 * Formula: (archetype base stat) * (birth sign ratio) + (racial bonus)
 */
export function calculateMaxHealth(player: PlayerData): number {
	const baseStat = getArchetypeBaseStat(player, 'maxHealth')
	const racialBonus = RacialStatBonuses[player.race].health
	const birthSign = BirthSigns[player.birthSign]
	const ratio = birthSign.healthRatio ?? 1

	return Math.floor(baseStat * ratio) + racialBonus
}

/**
 * Calculate max magicka from archetype base + race bonus + birth sign modifiers.
 * Formula: (archetype base stat) * (birth sign ratio) + (racial bonus)
 */
export function calculateMaxMagicka(player: PlayerData): number {
	const baseStat = getArchetypeBaseStat(player, 'maxMagicka')
	const racialBonus = RacialStatBonuses[player.race].magicka
	const birthSign = BirthSigns[player.birthSign]
	const ratio = birthSign.magickaRatio ?? 1

	return Math.floor(baseStat * ratio) + racialBonus
}

/**
 * Calculate max action points from archetype base + race bonus + birth sign modifiers.
 * Formula: (archetype base stat) * (birth sign ratio) + (racial bonus)
 */
export function calculateMaxAP(player: PlayerData): number {
	const baseStat = getArchetypeBaseStat(player, 'maxActionPoints')
	const racialBonus = RacialStatBonuses[player.race].actionPoints
	const birthSign = BirthSigns[player.birthSign]
	const ratio = birthSign.actionPointRatio ?? 1

	return Math.floor(baseStat * ratio) + racialBonus
}

/**
 * Calculate skill bonus for a specific skill.
 * Formula: level scaling bonus + major/minor bonus + subskill bonus
 *
 * - Major skills get majorSkillBonus from level data
 * - Minor skills get minorSkillBonus from level data
 * - Untrained skills get 0 base bonus
 * - Each matching subskill adds +1 (or configured bonus)
 */
export function calculateSkillBonus(player: PlayerData, skill: Skill): number {
	const levelData = Level[player.level] ?? Level[1]!

	// Determine if skill is major, minor, or untrained
	let baseBonus = 0
	if (player.majorSkills.includes(skill)) {
		baseBonus = levelData.majorSkillBonus
	} else if (player.minorSkills.includes(skill)) {
		baseBonus = levelData.minorSkillBonus
	}
	// Untrained skills get 0 base bonus

	// Count subskill bonuses for this skill
	const subskillBonus = player.subSkills.filter((sub) => sub.parentSkill === skill).length

	return baseBonus + subskillBonus
}

/**
 * Get the number of spell slots available per magic school based on major/minor skills.
 * Major magic skill = 3 spell slots
 * Minor magic skill = 1 spell slot
 *
 * Returns a record mapping magic school names to their available slot count.
 */
export function getAvailableSpellSlots(player: PlayerData): Record<string, number> {
	const slots: Record<string, number> = {}

	for (const skill of SpellSkills) {
		if (player.majorSkills.includes(skill)) {
			slots[skill] = 3
		} else if (player.minorSkills.includes(skill)) {
			slots[skill] = 1
		}
		// If not major or minor, no slots for that school
	}

	return slots
}

/**
 * Check if player has any magic skills selected (either major or minor).
 * Used to determine if the spells wizard step should be shown.
 */
export function hasMagicSkills(player: PlayerData): boolean {
	const allPlayerSkills = [...player.majorSkills, ...player.minorSkills]
	return SpellSkills.some((magicSkill) => allPlayerSkills.includes(magicSkill))
}

/**
 * Calculate all derived stats for a player.
 * Convenience function that returns all calculated max stats.
 */
export function calculateAllStats(player: PlayerData): {
	maxHealth: number
	maxMagicka: number
	maxAP: number
} {
	return {
		maxHealth: calculateMaxHealth(player),
		maxMagicka: calculateMaxMagicka(player),
		maxAP: calculateMaxAP(player),
	}
}

/**
 * Stat breakdown showing base, racial, birth sign, and total values.
 */
export interface StatBreakdown {
	base: number
	racial: number
	birthSign: number
	total: number
}

/**
 * Get a detailed breakdown of how a stat is calculated.
 */
export function getStatBreakdown(
	player: PlayerData,
	statType: 'health' | 'magicka' | 'actionPoints'
): StatBreakdown {
	const archetype = Archetypes[player.archetype]
	const levelData = Level[player.level] ?? Level[1]
	if (!levelData) {
		throw new Error(`Level data not found for level ${player.level}`)
	}
	const birthSign = BirthSigns[player.birthSign]

	const statKeyMap = {
		health: 'maxHealth',
		magicka: 'maxMagicka',
		actionPoints: 'maxActionPoints',
	} as const

	const ratioKeyMap = {
		health: 'healthRatio',
		magicka: 'magickaRatio',
		actionPoints: 'actionPointRatio',
	} as const

	const statKey = statKeyMap[statType]
	const ratioKey = ratioKeyMap[statType]

	const base = levelData[archetype[statKey]]
	const racial = RacialStatBonuses[player.race][statType]
	const ratio = birthSign[ratioKey] ?? 1
	const birthSignBonus = ratio !== 1 ? Math.floor(base * ratio) - base : 0
	const total = Math.floor(base * ratio) + racial

	return { base, racial, birthSign: birthSignBonus, total }
}
