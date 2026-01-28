export interface ShoutWord {
	word: string
	translation: string
	range: string
	effect: string
}

export interface Shout {
	id: string
	name: string
	description: string
	words: ShoutWord[]
	resolve?: string
}

export const shouts: Shout[] = [
	{
		id: 'unrelenting-force',
		name: 'Unrelenting Force',
		description: 'A great thundering shout that demolishes all in its path',
		resolve: 'Opponent rolls Athletics or Acrobatics. DC 10 + Character level.',
		words: [
			{ word: 'Fus', translation: 'Force', range: 'Short', effect: 'Push up to 40 feet, 2 force damage' },
			{ word: 'Roh', translation: 'Balance', range: 'Medium', effect: 'Push up to 85 feet, 4 force damage' },
			{ word: 'Dah', translation: 'Push', range: 'Long', effect: 'Push up to 200 feet, 8 force damage' },
		]
	},
	{
		id: 'become-ethereal',
		name: 'Become Ethereal',
		description: 'A guttural whisper that rends what was apart from Mundus',
		words: [
			{ word: 'Feim', translation: 'Fade', range: 'Immediate', effect: '1 round invisible/intangible, +6 Sneak advantage' },
			{ word: 'Zii', translation: 'Spirit', range: 'Adjacent', effect: '2 rounds, +8 Sneak advantage' },
			{ word: 'Gron', translation: 'Bind', range: 'Short', effect: '4 rounds, +8 Sneak advantage' },
		]
	},
	{
		id: 'whirlwind-sprint',
		name: 'Whirlwind Sprint',
		description: 'A sharp yell that propels the user forwards',
		resolve: 'Creatures in path roll Athletics vs you.',
		words: [
			{ word: 'Wuld', translation: 'Whirlwind', range: 'Self', effect: 'Move 25 feet, auto-dodge, trample +2 adv' },
			{ word: 'Nah', translation: 'Fury', range: 'Self', effect: 'Move 25 feet, trample +4 adv' },
			{ word: 'Kest', translation: 'Tempest', range: 'Self', effect: 'Move 40 feet, trample +6 adv' },
		]
	},
]

export function getShoutById(id: string): Shout | undefined {
	return shouts.find(s => s.id === id)
}
