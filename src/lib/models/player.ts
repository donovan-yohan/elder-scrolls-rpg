import type { BirthSignName } from '$lib/data/birthSign'
import type { ArchetypeName } from '$lib/data/archetype'

export type Player = {
	id: string
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
}
