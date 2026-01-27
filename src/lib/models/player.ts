import { BirthSignName } from '$lib/data/birthSign'
import { ArchetypeName } from '$lib/data/archetype'
import type { Skill } from '$lib/data/skill'
import type { SubSkill } from '$lib/models/subskill'
import { RaceName } from '$lib/data/race'
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'

export interface InventoryItem {
	itemId: string
	quantity: number
}

export interface OwnedWeapon {
	weaponId: string
	materialId: string | null
}

export interface EquipmentSlot {
	id: string | null
	materialId: string | null
}

export interface Equipment {
	weapon: EquipmentSlot
	offhand: EquipmentSlot
	armor: EquipmentSlot
	accessories: string[]
}

export type PlayerData = {
	id: string
	schemaVersion: string
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
	ownedWeapons: OwnedWeapon[]
	notes: string
	createdAt: string
	updatedAt: string
}

export const defaultPlayerData: Omit<PlayerData, 'id'> = {
	schemaVersion: CHARACTER_SCHEMA_VERSION,
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
		weapon: { id: null, materialId: null },
		offhand: { id: null, materialId: null },
		armor: { id: null, materialId: null },
		accessories: [],
	},
	inventory: [],
	ownedWeapons: [],
	notes: '',
	createdAt: '',
	updatedAt: '',
}
