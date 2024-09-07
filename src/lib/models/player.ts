import type { BirthSignName } from '$lib/data/birthSign'
import type { ArchetypeName } from '$lib/data/archetype'
import type { Skill } from '$lib/data/skill'
import type { SubSkill } from '$lib/models/subskill'

export type Player = {
	id: string
	level: number
	playerName: string
	characterName: string
	maxHealth: number
	health: number
	maxActionPoints: number
	actionPoints: number
	maxMagicka: number
	magicka: number
	birthSign: BirthSignName
	archetype: ArchetypeName
	majorSkills: Skill[]
	minorSkills: Skill[]
	subSkills: SubSkill[]
}
