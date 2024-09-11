export enum ArchetypeName {
	Warrior = 'Warrior',
	Spellsword = 'Spellsword',
	Thief = 'Thief',
	Scout = 'Scout',
	Mage = 'Mage',
	Cleric = 'Cleric',
}

type ArchetypeStat = 'highStat' | 'mediumStat' | 'lowStat'

export interface Archetype {
	maxHealth: ArchetypeStat
	maxMagicka: ArchetypeStat
	maxActionPoints: ArchetypeStat
}

export const Archetypes: Record<ArchetypeName, Archetype> = {
	[ArchetypeName.Warrior]: {
		maxHealth: 'highStat',
		maxActionPoints: 'mediumStat',
		maxMagicka: 'lowStat',
	},
	[ArchetypeName.Spellsword]: {
		maxHealth: 'highStat',
		maxMagicka: 'mediumStat',
		maxActionPoints: 'lowStat',
	},
	[ArchetypeName.Thief]: {
		maxActionPoints: 'highStat',
		maxMagicka: 'mediumStat',
		maxHealth: 'lowStat',
	},
	[ArchetypeName.Scout]: {
		maxActionPoints: 'highStat',
		maxHealth: 'mediumStat',
		maxMagicka: 'lowStat',
	},
	[ArchetypeName.Mage]: {
		maxMagicka: 'highStat',
		maxActionPoints: 'mediumStat',
		maxHealth: 'lowStat',
	},
	[ArchetypeName.Cleric]: {
		maxMagicka: 'highStat',
		maxHealth: 'mediumStat',
		maxActionPoints: 'lowStat',
	},
}
