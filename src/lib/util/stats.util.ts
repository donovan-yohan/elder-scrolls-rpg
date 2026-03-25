import type { PlayerData, Complication } from '$lib/models/player'
import { Skill } from '$lib/data/skill'
import { SpellSkills } from '$lib/data/skill'
import { Archetypes } from '$lib/data/archetype'
import { BirthSigns } from '$lib/data/birthSign'
import { RaceName } from '$lib/data/race'
import { Level } from '$lib/data/level'
import { calculateMaxSpiritPoints } from './spiritPoints.util'

/**
 * Calculate subskill bonus based on player level.
 * Formula: floor(level / 2), minimum 1
 */
export function getSubskillBonus(level: number): number {
	return Math.max(1, Math.floor(level / 2))
}

/**
 * Get the number of subskill slots available at a given level.
 * Uses Level data as single source of truth.
 */
export function getSubskillSlots(level: number): number {
	return (Level[level] ?? Level[1])?.subSkillSlots ?? 1
}

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
 * Formula: level scaling bonus based on major/minor status
 *
 * - Major skills get majorSkillBonus from level data
 * - Minor skills get minorSkillBonus from level data
 * - Untrained skills get 0 base bonus
 *
 * Note: Subskill bonuses are now applied separately during rolls via SubskillPicker
 * when the player invokes a subskill and the GM agrees it applies.
 */
export function calculateSkillBonus(player: PlayerData, skill: Skill): number {
	const levelData = Level[player.level] ?? Level[1]!

	if (player.majorSkills.includes(skill)) return levelData.majorSkillBonus
	if (player.minorSkills.includes(skill)) return levelData.minorSkillBonus
	return 0
}

/**
 * Get all skills organized by their level (Major, Minor, Untrained)
 * along with their calculated bonuses for a player.
 */
export function getSkillsWithLevels(player: PlayerData): {
	major: { skill: Skill; bonus: number }[]
	minor: { skill: Skill; bonus: number }[]
	untrained: { skill: Skill; bonus: number }[]
} {
	const levelData = Level[player.level] ?? Level[1]!
	const allSkills = Object.values(Skill)

	const major = player.majorSkills
		.map((skill) => ({
			skill,
			bonus: levelData.majorSkillBonus,
		}))
		.sort((a, b) => a.skill.localeCompare(b.skill))

	const minor = player.minorSkills
		.map((skill) => ({
			skill,
			bonus: levelData.minorSkillBonus,
		}))
		.sort((a, b) => a.skill.localeCompare(b.skill))

	const untrained = allSkills
		.filter(
			(skill) =>
				!player.majorSkills.includes(skill) && !player.minorSkills.includes(skill)
		)
		.map((skill) => ({ skill, bonus: 0 }))
		.sort((a, b) => a.skill.localeCompare(b.skill))

	return { major, minor, untrained }
}

/**
 * Calculate what changes need to happen when leveling up.
 * Returns null if no choices needed (just stat changes).
 */
export function getLevelUpChanges(
	currentLevel: number,
	targetLevel: number
): {
	majorSlotsGained: number
	minorSlotsGained: number
	subskillSlotsGained: number
	hasChoices: boolean
} | null {
	if (targetLevel <= currentLevel) return null
	if (targetLevel > 20) return null

	const currentData = Level[currentLevel] ?? Level[1]!
	const targetData = Level[targetLevel] ?? Level[20]!

	const majorSlotsGained = targetData.majorSkills - currentData.majorSkills
	const minorSlotsGained = targetData.minorSkills - currentData.minorSkills
	const subskillSlotsGained = targetData.subSkillSlots - currentData.subSkillSlots

	const hasChoices = majorSlotsGained > 0 || minorSlotsGained > 0 || subskillSlotsGained > 0

	if (!hasChoices) return null

	return {
		majorSlotsGained,
		minorSlotsGained,
		subskillSlotsGained,
		hasChoices,
	}
}

/**
 * Get the available skills that can be promoted.
 */
export function getPromotableSkills(player: PlayerData): {
	minorToMajor: Skill[]
	untrainedToMinor: Skill[]
} {
	const allSkills = Object.values(Skill)

	const minorToMajor = player.minorSkills.filter(s => !player.majorSkills.includes(s))
	const untrainedToMinor = allSkills.filter(
		s => !player.majorSkills.includes(s) && !player.minorSkills.includes(s)
	)

	return { minorToMajor, untrainedToMinor }
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
 * Count complications by type for a player.
 */
export function countComplications(complications: Complication[]): {
	hp: number
	ap: number
	mp: number
	equipment: number
} {
	return complications.reduce(
		(acc, c) => {
			acc[c.type]++
			return acc
		},
		{ hp: 0, ap: 0, mp: 0, equipment: 0 }
	)
}

/**
 * Calculate effective max health after complications.
 */
export function calculateEffectiveMaxHealth(player: PlayerData): number {
	const baseMax = calculateMaxHealth(player)
	const hpComplications = player.complications.filter(c => c.type === 'hp').length
	return Math.max(1, baseMax - hpComplications)
}

/**
 * Calculate effective max magicka after complications.
 */
export function calculateEffectiveMaxMagicka(player: PlayerData): number {
	const baseMax = calculateMaxMagicka(player)
	const mpComplications = player.complications.filter(c => c.type === 'mp').length
	return Math.max(0, baseMax - mpComplications)
}

/**
 * Calculate effective max AP after complications.
 */
export function calculateEffectiveMaxAP(player: PlayerData): number {
	const baseMax = calculateMaxAP(player)
	const apComplications = player.complications.filter(c => c.type === 'ap').length
	return Math.max(1, baseMax - apComplications)
}

/**
 * Check if an equipment slot is damaged.
 */
export function isEquipmentDamaged(
	complications: Complication[],
	slot: 'weapon' | 'offhand' | 'armor'
): boolean {
	return complications.some(c => c.type === 'equipment' && c.equipmentSlot === slot)
}

/**
 * Get all damaged equipment slots.
 */
export function getDamagedEquipmentSlots(complications: Complication[]): ('weapon' | 'offhand' | 'armor')[] {
	return complications
		.filter(c => c.type === 'equipment' && c.equipmentSlot)
		.map(c => c.equipmentSlot as 'weapon' | 'offhand' | 'armor')
}

/**
 * Calculate all derived stats for a player.
 * Convenience function that returns all calculated max stats.
 * Includes both base and effective (after complications) values.
 */
export function calculateAllStats(player: PlayerData): {
	maxHealth: number
	maxMagicka: number
	maxAP: number
	effectiveMaxHealth: number
	effectiveMaxMagicka: number
	effectiveMaxAP: number
	maxSpiritPoints: number
} {
	return {
		maxHealth: calculateMaxHealth(player),
		maxMagicka: calculateMaxMagicka(player),
		maxAP: calculateMaxAP(player),
		effectiveMaxHealth: calculateEffectiveMaxHealth(player),
		effectiveMaxMagicka: calculateEffectiveMaxMagicka(player),
		effectiveMaxAP: calculateEffectiveMaxAP(player),
		maxSpiritPoints: calculateMaxSpiritPoints(player.level),
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
