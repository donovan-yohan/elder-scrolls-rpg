import { BirthSignName } from '$lib/data/birthSign'
import { ArchetypeName } from '$lib/data/archetype'
import type { Skill } from '$lib/data/skill'
import type { SubSkill } from '$lib/models/subskill'
import { RaceName } from '$lib/data/race'

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
	race: RaceName
}

export const defaultPlayer: Omit<Player, 'id'> = {
	level: 1,
	playerName: '',
	characterName: '',
	maxHealth: 0,
	health: 0,
	maxActionPoints: 0,
	actionPoints: 0,
	maxMagicka: 0,
	magicka: 0,
	birthSign: BirthSignName.Apprentice,
	archetype: ArchetypeName.Warrior,
	race: RaceName.Nord,
	majorSkills: [],
	minorSkills: [],
	subSkills: [],
}
