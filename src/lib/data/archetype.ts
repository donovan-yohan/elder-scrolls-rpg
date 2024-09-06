import type { Player } from '$lib/models/player'

export enum ArchetypeName {
	Warrior = 'Warrior',
	Spellsword = 'Spellsword',
	Thief = 'Thief',
	Scout = 'Scout',
	Mage = 'Mage',
	Cleric = 'Cleric',
}

type ArchetypeStat = keyof Pick<Player, 'maxHealth' | 'maxMagicka' | 'maxActionPoints'>

export interface Archetype {
	highStat: ArchetypeStat
	mediumStat: ArchetypeStat
	lowStat: ArchetypeStat
}

export const Archetypes: Record<ArchetypeName, Archetype> = {
	[ArchetypeName.Warrior]: {
		highStat: 'maxHealth',
		mediumStat: 'maxActionPoints',
		lowStat: 'maxMagicka',
	},
	[ArchetypeName.Spellsword]: {
		highStat: 'maxHealth',
		mediumStat: 'maxMagicka',
		lowStat: 'maxActionPoints',
	},
	[ArchetypeName.Thief]: {
		highStat: 'maxActionPoints',
		mediumStat: 'maxMagicka',
		lowStat: 'maxHealth',
	},
	[ArchetypeName.Scout]: {
		highStat: 'maxActionPoints',
		mediumStat: 'maxHealth',
		lowStat: 'maxMagicka',
	},
	[ArchetypeName.Mage]: {
		highStat: 'maxMagicka',
		mediumStat: 'maxActionPoints',
		lowStat: 'maxHealth',
	},
	[ArchetypeName.Cleric]: {
		highStat: 'maxMagicka',
		mediumStat: 'maxHealth',
		lowStat: 'maxActionPoints',
	},
}
