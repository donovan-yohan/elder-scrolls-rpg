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

export interface Complication {
	id: string
	type: 'hp' | 'ap' | 'mp' | 'equipment'
	equipmentSlot?: 'weapon' | 'offhand' | 'armor' // Only for equipment type
	timestamp: string
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
	currentSpiritPoints: number
	birthSign: BirthSignName
	archetype: ArchetypeName
	majorSkills: Skill[]
	minorSkills: Skill[]
	subSkills: SubSkill[]
	race: RaceName
	knownSpells: string[]
	knownShouts: string[]
	equipment: Equipment
	inventory: InventoryItem[]
	ownedWeapons: OwnedWeapon[]
	notes: string
	spiritPoints: number
	maxSpiritPoints: number
	complications: Complication[]
	fortunePoints: number
	misfortunePoints: number
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
	currentSpiritPoints: 1,
	birthSign: BirthSignName.Apprentice,
	archetype: ArchetypeName.Warrior,
	race: RaceName.Nord,
	majorSkills: [],
	minorSkills: [],
	subSkills: [],
	knownSpells: [],
	knownShouts: [],
	equipment: {
		weapon: { id: null, materialId: null },
		offhand: { id: null, materialId: null },
		armor: { id: null, materialId: null },
		accessories: [],
	},
	inventory: [],
	ownedWeapons: [],
	notes: '',
	spiritPoints: 1,
	maxSpiritPoints: 1,
	complications: [],
	fortunePoints: 0,
	misfortunePoints: 0,
	createdAt: '',
	updatedAt: '',
}
