import { BirthSignName } from '$lib/data/birthSign'
import { ArchetypeName } from '$lib/data/archetype'
import type { Skill } from '$lib/data/skill'
import type { SubSkill } from '$lib/models/subskill'
import { RaceName } from '$lib/data/race'

export interface InventoryItem {
	itemId: string
	quantity: number
}

export interface Equipment {
	weapon: string | null
	offhand: string | null
	armor: string | null
	accessories: string[]
}

export type PlayerData = {
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
	knownSpells: string[]
	equipment: Equipment
	inventory: InventoryItem[]
	notes: string
	createdAt: string
	updatedAt: string
}

export const defaultPlayerData: Omit<PlayerData, 'id'> = {
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
	knownSpells: [],
	equipment: {
		weapon: null,
		offhand: null,
		armor: null,
		accessories: [],
	},
	inventory: [],
	notes: '',
	createdAt: '',
	updatedAt: '',
}
